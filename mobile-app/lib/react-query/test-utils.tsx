// Test utilities for React Query with TDD support
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { logger } from '@/lib/monitoring/logger';

// Mock data factories for testing
export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.jpg',
  bio: 'Test user bio',
  emailVerified: true,
  preferences: {
    notifications: true,
    newsletter: false,
    theme: 'system' as const,
  },
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockClub = (overrides: Partial<any> = {}) => ({
  id: 'club-123',
  name: 'Test Club',
  description: 'A test club for testing purposes',
  avatar: 'https://example.com/club-avatar.jpg',
  coverImage: 'https://example.com/club-cover.jpg',
  memberCount: 42,
  location: 'Test City',
  category: 'Technology',
  isPrivate: false,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  membershipStatus: 'member' as const,
  role: 'member' as const,
  ...overrides,
});

// Mock API responses
export const createMockApiResponse = (data: any, success = true) => ({
  data,
  success,
  message: success ? 'Success' : 'Error',
  ...(success ? {} : { error: 'Mock error' }),
});

export const createMockPaginatedResponse = (
  data: any[],
  page = 1,
  limit = 20,
  total?: number
) => ({
  data,
  pagination: {
    page,
    limit,
    total: total ?? data.length,
    totalPages: Math.ceil((total ?? data.length) / limit),
  },
});

// Query client factory for tests
export const createTestQueryClient = (options: any = {}) => {
  const defaultOptions = {
    queries: {
      retry: false,
      staleTime: 0,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  };

  return new QueryClient({
    defaultOptions: { ...defaultOptions, ...options },
    logger: {
      log: logger.debug,
      warn: logger.warn,
      error: logger.error,
    },
  });
};

// Test wrapper component
export const createTestWrapper = (
  queryClient?: QueryClient,
  additionalProviders?: (children: ReactNode) => ReactNode
) => {
  const testQueryClient = queryClient || createTestQueryClient();
  
  return ({ children }: { children: ReactNode }) => {
    let wrappedChildren = children;
    
    // Apply additional providers if provided
    if (additionalProviders) {
      wrappedChildren = additionalProviders(wrappedChildren);
    }
    
    return (
      <QueryClientProvider client={testQueryClient}>
        {wrappedChildren}
      </QueryClientProvider>
    );
  };
};

// Query state matchers for testing
export const queryStateMatchers = {
  toBeLoading: (query: any) => {
    return query.state.status === 'pending';
  },
  
  toBeSuccess: (query: any) => {
    return query.state.status === 'success';
  },
  
  toBeError: (query: any) => {
    return query.state.status === 'error';
  },
  
  toBeStale: (query: any) => {
    return query.isStale();
  },
  
  toHaveObservers: (query: any, count?: number) => {
    const observerCount = query.getObserversCount();
    return count !== undefined ? observerCount === count : observerCount > 0;
  },
};

// Mock API client for testing
export const createMockApiClient = (responses: Record<string, any> = {}) => {
  const mockApiClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
    
    // Auth methods
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    refreshProfile: jest.fn(),
    
    // Club methods
    getClubs: jest.fn(),
    getClub: jest.fn(),
    joinClub: jest.fn(),
    leaveClub: jest.fn(),
    
    // Event methods
    getEvents: jest.fn(),
    getEvent: jest.fn(),
    rsvpEvent: jest.fn(),
    
    // Utility methods
    isAuthenticated: jest.fn(() => true),
    isOnlineMode: jest.fn(() => true),
    getAccessToken: jest.fn(() => 'mock-token'),
    setTokens: jest.fn(),
    clearTokens: jest.fn(),
    
    // Offline queue methods
    getQueueStats: jest.fn(() => ({
      total: 0,
      pending: 0,
      failed: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
    })),
    clearOfflineQueue: jest.fn(),
    processOfflineQueue: jest.fn(),
    
    // Error metrics
    getErrorMetrics: jest.fn(() => ({})),
  };

  // Set up default responses
  Object.entries(responses).forEach(([method, response]) => {
    if (mockApiClient[method as keyof typeof mockApiClient]) {
      (mockApiClient[method as keyof typeof mockApiClient] as jest.Mock).mockResolvedValue(response);
    }
  });

  return mockApiClient;
};

// Test scenarios for common use cases
export const testScenarios = {
  // Authentication scenarios
  authenticatedUser: () => ({
    user: createMockUser(),
    tokens: {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600,
    },
    isAuthenticated: true,
  }),
  
  unauthenticatedUser: () => ({
    user: null,
    tokens: null,
    isAuthenticated: false,
  }),
  
  // Data scenarios
  emptyList: () => ({
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  }),
  
  populatedList: (count = 5) => ({
    data: Array.from({ length: count }, (_, i) => createMockClub({ id: `club-${i}` })),
    pagination: {
      page: 1,
      limit: 20,
      total: count,
      totalPages: Math.ceil(count / 20),
    },
  }),
  
  // Error scenarios
  networkError: () => ({
    type: 'NETWORK',
    message: 'Network request failed',
    retryable: true,
  }),
  
  authError: () => ({
    type: 'AUTHENTICATION',
    message: 'Authentication failed',
    status: 401,
    retryable: false,
  }),
};

// Test helpers for common operations
export const testHelpers = {
  // Simulate network delay
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create mock error
  createMockError: (type: string, message: string, status?: number) => {
    const error = new Error(message) as any;
    error.type = type;
    error.status = status;
    return error;
  },
};

// Export test types
export type MockApiClient = ReturnType<typeof createMockApiClient>;
export type TestQueryClient = ReturnType<typeof createTestQueryClient>;
export type TestWrapper = ReturnType<typeof createTestWrapper>;