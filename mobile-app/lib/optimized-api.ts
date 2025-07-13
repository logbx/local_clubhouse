import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tournament, TournamentResponse } from '../../shared/types/tournament';

interface OptimisticUpdate<T> {
  id: string;
  data: T;
  timestamp: number;
  rollback: () => void;
}

class OptimizedApiClient {
  private baseUrl: string;
  private pendingUpdates = new Map<string, OptimisticUpdate<any>>();
  
  constructor() {
    this.baseUrl = __DEV__ 
      ? 'http://localhost:3001/api'
      : 'https://your-backend.com/api';
  }

  // Optimistic tournament registration
  async registerForTournament(tournamentId: string): Promise<Tournament> {
    const updateId = `register-${tournamentId}`;
    
    // Store current state for rollback
    const currentTournament = await this.getCachedTournament(tournamentId);
    
    // Apply optimistic update
    const optimisticTournament = {
      ...currentTournament,
      players: [...(currentTournament?.players || []), {
        id: await this.getCurrentUserId(),
        name: await this.getCurrentUserName(),
        isGuest: false,
        registeredAt: new Date().toISOString()
      }]
    };
    
    // Store optimistic update
    this.pendingUpdates.set(updateId, {
      id: updateId,
      data: optimisticTournament,
      timestamp: Date.now(),
      rollback: () => this.setCachedTournament(tournamentId, currentTournament)
    });
    
    // Update local cache immediately
    await this.setCachedTournament(tournamentId, optimisticTournament);
    
    try {
      // Make actual API call
      const response = await this.post<TournamentResponse>(
        `/tournaments/${tournamentId}/register`
      );
      
      // Success: update cache with server response
      await this.setCachedTournament(tournamentId, response.data);
      this.pendingUpdates.delete(updateId);
      
      return response.data;
    } catch (error) {
      // Rollback on failure
      const update = this.pendingUpdates.get(updateId);
      if (update) {
        update.rollback();
        this.pendingUpdates.delete(updateId);
      }
      throw error;
    }
  }

  // Cached tournament fetching
  async getTournament(tournamentId: string): Promise<Tournament> {
    // Try cache first
    const cached = await this.getCachedTournament(tournamentId);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }
    
    // Fetch from API
    const response = await this.get<TournamentResponse>(`/tournaments/${tournamentId}`);
    await this.setCachedTournament(tournamentId, response.data);
    
    return response.data;
  }

  // Cache management
  private async getCachedTournament(tournamentId: string): Promise<Tournament | null> {
    try {
      const cached = await AsyncStorage.getItem(`tournament-${tournamentId}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }
  
  private async setCachedTournament(tournamentId: string, tournament: Tournament | null): Promise<void> {
    try {
      if (tournament) {
        await AsyncStorage.setItem(`tournament-${tournamentId}`, JSON.stringify({
          ...tournament,
          _cachedAt: Date.now()
        }));
      } else {
        await AsyncStorage.removeItem(`tournament-${tournamentId}`);
      }
    } catch {
      // Fail silently
    }
  }
  
  private isCacheValid(tournament: any): boolean {
    const cachedAt = tournament._cachedAt;
    if (!cachedAt) return false;
    
    // Cache valid for 2 minutes for tournaments
    const maxAge = 2 * 60 * 1000;
    return Date.now() - cachedAt < maxAge;
  }

  // HTTP helpers
  private async get<T>(path: string): Promise<T> {
    const token = await AsyncStorage.getItem('accessToken');
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
  
  private async post<T>(path: string, data?: any): Promise<T> {
    const token = await AsyncStorage.getItem('accessToken');
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
  
  private async getCurrentUserId(): Promise<string> {
    // Get from JWT token or AsyncStorage
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.id;
    }
    throw new Error('No user token found');
  }
  
  private async getCurrentUserName(): Promise<string> {
    const userProfile = await AsyncStorage.getItem('userProfile');
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      return profile.username || profile.fullName || 'User';
    }
    return 'User';
  }
}

export const optimizedApi = new OptimizedApiClient();