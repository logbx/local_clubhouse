import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { ClubCard } from '@/components/club/ClubCard';
import { EventCard } from '@/components/event/EventCard';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client-mobile';
import { useState } from 'react';

export default function HomeScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: clubs, refetch: refetchClubs } = useQuery({
    queryKey: ['user-clubs'],
    queryFn: () => api.getUserClubs(),
  });

  const { data: events, refetch: refetchEvents } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: () => api.getUpcomingEvents(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchClubs(), refetchEvents()]);
    setRefreshing(false);
  };

  return (
    <ScrollView 
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="p-4">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Welcome back, {user?.name}!
          </Text>
          <Text className="text-gray-600 dark:text-gray-400">
            Here's what's happening in your clubs
          </Text>
        </View>

        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Your Clubs
          </Text>
          {clubs && clubs.length > 0 ? (
            <View className="space-y-3">
              {clubs.map((club) => (
                <ClubCard key={club.id} club={club} />
              ))}
            </View>
          ) : (
            <View className="card p-8 items-center">
              <Text className="text-gray-500 dark:text-gray-400 text-center">
                You haven't joined any clubs yet. Browse clubs to get started!
              </Text>
            </View>
          )}
        </View>

        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Upcoming Events
          </Text>
          {events && events.length > 0 ? (
            <View className="space-y-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </View>
          ) : (
            <View className="card p-8 items-center">
              <Text className="text-gray-500 dark:text-gray-400 text-center">
                No upcoming events. Check back later!
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}