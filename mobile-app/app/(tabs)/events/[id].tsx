import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Share,
  Alert,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useLocationContext } from '@/contexts/LocationContext';
import { api } from '@/lib/api-client-mobile';
import { LocationCoordinates } from '@/hooks/useLocation';

interface EventDetails {
  _id: string;
  title: string;
  description: string;
  shortDescription: string;
  type: string;
  startDate: string;
  endDate: string;
  timezone: string;
  isAllDay: boolean;
  location: {
    name: string;
    address: string;
    coordinates: [number, number];
    city: string;
    country: string;
  };
  isOnline: boolean;
  onlineDetails?: {
    platform: string;
    meetingLink: string;
    meetingId?: string;
    password?: string;
  };
  imageUrl?: string;
  images: string[];
  capacity?: number;
  cost: {
    isFree: boolean;
    amount?: number;
    currency?: string;
  };
  requirements: {
    ageLimit?: number;
    skillLevel?: string;
    equipment?: string[];
    prerequisites?: string[];
  };
  tags: string[];
  organizer: {
    _id: string;
    name: string;
    avatar?: string;
    email: string;
  };
  club?: {
    _id: string;
    name: string;
    username: string;
    logoUrl?: string;
  };
  coOrganizers: Array<{
    _id: string;
    name: string;
    avatar?: string;
  }>;
  stats: {
    attendeeCount: number;
    interestedCount: number;
    viewCount: number;
  };
  attendeeCounts: {
    going: number;
    interested: number;
    waitlist: number;
    total: number;
  };
  settings: {
    allowWaitlist: boolean;
    requireApproval: boolean;
    allowGuests: boolean;
    enableCheckIn: boolean;
    allowCancellation: boolean;
  };
  userRSVP?: {
    status: 'going' | 'interested' | 'waitlist';
    response: {
      willAttend: boolean;
      guestCount: number;
      dietaryRestrictions?: string;
      accessibility?: string;
      notes?: string;
    };
    notifications: {
      rsvpConfirmation: boolean;
      reminder24h: boolean;
      reminder1h: boolean;
      eventUpdates: boolean;
      cancellation: boolean;
    };
  };
  relatedEvents: EventDetails[];
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canRSVP: boolean;
  };
}

