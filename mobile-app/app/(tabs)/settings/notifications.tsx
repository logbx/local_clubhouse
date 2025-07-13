import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useNotificationSettings } from '@/contexts/NotificationContext';
import { NotificationSettings } from '@/lib/services/notification.service';

interface SettingToggleProps {
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
  icon?: string;
}

function SettingToggle({ title, description, value, onToggle, disabled, icon }: SettingToggleProps) {
  return (
    <Pressable
      className={`flex-row items-center justify-between p-4 ${
        disabled ? 'opacity-50' : ''
      }`}
      onPress={onToggle}
      disabled={disabled}
    >
      <View className="flex-1 flex-row items-center">
        {icon && (
          <View className="mr-3">
            <Ionicons name={icon as any} size={20} color="#6B7280" />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
            {title}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </Text>
        </View>
      </View>
      
      <View className={`w-12 h-6 rounded-full ${
        value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}>
        <View className={`w-5 h-5 rounded-full bg-white transition-transform ${
          value ? 'transform translate-x-6' : 'transform translate-x-0.5'
        }`} />
      </View>
    </Pressable>
  );
}

export default function NotificationSettingsScreen() {
  const { 
    settings, 
    updateSettings, 
    permissionStatus, 
    requestPermissions,
    isEnabled 
  } = useNotificationSettings();
  
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      await updateSettings({ [key]: value });
    } catch (error) {
      Alert.alert(
        'Error', 
        'Failed to update notification settings. Please try again.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRequestPermissions = async () => {
    try {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'To receive notifications, please enable them in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request notification permissions.');
    }
  };

  const renderPermissionSection = () => {
    if (permissionStatus === 'granted') {
      return (
        <View className="bg-green-50 dark:bg-green-900 p-4 m-4 rounded-lg">
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text className="ml-2 font-medium text-green-800 dark:text-green-200">
              Notifications Enabled
            </Text>
          </View>
          <Text className="text-sm text-green-700 dark:text-green-300 mt-1">
            You'll receive notifications based on your preferences below.
          </Text>
        </View>
      );
    }

    if (permissionStatus === 'denied') {
      return (
        <View className="bg-red-50 dark:bg-red-900 p-4 m-4 rounded-lg">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text className="ml-2 font-medium text-red-800 dark:text-red-200">
                  Notifications Disabled
                </Text>
              </View>
              <Text className="text-sm text-red-700 dark:text-red-300 mt-1">
                Enable notifications in Settings to receive event updates.
              </Text>
            </View>
            <Pressable
              className="bg-red-600 px-3 py-2 rounded-lg ml-3"
              onPress={() => Linking.openSettings()}
            >
              <Text className="text-white font-medium text-sm">Settings</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View className="bg-yellow-50 dark:bg-yellow-900 p-4 m-4 rounded-lg">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center">
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text className="ml-2 font-medium text-yellow-800 dark:text-yellow-200">
                Permission Required
              </Text>
            </View>
            <Text className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Allow notifications to receive event reminders and updates.
            </Text>
          </View>
          <Pressable
            className="bg-yellow-600 px-3 py-2 rounded-lg ml-3"
            onPress={handleRequestPermissions}
          >
            <Text className="text-white font-medium text-sm">Allow</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Notification Settings
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1">
        {renderPermissionSection()}

        {/* Master Toggle */}
        <View className="bg-white dark:bg-gray-800 mt-4">
          <SettingToggle
            title="Enable Notifications"
            description="Turn on all app notifications"
            value={settings.enabled}
            onToggle={() => handleToggle('enabled', !settings.enabled)}
            icon="notifications-outline"
            disabled={permissionStatus !== 'granted'}
          />
        </View>

        {/* RSVP Notifications */}
        <View className="bg-white dark:bg-gray-800 mt-4">
          <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              RSVP & Confirmations
            </Text>
          </View>
          
          <SettingToggle
            title="RSVP Confirmations"
            description="Get notified when your RSVP is confirmed"
            value={settings.rsvpConfirmation}
            onToggle={() => handleToggle('rsvpConfirmation', !settings.rsvpConfirmation)}
            disabled={!isEnabled}
            icon="checkmark-circle-outline"
          />
          
          <SettingToggle
            title="Waitlist Updates"
            description="Notifications when moved from waitlist to confirmed"
            value={settings.waitlistUpdates}
            onToggle={() => handleToggle('waitlistUpdates', !settings.waitlistUpdates)}
            disabled={!isEnabled}
            icon="arrow-up-circle-outline"
          />
        </View>

        {/* Event Reminders */}
        <View className="bg-white dark:bg-gray-800 mt-4">
          <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Event Reminders
            </Text>
          </View>
          
          <SettingToggle
            title="Event Reminders"
            description="Receive reminders before events start"
            value={settings.eventReminders}
            onToggle={() => handleToggle('eventReminders', !settings.eventReminders)}
            disabled={!isEnabled}
            icon="time-outline"
          />
          
          <SettingToggle
            title="24 Hour Reminder"
            description="Remind me 1 day before the event"
            value={settings.reminder24h}
            onToggle={() => handleToggle('reminder24h', !settings.reminder24h)}
            disabled={!isEnabled || !settings.eventReminders}
            icon="calendar-outline"
          />
          
          <SettingToggle
            title="1 Hour Reminder"
            description="Remind me 1 hour before the event"
            value={settings.reminder1h}
            onToggle={() => handleToggle('reminder1h', !settings.reminder1h)}
            disabled={!isEnabled || !settings.eventReminders}
            icon="alarm-outline"
          />
          
          <SettingToggle
            title="15 Minute Reminder"
            description="Remind me 15 minutes before the event"
            value={settings.reminder15m}
            onToggle={() => handleToggle('reminder15m', !settings.reminder15m)}
            disabled={!isEnabled || !settings.eventReminders}
            icon="timer-outline"
          />
        </View>

        {/* Event Updates */}
        <View className="bg-white dark:bg-gray-800 mt-4">
          <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Event Updates
            </Text>
          </View>
          
          <SettingToggle
            title="Event Updates"
            description="Changes to event details, time, or location"
            value={settings.eventUpdates}
            onToggle={() => handleToggle('eventUpdates', !settings.eventUpdates)}
            disabled={!isEnabled}
            icon="information-circle-outline"
          />
          
          <SettingToggle
            title="Event Cancellations"
            description="Notifications when events are cancelled"
            value={settings.eventCancellation}
            onToggle={() => handleToggle('eventCancellation', !settings.eventCancellation)}
            disabled={!isEnabled}
            icon="close-circle-outline"
          />
          
          <SettingToggle
            title="Check-in Reminders"
            description="Reminders to check in at events"
            value={settings.checkInReminders}
            onToggle={() => handleToggle('checkInReminders', !settings.checkInReminders)}
            disabled={!isEnabled}
            icon="location-outline"
          />
        </View>

        {/* Notification Preferences */}
        <View className="bg-white dark:bg-gray-800 mt-4 mb-8">
          <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Notification Style
            </Text>
          </View>
          
          <SettingToggle
            title="Sound"
            description="Play sound with notifications"
            value={settings.soundEnabled}
            onToggle={() => handleToggle('soundEnabled', !settings.soundEnabled)}
            disabled={!isEnabled}
            icon="volume-high-outline"
          />
          
          <SettingToggle
            title="Vibration"
            description="Vibrate with notifications"
            value={settings.vibrationEnabled}
            onToggle={() => handleToggle('vibrationEnabled', !settings.vibrationEnabled)}
            disabled={!isEnabled}
            icon="phone-portrait-outline"
          />
        </View>

        {/* Loading Overlay */}
        {isUpdating && (
          <View className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <View className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-gray-900 dark:text-gray-100 mt-2">
                Updating settings...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}