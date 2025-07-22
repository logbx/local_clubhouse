import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client-mobile';
import { MobileEventCard } from '@/components/MobileEventCard';
import { StatusBar } from 'expo-status-bar';
import { websocket } from '@/lib/websocket';

type EventStatus = 'LIVE' | 'PAST' | 'DRAFT';

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: EventStatus;
  tags: string[];
  features: string[];
  imageUrl?: string;
  cost?: number;
  isFree: boolean;
  rsvps: Array<{ id: string; username: string }>;
  creator: {
    id: string;
    username: string;
  };
  clubName?: string;
  clubUsername?: string;
  clubLogoUrl?: string;
  creatorId: string;
  visibility: string;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<EventStatus>('LIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Load events
  const { 
    data: events, 
    isLoading, 
    refetch: refetchEvents 
  } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      try {
        const response = await api.get('/events');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching events:', error);
        return [];
      }
    },
  });

  // WebSocket connection and real-time updates
  useEffect(() => {
    if (!user) return;

    const connectWebSocket = async () => {
      try {
        await websocket.connect();
        websocket.joinEventsRoom();
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    };

    connectWebSocket();

    // Set up event listeners for real-time updates
    const unsubscribeEventCreated = websocket.on('event_created', (newEvent: Event) => {
      queryClient.setQueryData(['events'], (oldData: Event[] | undefined) => {
        if (!oldData) return [newEvent];
        return [newEvent, ...oldData];
      });
    });

    const unsubscribeEventUpdated = websocket.on('event_updated', (updatedEvent: Event) => {
      queryClient.setQueryData(['events'], (oldData: Event[] | undefined) => {
        if (!oldData) return [updatedEvent];
        return oldData.map(event => 
          event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event
        );
      });
    });

    const unsubscribeEventDeleted = websocket.on('event_deleted', (data: { eventId: string }) => {
      queryClient.setQueryData(['events'], (oldData: Event[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(event => event.id !== data.eventId);
      });
    });

    const unsubscribeEventRsvpChanged = websocket.on('event_rsvp_changed', (data: { eventId: string; rsvps: any[] }) => {
      queryClient.setQueryData(['events'], (oldData: Event[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(event => 
          event.id === data.eventId ? { ...event, rsvps: data.rsvps } : event
        );
      });
    });

    const unsubscribeEventStatusChanged = websocket.on('event_status_changed', (data: { eventId: string; status: EventStatus }) => {
      queryClient.setQueryData(['events'], (oldData: Event[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(event => 
          event.id === data.eventId ? { ...event, status: data.status } : event
        );
      });
    });

    return () => {
      unsubscribeEventCreated();
      unsubscribeEventUpdated();
      unsubscribeEventDeleted();
      unsubscribeEventRsvpChanged();
      unsubscribeEventStatusChanged();
      websocket.leaveEventsRoom();
    };
  }, [user, queryClient]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchEvents();
    setRefreshing(false);
  };

  const filteredEvents = events?.filter((event: Event) => {
    const matchesStatus = event.status === activeTab && event.visibility !== 'CLUB';
    const matchesSearch = !searchQuery || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  }) || [];

  const getEventStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'LIVE':
        return 'bg-green-100 text-green-800';
      case 'PAST':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canEditEvent = (event: Event) => {
    if (!user || !event) return false;
    
    return (
      (event.creator && user.id === event.creator.id) ||
      (event.creatorId && user.id === event.creatorId) ||
      (typeof event.creator === 'string' && user.id === event.creator)
    );
  };

  const handleCreateEvent = () => {
    router.push('/(tabs)/events/create');
  };

  const handleEventPress = (event: Event) => {
    router.push(`/(tabs)/events/${event.id}`);
  };

  const handleRsvp = async (eventId: string) => {
    if (!user) return;
    
    try {
      await api.post(`/events/${eventId}/rsvp`);
      refetchEvents();
    } catch (error) {
      console.error('Error updating RSVP:', error);
      Alert.alert('Error', 'Failed to update RSVP. Please try again.');
    }
  };

  const isUserRsvped = (event: Event) => {
    return event.rsvps.some(rsvp => rsvp.id === user?.id);
  };

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
            Dashboard
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
          </View>
        </View>

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
          {(['LIVE', 'PAST'] as EventStatus[]).map((status) => (
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
                  onRsvp={() => handleRsvp(event.id)}
                  isRsvped={isUserRsvped(event)}
                  canEdit={canEditEvent(event)}
                  user={user}
                  onTournamentPress={() => {
                    const hasTournament = event.features && (
                      event.features.includes('SINGLE_ELIMINATION_TOURNAMENT') || 
                      event.features.includes('SWISS_TOURNAMENT')
                    );
                    if (hasTournament) {
                      router.push(`/(tabs)/tournaments/${event.id}`);
                    }
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}