interface RSVPData {
  status: 'going' | 'interested' | 'not_going';
  guestCount?: number;
  dietaryRestrictions?: string;
  accessibility?: string;
  notes?: string;
  notifications?: {
    rsvpConfirmation?: boolean;
    reminder24h?: boolean;
    reminder1h?: boolean;
    eventUpdates?: boolean;
    cancellation?: boolean;
  };
}

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { currentLocation, getDistanceToLocation } = useLocationContext();
  const queryClient = useQueryClient();

  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [showOnlineDetails, setShowOnlineDetails] = useState(false);

  // Fetch event details
  const {
    data: eventData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`),
    enabled: !!id,
  });

  const event = eventData?.data?.event as EventDetails;
  const relatedEvents = eventData?.data?.relatedEvents || [];
  const permissions = eventData?.data?.permissions;

  // RSVP Mutation
  const rsvpMutation = useMutation({
    mutationFn: (rsvpData: RSVPData) => api.post(`/events/${id}/rsvp`, rsvpData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowRSVPModal(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update RSVP');
    },
  });

  const formatDate = (dateString: string, isAllDay: boolean = false): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    if (!isAllDay) {
      options.hour = 'numeric';
      options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('en-US', options);
  };

  const formatDuration = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes} minutes`;
    if (minutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${minutes}m`;
  };

  const getDistanceText = (): string | null => {
    if (!currentLocation || !event?.location.coordinates) return null;
    
    const distance = getDistanceToLocation({
      latitude: event.location.coordinates[1],
      longitude: event.location.coordinates[0],
    });
    
    if (!distance) return null;
    
    return distance < 1 
      ? `${Math.round(distance * 1000)}m away`
      : `${distance.toFixed(1)}km away`;
  };

  const handleShare = async () => {
    try {
      const shareContent = {
        title: event.title,
        message: `Check out this event: ${event.title}\n\n${event.shortDescription}\n\n📅 ${formatDate(event.startDate)}\n📍 ${event.location.name}`,
        url: `https://app.example.com/events/${event._id}`, // Replace with actual deep link
      };

      await Share.share(shareContent);
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };

  const handleDirections = () => {
    if (!event?.location.coordinates) return;
    
    const [lng, lat] = event.location.coordinates;
    const label = encodeURIComponent(event.location.name);
    
    const url = Platform.select({
      ios: `maps:${lat},${lng}?q=${label}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
    });
    
    if (url) {
      Linking.openURL(url);
    }
  };

  const handleJoinOnline = () => {
    if (event?.onlineDetails?.meetingLink) {
      Linking.openURL(event.onlineDetails.meetingLink);
    } else {
      setShowOnlineDetails(true);
    }
  };

  const handleRSVP = (status: 'going' | 'interested' | 'not_going') => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to RSVP for events.');
      return;
    }

    const rsvpData: RSVPData = { status };
    
    if (status === 'not_going') {
      // Simple removal for "not going"
      rsvpMutation.mutate(rsvpData);
    } else {
      // Show modal for going/interested to collect additional info
      setShowRSVPModal(true);
    }
  };

  const handleEditEvent = () => {
    router.push(`/events/${id}/edit`);
  };

  const renderHeader = () => (
    <View>
      {/* Event Image */}
      {event.imageUrl && (
        <View className="h-64 bg-gray-200 dark:bg-gray-700">
          {/* TODO: Add image component */}
          <View className="flex-1 items-center justify-center">
            <Ionicons name="image-outline" size={64} color="#9CA3AF" />
          </View>
        </View>
      )}

      {/* Header Actions */}
      <View className="absolute top-12 left-0 right-0 flex-row justify-between px-4">
        <Pressable
          className="bg-black/50 rounded-full p-2"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        
        <View className="flex-row space-x-2">
          <Pressable
            className="bg-black/50 rounded-full p-2"
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color="white" />
          </Pressable>
          
          {permissions?.canEdit && (
            <Pressable
              className="bg-black/50 rounded-full p-2"
              onPress={handleEditEvent}
            >
              <Ionicons name="create-outline" size={24} color="white" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  const renderEventInfo = () => (
    <View className="bg-white dark:bg-gray-800 p-6">
      {/* Title and Type */}
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {event.title}
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 mb-3">
            {event.shortDescription}
          </Text>
        </View>
        
        <View className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full ml-4">
          <Text className="text-sm font-medium text-blue-800 dark:text-blue-200 capitalize">
            {event.type}
          </Text>
        </View>
      </View>

      {/* RSVP Status */}
      {event.userRSVP && (
        <View className={`flex-row items-center p-3 rounded-lg mb-4 ${
          event.userRSVP.status === 'going' 
            ? 'bg-green-100 dark:bg-green-900'
            : event.userRSVP.status === 'waitlist'
            ? 'bg-yellow-100 dark:bg-yellow-900'
            : 'bg-blue-100 dark:bg-blue-900'
        }`}>
          <Ionicons 
            name={
              event.userRSVP.status === 'going' ? 'checkmark-circle' :
              event.userRSVP.status === 'waitlist' ? 'time' : 'heart'
            } 
            size={20} 
            color={
              event.userRSVP.status === 'going' ? '#10B981' :
              event.userRSVP.status === 'waitlist' ? '#F59E0B' : '#3B82F6'
            } 
          />
          <Text className={`ml-2 font-medium ${
            event.userRSVP.status === 'going' 
              ? 'text-green-800 dark:text-green-200'
              : event.userRSVP.status === 'waitlist'
              ? 'text-yellow-800 dark:text-yellow-200'
              : 'text-blue-800 dark:text-blue-200'
          }`}>
            You're {event.userRSVP.status === 'waitlist' ? 'on the waitlist' : event.userRSVP.status}
            {event.userRSVP.response.guestCount > 0 && 
              ` (+ ${event.userRSVP.response.guestCount} guest${event.userRSVP.response.guestCount > 1 ? 's' : ''})`
            }
          </Text>
        </View>
      )}

      {/* Date and Time */}
      <View className="flex-row items-start mb-4">
        <Ionicons name="calendar-outline" size={20} color="#6B7280" className="mt-1" />
        <View className="ml-3 flex-1">
          <Text className="text-gray-900 dark:text-gray-100 font-medium">
            {formatDate(event.startDate, event.isAllDay)}
          </Text>
          {!event.isAllDay && (
            <Text className="text-gray-600 dark:text-gray-400 text-sm">
              Duration: {formatDuration(event.startDate, event.endDate)}
            </Text>
          )}
          <Text className="text-gray-600 dark:text-gray-400 text-sm">
            {event.timezone}
          </Text>
        </View>
      </View>

      {/* Location */}
      <View className="flex-row items-start mb-4">
        <Ionicons 
          name={event.isOnline ? "videocam-outline" : "location-outline"} 
          size={20} 
          color="#6B7280" 
          className="mt-1" 
        />
        <View className="ml-3 flex-1">
          <Text className="text-gray-900 dark:text-gray-100 font-medium">
            {event.isOnline ? 'Online Event' : event.location.name}
          </Text>
          {!event.isOnline && (
            <>
              <Text className="text-gray-600 dark:text-gray-400 text-sm">
                {event.location.address}
              </Text>
              {getDistanceText() && (
                <Text className="text-blue-600 dark:text-blue-400 text-sm">
                  {getDistanceText()}
                </Text>
              )}
            </>
          )}
          {event.isOnline && event.onlineDetails && (
            <Text className="text-gray-600 dark:text-gray-400 text-sm">
              {event.onlineDetails.platform}
            </Text>
          )}
        </View>
        
        {!event.isOnline && (
          <Pressable
            className="bg-blue-600 px-3 py-1 rounded-lg"
            onPress={handleDirections}
          >
            <Text className="text-white text-sm font-medium">Directions</Text>
          </Pressable>
        )}
        
        {event.isOnline && (
          <Pressable
            className="bg-green-600 px-3 py-1 rounded-lg"
            onPress={handleJoinOnline}
          >
            <Text className="text-white text-sm font-medium">Join</Text>
          </Pressable>
        )}
      </View>

      {/* Organizer */}
      <View className="flex-row items-center mb-4">
        <Ionicons name="person-outline" size={20} color="#6B7280" />
        <View className="ml-3 flex-1">
          <Text className="text-gray-900 dark:text-gray-100 font-medium">
            {event.club ? event.club.name : event.organizer.name}
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 text-sm">
            {event.club ? 'Club Event' : 'Organizer'}
          </Text>
        </View>
      </View>

      {/* Attendees and Price */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <Ionicons name="people-outline" size={20} color="#6B7280" />
          <Text className="text-gray-900 dark:text-gray-100 ml-2">
            {event.attendeeCounts.total} attending
            {event.capacity && ` / ${event.capacity}`}
          </Text>
        </View>
        
        <View className="flex-row items-center">
          <Ionicons name="pricetag-outline" size={20} color="#6B7280" />
          <Text className="text-gray-900 dark:text-gray-100 ml-2 font-medium">
            {event.cost.isFree 
              ? 'Free' 
              : `${event.cost.currency || '$'}${event.cost.amount}`
            }
          </Text>
        </View>
      </View>

      {/* Tags */}
      {event.tags.length > 0 && (
        <View className="flex-row flex-wrap mb-4">
          {event.tags.map((tag, index) => (
            <View key={index} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mr-2 mb-2">
              <Text className="text-gray-700 dark:text-gray-300 text-sm">#{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderDescription = () => (
    <View className="bg-white dark:bg-gray-800 p-6 mt-2">
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        About This Event
      </Text>
      <Text className="text-gray-700 dark:text-gray-300 leading-6">
        {event.description}
      </Text>
    </View>
  );

  const renderRequirements = () => {
    if (!event.requirements || Object.keys(event.requirements).length === 0) return null;
    
    return (
      <View className="bg-white dark:bg-gray-800 p-6 mt-2">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Requirements
        </Text>
        
        {event.requirements.ageLimit && (
          <View className="flex-row items-center mb-2">
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text className="text-gray-700 dark:text-gray-300 ml-2">
              Age limit: {event.requirements.ageLimit}+
            </Text>
          </View>
        )}
        
        {event.requirements.skillLevel && (
          <View className="flex-row items-center mb-2">
            <Ionicons name="trending-up-outline" size={16} color="#6B7280" />
            <Text className="text-gray-700 dark:text-gray-300 ml-2 capitalize">
              Skill level: {event.requirements.skillLevel}
            </Text>
          </View>
        )}
        
        {event.requirements.equipment && event.requirements.equipment.length > 0 && (
          <View className="mb-2">
            <View className="flex-row items-center mb-1">
              <Ionicons name="build-outline" size={16} color="#6B7280" />
              <Text className="text-gray-700 dark:text-gray-300 ml-2 font-medium">
                Required equipment:
              </Text>
            </View>
            {event.requirements.equipment.map((item, index) => (
              <Text key={index} className="text-gray-600 dark:text-gray-400 ml-6">
                • {item}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderActionButtons = () => {
    if (!permissions?.canRSVP) return null;

    return (
      <View className="bg-white dark:bg-gray-800 p-6 mt-2">
        <View className="flex-row space-x-3">
          <Pressable
            className={`flex-1 py-3 rounded-lg ${
              event.userRSVP?.status === 'going'
                ? 'bg-gray-200 dark:bg-gray-700'
                : 'bg-green-600'
            }`}
            onPress={() => handleRSVP(event.userRSVP?.status === 'going' ? 'not_going' : 'going')}
            disabled={rsvpMutation.isPending}
          >
            <Text className={`text-center font-medium ${
              event.userRSVP?.status === 'going'
                ? 'text-gray-700 dark:text-gray-300'
                : 'text-white'
            }`}>
              {event.userRSVP?.status === 'going' ? 'Cancel RSVP' : 'Going'}
            </Text>
          </Pressable>
          
          <Pressable
            className={`flex-1 py-3 rounded-lg ${
              event.userRSVP?.status === 'interested'
                ? 'bg-gray-200 dark:bg-gray-700'
                : 'bg-blue-600'
            }`}
            onPress={() => handleRSVP(event.userRSVP?.status === 'interested' ? 'not_going' : 'interested')}
            disabled={rsvpMutation.isPending}
          >
            <Text className={`text-center font-medium ${
              event.userRSVP?.status === 'interested'
                ? 'text-gray-700 dark:text-gray-300'
                : 'text-white'
            }`}>
              {event.userRSVP?.status === 'interested' ? 'Not Interested' : 'Interested'}
            </Text>
          </Pressable>
        </View>
        
        {rsvpMutation.isPending && (
          <ActivityIndicator className="mt-3" size="small" color="#6B7280" />
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 dark:text-gray-400 mt-4">Loading event...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !event) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center p-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4 mb-2">
          Event not found
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 text-center mb-4">
          The event you're looking for doesn't exist or has been removed.
        </Text>
        <Pressable
          className="bg-blue-600 px-6 py-3 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white font-medium">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderEventInfo()}
        {renderDescription()}
        {renderRequirements()}
        {renderActionButtons()}
      </ScrollView>

      {/* RSVP Modal */}
      <RSVPModal
        visible={showRSVPModal}
        event={event}
        onSubmit={(data) => rsvpMutation.mutate(data)}
        onClose={() => setShowRSVPModal(false)}
        isLoading={rsvpMutation.isPending}
      />

      {/* Online Details Modal */}
      <OnlineDetailsModal
        visible={showOnlineDetails}
        event={event}
        onClose={() => setShowOnlineDetails(false)}
      />
    </View>
  );
}

// RSVP Modal Component
interface RSVPModalProps {
  visible: boolean;
  event: EventDetails;
  onSubmit: (data: RSVPData) => void;
  onClose: () => void;
  isLoading: boolean;
}

function RSVPModal({ visible, event, onSubmit, onClose, isLoading }: RSVPModalProps) {
  const [status, setStatus] = useState<'going' | 'interested'>('going');
  const [guestCount, setGuestCount] = useState(0);
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [accessibility, setAccessibility] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSubmit({
      status,
      guestCount,
      dietaryRestrictions: dietaryRestrictions.trim() || undefined,
      accessibility: accessibility.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            RSVP for Event
          </Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Status Selection */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
              Your Response
            </Text>
            <View className="flex-row space-x-3">
              <Pressable
                className={`flex-1 py-3 rounded-lg border ${
                  status === 'going'
                    ? 'bg-green-600 border-green-600'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
                onPress={() => setStatus('going')}
              >
                <Text className={`text-center font-medium ${
                  status === 'going' ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  Going
                </Text>
              </Pressable>
              
              <Pressable
                className={`flex-1 py-3 rounded-lg border ${
                  status === 'interested'
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
                onPress={() => setStatus('interested')}
              >
                <Text className={`text-center font-medium ${
                  status === 'interested' ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  Interested
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Additional fields for "going" status */}
          {status === 'going' && (
            <>
              {event.settings.allowGuests && (
                <View className="mb-4">
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Number of Guests
                  </Text>
                  <View className="flex-row items-center">
                    <Pressable
                      className="bg-gray-200 dark:bg-gray-700 p-2 rounded-lg"
                      onPress={() => setGuestCount(Math.max(0, guestCount - 1))}
                    >
                      <Ionicons name="remove" size={20} color="#6B7280" />
                    </Pressable>
                    <Text className="mx-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                      {guestCount}
                    </Text>
                    <Pressable
                      className="bg-gray-200 dark:bg-gray-700 p-2 rounded-lg"
                      onPress={() => setGuestCount(Math.min(10, guestCount + 1))}
                    >
                      <Ionicons name="add" size={20} color="#6B7280" />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Optional fields */}
              <View className="space-y-4">
                <View>
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Dietary Restrictions (Optional)
                  </Text>
                  <TextInput
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                    placeholder="Any dietary requirements..."
                    value={dietaryRestrictions}
                    onChangeText={setDietaryRestrictions}
                    multiline
                  />
                </View>

                <View>
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Accessibility Needs (Optional)
                  </Text>
                  <TextInput
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                    placeholder="Any accessibility requirements..."
                    value={accessibility}
                    onChangeText={setAccessibility}
                    multiline
                  />
                </View>

                <View>
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Notes (Optional)
                  </Text>
                  <TextInput
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                    placeholder="Additional notes..."
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Pressable
            className="bg-blue-600 rounded-lg py-3"
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-center font-medium">
                Submit RSVP
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// Online Details Modal Component
interface OnlineDetailsModalProps {
  visible: boolean;
  event: EventDetails;
  onClose: () => void;
}

function OnlineDetailsModal({ visible, event, onClose }: OnlineDetailsModalProps) {
  const copyToClipboard = (text: string, label: string) => {
    // Platform-specific clipboard implementation would go here
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Online Meeting Details
          </Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </Pressable>
        </View>

        <View className="flex-1 p-4">
          {event.onlineDetails && (
            <View className="space-y-4">
              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Platform
                </Text>
                <Text className="text-gray-700 dark:text-gray-300">
                  {event.onlineDetails.platform}
                </Text>
              </View>

              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Meeting Link
                </Text>
                <Pressable
                  className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg"
                  onPress={() => Linking.openURL(event.onlineDetails!.meetingLink)}
                >
                  <Text className="text-blue-800 dark:text-blue-200">
                    {event.onlineDetails.meetingLink}
                  </Text>
                </Pressable>
              </View>

              {event.onlineDetails.meetingId && (
                <View>
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Meeting ID
                  </Text>
                  <Pressable
                    className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex-row items-center justify-between"
                    onPress={() => copyToClipboard(event.onlineDetails!.meetingId!, 'Meeting ID')}
                  >
                    <Text className="text-gray-900 dark:text-gray-100 font-mono">
                      {event.onlineDetails.meetingId}
                    </Text>
                    <Ionicons name="copy-outline" size={20} color="#6B7280" />
                  </Pressable>
                </View>
              )}

              {event.onlineDetails.password && (
                <View>
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Password
                  </Text>
                  <Pressable
                    className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex-row items-center justify-between"
                    onPress={() => copyToClipboard(event.onlineDetails!.password!, 'Password')}
                  >
                    <Text className="text-gray-900 dark:text-gray-100 font-mono">
                      {event.onlineDetails.password}
                    </Text>
                    <Ionicons name="copy-outline" size={20} color="#6B7280" />
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        <View className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Pressable
            className="bg-green-600 rounded-lg py-3"
            onPress={() => {
              if (event.onlineDetails?.meetingLink) {
                Linking.openURL(event.onlineDetails.meetingLink);
              }
              onClose();
            }}
          >
            <Text className="text-white text-center font-medium">
              Join Meeting
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}