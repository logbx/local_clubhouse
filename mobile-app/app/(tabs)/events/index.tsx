import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  RefreshControl, 
  ActivityIndicator,
  Pressable,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useLocationContext } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { LocationCoordinates } from '@/hooks/useLocation';

interface Event {
  _id: string;
  title: string;
  shortDescription: string;
  type: string;
  startDate: string;
  endDate: string;
  location: {
    name: string;
    city: string;
    country: string;
    coordinates: [number, number];
  };
  isOnline: boolean;
  imageUrl?: string;
  capacity?: number;
  cost: {
    isFree: boolean;
    amount?: number;
    currency?: string;
  };
  organizer: {
    name: string;
    avatar?: string;
  };
  club?: {
    name: string;
    logoUrl?: string;
  };
  stats: {
    attendeeCount: number;
    interestedCount: number;
  };
  distance?: number;
  userRSVPStatus?: string;
}

interface EventFilters {
  search: string;
  type: string;
  status: 'upcoming' | 'ongoing' | 'past';
  location: string;
  radius: number;
  sortBy: 'date' | 'distance' | 'popularity';
  useLocation: boolean;
}

const EVENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'conference', label: 'Conference' },
  { value: 'social', label: 'Social' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
];

const RADIUS_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
];

export default function EventsScreen() {
  const { user } = useAuth();
  const { 
    currentLocation, 
    requestLocation, 
    isLoading: locationLoading,
    error: locationError,
  } = useLocationContext();

  const [filters, setFilters] = useState<EventFilters>({
    search: '',
    type: '',
    status: 'upcoming',
    location: '',
    radius: 25,
    sortBy: 'date',
    useLocation: true,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // Build query parameters
  const queryParams = useMemo(() => {
    const params: any = {
      page,
      limit: 20,
      status: filters.status,
      sortBy: filters.sortBy,
    };

    if (filters.search.trim()) {
      params.search = filters.search.trim();
    }

    if (filters.type) {
      params.type = filters.type;
    }

    if (filters.location.trim()) {
      params.location = filters.location.trim();
    }

    if (filters.useLocation && currentLocation) {
      params.lat = currentLocation.latitude;
      params.lng = currentLocation.longitude;
      params.radius = filters.radius;
    }

    return params;
  }, [filters, page, currentLocation]);

  // Fetch events
  const {
    data: eventsData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['events', queryParams],
    queryFn: () => api.get('/events', { params: queryParams }),
    enabled: true,
    staleTime: 60000, // 1 minute
  });

  const events = eventsData?.data?.events || [];
  const pagination = eventsData?.data?.pagination;
  const hasNextPage = pagination?.hasNext || false;

  // Auto-request location on mount if needed
  useEffect(() => {
    if (filters.useLocation && !currentLocation && !locationLoading) {
      requestLocation();
    }
  }, [filters.useLocation, currentLocation, locationLoading, requestLocation]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleRefresh = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetching) {
      setPage(prev => prev + 1);
    }
  }, [hasNextPage, isFetching]);

  const handleFilterChange = useCallback((key: keyof EventFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleLocationToggle = useCallback(() => {
    const newUseLocation = !filters.useLocation;
    setFilters(prev => ({ ...prev, useLocation: newUseLocation }));
    
    if (newUseLocation && !currentLocation) {
      requestLocation();
    }
  }, [filters.useLocation, currentLocation, requestLocation]);

  const formatDistance = (distance?: number): string => {
    if (!distance) return '';
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const renderEventCard = ({ item: event }: { item: Event }) => (
    <Pressable
      className="bg-white dark:bg-gray-800 rounded-lg mb-4 mx-4 shadow-sm border border-gray-200 dark:border-gray-700"
      onPress={() => router.push(`/events/${event._id}`)}
    >
      {/* Event Image */}
      {event.imageUrl && (
        <View className="h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
          {/* TODO: Add image component */}
          <View className="flex-1 items-center justify-center">
            <Ionicons name="image-outline" size={48} color="#9CA3AF" />
          </View>
        </View>
      )}

      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {event.title}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {event.shortDescription}
            </Text>
          </View>
          
          {event.userRSVPStatus && (
            <View className={`px-2 py-1 rounded-full ml-2 ${
              event.userRSVPStatus === 'going' 
                ? 'bg-green-100 dark:bg-green-900' 
                : 'bg-blue-100 dark:bg-blue-900'
            }`}>
              <Text className={`text-xs font-medium ${
                event.userRSVPStatus === 'going'
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-blue-800 dark:text-blue-200'
              }`}>
                {event.userRSVPStatus === 'going' ? 'Going' : 'Interested'}
              </Text>
            </View>
          )}
        </View>

        {/* Event Details */}
        <View className="space-y-2 mb-3">
          {/* Date and Time */}
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600 dark:text-gray-400 ml-2">
              {formatDate(event.startDate)}
            </Text>
          </View>

          {/* Location */}
          <View className="flex-row items-center">
            <Ionicons 
              name={event.isOnline ? "videocam-outline" : "location-outline"} 
              size={16} 
              color="#6B7280" 
            />
            <Text className="text-sm text-gray-600 dark:text-gray-400 ml-2 flex-1">
              {event.isOnline ? 'Online Event' : `${event.location.name}, ${event.location.city}`}
            </Text>
            {event.distance && (
              <Text className="text-sm text-gray-500 dark:text-gray-500">
                {formatDistance(event.distance)}
              </Text>
            )}
          </View>

          {/* Organizer */}
          <View className="flex-row items-center">
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600 dark:text-gray-400 ml-2">
              {event.club ? event.club.name : event.organizer.name}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center space-x-4">
            {/* Attendees */}
            <View className="flex-row items-center">
              <Ionicons name="people-outline" size={16} color="#6B7280" />
              <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                {event.stats.attendeeCount + event.stats.interestedCount}
                {event.capacity && ` / ${event.capacity}`}
              </Text>
            </View>

            {/* Price */}
            <View className="flex-row items-center">
              <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
              <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                {event.cost.isFree 
                  ? 'Free' 
                  : `${event.cost.currency || '$'}${event.cost.amount}`
                }
              </Text>
            </View>
          </View>

          {/* Event Type */}
          <View className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            <Text className="text-xs text-gray-600 dark:text-gray-400 capitalize">
              {event.type}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  const renderHeader = () => (
    <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      {/* Search Bar */}
      <View className="flex-row items-center mb-3">
        <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
          <Ionicons name="search-outline" size={20} color="#6B7280" />
          <TextInput
            className="flex-1 ml-2 text-gray-900 dark:text-gray-100"
            placeholder="Search events..."
            placeholderTextColor="#6B7280"
            value={filters.search}
            onChangeText={(text) => handleFilterChange('search', text)}
          />
        </View>
        
        <Pressable
          className="ml-3 p-2 bg-blue-600 rounded-lg"
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={20} color="white" />
        </Pressable>
      </View>

      {/* Quick Filters */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row space-x-2">
          {['upcoming', 'ongoing', 'past'].map((status) => (
            <Pressable
              key={status}
              className={`px-3 py-1 rounded-full ${
                filters.status === status
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
              onPress={() => handleFilterChange('status', status)}
            >
              <Text className={`text-sm capitalize ${
                filters.status === status
                  ? 'text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {status}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Location Toggle */}
        <Pressable
          className={`p-2 rounded-lg ${
            filters.useLocation
              ? 'bg-green-100 dark:bg-green-900'
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
          onPress={handleLocationToggle}
        >
          <Ionicons 
            name={filters.useLocation ? "location" : "location-outline"} 
            size={16} 
            color={filters.useLocation ? "#10B981" : "#6B7280"} 
          />
        </Pressable>
      </View>

      {/* Location Status */}
      {filters.useLocation && (
        <View className="mt-2 flex-row items-center">
          {locationLoading ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : currentLocation ? (
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          ) : (
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
          )}
          <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
            {locationLoading 
              ? 'Getting location...'
              : currentLocation 
                ? `Using current location (${filters.radius}km radius)`
                : 'Location unavailable'
            }
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center p-8">
      <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
      <Text className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4 mb-2">
        No events found
      </Text>
      <Text className="text-gray-600 dark:text-gray-400 text-center mb-4">
        Try adjusting your filters or search terms
      </Text>
      <Pressable
        className="bg-blue-600 px-4 py-2 rounded-lg"
        onPress={() => setFilters({
          search: '',
          type: '',
          status: 'upcoming',
          location: '',
          radius: 25,
          sortBy: 'date',
          useLocation: true,
        })}
      >
        <Text className="text-white font-medium">Clear Filters</Text>
      </Pressable>
    </View>
  );

  const renderFooter = () => {
    if (!isFetching || page === 1) return null;
    
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#6B7280" />
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {renderHeader()}
      
      <FlatList
        data={events}
        renderItem={renderEventCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={events.length === 0 ? { flex: 1 } : undefined}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && page === 1}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilters}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClose={() => setShowFilters(false)}
      />
    </SafeAreaView>
  );
}

// Filter Modal Component
interface FilterModalProps {
  visible: boolean;
  filters: EventFilters;
  onFilterChange: (key: keyof EventFilters, value: any) => void;
  onClose: () => void;
}

function FilterModal({ visible, filters, onFilterChange, onClose }: FilterModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Filter Events
          </Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </Pressable>
        </View>

        <View className="flex-1 p-4">
          {/* Event Type */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
              Event Type
            </Text>
            <View className="flex-row flex-wrap">
              {EVENT_TYPES.map((type) => (
                <Pressable
                  key={type.value}
                  className={`mr-2 mb-2 px-3 py-2 rounded-lg border ${
                    filters.type === type.value
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  }`}
                  onPress={() => onFilterChange('type', type.value)}
                >
                  <Text className={`${
                    filters.type === type.value
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Location Search */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
              Location
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              placeholder="City or address..."
              placeholderTextColor="#6B7280"
              value={filters.location}
              onChangeText={(text) => onFilterChange('location', text)}
            />
          </View>

          {/* Radius */}
          {filters.useLocation && (
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
                Search Radius
              </Text>
              <View className="flex-row flex-wrap">
                {RADIUS_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    className={`mr-2 mb-2 px-3 py-2 rounded-lg border ${
                      filters.radius === option.value
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    }`}
                    onPress={() => onFilterChange('radius', option.value)}
                  >
                    <Text className={`${
                      filters.radius === option.value
                        ? 'text-white'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Sort By */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
              Sort By
            </Text>
            <View className="flex-row flex-wrap">
              {[
                { value: 'date', label: 'Date' },
                { value: 'distance', label: 'Distance' },
                { value: 'popularity', label: 'Popularity' },
              ].map((option) => (
                <Pressable
                  key={option.value}
                  className={`mr-2 mb-2 px-3 py-2 rounded-lg border ${
                    filters.sortBy === option.value
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  }`}
                  onPress={() => onFilterChange('sortBy', option.value)}
                >
                  <Text className={`${
                    filters.sortBy === option.value
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Pressable
            className="bg-blue-600 rounded-lg py-3"
            onPress={onClose}
          >
            <Text className="text-white text-center font-medium">
              Apply Filters
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}