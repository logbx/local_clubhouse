import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function SocialScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={{
        backgroundColor: 'white',
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
      }}>
        <Text style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: '#111827',
        }}>
          Social
        </Text>
      </View>

      {/* Content */}
      <View style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}>
        <Ionicons name="people-circle-outline" size={64} color="#9ca3af" />
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          color: '#111827',
          marginTop: 16,
          marginBottom: 8,
        }}>
          Social Features
        </Text>
        <Text style={{
          fontSize: 16,
          color: '#6b7280',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          Messages, Friends, and Groups{'\n'}
          coming soon!
        </Text>
        
        <TouchableOpacity
          style={{
            backgroundColor: '#3b82f6',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{
            color: 'white',
            fontSize: 16,
            fontWeight: '600',
          }}>
            Enable Social Features
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}