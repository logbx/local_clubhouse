import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Link } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Event } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`} asChild>
      <TouchableOpacity>
        <Card>
          {event.image && (
            <Image
              source={{ uri: event.image }}
              className="w-full h-48 rounded-t-lg -m-4 mb-4"
              resizeMode="cover"
            />
          )}
          <View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {event.title}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2" numberOfLines={2}>
              {event.description}
            </Text>
            
            <View className="space-y-2">
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <Text className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                  {format(new Date(event.startDate), 'MMM d, yyyy h:mm a')}
                </Text>
              </View>
              
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={16} color="#6b7280" />
                <Text className="text-sm text-gray-600 dark:text-gray-400 ml-2" numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="people-outline" size={16} color="#6b7280" />
                  <Text className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                    {event.attendeeCount}
                    {event.maxAttendees && `/${event.maxAttendees}`} attending
                  </Text>
                </View>
                
                <Text className="text-sm text-primary-600 font-medium">
                  {event.club.name}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </Link>
  );
}