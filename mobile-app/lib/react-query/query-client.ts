import { QueryClient, QueryClientConfig, MutationCache, QueryCache } from '@tanstack/react-query';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { errorHandler, ErrorType } from '../api/error-handler';
import { logger } from '../monitoring/logger';
import { storage } from '../storage';

// Enhanced QueryClient configuration with offline support and error handling
export function createQueryClient(): QueryClient {
  const defaultOptions: QueryClientConfig['defaultOptions'] = {
    queries: {
      // Stale time configuration
      staleTime: 5 * 60 * 1000, // 5 minutes default
      
      // Cache time (how long inactive queries stay in memory)
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
      
      // Retry configuration with intelligent error handling
      retry: (failureCount, error) => {
        // Type-safe error handling
        const apiError = error as any;
        
        // Don't retry on authentication errors
        if (apiError?.type === ErrorType.AUTHENTICATION || apiError?.status === 401) {
          return false;
        }
        
        // Don't retry on client errors (4xx)
        if (apiError?.status >= 400 && apiError?.status < 500) {
          return false;
        }
        
        // Don't retry validation errors
        if (apiError?.type === ErrorType.VALIDATION) {
          return false;
        }
        
        // Retry network and server errors with exponential backoff
        if (apiError?.type === ErrorType.NETWORK || 
            apiError?.type === ErrorType.TIMEOUT ||
            apiError?.type === ErrorType.SERVER ||
            (apiError?.status >= 500)) {
          return failureCount < 3;
        }
        
        return failureCount < 2;
      },
      
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Network mode configuration
      networkMode: 'offlineFirst',
      
      // Refetch configuration
      refetchOnWindowFocus: Platform.OS === 'web',
      refetchOnMount: true,
      refetchOnReconnect: true,
      
      // Error handling
      throwOnError: false,
      
      // Enable query optimization
      structuralSharing: true,
      
      // Query function timeout
      queryFn: undefined, // Will be set per query
    },
    
    mutations: {
      // Don't retry mutations by default
      retry: false,
      
      // Network mode for mutations
      networkMode: 'online',
      
      // Mutation timeout
      mutationFn: undefined,
      
      // Error handling for mutations
      throwOnError: false,
    },
  };

  // Enhanced Query Cache with detailed error handling
  const queryCache = new QueryCache({
    onError: (error, query) => {
      logger.error('Query Error', {
        queryKey: query.queryKey,
        error: error.message,
        queryHash: query.queryHash,
        state: query.state,
      });
      
      // Handle specific error types
      const apiError = error as any;
      if (apiError?.type === ErrorType.AUTHENTICATION) {
        // Trigger auth refresh or redirect to login
        logger.warn('Authentication error in query, may need to refresh auth');
      }
    },
    
    onSuccess: (data, query) => {
      logger.debug('Query Success', {
        queryKey: query.queryKey,
        dataType: typeof data,
        queryHash: query.queryHash,
      });
    },
    
    onSettled: (data, error, query) => {
      // Log query performance metrics
      const duration = Date.now() - (query.state.dataUpdatedAt || query.state.dataUpdatedAt || 0);
      
      logger.debug('Query Settled', {
        queryKey: query.queryKey,
        success: !error,
        duration,
        cacheTime: query.options.gcTime,
        staleTime: query.options.staleTime,
      });
    },
  });

  // Enhanced Mutation Cache with optimistic updates and rollback
  const mutationCache = new MutationCache({
    onError: (error, variables, context, mutation) => {
      logger.error('Mutation Error', {
        mutationKey: mutation.options.mutationKey,
        error: error.message,
        variables,
        context,
      });
      
      // Rollback optimistic updates on error
      if (context && typeof context === 'object' && 'rollback' in context) {
        const rollbackFn = (context as any).rollback;
        if (typeof rollbackFn === 'function') {
          try {
            rollbackFn();
            logger.info('Rollback executed successfully');
          } catch (rollbackError) {
            logger.error('Rollback failed', rollbackError);
          }
        }
      }
    },
    
    onSuccess: (data, variables, context, mutation) => {
      logger.debug('Mutation Success', {
        mutationKey: mutation.options.mutationKey,
        variables,
        dataType: typeof data,
      });
    },
    
    onSettled: (data, error, variables, context, mutation) => {
      const duration = Date.now() - mutation.state.submittedAt;
      
      logger.debug('Mutation Settled', {
        mutationKey: mutation.options.mutationKey,
        success: !error,
        duration,
        variables,
      });
    },
  });

  // Create QueryClient with enhanced configuration
  const queryClient = new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions,
  });

  // Set up network status monitoring
  setupNetworkMonitoring(queryClient);
  
  // Set up query persistence for offline support
  setupQueryPersistence(queryClient);

  return queryClient;
}

