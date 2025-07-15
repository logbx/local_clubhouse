# Enhanced React Query Integration

## Overview

This enhanced React Query integration provides a comprehensive, production-ready solution with advanced patterns, offline support, and development tools specifically designed for the Local Clubhouse mobile app.

## Features

### 🚀 **Enhanced QueryClient Configuration**
- **Offline-first architecture** with intelligent network detection
- **Advanced error handling** with typed error responses
- **Automatic retry logic** with exponential backoff
- **Performance monitoring** with detailed logging
- **Circuit breaker pattern** for fault tolerance

### 🗝️ **Type-Safe Query Key Management**
- **Centralized query keys** with TypeScript support
- **Hierarchical key structure** for efficient invalidation
- **Query key factories** for consistent patterns
- **Utility functions** for cache management

### 🔐 **Authentication Integration**
- **React Query-based auth hooks** replacing context patterns
- **Automatic token refresh** handling
- **Optimistic updates** for auth state
- **Permission-based queries** with role checking

### 🛡️ **Error Boundaries & Resilience**
- **Query-specific error boundaries** for graceful failures
- **Network error handling** with offline mode support
- **Authentication error recovery** with auto-redirect
- **Retry mechanisms** with intelligent backoff

### 🔧 **Development Tools**
- **React Query DevTools** for mobile debugging
- **Performance monitoring** with real-time metrics
- **Query inspector** for development debugging
- **Debug utilities** for troubleshooting

### 🧪 **Test-Driven Development Support**
- **Comprehensive test utilities** for query testing
- **Mock factories** for consistent test data
- **Query state matchers** for assertions
- **Test scenarios** for common use cases

## Architecture

```
lib/react-query/
├── index.ts              # Main exports and utilities
├── query-client.ts       # Enhanced QueryClient configuration
├── query-keys.ts         # Type-safe query key management
├── useAuthQueries.ts     # Authentication hooks
├── devtools.tsx          # Development tools
├── test-utils.ts         # Testing utilities
└── README.md            # Documentation
```

## Usage Examples

### Basic Query with Enhanced Patterns

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys, apiClient } from '@/lib/react-query';

