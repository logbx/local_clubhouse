import { View, Text, TextInput, TouchableOpacity, FlatList, RefreshControl, Platform, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client-mobile';
import { useState, useMemo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ClubCard } from '@/components/club/ClubCard';
import { useDebounce } from '@/hooks/useDebounce';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'gaming', label: 'Gaming' },
  { key: 'sports', label: 'Sports' },
  { key: 'technology', label: 'Tech' },
  { key: 'music', label: 'Music' },
  { key: 'art', label: 'Art' },
  { key: 'education', label: 'Education' },
  { key: 'business', label: 'Business' },
  { key: 'social', label: 'Social' },
  { key: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'popular', label: 'Popular' },
  { key: 'active', label: 'Most Active' },
  { key: 'name', label: 'Name' },
];

export default function ClubListScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [refreshing, setRefreshing] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['clubs', debouncedSearch, selectedCategory, sortBy],
    queryFn: ({ pageParam = 1 }) =>
      api.getClubs({
        page: pageParam,
        limit: 20,
        search: debouncedSearch || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        sortBy,
      }),
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const clubs = useMemo(() => {
    return data?.pages.flatMap(page => page.clubs) || [];
  }, [data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCreateClub = () => {
    router.push('/clubs/create');
  };

  const renderClubItem = useCallback(({ item }: { item: any }) => (
    <ClubCard key={item._id} club={item} />
  ), []);

  const renderHeader = () => (
    <View className="p-4">
      {/* Search Bar */}
      <View className="mb-4">
        <View className="relative">
          <TextInput
            className="input pl-10 pr-4"
            placeholder="Search clubs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          <Ionicons
            name="search-outline"
            size={20}
            color="#6b7280"
            className="absolute left-3 top-2.5"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              className="absolute right-3 top-2.5"
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Categories
        </Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`mr-2 px-4 py-2 rounded-full border ${
                selectedCategory === item.key
                  ? 'bg-primary-600 border-primary-600'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
              }`}
              onPress={() => setSelectedCategory(item.key)}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedCategory === item.key
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Sort Options */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sort by
        </Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SORT_OPTIONS}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`mr-2 px-3 py-1.5 rounded-md ${
                sortBy === item.key
                  ? 'bg-primary-100 dark:bg-primary-900'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
              onPress={() => setSortBy(item.key)}
            >
              <Text
                className={`text-xs font-medium ${
                  sortBy === item.key
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Results Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          {debouncedSearch ? `Results for "${debouncedSearch}"` : 'All Clubs'}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {data?.pages[0]?.pagination.total || 0} clubs
        </Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;

    return (
      <View className="py-4 items-center">
        <Text className="text-gray-500 dark:text-gray-400">Loading more clubs...</Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <Ionicons name="people-outline" size={64} color="#9ca3af" />
      <Text className="text-lg font-medium text-gray-900 dark:text-white mt-4 mb-2">
        {debouncedSearch ? 'No clubs found' : 'No clubs yet'}
      </Text>
      <Text className="text-gray-500 dark:text-gray-400 text-center px-8 mb-6">
        {debouncedSearch
          ? 'Try adjusting your search or filters'
          : 'Be the first to create a club and start building your community'}
      </Text>
      {!debouncedSearch && (
        <TouchableOpacity
          className="btn btn-primary"
          onPress={handleCreateClub}
        >
          <Text className="text-white font-semibold">Create First Club</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text className="text-lg font-medium text-gray-900 dark:text-white mt-4 mb-2">
          Failed to load clubs
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-center mb-6">
          Please check your connection and try again
        </Text>
        <TouchableOpacity
          className="btn btn-primary"
          onPress={() => refetch()}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FlatList
        data={clubs}
        keyExtractor={(item) => item._id}
        renderItem={renderClubItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0ea5e9']}
            tintColor="#0ea5e9"
          />
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Platform.OS === 'ios' ? 100 : 80,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button (Mobile) */}
      {Platform.OS !== 'web' && (
        <TouchableOpacity
          className="absolute bottom-6 right-6 w-14 h-14 bg-primary-600 rounded-full items-center justify-center shadow-lg"
          onPress={handleCreateClub}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 8,
          }}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      )}

      {/* Create Button (Web) */}
      {Platform.OS === 'web' && (
        <View className="absolute top-4 right-4">
          <TouchableOpacity
            className="btn btn-primary"
            onPress={handleCreateClub}
          >
            <View className="flex-row items-center">
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Create Club</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}