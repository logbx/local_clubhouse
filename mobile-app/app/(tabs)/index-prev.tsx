import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Mock user data for now
  const user = {
    name: 'Test User',
    email: 'test@example.com'
  };

  const profileMenuItems = [
    { 
      id: 'clubs', 
      label: 'Clubs', 
      icon: 'people-outline',
      onPress: () => {
        setShowProfileMenu(false);
        router.push('/(tabs)/clubs');
      }
    },
    { 
      id: 'sponsors', 
      label: 'Sponsors', 
      icon: 'business-outline',
      onPress: () => {
        setShowProfileMenu(false);
        Alert.alert('Coming Soon', 'Sponsors feature will be available soon');
      }
    },
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: 'person-outline',
      onPress: () => {
        setShowProfileMenu(false);
        router.push('/(tabs)/profile');
      }
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: 'settings-outline',
      onPress: () => {
        setShowProfileMenu(false);
        router.push('/(tabs)/settings/notifications');
      }
    },
  ];

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
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <Text style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#111827',
          }}>
            Home
          </Text>
          
          {/* Profile Icon */}
          <TouchableOpacity
            style={{
              width: 44,
              height: 44,
              backgroundColor: showProfileMenu ? '#6b7280' : '#f3f4f6',
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
            onPress={() => setShowProfileMenu(!showProfileMenu)}
          >
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#3b82f6',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: 'white',
              }}>
                {(user?.name || 'U')[0].toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Profile Menu */}
        {showProfileMenu && (
          <View style={{
            position: 'absolute',
            top: 110,
            right: 24,
            backgroundColor: 'white',
            borderRadius: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
            zIndex: 1000,
            minWidth: 150,
          }}>
            {profileMenuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderBottomWidth: index < profileMenuItems.length - 1 ? 1 : 0,
                  borderBottomColor: '#f3f4f6',
                }}
                onPress={item.onPress}
              >
                <Ionicons name={item.icon as any} size={18} color="#6b7280" />
                <Text style={{
                  marginLeft: 12,
                  fontSize: 16,
                  color: '#111827',
                }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={{
          fontSize: 16,
          color: '#6b7280',
        }}>
          Welcome back, {user?.name}!
        </Text>
      </View>

      {/* Content */}
      <View style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}>
        <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          color: '#111827',
          marginTop: 16,
          marginBottom: 8,
        }}>
          Dashboard Ready!
        </Text>
        <Text style={{
          fontSize: 16,
          color: '#6b7280',
          textAlign: 'center',
        }}>
          Navigation: Home & Social tabs ✓{'\n'}
          Profile dropdown menu ✓{'\n'}
          Shared components architecture ✓
        </Text>
      </View>

      {/* Close profile menu overlay */}
      {showProfileMenu && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onPress={() => setShowProfileMenu(false)}
          activeOpacity={1}
        />
      )}
    </View>
  );
}