function useClubs(params?: { search?: string; category?: string }) {
  return useQuery({
    queryKey: queryKeys.clubs.list(params),
    queryFn: () => apiClient.getClubs(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.clubs,
  });
}
```

### Optimistic Mutations with Rollback

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, apiClient, logger } from '@/lib/react-query';

function useJoinClub() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (clubId: string) => apiClient.joinClub(clubId),
    onMutate: async (clubId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.clubs.detail(clubId) 
      });
      
      // Snapshot previous value
      const previousClub = queryClient.getQueryData(
        queryKeys.clubs.detail(clubId)
      );
      
      // Optimistic update
      queryClient.setQueryData(
        queryKeys.clubs.detail(clubId), 
        (old: any) => ({
          ...old,
          memberCount: old.memberCount + 1,
          membershipStatus: 'member',
        })
      );
      
      return { previousClub, clubId };
    },
    onError: (error, clubId, context) => {
      // Rollback on error
      if (context?.previousClub) {
        queryClient.setQueryData(
          queryKeys.clubs.detail(context.clubId), 
          context.previousClub
        );
      }
      logger.error('Failed to join club', { clubId, error });
    },
    onSettled: (data, error, clubId) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.clubs.detail(clubId) 
      });
    },
  });
}
```

### Authentication with React Query

```typescript
import { useUser, useLogin, useLogout } from '@/lib/react-query';

function AuthExample() {
  const { data: user, isLoading } = useUser();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const handleLogin = (credentials) => {
    loginMutation.mutate(credentials, {
      onSuccess: () => {
        // Navigation handled automatically
        console.log('Login successful');
      },
      onError: (error) => {
        console.error('Login failed:', error.message);
      },
    });
  };

  if (isLoading) return <Loading />;
  if (!user) return <LoginForm onSubmit={handleLogin} />;
  
  return <Dashboard user={user} onLogout={logoutMutation.mutate} />;
}
```

### Error Boundaries Usage

```typescript
import { QueryErrorBoundary, AuthErrorBoundary } from '@/lib/react-query';

function App() {
  return (
    <AuthErrorBoundary>
      <QueryErrorBoundary>
        <ClubList />
      </QueryErrorBoundary>
    </AuthErrorBoundary>
  );
}
```

### Infinite Queries with Pagination

```typescript
import { usePaginatedQuery } from '@/lib/react-query';

function useInfiniteClubs(search?: string) {
  return usePaginatedQuery({
    queryKey: queryKeys.clubs.list({ search }),
    queryFn: ({ page }) => apiClient.getClubs({ page, search }),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.page < pagination.totalPages 
        ? pagination.page + 1 
        : undefined;
    },
  });
}
```

## Query Key Patterns

### Hierarchical Structure

```typescript
// Entity-based hierarchy
queryKeys.clubs.all               // ['clubs']
queryKeys.clubs.lists()           // ['clubs', 'list']
queryKeys.clubs.list(params)      // ['clubs', 'list', params]
queryKeys.clubs.detail(id)        // ['clubs', 'detail', id]
queryKeys.clubs.members(id)       // ['clubs', 'detail', id, 'members']

// Efficient invalidation
queryClient.invalidateQueries({ 
  queryKey: queryKeys.clubs.all 
}); // Invalidates all club queries

queryClient.invalidateQueries({ 
  queryKey: queryKeys.clubs.lists() 
}); // Invalidates only list queries
```

### Query Key Utilities

```typescript
import { queryKeys } from '@/lib/react-query';

// Invalidate all queries for an entity
queryClient.invalidateQueries({ 
  queryKey: queryKeys.invalidation.invalidateEntity('clubs') 
});

// Invalidate all list queries
queryClient.invalidateQueries({ 
  queryKey: queryKeys.invalidation.invalidateEntityLists('clubs') 
});

// Invalidate specific detail
queryClient.invalidateQueries({ 
  queryKey: queryKeys.invalidation.invalidateDetail('clubs', 'club-123') 
});
```

## Development Tools

### React Query DevTools

```typescript
// Automatically enabled in development
import { ReactQueryDevTools } from '@/lib/react-query';

function App() {
  return (
    <div>
      <MainApp />
      <ReactQueryDevTools /> {/* Only shows in __DEV__ */}
    </div>
  );
}
```

### Performance Monitoring

```typescript
import { QueryPerformanceMonitor } from '@/lib/react-query';

// Shows real-time query/mutation counts
<QueryPerformanceMonitor />
```

### Debug Utilities

```typescript
import { queryDebugUtils } from '@/lib/react-query';

// Debug specific query
queryDebugUtils.logQuery(['clubs', 'club-123']);

// Debug all queries
queryDebugUtils.logAllQueries();

// Invalidate from console
queryDebugUtils.invalidateQuery(['clubs']);
```

## Testing Support

### Mock Setup

```typescript
import { 
  createTestQueryClient, 
  createTestWrapper,
  createMockApiClient,
  testScenarios 
} from '@/lib/react-query';

describe('Club Hooks', () => {
  let queryClient: TestQueryClient;
  let mockApiClient: MockApiClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    mockApiClient = createMockApiClient({
      getClubs: testScenarios.populatedList(5),
    });
  });

  it('should load clubs successfully', async () => {
    const { result } = renderHook(
      () => useClubs(),
      { wrapper: createTestWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(5);
  });
});
```

### Custom Matchers

```typescript
import { queryStateMatchers } from '@/lib/react-query';

// Jest custom matchers
expect(query).toBeQueryLoading();
expect(query).toBeQuerySuccess();
expect(query).toBeQueryError();
expect(query).toHaveQueryKey(['clubs', 'club-123']);
```

## Performance Optimizations

### Stale Time Configuration

```typescript
import { QUERY_CONFIG } from '@/lib/react-query';

// Use predefined stale times
useQuery({
  queryKey: queryKeys.clubs.detail(id),
  queryFn: () => apiClient.getClub(id),
  staleTime: QUERY_CONFIG.STALE_TIME.LONG, // 15 minutes
});
```

### Prefetching Strategies

```typescript
import { usePrefetchQueries } from '@/lib/react-query';

function useClubDetailPrefetch() {
  const { prefetchAll } = usePrefetchQueries([
    {
      queryKey: queryKeys.clubs.members(clubId),
      queryFn: () => apiClient.getClubMembers(clubId),
    },
    {
      queryKey: queryKeys.clubs.events(clubId),
      queryFn: () => apiClient.getClubEvents(clubId),
    },
  ]);

  return { prefetchRelatedData: prefetchAll };
}
```

### Cache Management

```typescript
import { queryClientUtils } from '@/lib/react-query';

// Safe cache operations
queryClientUtils.setQueryDataSafe(
  queryClient,
  queryKeys.clubs.detail(id),
  newData,
  (data) => data.id === id // Validator
);

// Optimistic updates with rollback
const { success, rollback } = queryClientUtils.optimisticUpdate(
  queryClient,
  queryKeys.clubs.detail(id),
  (old) => ({ ...old, memberCount: old.memberCount + 1 }),
  (data) => data.memberCount >= 0 // Validator
);

if (!success) {
  rollback();
}
```

## Best Practices

### 1. **Use Type-Safe Query Keys**
```typescript
// ✅ Good
queryKey: queryKeys.clubs.detail(id)

// ❌ Avoid
queryKey: ['clubs', id]
```

### 2. **Handle Loading and Error States**
```typescript
function ClubDetail({ id }: { id: string }) {
  const { data: club, isLoading, error } = useClub(id);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!club) return <NotFound />;

  return <ClubInfo club={club} />;
}
```

### 3. **Use Optimistic Updates for Better UX**
```typescript
// Always include onMutate for immediate feedback
const mutation = useMutation({
  mutationFn: updateClub,
  onMutate: async (updates) => {
    // Cancel queries and snapshot
    await queryClient.cancelQueries({ queryKey: queryKeys.clubs.detail(id) });
    const previous = queryClient.getQueryData(queryKeys.clubs.detail(id));
    
    // Optimistic update
    queryClient.setQueryData(queryKeys.clubs.detail(id), updates);
    
    return { previous };
  },
  onError: (error, updates, context) => {
    // Rollback on error
    if (context?.previous) {
      queryClient.setQueryData(queryKeys.clubs.detail(id), context.previous);
    }
  },
});
```

### 4. **Use Error Boundaries**
```typescript
// Wrap components with appropriate error boundaries
<AuthErrorBoundary>
  <QueryErrorBoundary>
    <ClubManagement />
  </QueryErrorBoundary>
</AuthErrorBoundary>
```

### 5. **Enable Offline Support**
```typescript
// Queries automatically work offline with cached data
// Mutations are queued when offline and processed when online
const mutation = useJoinClub();

// This will queue if offline and process when back online
mutation.mutate(clubId);
```

## Configuration

### Environment Variables

```typescript
// Configure API client
const apiClient = new EnhancedApiClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 30000,
  offline: {
    enableQueue: true,
    defaultPriority: QueuePriority.MEDIUM,
  },
});
```

### Query Client Options

```typescript
// Customize query client for your needs
const queryClient = createQueryClient({
  queries: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  },
  mutations: {
    retry: false,
  },
});
```

This enhanced React Query integration provides a solid foundation for building robust, offline-capable mobile applications with excellent developer experience and production-ready performance.