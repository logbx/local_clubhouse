import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { TestProviders } from '../components/TestProviders';
import { NavigationExample } from '../components/NavigationExample';

export default function HomePage() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🏆 Local Clubhouse</Text>
        <Text style={styles.subtitle}>Connect with Local Clubs & Communities</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✨ Welcome to the Mobile App!</Text>
          <Text style={styles.cardText}>
            This is your Local Clubhouse mobile app running in development mode.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚀 Getting Started</Text>
          <Text style={styles.cardText}>• Join local clubs and communities</Text>
          <Text style={styles.cardText}>• Participate in events and tournaments</Text>
          <Text style={styles.cardText}>• Connect with like-minded people</Text>
          <Text style={styles.cardText}>• Real-time chat and notifications</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📱 Platform Support</Text>
          <Text style={styles.cardText}>
            ✅ iOS Simulator{'\n'}
            ✅ Android Emulator{'\n'}
            ✅ Web Browser{'\n'}
            ✅ Physical Device (Expo Go)
          </Text>
        </View>

        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>🔧 Development Info</Text>
          <Text style={styles.debugText}>API URL: {process.env.EXPO_PUBLIC_API_URL || 'Not configured'}</Text>
          <Text style={styles.debugText}>Environment: {process.env.EXPO_PUBLIC_ENVIRONMENT || 'development'}</Text>
          <Text style={styles.debugText}>Debug Mode: {__DEV__ ? 'Enabled' : 'Disabled'}</Text>
        </View>

        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>🎯 Start Exploring</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧪 Provider Test</Text>
          <TestProviders />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧭 Navigation Test</Text>
          <NavigationExample />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 32,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 4,
  },
  debugSection: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});