import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEventCalendar } from '@/hooks/useCalendar';

interface CalendarButtonProps {
  eventId: string;
  eventData: {
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    location?: string;
    url?: string;
    isAllDay?: boolean;
  };
  userPreferences?: {
    reminder24h?: boolean;
    reminder1h?: boolean;
    reminder15m?: boolean;
  };
  variant?: 'button' | 'icon' | 'full';
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  onCalendarAction?: (action: 'added' | 'removed' | 'shared', success: boolean) => void;
}

export function CalendarButton({
  eventId,
  eventData,
  userPreferences,
  variant = 'button',
  size = 'medium',
  showText = true,
  onCalendarAction,
}: CalendarButtonProps) {
  const {
    hasPermission,
    canRequestPermission,
    isLoading,
    error,
    isEventInCalendar,
    addEvent,
    removeEvent,
    shareEvent,
    requestPermissions,
    clearError,
  } = useEventCalendar();

  const [showOptions, setShowOptions] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isInCalendar = isEventInCalendar(eventId);

  const handleCalendarToggle = async () => {
    if (!hasPermission) {
      if (!canRequestPermission) {
        Alert.alert(
          'Permission Required',
          'Please enable calendar access in your device settings to add events to your calendar.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Platform.OS === 'ios' ? 
              require('react-native').Linking.openSettings() : 
              require('react-native').Linking.openSettings() 
            },
          ]
        );
        return;
      }

      const granted = await requestPermissions();
      if (!granted) {
        return;
      }
    }

    if (variant === 'full') {
      setShowOptions(true);
      return;
    }

    setActionLoading('toggle');
    try {
      if (isInCalendar) {
        const success = await removeEvent(eventId);
        onCalendarAction?.('removed', success);
      } else {
        const eventToAdd = {
          id: eventId,
          ...eventData,
          reminders: userPreferences,
        };
        const success = await addEvent(eventToAdd);
        onCalendarAction?.('added', !!success);
      }
    } catch (error) {
      console.error('Calendar action error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddToCalendar = async () => {
    setActionLoading('add');
    try {
      const eventToAdd = {
        id: eventId,
        ...eventData,
        reminders: userPreferences,
      };
      const success = await addEvent(eventToAdd);
      onCalendarAction?.('added', !!success);
      setShowOptions(false);
    } catch (error) {
      console.error('Add to calendar error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFromCalendar = async () => {
    Alert.alert(
      'Remove from Calendar',
      'Are you sure you want to remove this event from your calendar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('remove');
            try {
              const success = await removeEvent(eventId);
              onCalendarAction?.('removed', success);
              setShowOptions(false);
            } catch (error) {
              console.error('Remove from calendar error:', error);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleShareEvent = async () => {
    setActionLoading('share');
    try {
      const calendarEvent = {
        title: eventData.title,
        notes: eventData.description,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        location: eventData.location,
        url: eventData.url,
        allDay: eventData.isAllDay || false,
      };
      await shareEvent(calendarEvent);
      onCalendarAction?.('shared', true);
      setShowOptions(false);
    } catch (error) {
      console.error('Share event error:', error);
      onCalendarAction?.('shared', false);
    } finally {
      setActionLoading(null);
    }
  };

  const getButtonStyles = () => {
    const baseStyles = 'rounded-lg flex-row items-center justify-center';
    
    switch (size) {
      case 'small':
        return `${baseStyles} px-2 py-1`;
      case 'large':
        return `${baseStyles} px-6 py-4`;
      default:
        return `${baseStyles} px-4 py-2`;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 28;
      default: return 20;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  const renderIconButton = () => (
    <Pressable
      className={`${getButtonStyles()} ${
        isInCalendar 
          ? 'bg-green-100 dark:bg-green-900' 
          : 'bg-blue-100 dark:bg-blue-900'
      }`}
      onPress={handleCalendarToggle}
      disabled={isLoading || !!actionLoading}
    >
      {(isLoading || actionLoading === 'toggle') ? (
        <ActivityIndicator 
          size="small" 
          color={isInCalendar ? '#10B981' : '#3B82F6'} 
        />
      ) : (
        <Ionicons
          name={isInCalendar ? 'calendar-check' : 'calendar-outline'}
          size={getIconSize()}
          color={isInCalendar ? '#10B981' : '#3B82F6'}
        />
      )}
    </Pressable>
  );

  const renderButton = () => (
    <Pressable
      className={`${getButtonStyles()} ${
        isInCalendar 
          ? 'bg-green-600' 
          : 'bg-blue-600'
      }`}
      onPress={handleCalendarToggle}
      disabled={isLoading || !!actionLoading}
    >
      {(isLoading || actionLoading === 'toggle') ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <>
          <Ionicons
            name={isInCalendar ? 'calendar-check' : 'calendar-outline'}
            size={getIconSize()}
            color="white"
          />
          {showText && (
            <Text className={`text-white font-medium ml-2 ${getTextSize()}`}>
              {isInCalendar ? 'In Calendar' : 'Add to Calendar'}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );

  const renderFullOptions = () => (
    <Pressable
      className={`${getButtonStyles()} bg-blue-600`}
      onPress={handleCalendarToggle}
      disabled={isLoading || !!actionLoading}
    >
      {(isLoading || actionLoading) ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <>
          <Ionicons name="calendar-outline" size={getIconSize()} color="white" />
          {showText && (
            <Text className={`text-white font-medium ml-2 ${getTextSize()}`}>
              Calendar Options
            </Text>
          )}
        </>
      )}
    </Pressable>
  );

  const renderOptionsModal = () => (
    <Modal
      visible={showOptions}
      transparent
      animationType="fade"
      onRequestClose={() => setShowOptions(false)}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
            Calendar Options
          </Text>

          {/* Add to Calendar */}
          {!isInCalendar && (
            <Pressable
              className="flex-row items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900 mb-3"
              onPress={handleAddToCalendar}
              disabled={!!actionLoading}
            >
              {actionLoading === 'add' ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
              )}
              <Text className="ml-3 text-blue-800 dark:text-blue-200 font-medium">
                Add to Calendar
              </Text>
            </Pressable>
          )}

          {/* Remove from Calendar */}
          {isInCalendar && (
            <Pressable
              className="flex-row items-center p-3 rounded-lg bg-red-50 dark:bg-red-900 mb-3"
              onPress={handleRemoveFromCalendar}
              disabled={!!actionLoading}
            >
              {actionLoading === 'remove' ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Ionicons name="calendar-clear" size={20} color="#EF4444" />
              )}
              <Text className="ml-3 text-red-800 dark:text-red-200 font-medium">
                Remove from Calendar
              </Text>
            </Pressable>
          )}

          {/* Share Event */}
          <Pressable
            className="flex-row items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700 mb-4"
            onPress={handleShareEvent}
            disabled={!!actionLoading}
          >
            {actionLoading === 'share' ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Ionicons name="share-outline" size={20} color="#6B7280" />
            )}
            <Text className="ml-3 text-gray-700 dark:text-gray-300 font-medium">
              Share Event (.ics)
            </Text>
          </Pressable>

          {/* Close Button */}
          <Pressable
            className="bg-gray-200 dark:bg-gray-600 rounded-lg py-3"
            onPress={() => setShowOptions(false)}
          >
            <Text className="text-gray-700 dark:text-gray-300 font-medium text-center">
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  // Show error if any
  if (error) {
    return (
      <Pressable
        className="flex-row items-center px-3 py-2 bg-red-100 dark:bg-red-900 rounded-lg"
        onPress={clearError}
      >
        <Ionicons name="alert-circle" size={16} color="#EF4444" />
        <Text className="ml-2 text-red-800 dark:text-red-200 text-sm">
          Calendar Error
        </Text>
      </Pressable>
    );
  }

  return (
    <View>
      {variant === 'icon' && renderIconButton()}
      {variant === 'button' && renderButton()}
      {variant === 'full' && renderFullOptions()}
      {variant === 'full' && renderOptionsModal()}
    </View>
  );
}

// Convenience component for event details screens
export function EventCalendarActions({
  eventId,
  eventData,
  userPreferences,
}: {
  eventId: string;
  eventData: CalendarButtonProps['eventData'];
  userPreferences?: CalendarButtonProps['userPreferences'];
}) {
  return (
    <View className="flex-row items-center space-x-3">
      <CalendarButton
        eventId={eventId}
        eventData={eventData}
        userPreferences={userPreferences}
        variant="button"
        size="medium"
      />
      <CalendarButton
        eventId={eventId}
        eventData={eventData}
        userPreferences={userPreferences}
        variant="icon"
        size="medium"
        showText={false}
        onCalendarAction={(action, success) => {
          if (action === 'shared' && success) {
            // Could show a toast or other feedback
            console.log('Event shared successfully');
          }
        }}
      />
    </View>
  );
}