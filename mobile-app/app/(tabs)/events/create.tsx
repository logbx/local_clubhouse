import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/hooks/useAuth';
import { useLocationContext } from '@/contexts/LocationContext';
import { api } from '@/lib/api-client-mobile';
import { LocationCoordinates } from '@/hooks/useLocation';
import { locationService, PlaceResult } from '@/lib/services/location.service';

interface EventFormData {
  title: string;
  description: string;
  shortDescription: string;
  type: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  isAllDay: boolean;
  location: {
    name: string;
    address: string;
    coordinates: [number, number];
    city: string;
    country: string;
    postalCode?: string;
    placeId?: string;
  };
  isOnline: boolean;
  onlineDetails?: {
    platform: string;
    meetingLink: string;
    meetingId?: string;
    password?: string;
  };
  visibility: 'public' | 'private' | 'club_only';
  capacity?: number;
  cost: {
    isFree: boolean;
    amount?: number;
    currency: string;
    paymentRequired: boolean;
  };
  requirements: {
    ageLimit?: number;
    skillLevel?: string;
    equipment: string[];
    prerequisites: string[];
  };
  tags: string[];
  club?: string;
  coOrganizers: string[];
  settings: {
    allowWaitlist: boolean;
    requireApproval: boolean;
    allowGuests: boolean;
    sendReminders: boolean;
    enableCheckIn: boolean;
    allowCancellation: boolean;
    cancellationDeadline?: Date;
  };
  imageUrl?: string;
  images: string[];
}

