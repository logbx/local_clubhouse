import React from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' }}>
      <StatusBar style="dark" />
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
        Home Screen
      </Text>
      <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 8 }}>
        Shared components loaded successfully!
      </Text>
    </View>
  );
}