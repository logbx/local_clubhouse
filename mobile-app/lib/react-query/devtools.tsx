import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/monitoring/logger';
import { apiClient } from '@/lib/api';

// Development-only DevTools component
export function ReactQueryDevTools() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'queries' | 'mutations' | 'cache' | 'network'>('queries');
  const queryClient = useQueryClient();

  if (!__DEV__) {
    return null;
  }

  const getQueries = () => {
    const queryCache = queryClient.getQueryCache();
    return queryCache.getAll();
  };

  const getMutations = () => {
    const mutationCache = queryClient.getMutationCache();
    return mutationCache.getAll();
  };

  const getCacheStats = () => {
    const queries = getQueries();
    const mutations = getMutations();
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      loadingQueries: queries.filter(q => q.state.status === 'pending').length,
      totalMutations: mutations.length,
      activeMutations: mutations.filter(m => m.state.status === 'pending').length,
      errorMutations: mutations.filter(m => m.state.status === 'error').length,
    };
  };

  const getNetworkStats = () => {
    return {
      isOnline: apiClient.isOnlineMode(),
      isAuthenticated: apiClient.isAuthenticated(),
      queueStats: apiClient.getQueueStats(),
    };
  };

  const renderQueries = () => {
    const queries = getQueries();
    
    return (
      <ScrollView className="flex-1 p-4">
        <Text className="text-lg font-bold mb-4">Queries ({queries.length})</Text>
        {queries.map((query, index) => (
          <View key={index} className="mb-4 p-3 bg-gray-100 rounded">
            <Text className="font-medium text-sm">
              Key: {JSON.stringify(query.queryKey)}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">
              Status: {query.state.status}
            </Text>
            <Text className="text-xs text-gray-600">
              Stale: {query.isStale() ? 'Yes' : 'No'}
            </Text>
            <Text className="text-xs text-gray-600">
              Observers: {query.getObserversCount()}
            </Text>
            <Text className="text-xs text-gray-600">
              Updated: {new Date(query.state.dataUpdatedAt).toLocaleTimeString()}
            </Text>
            {query.state.error && (
              <Text className="text-xs text-red-600 mt-1">
                Error: {(query.state.error as any)?.message || 'Unknown error'}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderMutations = () => {
    const mutations = getMutations();
    
    return (
      <ScrollView className="flex-1 p-4">
        <Text className="text-lg font-bold mb-4">Mutations ({mutations.length})</Text>
        {mutations.map((mutation, index) => (
          <View key={index} className="mb-4 p-3 bg-gray-100 rounded">
            <Text className="font-medium text-sm">
              Key: {JSON.stringify(mutation.options.mutationKey || 'No key')}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">
              Status: {mutation.state.status}
            </Text>
            <Text className="text-xs text-gray-600">
              Submitted: {new Date(mutation.state.submittedAt).toLocaleTimeString()}
            </Text>
            {mutation.state.error && (
              <Text className="text-xs text-red-600 mt-1">
                Error: {(mutation.state.error as any)?.message || 'Unknown error'}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderCache = () => {
    const stats = getCacheStats();
    
    return (
      <ScrollView className="flex-1 p-4">
        <Text className="text-lg font-bold mb-4">Cache Statistics</Text>
        <View className="bg-gray-100 p-4 rounded mb-4">
          <Text className="text-sm font-medium mb-2">Query Statistics</Text>
          <Text className="text-xs">Total Queries: {stats.totalQueries}</Text>
          <Text className="text-xs">Active Queries: {stats.activeQueries}</Text>
          <Text className="text-xs">Stale Queries: {stats.staleQueries}</Text>
          <Text className="text-xs">Error Queries: {stats.errorQueries}</Text>
          <Text className="text-xs">Loading Queries: {stats.loadingQueries}</Text>
        </View>
        
        <View className="bg-gray-100 p-4 rounded mb-4">
          <Text className="text-sm font-medium mb-2">Mutation Statistics</Text>
          <Text className="text-xs">Total Mutations: {stats.totalMutations}</Text>
          <Text className="text-xs">Active Mutations: {stats.activeMutations}</Text>
          <Text className="text-xs">Error Mutations: {stats.errorMutations}</Text>
        </View>

        <View className="flex-row space-x-2 mt-4">
          <TouchableOpacity
            onPress={() => {
              queryClient.clear();
              logger.info('Query cache cleared via DevTools');
            }}
            className="bg-red-500 px-3 py-2 rounded"
          >
            <Text className="text-white text-xs">Clear Cache</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => {
              queryClient.invalidateQueries();
              logger.info('All queries invalidated via DevTools');
            }}
            className="bg-orange-500 px-3 py-2 rounded"
          >
            <Text className="text-white text-xs">Invalidate All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => {
              queryClient.resetQueries();
              logger.info('All queries reset via DevTools');
            }}
            className="bg-blue-500 px-3 py-2 rounded"
          >
            <Text className="text-white text-xs">Reset All</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderNetwork = () => {
    const stats = getNetworkStats();
    
    return (
      <ScrollView className="flex-1 p-4">
        <Text className="text-lg font-bold mb-4">Network & API</Text>
        
        <View className="bg-gray-100 p-4 rounded mb-4">
          <Text className="text-sm font-medium mb-2">Connection Status</Text>
          <Text className="text-xs">
            Online: {stats.isOnline ? '✅ Yes' : '❌ No'}
          </Text>
          <Text className="text-xs">
            Authenticated: {stats.isAuthenticated ? '✅ Yes' : '❌ No'}
          </Text>
        </View>

        <View className="bg-gray-100 p-4 rounded mb-4">
          <Text className="text-sm font-medium mb-2">Offline Queue</Text>
          <Text className="text-xs">Total: {stats.queueStats.total}</Text>
          <Text className="text-xs">Pending: {stats.queueStats.pending}</Text>
          <Text className="text-xs">Failed: {stats.queueStats.failed}</Text>
          <Text className="text-xs">High Priority: {stats.queueStats.highPriority}</Text>
          <Text className="text-xs">Medium Priority: {stats.queueStats.mediumPriority}</Text>
          <Text className="text-xs">Low Priority: {stats.queueStats.lowPriority}</Text>
        </View>

        <View className="flex-row space-x-2 mt-4">
          <TouchableOpacity
            onPress={async () => {
              await apiClient.clearOfflineQueue();
              logger.info('Offline queue cleared via DevTools');
            }}
            className="bg-red-500 px-3 py-2 rounded"
          >
            <Text className="text-white text-xs">Clear Queue</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={async () => {
              await apiClient.processOfflineQueue();
              logger.info('Offline queue processed via DevTools');
            }}
            className="bg-green-500 px-3 py-2 rounded"
          >
            <Text className="text-white text-xs">Process Queue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'queries':
        return renderQueries();
      case 'mutations':
        return renderMutations();
      case 'cache':
        return renderCache();
      case 'network':
        return renderNetwork();
      default:
        return null;
    }
  };

  return (
    <>
      {/* DevTools Toggle Button */}
      <TouchableOpacity
        onPress={() => setIsVisible(true)}
        className="absolute top-12 right-4 bg-green-500 px-3 py-2 rounded-full shadow-lg z-50"
        style={{ elevation: 5 }}
      >
        <Text className="text-white text-xs font-bold">RQ</Text>
      </TouchableOpacity>

      {/* DevTools Modal */}
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <Text className="text-lg font-bold">React Query DevTools</Text>
            <TouchableOpacity
              onPress={() => setIsVisible(false)}
              className="bg-gray-500 px-3 py-1 rounded"
            >
              <Text className="text-white text-sm">Close</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View className="flex-row border-b border-gray-200">
            {(['queries', 'mutations', 'cache', 'network'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 ${
                  activeTab === tab ? 'border-b-2 border-blue-500' : ''
                }`}
              >
                <Text className={`text-center text-sm ${
                  activeTab === tab ? 'text-blue-500 font-medium' : 'text-gray-600'
                }`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          {renderTabContent()}
        </View>
      </Modal>
    </>
  );
}

// Performance monitoring component
export function QueryPerformanceMonitor() {
  const queryClient = useQueryClient();
  const [metrics, setMetrics] = useState<any>({});

  useEffect(() => {
    if (!__DEV__) return;

    const interval = setInterval(() => {
      const stats = {
        queryCount: queryClient.getQueryCache().getAll().length,
        mutationCount: queryClient.getMutationCache().getAll().length,
        timestamp: Date.now(),
      };
      
      setMetrics(stats);
      
      // Log performance metrics
      logger.debug('Query Performance Metrics', stats);
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  if (!__DEV__) {
    return null;
  }

  return (
    <View className="absolute bottom-4 left-4 bg-black bg-opacity-75 px-2 py-1 rounded">
      <Text className="text-white text-xs">
        Q: {metrics.queryCount || 0} | M: {metrics.mutationCount || 0}
      </Text>
    </View>
  );
}

// Query Inspector for debugging specific queries
export function QueryInspector({ queryKey }: { queryKey: readonly string[] }) {
  const queryClient = useQueryClient();
  const query = queryClient.getQueryCache().find({ queryKey });

  if (!__DEV__ || !query) {
    return null;
  }

  return (
    <View className="bg-yellow-100 p-2 m-2 rounded">
      <Text className="text-xs font-bold">Query Inspector</Text>
      <Text className="text-xs">Key: {JSON.stringify(queryKey)}</Text>
      <Text className="text-xs">Status: {query.state.status}</Text>
      <Text className="text-xs">Stale: {query.isStale() ? 'Yes' : 'No'}</Text>
      <Text className="text-xs">Observers: {query.getObserversCount()}</Text>
      {query.state.error && (
        <Text className="text-xs text-red-600">
          Error: {(query.state.error as any)?.message}
        </Text>
      )}
    </View>
  );
}

// Query debugging utilities
export const queryDebugUtils = {
  logQuery: (queryKey: readonly string[]) => {
    if (!__DEV__) return;
    
    const queryClient = (global as any).__REACT_QUERY_CLIENT__;
    if (!queryClient) return;
    
    const query = queryClient.getQueryCache().find({ queryKey });
    if (query) {
      logger.debug('Query Debug Info', {
        queryKey,
        state: query.state,
        options: query.options,
        observers: query.getObserversCount(),
      });
    }
  },
  
  logAllQueries: () => {
    if (!__DEV__) return;
    
    const queryClient = (global as any).__REACT_QUERY_CLIENT__;
    if (!queryClient) return;
    
    const queries = queryClient.getQueryCache().getAll();
    logger.debug('All Queries Debug Info', {
      queries: queries.map(q => ({
        queryKey: q.queryKey,
        status: q.state.status,
        stale: q.isStale(),
        observers: q.getObserversCount(),
      })),
    });
  },
  
  invalidateQuery: (queryKey: readonly string[]) => {
    if (!__DEV__) return;
    
    const queryClient = (global as any).__REACT_QUERY_CLIENT__;
    if (!queryClient) return;
    
    queryClient.invalidateQueries({ queryKey });
    logger.debug('Query invalidated via debug utils', { queryKey });
  },
};