const EVENT_TYPES = [
  { value: 'tournament', label: 'Tournament' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'conference', label: 'Conference' },
  { value: 'social', label: 'Social' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
];

const SKILL_LEVELS = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const PLATFORMS = [
  'Zoom', 'Google Meet', 'Microsoft Teams', 'Discord', 'Twitch', 'YouTube Live', 'Other'
];

export default function CreateEventScreen() {
  const { user } = useAuth();
  const { currentLocation, requestLocation } = useLocationContext();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    shortDescription: '',
    type: 'meetup',
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endDate: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isAllDay: false,
    location: {
      name: '',
      address: '',
      coordinates: [0, 0],
      city: '',
      country: '',
    },
    isOnline: false,
    visibility: 'public',
    cost: {
      isFree: true,
      currency: 'USD',
      paymentRequired: false,
    },
    requirements: {
      equipment: [],
      prerequisites: [],
    },
    tags: [],
    coOrganizers: [],
    settings: {
      allowWaitlist: true,
      requireApproval: false,
      allowGuests: true,
      sendReminders: true,
      enableCheckIn: true,
      allowCancellation: true,
    },
    images: [],
  });

  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationResults, setLocationResults] = useState<PlaceResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Fetch user's clubs
  const { data: clubsData } = useQuery({
    queryKey: ['user-clubs'],
    queryFn: () => api.get('/clubs/my-clubs'),
    enabled: !!user,
  });

  const userClubs = (clubsData as any)?.data?.clubs || [];

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const formDataToSend = new FormData();
      
      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'images' && value.length > 0) {
          // Handle image uploads
          value.forEach((imageUri: string, index: number) => {
            formDataToSend.append('images', {
              uri: imageUri,
              type: 'image/jpeg',
              name: `image_${index}.jpg`,
            } as any);
          });
        } else if (typeof value === 'object' && value !== null) {
          formDataToSend.append(key, JSON.stringify(value));
        } else {
          formDataToSend.append(key, String(value));
        }
      });

      return api.post('/events', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: (response) => {
      const eventId = (response as any).data.event._id;
      Alert.alert(
        'Success!',
        'Your event has been created successfully.',
        [
          {
            text: 'View Event',
            onPress: () => router.replace(`/events/${eventId}`),
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to create event. Please try again.'
      );
    },
  });

  const updateFormData = useCallback((updates: Partial<EventFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const searchLocations = useCallback(async (query: string) => {
    if (!query.trim()) {
      setLocationResults([]);
      return;
    }

    setIsSearchingLocation(true);
    try {
      const results = await locationService.searchPlaces({
        query: query.trim(),
        location: currentLocation || undefined,
        limit: 8,
      });
      setLocationResults(results);
    } catch (error) {
      console.error('Location search error:', error);
      setLocationResults([]);
    } finally {
      setIsSearchingLocation(false);
    }
  }, [currentLocation]);

  const selectLocation = useCallback((place: PlaceResult) => {
    updateFormData({
      location: {
        name: place.name,
        address: place.address,
        coordinates: place.coordinates,
        city: place.city,
        country: place.country,
        postalCode: place.postalCode,
        placeId: place.placeId,
      },
    });
    setShowLocationSearch(false);
    setLocationSearchQuery('');
    setLocationResults([]);
  }, [updateFormData]);

  const useCurrentLocation = useCallback(async () => {
    if (!currentLocation) {
      const location = await requestLocation();
      if (!location) return;
    }

    try {
      const geocodeResult = await locationService.reverseGeocode(
        currentLocation || (await requestLocation())!
      );
      
      if (geocodeResult) {
        updateFormData({
          location: {
            name: 'Current Location',
            address: geocodeResult.address,
            coordinates: geocodeResult.coordinates,
            city: geocodeResult.city,
            country: geocodeResult.country,
            postalCode: geocodeResult.postalCode,
          },
        });
        setShowLocationSearch(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location details');
    }
  }, [currentLocation, requestLocation, updateFormData]);

  const pickImage = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant photo library access to add images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (!result.canceled && result.assets) {
      const imageUris = result.assets.map(asset => asset.uri);
      updateFormData({
        images: [...formData.images, ...imageUris].slice(0, 5), // Max 5 images
      });
    }
  }, [formData.images, updateFormData]);

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1: // Basic Info
        return !!(
          formData.title.trim() &&
          formData.shortDescription.trim() &&
          formData.description.trim() &&
          formData.type
        );
      case 2: // Date & Time
        return formData.startDate < formData.endDate;
      case 3: // Location
        return formData.isOnline || !!(
          formData.location.name &&
          formData.location.address &&
          formData.location.coordinates[0] !== 0
        );
      case 4: // Details
        return true; // All optional
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (!validateCurrentStep()) {
      Alert.alert('Required Fields', 'Please fill in all required fields before continuing.');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (!validateCurrentStep()) {
      Alert.alert('Required Fields', 'Please complete all required fields.');
      return;
    }

    createEventMutation.mutate(formData);
  };

  const renderProgressBar = () => (
    <View className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Step {currentStep} of 5
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {Math.round((currentStep / 5) * 100)}% Complete
        </Text>
      </View>
      <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <View 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / 5) * 100}%` }}
        />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Basic Information
      </Text>

      {/* Event Title */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          Event Title *
        </Text>
        <TextInput
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
          placeholder="Enter event title"
          value={formData.title}
          onChangeText={(text) => updateFormData({ title: text })}
          maxLength={200}
        />
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formData.title.length}/200 characters
        </Text>
      </View>

      {/* Short Description */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          Short Description *
        </Text>
        <TextInput
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
          placeholder="Brief summary for event listings"
          value={formData.shortDescription}
          onChangeText={(text) => updateFormData({ shortDescription: text })}
          maxLength={300}
          multiline
          numberOfLines={3}
        />
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formData.shortDescription.length}/300 characters
        </Text>
      </View>

      {/* Full Description */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          Full Description *
        </Text>
        <TextInput
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 min-h-[120px]"
          placeholder="Detailed event description"
          value={formData.description}
          onChangeText={(text) => updateFormData({ description: text })}
          maxLength={10000}
          multiline
          textAlignVertical="top"
        />
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formData.description.length}/10000 characters
        </Text>
      </View>

      {/* Event Type */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          Event Type *
        </Text>
        <View className="flex-row flex-wrap">
          {EVENT_TYPES.map((type) => (
            <Pressable
              key={type.value}
              className={`mr-2 mb-2 px-3 py-2 rounded-lg border ${
                formData.type === type.value
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
              }`}
              onPress={() => updateFormData({ type: type.value })}
            >
              <Text className={`${
                formData.type === type.value
                  ? 'text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {type.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Club Selection */}
      {userClubs.length > 0 && (
        <View className="mb-4">
          <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
            Organize for Club (Optional)
          </Text>
          <View className="flex-row flex-wrap">
            <Pressable
              className={`mr-2 mb-2 px-3 py-2 rounded-lg border ${
                !formData.club
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
              }`}
              onPress={() => updateFormData({ club: undefined })}
            >
              <Text className={`${
                !formData.club
                  ? 'text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                Personal Event
              </Text>
            </Pressable>
            {userClubs.map((club: any) => (
              <Pressable
                key={club._id}
                className={`mr-2 mb-2 px-3 py-2 rounded-lg border ${
                  formData.club === club._id
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
                onPress={() => updateFormData({ club: club._id })}
              >
                <Text className={`${
                  formData.club === club._id
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {club.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Images */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          Event Images (Optional)
        </Text>
        <Pressable
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 items-center"
          onPress={pickImage}
        >
          <Ionicons name="cloud-upload-outline" size={32} color="#6B7280" />
          <Text className="text-gray-600 dark:text-gray-400 mt-2 text-center">
            Tap to add photos ({formData.images.length}/5)
          </Text>
        </Pressable>
        
        {formData.images.length > 0 && (
          <View className="flex-row flex-wrap mt-2">
            {formData.images.map((uri, index) => (
              <View key={index} className="w-20 h-20 mr-2 mb-2 relative">
                <View className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <Pressable
                  className="absolute -top-1 -right-1 bg-red-600 rounded-full w-6 h-6 items-center justify-center"
                  onPress={() => {
                    const newImages = formData.images.filter((_, i) => i !== index);
                    updateFormData({ images: newImages });
                  }}
                >
                  <Ionicons name="close" size={12} color="white" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Date & Time
      </Text>

      {/* All Day Toggle */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
          All Day Event
        </Text>
        <Pressable
          className={`w-12 h-6 rounded-full ${
            formData.isAllDay ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          onPress={() => updateFormData({ isAllDay: !formData.isAllDay })}
        >
          <View className={`w-5 h-5 rounded-full bg-white transition-transform ${
            formData.isAllDay ? 'transform translate-x-6' : 'transform translate-x-0.5'
          }`} />
        </Pressable>
      </View>

      {/* Start Date */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          Start {formData.isAllDay ? 'Date' : 'Date & Time'} *
        </Text>
        <Pressable
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 bg-white dark:bg-gray-800"
          onPress={() => setShowDatePicker('start')}
        >
          <Text className="text-gray-900 dark:text-gray-100">
            {formData.startDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              ...(formData.isAllDay ? {} : {
                hour: 'numeric',
                minute: '2-digit',
              }),
            })}
          </Text>
        </Pressable>
      </View>

      {/* End Date */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          End {formData.isAllDay ? 'Date' : 'Date & Time'} *
        </Text>
        <Pressable
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 bg-white dark:bg-gray-800"
          onPress={() => setShowDatePicker('end')}
        >
          <Text className="text-gray-900 dark:text-gray-100">
            {formData.endDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              ...(formData.isAllDay ? {} : {
                hour: 'numeric',
                minute: '2-digit',
              }),
            })}
          </Text>
        </Pressable>
      </View>

      {/* Timezone */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          Timezone
        </Text>
        <TextInput
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
          value={formData.timezone}
          onChangeText={(text) => updateFormData({ timezone: text })}
          placeholder="e.g., America/New_York"
        />
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={showDatePicker === 'start' ? formData.startDate : formData.endDate}
          mode={formData.isAllDay ? 'date' : 'datetime'}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDatePicker(null);
            if (selectedDate) {
              if (showDatePicker === 'start') {
                updateFormData({ startDate: selectedDate });
                // Auto-adjust end date if it's before start date
                if (selectedDate >= formData.endDate) {
                  const newEndDate = new Date(selectedDate);
                  newEndDate.setHours(selectedDate.getHours() + 1);
                  updateFormData({ endDate: newEndDate });
                }
              } else {
                updateFormData({ endDate: selectedDate });
              }
            }
          }}
        />
      )}
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Location & Format
      </Text>

      {/* Online/In-Person Toggle */}
      <View className="mb-6">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
          Event Format *
        </Text>
        <View className="flex-row space-x-3">
          <Pressable
            className={`flex-1 py-3 rounded-lg border ${
              !formData.isOnline
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
            }`}
            onPress={() => updateFormData({ isOnline: false })}
          >
            <Text className={`text-center font-medium ${
              !formData.isOnline ? 'text-white' : 'text-gray-700 dark:text-gray-300'
            }`}>
              In-Person
            </Text>
          </Pressable>
          
          <Pressable
            className={`flex-1 py-3 rounded-lg border ${
              formData.isOnline
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
            }`}
            onPress={() => updateFormData({ isOnline: true })}
          >
            <Text className={`text-center font-medium ${
              formData.isOnline ? 'text-white' : 'text-gray-700 dark:text-gray-300'
            }`}>
              Online
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Location Section */}
      {!formData.isOnline ? (
        <View className="mb-4">
          <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
            Event Location *
          </Text>
          
          {formData.location.name ? (
            <View className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="font-medium text-gray-900 dark:text-gray-100">
                    {formData.location.name}
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {formData.location.address}
                  </Text>
                </View>
                <Pressable
                  className="ml-2 p-1"
                  onPress={() => updateFormData({
                    location: {
                      name: '',
                      address: '',
                      coordinates: [0, 0],
                      city: '',
                      country: '',
                    }
                  })}
                >
                  <Ionicons name="close-circle" size={20} color="#6B7280" />
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="space-y-2">
              <Pressable
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 bg-white dark:bg-gray-800 flex-row items-center"
                onPress={() => setShowLocationSearch(true)}
              >
                <Ionicons name="search-outline" size={20} color="#6B7280" />
                <Text className="ml-2 text-gray-600 dark:text-gray-400">
                  Search for a location
                </Text>
              </Pressable>
              
              <Pressable
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 bg-white dark:bg-gray-800 flex-row items-center"
                onPress={useCurrentLocation}
              >
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <Text className="ml-2 text-gray-600 dark:text-gray-400">
                  Use current location
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : (
        <View className="mb-4">
          <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
            Online Meeting Details *
          </Text>
          
          {/* Platform */}
          <View className="mb-3">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Platform
            </Text>
            <View className="flex-row flex-wrap">
              {PLATFORMS.map((platform) => (
                <Pressable
                  key={platform}
                  className={`mr-2 mb-2 px-3 py-2 rounded-lg border ${
                    formData.onlineDetails?.platform === platform
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  }`}
                  onPress={() => updateFormData({
                    onlineDetails: {
                      ...formData.onlineDetails,
                      platform,
                      meetingLink: formData.onlineDetails?.meetingLink || '',
                    }
                  })}
                >
                  <Text className={`text-sm ${
                    formData.onlineDetails?.platform === platform
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {platform}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Meeting Link */}
          <View className="mb-3">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meeting Link
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              placeholder="https://zoom.us/j/..."
              value={formData.onlineDetails?.meetingLink || ''}
              onChangeText={(text) => updateFormData({
                onlineDetails: {
                  ...formData.onlineDetails,
                  platform: formData.onlineDetails?.platform || 'Zoom',
                  meetingLink: text,
                }
              })}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          {/* Optional fields */}
          <View className="mb-3">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meeting ID (Optional)
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              placeholder="123-456-7890"
              value={formData.onlineDetails?.meetingId || ''}
              onChangeText={(text) => updateFormData({
                onlineDetails: {
                  ...formData.onlineDetails,
                  platform: formData.onlineDetails?.platform || 'Zoom',
                  meetingLink: formData.onlineDetails?.meetingLink || '',
                  meetingId: text,
                }
              })}
            />
          </View>

          <View className="mb-3">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password (Optional)
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              placeholder="Meeting password"
              value={formData.onlineDetails?.password || ''}
              onChangeText={(text) => updateFormData({
                onlineDetails: {
                  ...formData.onlineDetails,
                  platform: formData.onlineDetails?.platform || 'Zoom',
                  meetingLink: formData.onlineDetails?.meetingLink || '',
                  password: text,
                }
              })}
              secureTextEntry
            />
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Event Details
      </Text>

      {/* Visibility */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          Event Visibility
        </Text>
        <View className="space-y-2">
          {[
            { value: 'public', label: 'Public', desc: 'Anyone can find and join' },
            { value: 'private', label: 'Private', desc: 'Invite only' },
            { value: 'club_only', label: 'Club Only', desc: 'Only club members can see' },
          ].map((option) => (
            <Pressable
              key={option.value}
              className={`border rounded-lg p-3 ${
                formData.visibility === option.value
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-600'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
              }`}
              onPress={() => updateFormData({ visibility: option.value as any })}
            >
              <View className="flex-row items-center">
                <View className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  formData.visibility === option.value
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`} />
                <View className="flex-1">
                  <Text className="font-medium text-gray-900 dark:text-gray-100">
                    {option.label}
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    {option.desc}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Capacity */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          Capacity (Optional)
        </Text>
        <TextInput
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
          placeholder="Maximum number of attendees"
          value={formData.capacity?.toString() || ''}
          onChangeText={(text) => {
            const num = parseInt(text) || undefined;
            updateFormData({ capacity: num });
          }}
          keyboardType="numeric"
        />
      </View>

      {/* Cost */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          Event Cost
        </Text>
        
        <View className="flex-row items-center mb-3">
          <Pressable
            className={`w-5 h-5 rounded mr-2 ${
              formData.cost.isFree
                ? 'bg-blue-600'
                : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600'
            }`}
            onPress={() => updateFormData({
              cost: { ...formData.cost, isFree: !formData.cost.isFree }
            })}
          >
            {formData.cost.isFree && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </Pressable>
          <Text className="text-gray-900 dark:text-gray-100">
            This is a free event
          </Text>
        </View>

        {!formData.cost.isFree && (
          <View className="flex-row items-center space-x-2">
            <TextInput
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              placeholder="0.00"
              value={formData.cost.amount?.toString() || ''}
              onChangeText={(text) => {
                const num = parseFloat(text) || 0;
                updateFormData({
                  cost: { ...formData.cost, amount: num }
                });
              }}
              keyboardType="decimal-pad"
            />
            <TextInput
              className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              placeholder="USD"
              value={formData.cost.currency}
              onChangeText={(text) => updateFormData({
                cost: { ...formData.cost, currency: text }
              })}
            />
          </View>
        )}
      </View>

      {/* Tags */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          Tags (Optional)
        </Text>
        <TextInput
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
          placeholder="Enter tags separated by commas"
          value={formData.tags.join(', ')}
          onChangeText={(text) => {
            const tags = text.split(',').map(tag => tag.trim()).filter(Boolean);
            updateFormData({ tags });
          }}
        />
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          e.g., gaming, tournament, esports
        </Text>
      </View>
    </ScrollView>
  );

  const renderStep5 = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Event Settings
      </Text>

      {/* Settings toggles */}
      <View className="space-y-4">
        {[
          { key: 'allowWaitlist', label: 'Allow Waitlist', desc: 'Let people join a waitlist when capacity is full' },
          { key: 'requireApproval', label: 'Require Approval', desc: 'Manually approve each registration' },
          { key: 'allowGuests', label: 'Allow Guests', desc: 'Let attendees bring guests' },
          { key: 'sendReminders', label: 'Send Reminders', desc: 'Send automatic reminder notifications' },
          { key: 'enableCheckIn', label: 'Enable Check-in', desc: 'Allow attendees to check in at the event' },
          { key: 'allowCancellation', label: 'Allow Cancellation', desc: 'Let attendees cancel their RSVP' },
        ].map((setting) => (
          <View key={setting.key} className="flex-row items-start">
            <Pressable
              className={`w-12 h-6 rounded-full mr-3 mt-1 ${
                formData.settings[setting.key as keyof typeof formData.settings]
                  ? 'bg-blue-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              onPress={() => updateFormData({
                settings: {
                  ...formData.settings,
                  [setting.key]: !formData.settings[setting.key as keyof typeof formData.settings],
                }
              })}
            >
              <View className={`w-5 h-5 rounded-full bg-white transition-transform ${
                formData.settings[setting.key as keyof typeof formData.settings]
                  ? 'transform translate-x-6'
                  : 'transform translate-x-0.5'
              }`} />
            </Pressable>
            
            <View className="flex-1">
              <Text className="font-medium text-gray-900 dark:text-gray-100">
                {setting.label}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {setting.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Summary */}
      <View className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Event Summary
        </Text>
        <Text className="text-gray-700 dark:text-gray-300 mb-1">
          <Text className="font-medium">Title:</Text> {formData.title}
        </Text>
        <Text className="text-gray-700 dark:text-gray-300 mb-1">
          <Text className="font-medium">Type:</Text> {formData.type}
        </Text>
        <Text className="text-gray-700 dark:text-gray-300 mb-1">
          <Text className="font-medium">Date:</Text> {formData.startDate.toLocaleDateString()}
        </Text>
        <Text className="text-gray-700 dark:text-gray-300 mb-1">
          <Text className="font-medium">Format:</Text> {formData.isOnline ? 'Online' : 'In-Person'}
        </Text>
        <Text className="text-gray-700 dark:text-gray-300">
          <Text className="font-medium">Visibility:</Text> {formData.visibility}
        </Text>
      </View>
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#6B7280" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Create Event
        </Text>
        <View className="w-6" />
      </View>

      {renderProgressBar()}

      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderCurrentStep()}
      </KeyboardAvoidingView>

      {/* Navigation */}
      <View className="flex-row items-center justify-between p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <Pressable
          className={`px-6 py-3 rounded-lg ${
            currentStep === 1
              ? 'bg-gray-200 dark:bg-gray-700'
              : 'bg-blue-600'
          }`}
          onPress={prevStep}
          disabled={currentStep === 1}
        >
          <Text className={`font-medium ${
            currentStep === 1
              ? 'text-gray-400 dark:text-gray-500'
              : 'text-white'
          }`}>
            Previous
          </Text>
        </Pressable>

        <Text className="text-gray-600 dark:text-gray-400">
          {currentStep} / 5
        </Text>

        <Pressable
          className="bg-blue-600 px-6 py-3 rounded-lg"
          onPress={currentStep === 5 ? handleSubmit : nextStep}
          disabled={createEventMutation.isPending}
        >
          {createEventMutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-medium">
              {currentStep === 5 ? 'Create Event' : 'Next'}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Location Search Modal */}
      <LocationSearchModal
        visible={showLocationSearch}
        searchQuery={locationSearchQuery}
        onSearchChange={setLocationSearchQuery}
        searchResults={locationResults}
        isSearching={isSearchingLocation}
        onLocationSelect={selectLocation}
        onClose={() => setShowLocationSearch(false)}
        onSearch={searchLocations}
      />
    </SafeAreaView>
  );
}

// Location Search Modal Component
interface LocationSearchModalProps {
  visible: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: PlaceResult[];
  isSearching: boolean;
  onLocationSelect: (place: PlaceResult) => void;
  onClose: () => void;
  onSearch: (query: string) => void;
}

function LocationSearchModal({
  visible,
  searchQuery,
  onSearchChange,
  searchResults,
  isSearching,
  onLocationSelect,
  onClose,
  onSearch,
}: LocationSearchModalProps) {
  useEffect(() => {
    if (searchQuery.trim()) {
      const debounceTimer = setTimeout(() => {
        onSearch(searchQuery);
      }, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [searchQuery, onSearch]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Search Location
          </Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </Pressable>
        </View>

        {/* Search Input */}
        <View className="p-4">
          <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
            <Ionicons name="search-outline" size={20} color="#6B7280" />
            <TextInput
              className="flex-1 ml-2 text-gray-900 dark:text-gray-100"
              placeholder="Search for an address or venue..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={onSearchChange}
              autoFocus
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#6B7280" />
            )}
          </View>
        </View>

        {/* Search Results */}
        <ScrollView className="flex-1 px-4">
          {searchResults.map((place, index) => (
            <Pressable
              key={`${place.placeId}-${index}`}
              className="py-3 border-b border-gray-200 dark:border-gray-700"
              onPress={() => onLocationSelect(place)}
            >
              <View className="flex-row items-start">
                <Ionicons name="location-outline" size={20} color="#6B7280" className="mt-1" />
                <View className="ml-3 flex-1">
                  <Text className="font-medium text-gray-900 dark:text-gray-100">
                    {place.name}
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {place.address}
                  </Text>
                  {place.distance && (
                    <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {place.distance < 1 
                        ? `${Math.round(place.distance * 1000)}m away`
                        : `${place.distance.toFixed(1)}km away`
                      }
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          ))}

          {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
            <View className="py-8 items-center">
              <Ionicons name="search-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 dark:text-gray-400 mt-2">
                No locations found
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}