// Network monitoring setup
function setupNetworkMonitoring(queryClient: QueryClient) {
  NetInfo.addEventListener((state) => {
    const isOnline = state.isConnected ?? false;
    
    logger.info('Network status changed', {
      isOnline,
      type: state.type,
      details: state.details,
    });
    
    if (isOnline) {
      // Resume queries when back online
      queryClient.resumePausedMutations();
      queryClient.invalidateQueries();
      
      logger.info('Resumed queries after network reconnection');
    } else {
      logger.info('Network offline, queries will be paused');
    }
  });
}

// Query persistence for offline support
function setupQueryPersistence(queryClient: QueryClient) {
  // Persist critical queries for offline access
  const persistQuery = async (queryKey: string[], data: any) => {
    try {
      const key = `query_cache_${queryKey.join('_')}`;
      await storage.set(key, {
        data,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Failed to persist query', { queryKey, error });
    }
  };

  // Restore persisted queries on startup
  const restorePersistedQueries = async () => {
    try {
      // This would be implemented based on your specific persistence needs
      logger.debug('Query persistence restoration started');
    } catch (error) {
      logger.error('Failed to restore persisted queries', error);
    }
  };

  // Initialize persistence
  restorePersistedQueries();
}

// Query client utilities
export const queryClientUtils = {
  // Invalidate all queries for an entity
  invalidateEntity: (queryClient: QueryClient, entityKey: readonly string[]) => {
    return queryClient.invalidateQueries({ queryKey: entityKey });
  },
  
  // Remove all queries for an entity
  removeEntityQueries: (queryClient: QueryClient, entityKey: readonly string[]) => {
    return queryClient.removeQueries({ queryKey: entityKey });
  },
  
  // Reset all queries for an entity
  resetEntityQueries: (queryClient: QueryClient, entityKey: readonly string[]) => {
    return queryClient.resetQueries({ queryKey: entityKey });
  },
  
  // Prefetch with error handling
  safePrefetch: async (
    queryClient: QueryClient,
    queryKey: readonly string[],
    queryFn: () => Promise<any>,
    options?: any
  ) => {
    try {
      await queryClient.prefetchQuery({
        queryKey,
        queryFn,
        ...options,
      });
      logger.debug('Query prefetched successfully', { queryKey });
    } catch (error) {
      logger.warn('Query prefetch failed', { queryKey, error });
    }
  },
  
  // Get query data with fallback
  getQueryDataWithFallback: <T>(
    queryClient: QueryClient,
    queryKey: readonly string[],
    fallback: T
  ): T => {
    const data = queryClient.getQueryData<T>(queryKey);
    return data ?? fallback;
  },
  
  // Set query data with validation
  setQueryDataSafe: <T>(
    queryClient: QueryClient,
    queryKey: readonly string[],
    data: T | ((old: T | undefined) => T),
    validator?: (data: T) => boolean
  ) => {
    try {
      const result = queryClient.setQueryData(queryKey, data);
      
      if (validator && !validator(result as T)) {
        logger.warn('Query data validation failed', { queryKey });
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to set query data', { queryKey, error });
      return false;
    }
  },
  
  // Optimistic update with rollback
  optimisticUpdate: <T>(
    queryClient: QueryClient,
    queryKey: readonly string[],
    updater: (old: T | undefined) => T,
    validator?: (data: T) => boolean
  ) => {
    const previousData = queryClient.getQueryData<T>(queryKey);
    
    const rollback = () => {
      queryClient.setQueryData(queryKey, previousData);
    };
    
    try {
      const newData = updater(previousData);
      
      if (validator && !validator(newData)) {
        logger.warn('Optimistic update validation failed', { queryKey });
        return { success: false, rollback };
      }
      
      queryClient.setQueryData(queryKey, newData);
      return { success: true, rollback };
    } catch (error) {
      logger.error('Optimistic update failed', { queryKey, error });
      return { success: false, rollback };
    }
  },
};

// Development tools setup
export const setupDevTools = (queryClient: QueryClient) => {
  if (__DEV__) {
    // Enable React Query DevTools for development
    logger.info('React Query DevTools enabled for development');
    
    // Add global query client for debugging
    if (typeof global !== 'undefined') {
      (global as any).__REACT_QUERY_CLIENT__ = queryClient;
    }
  }
};

// Export singleton instance
export const queryClient = createQueryClient();

// Setup dev tools
setupDevTools(queryClient);