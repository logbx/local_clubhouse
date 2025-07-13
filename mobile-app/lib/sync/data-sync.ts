import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { db, dbUtils } from '../db';
import { users, clubs, events, tournaments, apiCache, offlineQueue } from '../db/schema';
import { eq, and, gt, lt, desc, asc } from 'drizzle-orm';
import { apiClient } from '../api-client-new';
import type { SyncStatus, User, Club, Event, Tournament } from '../db/types';

interface SyncProgress {
  current: number;
  total: number;
  table: string;
  status: 'syncing' | 'completed' | 'error';
}

interface SyncResult {
  success: boolean;
  syncedTables: string[];
  errors: Array<{ table: string; error: string }>;
  totalRecords: number;
  syncedRecords: number;
  duration: number;
}

type SyncEventType = 'progress' | 'complete' | 'error' | 'start' | 'table_start' | 'table_complete';
type SyncEventHandler = (data: any) => void;

class DataSyncService {
  private isOnline = true;
  private isSyncing = false;
  private eventHandlers: Map<SyncEventType, Set<SyncEventHandler>> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private lastFullSync: number = 0;
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly FULL_SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.initializeNetworkListener();
    this.startPeriodicSync();
  }

  private async initializeNetworkListener() {
    if (Platform.OS !== 'web') {
      NetInfo.addEventListener(state => {
        const wasOffline = !this.isOnline;
        this.isOnline = state.isConnected ?? false;
        
        if (wasOffline && this.isOnline) {
          console.log('📶 Network reconnected, starting sync');
          this.syncAll();
        }
      });

      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected ?? false;
    } else {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.syncAll();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
      
      this.isOnline = navigator.onLine;
    }
  }

  private startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        const now = Date.now();
        const shouldFullSync = now - this.lastFullSync > this.FULL_SYNC_INTERVAL;
        
        if (shouldFullSync) {
          this.syncAll();
        } else {
          this.syncPendingChanges();
        }
      }
    }, this.SYNC_INTERVAL);
  }

  private emit(event: SyncEventType, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  on(event: SyncEventType, handler: SyncEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    this.eventHandlers.get(event)!.add(handler);
    
    return () => {
      this.off(event, handler);
    };
  }

  off(event: SyncEventType, handler?: SyncEventHandler) {
    if (!handler) {
      this.eventHandlers.delete(event);
      return;
    }

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  async syncAll(force: boolean = false): Promise<SyncResult> {
    if (this.isSyncing && !force) {
      throw new Error('Sync already in progress');
    }

    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    const startTime = Date.now();
    this.isSyncing = true;
    this.lastFullSync = startTime;

    const result: SyncResult = {
      success: false,
      syncedTables: [],
      errors: [],
      totalRecords: 0,
      syncedRecords: 0,
      duration: 0,
    };

    this.emit('start', { timestamp: startTime });

    try {
      const database = await dbUtils.waitForDB();

      // Sync in order of dependencies
      const tables = [
        { name: 'users', syncFn: () => this.syncUsers() },
        { name: 'clubs', syncFn: () => this.syncClubs() },
        { name: 'events', syncFn: () => this.syncEvents() },
        { name: 'tournaments', syncFn: () => this.syncTournaments() },
      ];

      for (const table of tables) {
        try {
          this.emit('table_start', { table: table.name });
          
          const tableResult = await table.syncFn();
          result.syncedTables.push(table.name);
          result.totalRecords += tableResult.total;
          result.syncedRecords += tableResult.synced;
          
          this.emit('table_complete', { 
            table: table.name, 
            synced: tableResult.synced,
            total: tableResult.total 
          });
        } catch (error: any) {
          console.error(`Failed to sync ${table.name}:`, error);
          result.errors.push({ 
            table: table.name, 
            error: error.message || 'Unknown error' 
          });
        }
      }

      // Sync pending offline changes
      await this.syncPendingChanges();

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      this.emit('complete', result);
      console.log(`✅ Sync completed in ${result.duration}ms`, result);

    } catch (error: any) {
      result.success = false;
      result.errors.push({ table: 'general', error: error.message });
      result.duration = Date.now() - startTime;
      
      this.emit('error', { error: error.message, result });
      console.error('❌ Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  private async syncUsers(): Promise<{ total: number; synced: number }> {
    const database = await dbUtils.waitForDB();
    
    // Get last sync timestamp
    const lastUser = await database
      .select()
      .from(users)
      .orderBy(desc(users.lastSyncAt))
      .limit(1);
    
    const lastSyncAt = lastUser[0]?.lastSyncAt || 0;
    
    // Fetch updates from server
    const response = await apiClient.get('/sync/users', {
      body: { since: lastSyncAt },
      cache: false,
    });

    let syncedCount = 0;
    const now = Date.now();

    for (const userData of response.users || []) {
      try {
        await database
          .insert(users)
          .values({
            ...userData,
            lastSyncAt: now,
            syncStatus: 'synced' as SyncStatus,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              ...userData,
              lastSyncAt: now,
              syncStatus: 'synced' as SyncStatus,
              updatedAt: userData.updatedAt || now,
            },
          });
        
        syncedCount++;
      } catch (error) {
        console.error('Failed to sync user:', userData.id, error);
      }
    }

    return { total: response.users?.length || 0, synced: syncedCount };
  }

  private async syncClubs(): Promise<{ total: number; synced: number }> {
    const database = await dbUtils.waitForDB();
    
    const lastClub = await database
      .select()
      .from(clubs)
      .orderBy(desc(clubs.lastSyncAt))
      .limit(1);
    
    const lastSyncAt = lastClub[0]?.lastSyncAt || 0;
    
    const response = await apiClient.get('/sync/clubs', {
      body: { since: lastSyncAt },
      cache: false,
    });

    let syncedCount = 0;
    const now = Date.now();

    for (const clubData of response.clubs || []) {
      try {
        await database
          .insert(clubs)
          .values({
            ...clubData,
            lastSyncAt: now,
            syncStatus: 'synced' as SyncStatus,
          })
          .onConflictDoUpdate({
            target: clubs.id,
            set: {
              ...clubData,
              lastSyncAt: now,
              syncStatus: 'synced' as SyncStatus,
              updatedAt: clubData.updatedAt || now,
            },
          });
        
        syncedCount++;
      } catch (error) {
        console.error('Failed to sync club:', clubData.id, error);
      }
    }

    return { total: response.clubs?.length || 0, synced: syncedCount };
  }

  private async syncEvents(): Promise<{ total: number; synced: number }> {
    const database = await dbUtils.waitForDB();
    
    const lastEvent = await database
      .select()
      .from(events)
      .orderBy(desc(events.lastSyncAt))
      .limit(1);
    
    const lastSyncAt = lastEvent[0]?.lastSyncAt || 0;
    
    const response = await apiClient.get('/sync/events', {
      body: { since: lastSyncAt },
      cache: false,
    });

    let syncedCount = 0;
    const now = Date.now();

    for (const eventData of response.events || []) {
      try {
        await database
          .insert(events)
          .values({
            ...eventData,
            lastSyncAt: now,
            syncStatus: 'synced' as SyncStatus,
          })
          .onConflictDoUpdate({
            target: events.id,
            set: {
              ...eventData,
              lastSyncAt: now,
              syncStatus: 'synced' as SyncStatus,
              updatedAt: eventData.updatedAt || now,
            },
          });
        
        syncedCount++;
      } catch (error) {
        console.error('Failed to sync event:', eventData.id, error);
      }
    }

    return { total: response.events?.length || 0, synced: syncedCount };
  }

  private async syncTournaments(): Promise<{ total: number; synced: number }> {
    const database = await dbUtils.waitForDB();
    
    const lastTournament = await database
      .select()
      .from(tournaments)
      .orderBy(desc(tournaments.lastSyncAt))
      .limit(1);
    
    const lastSyncAt = lastTournament[0]?.lastSyncAt || 0;
    
    const response = await apiClient.get('/sync/tournaments', {
      body: { since: lastSyncAt },
      cache: false,
    });

    let syncedCount = 0;
    const now = Date.now();

    for (const tournamentData of response.tournaments || []) {
      try {
        await database
          .insert(tournaments)
          .values({
            ...tournamentData,
            lastSyncAt: now,
            syncStatus: 'synced' as SyncStatus,
          })
          .onConflictDoUpdate({
            target: tournaments.id,
            set: {
              ...tournamentData,
              lastSyncAt: now,
              syncStatus: 'synced' as SyncStatus,
              updatedAt: tournamentData.updatedAt || now,
            },
          });
        
        syncedCount++;
      } catch (error) {
        console.error('Failed to sync tournament:', tournamentData.id, error);
      }
    }

    return { total: response.tournaments?.length || 0, synced: syncedCount };
  }

  async syncPendingChanges(): Promise<void> {
    const database = await dbUtils.waitForDB();
    
    // Get all pending changes
    const pendingUsers = await database
      .select()
      .from(users)
      .where(eq(users.syncStatus, 'pending'));
    
    const pendingClubs = await database
      .select()
      .from(clubs)
      .where(eq(clubs.syncStatus, 'pending'));
    
    const pendingEvents = await database
      .select()
      .from(events)
      .where(eq(events.syncStatus, 'pending'));
    
    const pendingTournaments = await database
      .select()
      .from(tournaments)
      .where(eq(tournaments.syncStatus, 'pending'));

    // Sync users
    for (const user of pendingUsers) {
      try {
        await apiClient.put(`/users/${user.id}`, user, { queueIfOffline: true });
        
        await database
          .update(users)
          .set({ 
            syncStatus: 'synced' as SyncStatus, 
            lastSyncAt: Date.now() 
          })
          .where(eq(users.id, user.id));
      } catch (error) {
        console.error('Failed to sync pending user:', user.id, error);
      }
    }

    // Sync clubs
    for (const club of pendingClubs) {
      try {
        await apiClient.put(`/clubs/${club.username}`, club, { queueIfOffline: true });
        
        await database
          .update(clubs)
          .set({ 
            syncStatus: 'synced' as SyncStatus, 
            lastSyncAt: Date.now() 
          })
          .where(eq(clubs.id, club.id));
      } catch (error) {
        console.error('Failed to sync pending club:', club.id, error);
      }
    }

    // Sync events
    for (const event of pendingEvents) {
      try {
        await apiClient.put(`/events/${event.id}`, event, { queueIfOffline: true });
        
        await database
          .update(events)
          .set({ 
            syncStatus: 'synced' as SyncStatus, 
            lastSyncAt: Date.now() 
          })
          .where(eq(events.id, event.id));
      } catch (error) {
        console.error('Failed to sync pending event:', event.id, error);
      }
    }

    // Sync tournaments
    for (const tournament of pendingTournaments) {
      try {
        await apiClient.put(`/tournaments/${tournament.id}`, tournament, { queueIfOffline: true });
        
        await database
          .update(tournaments)
          .set({ 
            syncStatus: 'synced' as SyncStatus, 
            lastSyncAt: Date.now() 
          })
          .where(eq(tournaments.id, tournament.id));
      } catch (error) {
        console.error('Failed to sync pending tournament:', tournament.id, error);
      }
    }
  }

  async markAsModified(table: string, recordId: string): Promise<void> {
    const database = await dbUtils.waitForDB();
    const now = Date.now();

    switch (table) {
      case 'users':
        await database
          .update(users)
          .set({ 
            syncStatus: 'pending' as SyncStatus, 
            updatedAt: now 
          })
          .where(eq(users.id, recordId));
        break;
      
      case 'clubs':
        await database
          .update(clubs)
          .set({ 
            syncStatus: 'pending' as SyncStatus, 
            updatedAt: now 
          })
          .where(eq(clubs.id, recordId));
        break;
      
      case 'events':
        await database
          .update(events)
          .set({ 
            syncStatus: 'pending' as SyncStatus, 
            updatedAt: now 
          })
          .where(eq(events.id, recordId));
        break;
      
      case 'tournaments':
        await database
          .update(tournaments)
          .set({ 
            syncStatus: 'pending' as SyncStatus, 
            updatedAt: now 
          })
          .where(eq(tournaments.id, recordId));
        break;
    }
  }

  async handleConflict(table: string, recordId: string, localData: any, serverData: any): Promise<'local' | 'server' | 'merge'> {
    // Simple conflict resolution: server wins if it's newer
    if (serverData.updatedAt > localData.updatedAt) {
      return 'server';
    }
    
    // For now, we'll use server data in conflicts
    // In a real app, you might want to show a UI for manual resolution
    return 'server';
  }

  async getConflictedRecords(): Promise<Array<{ table: string; id: string; localData: any; serverData: any }>> {
    const database = await dbUtils.waitForDB();
    const conflicts: Array<{ table: string; id: string; localData: any; serverData: any }> = [];

    // Check for conflicted records
    const conflictedUsers = await database
      .select()
      .from(users)
      .where(eq(users.syncStatus, 'conflict'));

    for (const user of conflictedUsers) {
      try {
        const serverData = await apiClient.get(`/users/${user.id}`);
        conflicts.push({
          table: 'users',
          id: user.id,
          localData: user,
          serverData,
        });
      } catch (error) {
        console.error('Failed to fetch server data for user:', user.id, error);
      }
    }

    return conflicts;
  }

  async resolveConflict(table: string, recordId: string, resolution: 'local' | 'server'): Promise<void> {
    const database = await dbUtils.waitForDB();
    const now = Date.now();

    if (resolution === 'server') {
      // Fetch latest from server and update local
      try {
        let serverData;
        switch (table) {
          case 'users':
            serverData = await apiClient.get(`/users/${recordId}`);
            await database
              .update(users)
              .set({
                ...serverData,
                syncStatus: 'synced' as SyncStatus,
                lastSyncAt: now,
              })
              .where(eq(users.id, recordId));
            break;
          // Add other tables as needed
        }
      } catch (error) {
        console.error('Failed to resolve conflict with server data:', error);
      }
    } else {
      // Mark local as pending to be synced
      await this.markAsModified(table, recordId);
    }
  }

  async clearSyncData(): Promise<void> {
    const database = await dbUtils.waitForDB();
    
    // Clear all cached data
    await Promise.all([
      database.delete(apiCache),
      database.delete(offlineQueue),
    ]);

    // Reset sync status and timestamps
    await Promise.all([
      database.update(users).set({ 
        syncStatus: 'pending' as SyncStatus, 
        lastSyncAt: null 
      }),
      database.update(clubs).set({ 
        syncStatus: 'pending' as SyncStatus, 
        lastSyncAt: null 
      }),
      database.update(events).set({ 
        syncStatus: 'pending' as SyncStatus, 
        lastSyncAt: null 
      }),
      database.update(tournaments).set({ 
        syncStatus: 'pending' as SyncStatus, 
        lastSyncAt: null 
      }),
    ]);

    this.lastFullSync = 0;
    console.log('🗑️ Sync data cleared');
  }

  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastFullSync: this.lastFullSync,
    };
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.eventHandlers.clear();
  }
}

export const dataSyncService = new DataSyncService();
export default dataSyncService;