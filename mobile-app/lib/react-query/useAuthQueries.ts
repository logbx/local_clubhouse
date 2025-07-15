// Auth-related React Query hooks
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '../api-client-mobile';
import { queryKeys } from './query-keys';
import { storage } from '../storage';

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
  confirmPassword: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Auth query hooks
export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await api.post<{ user: User; tokens: AuthTokens }>('/auth/login', credentials);
      
      // Store tokens
      await storage.setAccessToken(response.data.tokens.accessToken);
      await storage.setRefreshToken(response.data.tokens.refreshToken);
      await storage.set('current_user', response.data.user);
      
      return response.data;
    },
    onSuccess: (data) => {
      // Update auth queries
      queryClient.setQueryData(queryKeys.auth.user, data.user);
      queryClient.setQueryData(queryKeys.auth.tokens, data.tokens);
      
      // Invalidate auth-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      
      // Navigate to main app
      router.replace('/(tabs)/');
    },
    onError: (error) => {
      console.error('Login failed:', error);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const response = await api.post<{ user: User; tokens: AuthTokens }>('/auth/register', credentials);
      
      // Store tokens
      await storage.setAccessToken(response.data.tokens.accessToken);
      await storage.setRefreshToken(response.data.tokens.refreshToken);
      await storage.set('current_user', response.data.user);
      
      return response.data;
    },
    onSuccess: (data) => {
      // Update auth queries
      queryClient.setQueryData(queryKeys.auth.user, data.user);
      queryClient.setQueryData(queryKeys.auth.tokens, data.tokens);
      
      // Invalidate auth-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      
      // Navigate to main app
      router.replace('/(tabs)/');
    },
    onError: (error) => {
      console.error('Registration failed:', error);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        // Continue with logout even if API call fails
        console.warn('Logout API call failed:', error);
      }
      
      // Clear stored tokens and user data
      await storage.removeAccessToken();
      await storage.removeRefreshToken();
      await storage.remove('current_user');
    },
    onSuccess: () => {
      // Clear all auth-related queries
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
      queryClient.clear();
      
      // Navigate to login
      router.replace('/(auth)/login');
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      const response = await api.post('/auth/change-password', data);
      return response.data;
    },
    onSuccess: () => {
      // Optionally show success message
    },
    onError: (error) => {
      console.error('Change password failed:', error);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    },
    onError: (error) => {
      console.error('Forgot password failed:', error);
    },
  });
}

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const response = await api.post('/auth/reset-password', data);
      return response.data;
    },
    onSuccess: () => {
      // Navigate to login after successful reset
      router.replace('/(auth)/login');
    },
    onError: (error) => {
      console.error('Reset password failed:', error);
    },
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post('/auth/verify-email', { token });
      return response.data;
    },
    onSuccess: (data) => {
      // Update user data with verified status
      queryClient.setQueryData(queryKeys.auth.user, (oldUser: User | undefined) => {
        if (oldUser) {
          return { ...oldUser, emailVerified: true };
        }
        return oldUser;
      });
    },
    onError: (error) => {
      console.error('Email verification failed:', error);
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await api.post('/auth/resend-verification', { email });
      return response.data;
    },
    onError: (error) => {
      console.error('Resend verification failed:', error);
    },
  });
}

export function useRefreshToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post<{ tokens: AuthTokens }>('/auth/refresh', {
        refreshToken,
      });

      // Store new tokens
      await storage.setAccessToken(response.data.tokens.accessToken);
      await storage.setRefreshToken(response.data.tokens.refreshToken);

      return response.data.tokens;
    },
    onSuccess: (tokens) => {
      // Update token query
      queryClient.setQueryData(queryKeys.auth.tokens, tokens);
    },
    onError: async (error) => {
      console.error('Token refresh failed:', error);
      
      // Clear stored tokens on refresh failure
      await storage.removeAccessToken();
      await storage.removeRefreshToken();
      await storage.remove('current_user');
      
      // Clear queries and redirect to login
      queryClient.clear();
    },
  });
}

// Utility hooks
export function useIsAuthenticated(): boolean {
  const { data: user } = useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      const user = await storage.get<User>('current_user');
      const token = await storage.getAccessToken();
      
      if (!user || !token) {
        return null;
      }
      
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  return !!user;
}

export function useHasPermission(permission: string): boolean {
  const { data: user } = useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      const user = await storage.get<User>('current_user');
      return user;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return user?.permissions?.includes(permission) || false;
}

export function useHasAnyPermission(permissions: string[]): boolean {
  const { data: user } = useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      const user = await storage.get<User>('current_user');
      return user;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return permissions.some(permission => user?.permissions?.includes(permission)) || false;
}

export function useHasAllPermissions(permissions: string[]): boolean {
  const { data: user } = useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      const user = await storage.get<User>('current_user');
      return user;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return permissions.every(permission => user?.permissions?.includes(permission)) || false;
}

export function useRequireAuth(): { user: User | null; isLoading: boolean } {
  const router = useRouter();
  
  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      const user = await storage.get<User>('current_user');
      const token = await storage.getAccessToken();
      
      if (!user || !token) {
        return null;
      }
      
      return user;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Redirect to login if not authenticated
  if (!isLoading && !user) {
    router.replace('/(auth)/login');
  }

  return { user, isLoading };
}