// React Query Integration - Main exports
// Enhanced configuration with offline-first architecture and TDD support

// Core Query Client
export { queryClient, createQueryClient, queryClientUtils, setupDevTools } from './query-client';

// Query Keys Management
export { queryKeys, matchesQueryKey, isValidQueryKey } from './query-keys';
export type { 
  QueryKey, 
  AuthQueryKey, 
  ClubQueryKey, 
  EventQueryKey, 
  TournamentQueryKey 
} from './query-keys';

// Enhanced Auth Hooks
export {
  // Data hooks
  useUser,
  useProfile, 
  useUserPermissions,
  useSession,
  
  // Mutation hooks
  useLogin,
  useRegister,
  useLogout,
  useUpdateProfile,
  useChangePassword,
  useForgotPassword,
  useResetPassword,
  useVerifyEmail,
  useResendVerification,
  useRefreshToken,
  
  // Utility hooks
  useIsAuthenticated,
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
  useRequireAuth,
} from './useAuthQueries';

export type {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
} from './useAuthQueries';

// Error Boundary Components
export {
  ErrorBoundary,
  QueryErrorBoundary,
  AuthErrorBoundary,
  NetworkErrorBoundary,
  RetryButton,
  LoadingErrorWrapper,
} from '../components/ErrorBoundary';

// Development Tools
export {
  ReactQueryDevTools,
  QueryPerformanceMonitor,
  QueryInspector,
  queryDebugUtils,
} from './devtools';

// Test Utilities (for testing environment)
export {
  createMockUser,
  createMockClub,
  createMockEvent,
  createMockTournament,
  createMockApiResponse,
  createMockPaginatedResponse,
  createTestQueryClient,
  createTestWrapper,
  createMockApiClient,
  queryStateMatchers,
  testScenarios,
  testHelpers,
} from './test-utils';

export type {
  MockApiClient,
  TestQueryClient,
  TestWrapper,
} from './test-utils';

// Re-export commonly used React Query hooks and utilities
export {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useSuspenseQuery,
  useSuspenseInfiniteQuery,
  QueryClient,
  QueryClientProvider,
  useIsFetching,
  useIsMutating,
  useIsRestoring,
} from '@tanstack/react-query';

// Enhanced hook patterns and utilities

/**
 * Custom hook for paginated queries with infinite scroll support
 */
export function usePaginatedQuery<T>({
  queryKey,
  queryFn,
  getNextPageParam,
  getPreviousPageParam,
  initialPageParam = 1,
  ...options
}: any) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = initialPageParam }) => queryFn({ page: pageParam }),
    getNextPageParam: getNextPageParam || ((lastPage: any) => {
      const { pagination } = lastPage;
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined;
    }),
    getPreviousPageParam: getPreviousPageParam || ((firstPage: any) => {
      const { pagination } = firstPage;
      return pagination.page > 1 ? pagination.page - 1 : undefined;
    }),
    initialPageParam,
    ...options,
  });
}

/**
 * Custom hook for optimistic mutations with rollback support
 */
export function useOptimisticMutation<TData, TError, TVariables, TContext>({
  mutationFn,
  onMutate,
  onError,
  onSuccess,
  onSettled,
  ...options
}: any) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      // Run custom onMutate first
      const context = onMutate ? await onMutate(variables) : undefined;
      
      // Return context for rollback
      return { ...context, rollback: context?.rollback };
    },
    onError: (error: TError, variables: TVariables, context: TContext) => {
      // Execute rollback if available
      if (context && typeof context === 'object' && 'rollback' in context) {
        const rollbackFn = (context as any).rollback;
        if (typeof rollbackFn === 'function') {
          rollbackFn();
        }
      }
      
      // Run custom onError
      if (onError) {
        onError(error, variables, context);
      }
    },
    onSuccess,
    onSettled,
    ...options,
  });
}

/**
 * Custom hook for cached queries with automatic refresh
 */
export function useCachedQuery<T>({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000, // 5 minutes
  gcTime = 10 * 60 * 1000, // 10 minutes
  refetchInterval,
  enabled = true,
  ...options
}: any) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime,
    gcTime,
    refetchInterval,
    enabled,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    ...options,
  });
}

/**
 * Custom hook for real-time queries with WebSocket integration
 */
export function useRealtimeQuery<T>({
  queryKey,
  queryFn,
  subscriptionKey,
  onUpdate,
  ...options
}: any) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey,
    queryFn,
    ...options,
  });

  // TODO: Integrate with WebSocket service
  // This would subscribe to real-time updates and invalidate/update the query
  
  return query;
}

/**
 * Hook for managing query dependencies
 */
export function useDependentQuery<T>({
  queryKey,
  queryFn,
  dependsOn,
  ...options
}: any) {
  const enabled = Array.isArray(dependsOn) 
    ? dependsOn.every(dep => dep !== undefined && dep !== null)
    : dependsOn !== undefined && dependsOn !== null;

  return useQuery({
    queryKey,
    queryFn,
    enabled: enabled && (options.enabled !== false),
    ...options,
  });
}

/**
 * Hook for prefetching related queries
 */
export function usePrefetchQueries(queries: Array<{
  queryKey: readonly string[];
  queryFn: () => Promise<any>;
  staleTime?: number;
}>) {
  const queryClient = useQueryClient();

  const prefetchAll = async () => {
    await Promise.all(
      queries.map(({ queryKey, queryFn, staleTime = 5 * 60 * 1000 }) =>
        queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime,
        })
      )
    );
  };

  return { prefetchAll };
}

// Query configuration constants
export const QUERY_CONFIG = {
  STALE_TIME: {
    SHORT: 30 * 1000, // 30 seconds
    MEDIUM: 5 * 60 * 1000, // 5 minutes
    LONG: 15 * 60 * 1000, // 15 minutes
    VERY_LONG: 60 * 60 * 1000, // 1 hour
  },
  GC_TIME: {
    SHORT: 5 * 60 * 1000, // 5 minutes
    MEDIUM: 10 * 60 * 1000, // 10 minutes
    LONG: 30 * 60 * 1000, // 30 minutes
  },
  RETRY: {
    DEFAULT: 2,
    AGGRESSIVE: 3,
    CONSERVATIVE: 1,
    NONE: 0,
  },
} as const;