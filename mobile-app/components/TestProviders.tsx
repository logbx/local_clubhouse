import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useLocationContext } from '../contexts/LocationContext';
import { useAuth } from '../hooks/useAuth';

export function TestProviders() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { isPermissionGranted, requestPermission } = useNotifications();
  const { currentLocation, requestLocation } = useLocationContext();
  const { user } = useAuth();

  const handleTestNotifications = async () => {
    if (!isPermissionGranted) {
      const granted = await requestPermission();
      Alert.alert('Notification Permission', granted ? 'Granted' : 'Denied');
    } else {
      Alert.alert('Notifications', 'Permission already granted');
    }
  };

  const handleTestLocation = async () => {
    const location = await requestLocation();
    Alert.alert(
      'Location', 
      location ? `Lat: ${location.latitude}, Lng: ${location.longitude}` : 'Failed to get location'
    );
  };

  return (
    <View className="flex-1 justify-center items-center p-4 bg-white dark:bg-gray-900">
      <Text className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Provider Test Screen
      </Text>
      
      <View className="space-y-4 w-full max-w-sm">
        <TouchableOpacity
          onPress={toggleTheme}
          className="bg-blue-500 p-3 rounded-lg"
        >
          <Text className="text-white text-center font-medium">
            Theme: {theme} (Currently {isDark ? 'Dark' : 'Light'})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleTestNotifications}
          className="bg-green-500 p-3 rounded-lg"
        >
          <Text className="text-white text-center font-medium">
            Test Notifications {isPermissionGranted ? '✓' : '✗'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleTestLocation}
          className="bg-purple-500 p-3 rounded-lg"
        >
          <Text className="text-white text-center font-medium">
            Test Location {currentLocation ? '✓' : '✗'}
          </Text>
        </TouchableOpacity>

        <View className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
          <Text className="text-gray-900 dark:text-white text-center">
            User: {user ? user.name : 'Not logged in'}
          </Text>
        </View>
      </View>
    </View>
  );
}