import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client-mobile';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user stats
  const { 
    data: userStats, 
    refetch: refetchStats 
  } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/users/stats');
        return response.data || {};
      } catch (error) {
        console.error('Error fetching user stats:', error);
        return {};
      }
    },
    enabled: !!user,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchStats();
    setRefreshing(false);
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing will be implemented soon');
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Settings will be implemented soon');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: logout
        }
      ]
    );
  };

  const handleViewClubs = () => {
    router.push('/(tabs)/clubs');
  };

  const handleViewEvents = () => {
    router.push('/(tabs)/events');
  };

  const handleViewTournaments = () => {
    router.push('/(tabs)/tournaments');
  };

  const menuItems = [
    {
      icon: 'person-outline',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      onPress: handleEditProfile,
    },
    {
      icon: 'settings-outline',
      title: 'Settings',
      subtitle: 'App preferences and notifications',
      onPress: handleSettings,
    },
    {
      icon: 'help-circle-outline',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: () => Alert.alert('Help', 'Help & Support will be implemented soon'),
    },
    {
      icon: 'information-circle-outline',
      title: 'About',
      subtitle: 'App version and terms',
      onPress: () => Alert.alert('About', 'About page will be implemented soon'),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{
          backgroundColor: 'white',
          paddingTop: 20,
          paddingBottom: 24,
          paddingHorizontal: 24,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}>
          <Text style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: 24,
          }}>
            Profile
          </Text>

          {/* Profile Info */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#3b82f6',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}>
              <Text style={{
                fontSize: 32,
                fontWeight: 'bold',
                color: 'white',
              }}>
                {(user?.name || user?.username || user?.email || 'U')[0].toUpperCase()}
              </Text>
            </View>
            
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '600',
                color: '#111827',
                marginBottom: 4,
              }}>
                {user?.name || user?.username || 'User'}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#6b7280',
                marginBottom: 8,
              }}>
                {user?.email}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#f3f4f6',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  alignSelf: 'flex-start',
                }}
                onPress={handleEditProfile}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: '#374151',
                }}>
                  Edit Profile
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={{
          backgroundColor: 'white',
          margin: 16,
          borderRadius: 12,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#111827',
            marginBottom: 16,
          }}>
            Your Activity
          </Text>

          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
            <TouchableOpacity
              style={{ alignItems: 'center', flex: 1 }}
              onPress={handleViewEvents}
            >
              <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#3b82f6',
                marginBottom: 4,
              }}>
                {userStats?.eventsAttended || 0}
              </Text>
              <Text style={{
                fontSize: 12,
                color: '#6b7280',
                textAlign: 'center',
              }}>
                Events{'\n'}Attended
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ alignItems: 'center', flex: 1 }}
              onPress={handleViewTournaments}
            >
              <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#10b981',
                marginBottom: 4,
              }}>
                {userStats?.tournamentsWon || 0}
              </Text>
              <Text style={{
                fontSize: 12,
                color: '#6b7280',
                textAlign: 'center',
              }}>
                Tournaments{'\n'}Won
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ alignItems: 'center', flex: 1 }}
              onPress={handleViewClubs}
            >
              <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#f59e0b',
                marginBottom: 4,
              }}>
                {userStats?.clubsJoined || 0}
              </Text>
              <Text style={{
                fontSize: 12,
                color: '#6b7280',
                textAlign: 'center',
              }}>
                Clubs{'\n'}Joined
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{
          backgroundColor: 'white',
          marginHorizontal: 16,
          marginBottom: 16,
          borderRadius: 12,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#111827',
            marginBottom: 16,
          }}>
            Quick Actions
          </Text>

          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
            <TouchableOpacity
              style={{
                alignItems: 'center',
                flex: 1,
                padding: 12,
              }}
              onPress={() => router.push('/(tabs)/events/create')}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#dbeafe',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}>
                <Ionicons name="calendar-outline" size={24} color="#3b82f6" />
              </View>
              <Text style={{
                fontSize: 12,
                fontWeight: '500',
                color: '#374151',
                textAlign: 'center',
              }}>
                Create Event
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                alignItems: 'center',
                flex: 1,
                padding: 12,
              }}
              onPress={handleViewClubs}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#dcfce7',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}>
                <Ionicons name="people-outline" size={24} color="#10b981" />
              </View>
              <Text style={{
                fontSize: 12,
                fontWeight: '500',
                color: '#374151',
                textAlign: 'center',
              }}>
                Browse Clubs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                alignItems: 'center',
                flex: 1,
                padding: 12,
              }}
              onPress={handleViewTournaments}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#fef3c7',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}>
                <Ionicons name="trophy-outline" size={24} color="#f59e0b" />
              </View>
              <Text style={{
                fontSize: 12,
                fontWeight: '500',
                color: '#374151',
                textAlign: 'center',
              }}>
                Tournaments
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <View style={{
          backgroundColor: 'white',
          marginHorizontal: 16,
          marginBottom: 16,
          borderRadius: 12,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                borderBottomColor: '#f3f4f6',
              }}
              onPress={item.onPress}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#f3f4f6',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name={item.icon as any} size={20} color="#6b7280" />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: '#111827',
                  marginBottom: 2,
                }}>
                  {item.title}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#6b7280',
                }}>
                  {item.subtitle}
                </Text>
              </View>
              
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View style={{
          marginHorizontal: 16,
          marginBottom: 32,
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#ef4444',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
            }}
            onPress={handleLogout}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: 'white',
            }}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}