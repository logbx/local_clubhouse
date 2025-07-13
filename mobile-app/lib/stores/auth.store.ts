import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api-client-new';
import type { User, AuthState, LoginCredentials, RegisterCredentials, AuthResponse } from '../db/types';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,

      // Actions
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.login(
            credentials.email || credentials.username!,
            credentials.password,
            credentials.rememberMe
          );

          set({
            user: response.user,
            token: response.accessToken || response.token,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Login failed',
          });
          throw error;
        }
      },

      register: async (credentials: RegisterCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.register(
            credentials.fullName,
            credentials.email,
            credentials.password,
            credentials.agreeToTerms
          );

          // Auto-login after registration if tokens are provided
          if (response.accessToken || response.token) {
            set({
              user: response.user,
              token: response.accessToken || response.token,
              refreshToken: response.refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Registration failed',
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          await apiClient.logout();
        } catch (error) {
          console.warn('Logout request failed:', error);
        } finally {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshToken: async () => {
        const { refreshToken: currentRefreshToken } = get();
        
        if (!currentRefreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await apiClient.post('/auth/refresh', {
            refreshToken: currentRefreshToken,
          });

          set({
            token: response.accessToken || response.token,
            refreshToken: response.refreshToken,
            user: response.user || get().user,
            error: null,
          });
        } catch (error: any) {
          // If refresh fails, log out
          await get().logout();
          throw error;
        }
      },

      updateProfile: async (updates: Partial<User>) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.updateProfile(updates);
          
          set({
            user: response.user || { ...get().user, ...updates },
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Profile update failed',
          });
          throw error;
        }
      },

      checkAuthStatus: async () => {
        const { token, refreshToken: currentRefreshToken } = get();
        
        if (!token) {
          set({
            isAuthenticated: false,
            isLoading: false,
            user: null,
          });
          return;
        }

        set({ isLoading: true });

        try {
          // Try to get current user profile
          const response = await apiClient.getProfile();
          
          set({
            user: response.user || response,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          // If profile fetch fails due to expired token, try refresh
          if (error.code === 'UNAUTHORIZED' && currentRefreshToken) {
            try {
              await get().refreshToken();
              // Retry getting profile
              const response = await apiClient.getProfile();
              set({
                user: response.user || response,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } catch (refreshError) {
              // Refresh failed, logout
              await get().logout();
            }
          } else {
            // Other error, logout
            await get().logout();
          }
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
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
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);