import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { apiClient } from '@/lib/api';
import { storage } from '@/lib/storage';
import { queryKeys } from '@/lib/react-query/query-keys';
import { logger } from '@/lib/monitoring/logger';
import { errorHandler, ErrorType } from '@/lib/api/error-handler';
import * as Crypto from 'expo-crypto';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  emailVerified: boolean;
  preferences: {
    notifications: boolean;
    newsletter: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
  newsletter?: boolean;
  deviceInfo?: string;
}

// Helper function to generate device info
async function getDeviceInfo(): Promise<string> {
  if (Platform.OS === 'web') {
    return `Web - ${navigator.userAgent.split(' ')[0]}`;
  } else {
    const deviceId = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Platform.OS}-${Platform.Version}-${Date.now()}`
    );
    return `${Platform.OS} - ${deviceId.substring(0, 8)}`;
  }
}

// React Query hooks for authentication

/**
 * Get current user profile
 */
export function useUser() {
  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      const response = await apiClient.get<{ user: User }>('/auth/me');
      return response.user;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: apiClient.isAuthenticated(),
    retry: (failureCount, error) => {
      const apiError = error as any;
      // Don't retry on auth errors
      if (apiError?.type === ErrorType.AUTHENTICATION || apiError?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Get user profile with extended information
 */
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: async () => {
      const response = await apiClient.get<{ user: User }>('/auth/profile');
      return response.user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: apiClient.isAuthenticated(),
  });
}

/**
 * Get user permissions
 */
export function useUserPermissions() {
  return useQuery({
    queryKey: queryKeys.auth.permissions(),
    queryFn: async () => {
      const response = await apiClient.get<{ permissions: string[] }>('/auth/permissions');
      return response.permissions;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: apiClient.isAuthenticated(),
  });
}

/**
 * Get session information
 */
export function useSession() {
  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: async () => {
      const response = await apiClient.get<{
        session: {
          id: string;
          deviceInfo: string;
          lastActive: string;
          expiresAt: string;
        };
      }>('/auth/session');
      return response.session;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: apiClient.isAuthenticated(),
  });
}

/**
 * Login mutation with optimistic updates
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const deviceInfo = await getDeviceInfo();
      const response = await apiClient.post<{
        user: User;
        tokens: AuthTokens;
      }>('/auth/login', {
        ...credentials,
        deviceInfo,
      });

      // Store tokens
      await apiClient.setTokens(response.tokens);

      return response;
    },
    onSuccess: (data) => {
      // Update user cache
      queryClient.setQueryData(queryKeys.auth.user(), data.user);
      
      // Invalidate all auth-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      
      // Prefetch user data
      queryClient.prefetchQuery({
        queryKey: queryKeys.auth.profile(),
        queryFn: () => apiClient.get<{ user: User }>('/auth/profile'),
      });

      logger.info('User logged in successfully', {
        userId: data.user.id,
        email: data.user.email,
      });

      // Navigate to main app
      router.replace('/(tabs)');
    },
    onError: (error) => {
      logger.error('Login failed', error);
      
      // Clear any cached auth data on login failure
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
    },
  });
}

/**
 * Register mutation with optimistic updates
 */
export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const deviceInfo = await getDeviceInfo();
      const response = await apiClient.post<{
        user: User;
        tokens: AuthTokens;
      }>('/auth/register', {
        ...credentials,
        deviceInfo,
      });

      // Store tokens
      await apiClient.setTokens(response.tokens);

      return response;
    },
    onSuccess: (data) => {
      // Update user cache
      queryClient.setQueryData(queryKeys.auth.user(), data.user);
      
      // Invalidate all auth-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });

      logger.info('User registered successfully', {
        userId: data.user.id,
        email: data.user.email,
      });

      // Navigate to main app
      router.replace('/(tabs)');
    },
    onError: (error) => {
      logger.error('Registration failed', error);
      
      // Clear any cached auth data on registration failure
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
    },
  });
}

/**
 * Logout mutation with cache cleanup
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      try {
        await apiClient.post('/auth/logout');
      } catch (error) {
        logger.warn('Logout request failed', error);
      }
      
      // Clear tokens regardless of API response
      await apiClient.clearTokens();
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      
      // Clear offline queue
      apiClient.clearOfflineQueue();

      logger.info('User logged out successfully');

      // Navigate to login
      router.replace('/(auth)/login');
    },
    onError: (error) => {
      logger.error('Logout failed', error);
      
      // Still clear cache and redirect on error
      queryClient.clear();
      router.replace('/(auth)/login');
    },
  });
}

/**
 * Update profile mutation with optimistic updates
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<User>) => {
      const response = await apiClient.patch<{ user: User }>('/auth/profile', updates);
      return response.user;
    },
    onMutate: async (updates) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.auth.user() });
      await queryClient.cancelQueries({ queryKey: queryKeys.auth.profile() });

      // Snapshot the previous value
      const previousUser = queryClient.getQueryData<User>(queryKeys.auth.user());
      const previousProfile = queryClient.getQueryData<User>(queryKeys.auth.profile());

      // Optimistically update to the new value
      if (previousUser) {
        queryClient.setQueryData(queryKeys.auth.user(), {
          ...previousUser,
          ...updates,
        });
      }
      
      if (previousProfile) {
        queryClient.setQueryData(queryKeys.auth.profile(), {
          ...previousProfile,
          ...updates,
        });
      }

      // Return a context object with the snapshotted value
      return { previousUser, previousProfile };
    },
    onError: (error, updates, context) => {
      logger.error('Profile update failed', error);
      
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.auth.user(), context.previousUser);
      }
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.auth.profile(), context.previousProfile);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile() });
    },
  });
}

/**
 * Change password mutation
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (passwords: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      const response = await apiClient.patch('/auth/change-password', passwords);
      return response;
    },
    onSuccess: () => {
      logger.info('Password changed successfully');
    },
    onError: (error) => {
      logger.error('Password change failed', error);
    },
  });
}

/**
 * Forgot password mutation
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response;
    },
    onSuccess: () => {
      logger.info('Password reset email sent');
    },
    onError: (error) => {
      logger.error('Forgot password failed', error);
    },
  });
}

/**
 * Reset password mutation
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: async (data: {
      token: string;
      password: string;
      confirmPassword: string;
    }) => {
      const response = await apiClient.post('/auth/reset-password', data);
      return response;
    },
    onSuccess: () => {
      logger.info('Password reset successful');
    },
    onError: (error) => {
      logger.error('Password reset failed', error);
    },
  });
}

/**
 * Verify email mutation
 */
export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await apiClient.post('/auth/verify-email', { token });
      return response;
    },
    onSuccess: () => {
      // Invalidate user data to refetch updated verification status
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile() });
      
      logger.info('Email verified successfully');
    },
    onError: (error) => {
      logger.error('Email verification failed', error);
    },
  });
}

/**
 * Resend verification email mutation
 */
export function useResendVerification() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/auth/resend-verification');
      return response;
    },
    onSuccess: () => {
      logger.info('Verification email resent');
    },
    onError: (error) => {
      logger.error('Resend verification failed', error);
    },
  });
}

/**
 * Refresh token mutation (usually handled automatically by API client)
 */
export function useRefreshToken() {
  return useMutation({
    mutationFn: async () => {
      // This would typically be handled by the API client automatically
      // But we can expose it for manual refresh if needed
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<AuthTokens>('/auth/refresh', {
        refreshToken,
      });

      await apiClient.setTokens(response);
      return response;
    },
    onSuccess: () => {
      logger.info('Token refreshed successfully');
    },
    onError: (error) => {
      logger.error('Token refresh failed', error);
    },
  });
}

// Utility hooks for auth state

/**
 * Check if user is authenticated
 */
export function useIsAuthenticated() {
  const { data: user, isLoading } = useUser();
  return {
    isAuthenticated: !!user && apiClient.isAuthenticated(),
    isLoading,
    user,
  };
}

/**
 * Check if user has specific permissions
 */
export function useHasPermission(permission: string) {
  const { data: permissions, isLoading } = useUserPermissions();
  return {
    hasPermission: permissions?.includes(permission) ?? false,
    isLoading,
    permissions: permissions ?? [],
  };
}

/**
 * Check if user has any of the specified permissions
 */
export function useHasAnyPermission(permissionList: string[]) {
  const { data: permissions, isLoading } = useUserPermissions();
  return {
    hasAnyPermission: permissionList.some(p => permissions?.includes(p)) ?? false,
    isLoading,
    permissions: permissions ?? [],
  };
}

/**
 * Check if user has all specified permissions
 */
export function useHasAllPermissions(permissionList: string[]) {
  const { data: permissions, isLoading } = useUserPermissions();
  return {
    hasAllPermissions: permissionList.every(p => permissions?.includes(p)) ?? false,
    isLoading,
    permissions: permissions ?? [],
  };
}

// Higher-order component for protected routes
export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useIsAuthenticated();
  const router = useRouter();

  if (!isLoading && !isAuthenticated) {
    router.replace('/(auth)/login');
  }

  return { isAuthenticated, isLoading };
}