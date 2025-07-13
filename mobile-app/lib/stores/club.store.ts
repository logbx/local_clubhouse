import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api-client-new';
import type { Club, ClubWithRelations, ClubMember, StoreState, PaginatedResponse } from '../db/types';

interface ClubState extends StoreState {
  // Data
  clubs: Club[];
  userClubs: Club[];
  currentClub: ClubWithRelations | null;
  clubMembers: ClubMember[];
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
}

interface ClubActions {
  // Club operations
  fetchClubs: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sortBy?: string;
    location?: string;
  }) => Promise<void>;
  fetchUserClubs: () => Promise<void>;
  fetchClub: (username: string) => Promise<void>;
  createClub: (clubData: Partial<Club>) => Promise<Club>;
  updateClub: (username: string, updates: Partial<Club>) => Promise<void>;
  deleteClub: (username: string) => Promise<void>;
  joinClub: (username: string) => Promise<void>;
  leaveClub: (username: string) => Promise<void>;
  
  // Member operations
  fetchClubMembers: (username: string, params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }) => Promise<void>;
  addClubMember: (username: string, memberData: { email: string; role?: string }) => Promise<void>;
  updateClubMember: (username: string, memberId: string, updates: { role: string }) => Promise<void>;
  removeClubMember: (username: string, memberId: string) => Promise<void>;
  
  // Local state management
  setCurrentClub: (club: ClubWithRelations | null) => void;
  updateClubLocally: (clubId: string, updates: Partial<Club>) => void;
  addClubLocally: (club: Club) => void;
  removeClubLocally: (clubId: string) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useClubStore = create<ClubState & ClubActions>()(
  persist(
    (set, get) => ({
      // Initial state
      clubs: [],
      userClubs: [],
      currentClub: null,
      clubMembers: [],
      pagination: null,
      loading: false,
      error: null,
      lastFetch: null,
      isOnline: true,

      // Club operations
      fetchClubs: async (params = {}) => {
        set({ loading: true, error: null });
        
        try {
          const response: PaginatedResponse<Club> = await apiClient.get('/clubs', {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 5 * 60 * 1000, // 5 minutes
            body: params,
          });

          set({
            clubs: params.page === 1 ? response.data : [...get().clubs, ...response.data],
            pagination: response.pagination,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch clubs',
          });
          throw error;
        }
      },

      fetchUserClubs: async () => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.get('/clubs/user', {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 2 * 60 * 1000, // 2 minutes
          });

          set({
            userClubs: response.clubs || response,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch user clubs',
          });
          throw error;
        }
      },

      fetchClub: async (username: string) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.get(`/clubs/${username}`, {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 2 * 60 * 1000, // 2 minutes
          });

          set({
            currentClub: response.club || response,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch club',
          });
          throw error;
        }
      },

      createClub: async (clubData: Partial<Club>) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.post('/clubs', clubData, {
            queueIfOffline: true,
          });

          const newClub = response.club || response;
          
          set({
            clubs: [newClub, ...get().clubs],
            userClubs: [newClub, ...get().userClubs],
            loading: false,
          });

          return newClub;
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to create club',
          });
          throw error;
        }
      },

      updateClub: async (username: string, updates: Partial<Club>) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.put(`/clubs/${username}`, updates, {
            queueIfOffline: true,
          });

          const updatedClub = response.club || response;

          // Update in all relevant arrays
          set({
            clubs: get().clubs.map(club => 
              club.username === username ? { ...club, ...updatedClub } : club
            ),
            userClubs: get().userClubs.map(club => 
              club.username === username ? { ...club, ...updatedClub } : club
            ),
            currentClub: get().currentClub?.username === username 
              ? { ...get().currentClub!, ...updatedClub }
              : get().currentClub,
            loading: false,
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to update club',
          });
          throw error;
        }
      },

      deleteClub: async (username: string) => {
        set({ loading: true, error: null });
        
        try {
          await apiClient.delete(`/clubs/${username}`, {
            queueIfOffline: true,
          });

          set({
            clubs: get().clubs.filter(club => club.username !== username),
            userClubs: get().userClubs.filter(club => club.username !== username),
            currentClub: get().currentClub?.username === username ? null : get().currentClub,
            loading: false,
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to delete club',
          });
          throw error;
        }
      },

      joinClub: async (username: string) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.post(`/clubs/${username}/join`, {}, {
            queueIfOffline: true,
          });

          // Update member count locally
          const updatedClubs = get().clubs.map(club => 
            club.username === username 
              ? { ...club, memberCount: club.memberCount + 1 }
              : club
          );

          set({
            clubs: updatedClubs,
            loading: false,
          });

          // Refresh user clubs
          await get().fetchUserClubs();
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to join club',
          });
          throw error;
        }
      },

      leaveClub: async (username: string) => {
        set({ loading: true, error: null });
        
        try {
          await apiClient.delete(`/clubs/${username}/leave`, {
            queueIfOffline: true,
          });

          // Update member count locally
          const updatedClubs = get().clubs.map(club => 
            club.username === username 
              ? { ...club, memberCount: Math.max(0, club.memberCount - 1) }
              : club
          );

          set({
            clubs: updatedClubs,
            userClubs: get().userClubs.filter(club => club.username !== username),
            loading: false,
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to leave club',
          });
          throw error;
        }
      },

      // Member operations
      fetchClubMembers: async (username: string, params = {}) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.get(`/clubs/${username}/members`, {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 2 * 60 * 1000, // 2 minutes
            body: params,
          });

          set({
            clubMembers: response.members || response.data || response,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch club members',
          });
          throw error;
        }
      },

      addClubMember: async (username: string, memberData: { email: string; role?: string }) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.post(`/clubs/${username}/members`, memberData, {
            queueIfOffline: true,
          });

          const newMember = response.member || response;
          
          set({
            clubMembers: [newMember, ...get().clubMembers],
            loading: false,
          });

          // Update member count
          get().updateClubLocally(get().currentClub?.id || '', {
            memberCount: (get().currentClub?.memberCount || 0) + 1
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to add club member',
          });
          throw error;
        }
      },

      updateClubMember: async (username: string, memberId: string, updates: { role: string }) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.put(`/clubs/${username}/members?memberId=${memberId}`, updates, {
            queueIfOffline: true,
          });

          const updatedMember = response.member || response;
          
          set({
            clubMembers: get().clubMembers.map(member => 
              member.id === memberId ? { ...member, ...updatedMember } : member
            ),
            loading: false,
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to update club member',
          });
          throw error;
        }
      },

      removeClubMember: async (username: string, memberId: string) => {
        set({ loading: true, error: null });
        
        try {
          await apiClient.delete(`/clubs/${username}/members?memberId=${memberId}`, {
            queueIfOffline: true,
          });

          set({
            clubMembers: get().clubMembers.filter(member => member.id !== memberId),
            loading: false,
          });

          // Update member count
          get().updateClubLocally(get().currentClub?.id || '', {
            memberCount: Math.max(0, (get().currentClub?.memberCount || 0) - 1)
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to remove club member',
          });
          throw error;
        }
      },

      // Local state management
      setCurrentClub: (club: ClubWithRelations | null) => {
        set({ currentClub: club });
      },

      updateClubLocally: (clubId: string, updates: Partial<Club>) => {
        set({
          clubs: get().clubs.map(club => 
            club.id === clubId ? { ...club, ...updates } : club
          ),
          userClubs: get().userClubs.map(club => 
            club.id === clubId ? { ...club, ...updates } : club
          ),
          currentClub: get().currentClub?.id === clubId 
            ? { ...get().currentClub!, ...updates }
            : get().currentClub,
        });
      },

      addClubLocally: (club: Club) => {
        set({
          clubs: [club, ...get().clubs],
        });
      },

      removeClubLocally: (clubId: string) => {
        set({
          clubs: get().clubs.filter(club => club.id !== clubId),
          userClubs: get().userClubs.filter(club => club.id !== clubId),
          currentClub: get().currentClub?.id === clubId ? null : get().currentClub,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },
    }),
    {
      name: 'club-storage',
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
        userClubs: state.userClubs,
        currentClub: state.currentClub,
        lastFetch: state.lastFetch,
      }),
    }
  )
);