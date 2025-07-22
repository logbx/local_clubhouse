import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client-mobile';
import { websocket } from '@/lib/websocket';
import { useEvents } from '../../shared/hooks/useEvents';
import { Event } from '../../shared/components/EventCard/types';
import { MobileEventCard } from '../../components/MobileEventCard';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  const { user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const {
    isLoading,
    activeTab,
    setActiveTab,
    refreshEvents,
    searchQuery,
    setSearchQuery,
    filteredEvents,
    handleRSVP,
  } = useEvents({
    apiClient: api,
    userId: user?.id,
    enableRealtime: true,
    websocketService: websocket,
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshEvents();
    setRefreshing(false);
  };

  const handleCreateEvent = () => {
    router.push('/(tabs)/events/create');
  };

  const handleEventPress = (event: Event) => {
    router.push(`/(tabs)/events/${event.id}`);
  };

  const handleEventRSVP = async (eventId: string) => {
    try {
      await handleRSVP(eventId);
    } catch (error) {
      Alert.alert('Error', 'Failed to update RSVP. Please try again.');
    }
  };

  const handleTournamentPress = (event: Event) => {
    router.push(`/(tabs)/tournaments/${event.id}`);
  };

  const canEditEvent = (event: Event) => {
    if (!user || !event) return false;
    
    return (
      (event.creator && user.id === event.creator.id) ||
      (event.creatorId && user.id === event.creatorId) ||
      (typeof event.creator === 'string' && user.id === event.creator)
    );
  };

  const isUserRsvped = (event: Event) => {
    return event.rsvps.some(rsvp => rsvp.id === user?.id);
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                backgroundColor: showSearch ? '#6b7280' : '#f3f4f6',
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }}
            >
              <Ionicons name="search" size={20} color={showSearch ? 'white' : '#374151'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                backgroundColor: '#3b82f6',
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={handleCreateEvent}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
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
                  {(user?.name || user?.username || user?.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
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
          marginBottom: showSearch ? 12 : 20,
        }}>
          Welcome back, {user?.name || user?.username}!
        </Text>

        {/* Search Input */}
        {showSearch && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f3f4f6',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginBottom: 20,
          }}>
            <Ionicons name="search" size={20} color="#6b7280" />
            <TextInput
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: 16,
                color: '#111827',
              }}
              placeholder="Search events..."
              placeholderTextColor="#6b7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={{ padding: 4 }}
                onPress={() => setSearchQuery('')}
              >
                <Ionicons name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tabs */}
        <View style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}>
          {(['LIVE', 'PAST'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: activeTab === status ? '#3b82f6' : 'transparent',
                alignItems: 'center',
              }}
              onPress={() => setActiveTab(status)}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: activeTab === status ? '600' : '500',
                color: activeTab === status ? '#3b82f6' : '#6b7280',
                textTransform: 'capitalize',
              }}>
                {status.toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ padding: 16 }}>
          {isLoading ? (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 60,
            }}>
              <Ionicons name="refresh" size={32} color="#6b7280" />
              <Text style={{
                fontSize: 16,
                color: '#6b7280',
                marginTop: 12,
              }}>
                Loading events...
              </Text>
            </View>
          ) : filteredEvents.length === 0 ? (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 60,
            }}>
              <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#111827',
                marginTop: 16,
                marginBottom: 8,
              }}>
                {searchQuery ? 'No matching events' : 'No events found'}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#6b7280',
                textAlign: 'center',
              }}>
                {searchQuery 
                  ? `No events match "${searchQuery}". Try different keywords.`
                  : 'Get started by creating a new event.'
                }
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {filteredEvents.map((event: Event) => (
                <MobileEventCard
                  key={event.id}
                  event={event}
                  onPress={() => handleEventPress(event)}
                  onRsvp={() => handleEventRSVP(event.id)}
                  isRsvped={isUserRsvped(event)}
                  canEdit={canEditEvent(event)}
                  user={user}
                  onTournamentPress={() => handleTournamentPress(event)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

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