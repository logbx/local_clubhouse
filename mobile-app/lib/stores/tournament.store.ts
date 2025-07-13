import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api-client-new';
import type { Tournament, StoreState, PaginatedResponse } from '../db/types';

interface TournamentMatch {
  _id: string;
  player1: any;
  player2: any;
  result?: any;
  status: string;
  round: any;
  position: number;
}

interface TournamentPlayer {
  _id: string;
  player: any;
  seed: number;
  status: string;
  stats: any;
}

interface TournamentRound {
  _id: string;
  roundNumber: number;
  name: string;
  status: string;
  matches: TournamentMatch[];
}

interface TournamentState extends StoreState {
  // Data
  tournaments: Tournament[];
  userTournaments: Tournament[];
  currentTournament: Tournament | null;
  tournamentPlayers: TournamentPlayer[];
  tournamentMatches: TournamentMatch[];
  tournamentRounds: TournamentRound[];
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  
  // Filters
  filters: {
    search?: string;
    type?: string;
    status?: string;
    clubId?: string;
    eventId?: string;
  };
}

interface TournamentActions {
  // Tournament operations
  fetchTournaments: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    status?: string;
    clubId?: string;
  }) => Promise<void>;
  fetchUserTournaments: () => Promise<void>;
  fetchTournament: (tournamentId: string) => Promise<void>;
  createTournament: (tournamentData: Partial<Tournament>) => Promise<Tournament>;
  updateTournament: (tournamentId: string, updates: Partial<Tournament>) => Promise<void>;
  deleteTournament: (tournamentId: string) => Promise<void>;
  
  // Player operations
  fetchTournamentPlayers: (tournamentId: string) => Promise<void>;
  addTournamentPlayer: (tournamentId: string, playerData: {
    playerId?: string;
    email?: string;
    name?: string;
    seed?: number;
  }) => Promise<void>;
  updateTournamentPlayer: (tournamentId: string, playerId: string, updates: any) => Promise<void>;
  removeTournamentPlayer: (tournamentId: string, playerId: string) => Promise<void>;
  
  // Match operations
  fetchTournamentMatches: (tournamentId: string, params?: {
    round?: number;
    status?: string;
    live?: boolean;
  }) => Promise<void>;
  submitMatchResult: (tournamentId: string, matchData: {
    matchId: string;
    result: {
      winner?: string;
      isDraw?: boolean;
      score: {
        player1Score: number;
        player2Score: number;
        games?: any[];
      };
      duration?: number;
      notes?: string;
    };
  }) => Promise<void>;
  updateMatch: (tournamentId: string, matchId: string, updates: any) => Promise<void>;
  
  // Round operations
  fetchTournamentRounds: (tournamentId: string) => Promise<void>;
  generateNextRound: (tournamentId: string, options?: {
    autoGenerate?: boolean;
    pairings?: any[];
  }) => Promise<void>;
  
  // Local state management
  setCurrentTournament: (tournament: Tournament | null) => void;
  updateTournamentLocally: (tournamentId: string, updates: Partial<Tournament>) => void;
  updateMatchLocally: (matchId: string, updates: Partial<TournamentMatch>) => void;
  addTournamentLocally: (tournament: Tournament) => void;
  removeTournamentLocally: (tournamentId: string) => void;
  setFilters: (filters: Partial<TournamentState['filters']>) => void;
  clearFilters: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useTournamentStore = create<TournamentState & TournamentActions>()(
  persist(
    (set, get) => ({
      // Initial state
      tournaments: [],
      userTournaments: [],
      currentTournament: null,
      tournamentPlayers: [],
      tournamentMatches: [],
      tournamentRounds: [],
      pagination: null,
      filters: {},
      loading: false,
      error: null,
      lastFetch: null,
      isOnline: true,

      // Tournament operations
      fetchTournaments: async (params = {}) => {
        set({ loading: true, error: null });
        
        try {
          const response: PaginatedResponse<Tournament> = await apiClient.get('/tournaments', {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 3 * 60 * 1000, // 3 minutes
            body: { ...get().filters, ...params },
          });

          set({
            tournaments: params.page === 1 ? response.tournaments : [...get().tournaments, ...response.tournaments],
            pagination: response.pagination,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch tournaments',
          });
          throw error;
        }
      },

      fetchUserTournaments: async () => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.get('/tournaments/user', {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 2 * 60 * 1000, // 2 minutes
          });

          set({
            userTournaments: response.tournaments || response,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch user tournaments',
          });
          throw error;
        }
      },

      fetchTournament: async (tournamentId: string) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.get(`/tournaments/${tournamentId}`, {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 1 * 60 * 1000, // 1 minute for active tournaments
          });

          set({
            currentTournament: response.tournament || response,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch tournament',
          });
          throw error;
        }
      },

      createTournament: async (tournamentData: Partial<Tournament>) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.post('/tournaments', tournamentData, {
            queueIfOffline: true,
          });

          const newTournament = response.tournament || response;
          
          set({
            tournaments: [newTournament, ...get().tournaments],
            userTournaments: [newTournament, ...get().userTournaments],
            loading: false,
          });

          return newTournament;
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to create tournament',
          });
          throw error;
        }
      },

      updateTournament: async (tournamentId: string, updates: Partial<Tournament>) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.put(`/tournaments/${tournamentId}`, updates, {
            queueIfOffline: true,
          });

          const updatedTournament = response.tournament || response;

          set({
            tournaments: get().tournaments.map(tournament => 
              tournament.id === tournamentId ? { ...tournament, ...updatedTournament } : tournament
            ),
            userTournaments: get().userTournaments.map(tournament => 
              tournament.id === tournamentId ? { ...tournament, ...updatedTournament } : tournament
            ),
            currentTournament: get().currentTournament?.id === tournamentId 
              ? { ...get().currentTournament!, ...updatedTournament }
              : get().currentTournament,
            loading: false,
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to update tournament',
          });
          throw error;
        }
      },

      deleteTournament: async (tournamentId: string) => {
        set({ loading: true, error: null });
        
        try {
          await apiClient.delete(`/tournaments/${tournamentId}`, {
            queueIfOffline: true,
          });

          set({
            tournaments: get().tournaments.filter(tournament => tournament.id !== tournamentId),
            userTournaments: get().userTournaments.filter(tournament => tournament.id !== tournamentId),
            currentTournament: get().currentTournament?.id === tournamentId ? null : get().currentTournament,
            loading: false,
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to delete tournament',
          });
          throw error;
        }
      },

      // Player operations
      fetchTournamentPlayers: async (tournamentId: string) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.get(`/tournaments/${tournamentId}/players`, {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 30 * 1000, // 30 seconds for live data
          });

          set({
            tournamentPlayers: response.players || response,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch tournament players',
          });
          throw error;
        }
      },

      addTournamentPlayer: async (tournamentId: string, playerData: any) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.post(`/tournaments/${tournamentId}/players`, playerData, {
            queueIfOffline: true,
          });

          const newPlayer = response.player || response;
          
          set({
            tournamentPlayers: [newPlayer, ...get().tournamentPlayers],
            loading: false,
          });

          // Update player count
          get().updateTournamentLocally(tournamentId, {
            currentPlayers: (get().currentTournament?.currentPlayers || 0) + 1
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to add tournament player',
          });
          throw error;
        }
      },

      updateTournamentPlayer: async (tournamentId: string, playerId: string, updates: any) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.put(`/tournaments/${tournamentId}/players?playerId=${playerId}`, updates, {
            queueIfOffline: true,
          });

          const updatedPlayer = response.player || response;
          
          set({
            tournamentPlayers: get().tournamentPlayers.map(player => 
              player.player.id === playerId ? { ...player, ...updatedPlayer } : player
            ),
            loading: false,
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to update tournament player',
          });
          throw error;
        }
      },

      removeTournamentPlayer: async (tournamentId: string, playerId: string) => {
        set({ loading: true, error: null });
        
        try {
          await apiClient.delete(`/tournaments/${tournamentId}/players?playerId=${playerId}`, {
            queueIfOffline: true,
          });

          set({
            tournamentPlayers: get().tournamentPlayers.filter(player => player.player.id !== playerId),
            loading: false,
          });

          // Update player count
          get().updateTournamentLocally(tournamentId, {
            currentPlayers: Math.max(0, (get().currentTournament?.currentPlayers || 0) - 1)
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to remove tournament player',
          });
          throw error;
        }
      },

      // Match operations
      fetchTournamentMatches: async (tournamentId: string, params = {}) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.get(`/tournaments/${tournamentId}/matches`, {
            queueIfOffline: true,
            cache: params.live ? false : true,
            cacheTimeout: params.live ? 0 : 30 * 1000, // No cache for live, 30s otherwise
            body: params,
          });

          set({
            tournamentMatches: response.matches || response,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch tournament matches',
          });
          throw error;
        }
      },

      submitMatchResult: async (tournamentId: string, matchData: any) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.post(`/tournaments/${tournamentId}/matches`, matchData, {
            queueIfOffline: true,
          });

          const updatedMatch = response.match || response;
          
          set({
            tournamentMatches: get().tournamentMatches.map(match => 
              match._id === matchData.matchId ? { ...match, ...updatedMatch } : match
            ),
            loading: false,
          });

          // Update tournament stats if round completed
          if (response.roundCompleted) {
            get().updateTournamentLocally(tournamentId, {
              currentRound: (get().currentTournament?.currentRound || 0) + 1
            });
          }
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to submit match result',
          });
          throw error;
        }
      },

      updateMatch: async (tournamentId: string, matchId: string, updates: any) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.put(`/tournaments/${tournamentId}/matches?matchId=${matchId}`, updates, {
            queueIfOffline: true,
          });

          const updatedMatch = response.match || response;
          
          set({
            tournamentMatches: get().tournamentMatches.map(match => 
              match._id === matchId ? { ...match, ...updatedMatch } : match
            ),
            loading: false,
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to update match',
          });
          throw error;
        }
      },

      // Round operations
      fetchTournamentRounds: async (tournamentId: string) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.get(`/tournaments/${tournamentId}/rounds`, {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 30 * 1000, // 30 seconds
          });

          set({
            tournamentRounds: response.rounds || response,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch tournament rounds',
          });
          throw error;
        }
      },

      generateNextRound: async (tournamentId: string, options = {}) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.post(`/tournaments/${tournamentId}/rounds`, options, {
            queueIfOffline: true,
          });

          const newRound = response.round || response;
          
          set({
            tournamentRounds: [...get().tournamentRounds, newRound],
            loading: false,
          });

          // Update current round
          get().updateTournamentLocally(tournamentId, {
            currentRound: newRound.roundNumber
          });

          // Refresh matches
          await get().fetchTournamentMatches(tournamentId);
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to generate next round',
          });
          throw error;
        }
      },

      // Local state management
      setCurrentTournament: (tournament: Tournament | null) => {
        set({ currentTournament: tournament });
      },

      updateTournamentLocally: (tournamentId: string, updates: Partial<Tournament>) => {
        set({
          tournaments: get().tournaments.map(tournament => 
            tournament.id === tournamentId ? { ...tournament, ...updates } : tournament
          ),
          userTournaments: get().userTournaments.map(tournament => 
            tournament.id === tournamentId ? { ...tournament, ...updates } : tournament
          ),
          currentTournament: get().currentTournament?.id === tournamentId 
            ? { ...get().currentTournament!, ...updates }
            : get().currentTournament,
        });
      },

      updateMatchLocally: (matchId: string, updates: Partial<TournamentMatch>) => {
        set({
          tournamentMatches: get().tournamentMatches.map(match => 
            match._id === matchId ? { ...match, ...updates } : match
          ),
        });
      },

      addTournamentLocally: (tournament: Tournament) => {
        set({
          tournaments: [tournament, ...get().tournaments],
        });
      },

      removeTournamentLocally: (tournamentId: string) => {
        set({
          tournaments: get().tournaments.filter(tournament => tournament.id !== tournamentId),
          userTournaments: get().userTournaments.filter(tournament => tournament.id !== tournamentId),
          currentTournament: get().currentTournament?.id === tournamentId ? null : get().currentTournament,
        });
      },

      setFilters: (filters: Partial<TournamentState['filters']>) => {
        set({ filters: { ...get().filters, ...filters } });
      },

      clearFilters: () => {
        set({ filters: {} });
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },
    }),
    {
      name: 'tournament-storage',
      storage: Platform.select({
        web: {
          getItem: (name: string) => {
            const item = localStorage.getItem(name);
            return item ? JSON.parse(item) : null;
          },
          setItem: (name: string, value: any) => {
            localStorage.setItem(name, JSON.stringify(value));
          },
          removeItem: (name: string) => {
            localStorage.removeItem(name);
          },
        },
        default: {
          getItem: async (name: string) => {
            const item = await AsyncStorage.getItem(name);
            return item ? JSON.parse(item) : null;
          },
          setItem: async (name: string, value: any) => {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          },
          removeItem: async (name: string) => {
            await AsyncStorage.removeItem(name);
          },
        },
      }),
      partialize: (state) => ({
        userTournaments: state.userTournaments,
        currentTournament: state.currentTournament,
        filters: state.filters,
        lastFetch: state.lastFetch,
      }),
    }
  )
);