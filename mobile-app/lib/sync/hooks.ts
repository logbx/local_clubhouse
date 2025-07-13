import { useState, useEffect, useCallback } from 'react';
import { dataSyncService } from './data-sync';
import type { SyncResult } from './data-sync';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: number | null;
  progress: {
    current: number;
    total: number;
    table: string;
    status: 'syncing' | 'completed' | 'error';
  } | null;
  error: string | null;
  result: SyncResult | null;
}

// Main sync status hook
export function useSyncStatus() {
  const [state, setState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    lastSync: null,
    progress: null,
    error: null,
    result: null,
  });

  useEffect(() => {
    // Update initial status
    const status = dataSyncService.getSyncStatus();
    setState(prev => ({
      ...prev,
      isOnline: status.isOnline,
      isSyncing: status.isSyncing,
      lastSync: status.lastFullSync || null,
    }));

    // Listen to sync events
    const unsubscribeStart = dataSyncService.on('start', () => {
      setState(prev => ({ 
        ...prev, 
        isSyncing: true, 
        error: null, 
        progress: null,
        result: null 
      }));
    });

    const unsubscribeProgress = dataSyncService.on('progress', (data) => {
      setState(prev => ({ ...prev, progress: data }));
    });

    const unsubscribeTableStart = dataSyncService.on('table_start', (data) => {
      setState(prev => ({ 
        ...prev, 
        progress: { 
          current: 0, 
          total: 0, 
          table: data.table, 
          status: 'syncing' 
        } 
      }));
    });

    const unsubscribeTableComplete = dataSyncService.on('table_complete', (data) => {
      setState(prev => ({ 
        ...prev, 
        progress: { 
          current: data.synced, 
          total: data.total, 
          table: data.table, 
          status: 'completed' 
        } 
      }));
    });

    const unsubscribeComplete = dataSyncService.on('complete', (result: SyncResult) => {
      setState(prev => ({ 
        ...prev, 
        isSyncing: false, 
        lastSync: Date.now(),
        progress: null,
        result,
        error: result.success ? null : 'Sync completed with errors'
      }));
    });

    const unsubscribeError = dataSyncService.on('error', (data) => {
      setState(prev => ({ 
        ...prev, 
        isSyncing: false, 
        error: data.error,
        progress: null 
      }));
    });

    return () => {
      unsubscribeStart();
      unsubscribeProgress();
      unsubscribeTableStart();
      unsubscribeTableComplete();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, []);

  const syncNow = useCallback(async (force: boolean = false) => {
    try {
      return await dataSyncService.syncAll(force);
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearSyncData = useCallback(async () => {
    try {
      await dataSyncService.clearSyncData();
      setState(prev => ({ 
        ...prev, 
        lastSync: null, 
        result: null, 
        error: null 
      }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  }, []);

  return {
    ...state,
    syncNow,
    clearError,
    clearSyncData,
  };
}

// Sync progress hook for detailed progress tracking
export function useSyncProgress() {
  const [progress, setProgress] = useState<{
    tables: Array<{
      name: string;
      status: 'pending' | 'syncing' | 'completed' | 'error';
      synced: number;
      total: number;
    }>;
    overall: {
      current: number;
      total: number;
      percentage: number;
    };
  }>({
    tables: [],
    overall: { current: 0, total: 0, percentage: 0 },
  });

  useEffect(() => {
    const unsubscribeStart = dataSyncService.on('start', () => {
      setProgress({
        tables: [
          { name: 'users', status: 'pending', synced: 0, total: 0 },
          { name: 'clubs', status: 'pending', synced: 0, total: 0 },
          { name: 'events', status: 'pending', synced: 0, total: 0 },
          { name: 'tournaments', status: 'pending', synced: 0, total: 0 },
        ],
        overall: { current: 0, total: 0, percentage: 0 },
      });
    });

    const unsubscribeTableStart = dataSyncService.on('table_start', (data) => {
      setProgress(prev => ({
        ...prev,
        tables: prev.tables.map(table => 
          table.name === data.table 
            ? { ...table, status: 'syncing' }
            : table
        ),
      }));
    });

    const unsubscribeTableComplete = dataSyncService.on('table_complete', (data) => {
      setProgress(prev => {
        const updatedTables = prev.tables.map(table => 
          table.name === data.table 
            ? { ...table, status: 'completed', synced: data.synced, total: data.total }
            : table
        );

        const totalSynced = updatedTables.reduce((sum, table) => sum + table.synced, 0);
        const totalRecords = updatedTables.reduce((sum, table) => sum + table.total, 0);
        const percentage = totalRecords > 0 ? Math.round((totalSynced / totalRecords) * 100) : 0;

        return {
          tables: updatedTables,
          overall: {
            current: totalSynced,
            total: totalRecords,
            percentage,
          },
        };
      });
    });

    const unsubscribeComplete = dataSyncService.on('complete', () => {
      setProgress(prev => ({
        ...prev,
        overall: { ...prev.overall, percentage: 100 },
      }));
    });

    return () => {
      unsubscribeStart();
      unsubscribeTableStart();
      unsubscribeTableComplete();
      unsubscribeComplete();
    };
  }, []);

  return progress;
}

// Hook for manual sync control
export function useManualSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const sync = useCallback(async (force: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await dataSyncService.syncAll(force);
      setLastResult(result);
      
      if (!result.success) {
        const errorMessage = result.errors.map(e => `${e.table}: ${e.error}`).join(', ');
        setError(errorMessage);
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Sync failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncTable = useCallback(async (tableName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // This would need to be implemented in the sync service
      // For now, we'll just sync all
      const result = await dataSyncService.syncAll();
      setLastResult(result);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Table sync failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    lastResult,
    sync,
    syncTable,
    clearError,
  };
}

// Hook for conflict resolution
export function useSyncConflicts() {
  const [conflicts, setConflicts] = useState<Array<{
    table: string;
    id: string;
    localData: any;
    serverData: any;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConflicts = useCallback(async () => {
    setIsLoading(true);
    try {
      const conflictedRecords = await dataSyncService.getConflictedRecords();
      setConflicts(conflictedRecords);
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveConflict = useCallback(async (
    table: string, 
    recordId: string, 
    resolution: 'local' | 'server'
  ) => {
    try {
      await dataSyncService.resolveConflict(table, recordId, resolution);
      
      // Remove resolved conflict from list
      setConflicts(prev => 
        prev.filter(conflict => 
          !(conflict.table === table && conflict.id === recordId)
        )
      );
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw error;
    }
  }, []);

  const resolveAllConflicts = useCallback(async (resolution: 'local' | 'server') => {
    try {
      await Promise.all(
        conflicts.map(conflict => 
          dataSyncService.resolveConflict(conflict.table, conflict.id, resolution)
        )
      );
      
      setConflicts([]);
    } catch (error) {
      console.error('Failed to resolve all conflicts:', error);
      throw error;
    }
  }, [conflicts]);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  return {
    conflicts,
    isLoading,
    fetchConflicts,
    resolveConflict,
    resolveAllConflicts,
    hasConflicts: conflicts.length > 0,
  };
}

// Hook for network status and auto-sync
export function useAutoSync(options: {
  enableAutoSync?: boolean;
  syncOnConnect?: boolean;
  syncInterval?: number;
} = {}) {
  const {
    enableAutoSync = true,
    syncOnConnect = true,
    syncInterval = 5 * 60 * 1000, // 5 minutes
  } = options;

  const [networkStatus, setNetworkStatus] = useState({
    isOnline: true,
    wasOffline: false,
  });

  const syncStatus = useSyncStatus();

  useEffect(() => {
    if (syncStatus.isOnline !== networkStatus.isOnline) {
      setNetworkStatus(prev => ({
        isOnline: syncStatus.isOnline,
        wasOffline: prev.isOnline && !syncStatus.isOnline,
      }));
    }
  }, [syncStatus.isOnline, networkStatus.isOnline]);

  useEffect(() => {
    // Auto-sync when coming back online
    if (syncOnConnect && networkStatus.isOnline && networkStatus.wasOffline) {
      syncStatus.syncNow();
    }
  }, [networkStatus.isOnline, networkStatus.wasOffline, syncOnConnect, syncStatus]);

  useEffect(() => {
    if (!enableAutoSync) return;

    const interval = setInterval(() => {
      if (syncStatus.isOnline && !syncStatus.isSyncing) {
        dataSyncService.syncPendingChanges();
      }
    }, syncInterval);

    return () => clearInterval(interval);
  }, [enableAutoSync, syncInterval, syncStatus.isOnline, syncStatus.isSyncing]);

  return {
    ...syncStatus,
    networkStatus,
    enableAutoSync,
  };
}

// Hook for sync statistics
export function useSyncStats() {
  const [stats, setStats] = useState({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageDuration: 0,
    lastSyncDuration: 0,
    recordsSynced: 0,
  });

  useEffect(() => {
    const unsubscribeComplete = dataSyncService.on('complete', (result: SyncResult) => {
      setStats(prev => ({
        totalSyncs: prev.totalSyncs + 1,
        successfulSyncs: result.success ? prev.successfulSyncs + 1 : prev.successfulSyncs,
        failedSyncs: result.success ? prev.failedSyncs : prev.failedSyncs + 1,
        averageDuration: Math.round(
          (prev.averageDuration * prev.totalSyncs + result.duration) / (prev.totalSyncs + 1)
        ),
        lastSyncDuration: result.duration,
        recordsSynced: prev.recordsSynced + result.syncedRecords,
      }));
    });

    return unsubscribeComplete;
  }, []);

  const resetStats = useCallback(() => {
    setStats({
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageDuration: 0,
      lastSyncDuration: 0,
      recordsSynced: 0,
    });
  }, []);

  return {
    ...stats,
    successRate: stats.totalSyncs > 0 ? Math.round((stats.successfulSyncs / stats.totalSyncs) * 100) : 0,
    resetStats,
  };
}