import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Copy the exact event structure from web dashboard
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
  features?: string[];
  imageUrl?: string;
  cost?: number;
  isFree: boolean;
  rsvps: Array<{ id: string; username: string }>;
  creator: {
    id: string;
    username: string;
  };
  visibility: string;
}

export default function HomeScreen() {
  // Copy the exact state structure from web dashboard
  const [activeTab, setActiveTab] = useState<EventStatus>('LIVE');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Mock user data (will be replaced with real auth)
  const user = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com'
  };

  // Mock events data (copy structure from web dashboard)
  const events: Event[] = [
    {
      id: 'event-1',
      title: 'Weekly Chess Tournament',
      description: 'Join our weekly tournament for all skill levels',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      location: 'Main Club Room',
      status: 'LIVE',
      tags: ['tournament', 'weekly'],
      features: ['SINGLE_ELIMINATION_TOURNAMENT'],
      isFree: true,
      rsvps: [
        { id: 'user-1', username: 'player1' },
        { id: 'user-2', username: 'player2' }
      ],
      creator: { id: 'user-1', username: 'organizer' },
      visibility: 'PUBLIC'
    },
    {
      id: 'event-2', 
      title: 'Chess Strategy Workshop',
      description: 'Learn advanced chess strategies from grandmaster',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
      location: 'Online',
      status: 'PAST',
      tags: ['workshop', 'strategy'],
      isFree: false,
      cost: 25,
      rsvps: [{ id: 'user-1', username: 'student1' }],
      creator: { id: 'user-3', username: 'grandmaster' },
      visibility: 'PUBLIC'
    }
  ];

  // Copy the filtering logic from web dashboard
  const filteredEvents = events.filter((event: Event) => {
    const matchesStatus = event.status === activeTab && event.visibility !== 'CLUB';
    return matchesStatus;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleCreateEvent = () => {
    router.push('/(tabs)/events/create');
  };

  const handleEventPress = (event: Event) => {
    router.push(`/(tabs)/events/${event.id}`);
  };

  const canEditEvent = (event: Event) => {
    if (!user || !event) return false;
    return user.id === event.creator.id;
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

  // Copy the event status color logic from web
  const getEventStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'DRAFT':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'LIVE':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'PAST':
        return { backgroundColor: '#f3f4f6', color: '#374151' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    })} - ${end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    })}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Header - Copy from web dashboard structure */}
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
            Events
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
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
                  {(user?.name || 'U')[0].toUpperCase()}
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

        {/* Tabs - Copy exact structure from web */}
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

      {/* Event Grid - Copy structure from web dashboard */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ padding: 16 }}>
          {filteredEvents.length === 0 ? (
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
                No events found
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#6b7280',
                textAlign: 'center',
              }}>
                Get started by creating a new event.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {filteredEvents.map((event: Event) => {
                const statusStyle = getEventStatusColor(event.status);
                const hasTournament = event.features?.includes('SINGLE_ELIMINATION_TOURNAMENT') || 
                                    event.features?.includes('SWISS_TOURNAMENT');

                return (
                  <TouchableOpacity
                    key={event.id}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 12,
                      padding: 16,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                    }}
                    onPress={() => handleEventPress(event)}
                    activeOpacity={0.7}
                  >
                    {/* Header */}
                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        backgroundColor: statusStyle.backgroundColor,
                      }}>
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: statusStyle.color,
                          textTransform: 'uppercase',
                        }}>
                          {event.status}
                        </Text>
                      </View>
                      <Text style={{
                        fontSize: 14,
                        color: '#6b7280',
                      }}>
                        {formatDate(event.startDate)}
                      </Text>
                    </View>

                    {/* Title */}
                    <Text style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: 8,
                    }}>
                      {event.title}
                    </Text>

                    {/* Description */}
                    <Text style={{
                      fontSize: 14,
                      color: '#6b7280',
                      marginBottom: 12,
                      lineHeight: 20,
                    }}
                    numberOfLines={2}
                    >
                      {event.description}
                    </Text>

                    {/* Details */}
                    <View style={{ gap: 8, marginBottom: 16 }}>
                      {/* Time */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <Ionicons name="time-outline" size={16} color="#6b7280" />
                        <Text style={{
                          fontSize: 14,
                          color: '#6b7280',
                          marginLeft: 8,
                        }}>
                          {formatTime(event.startDate, event.endDate)}
                        </Text>
                      </View>

                      {/* Location */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <Ionicons name="location-outline" size={16} color="#6b7280" />
                        <Text style={{
                          fontSize: 14,
                          color: '#6b7280',
                          marginLeft: 8,
                        }}>
                          {event.location}
                        </Text>
                      </View>

                      {/* RSVPs */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <Ionicons name="people-outline" size={16} color="#6b7280" />
                        <Text style={{
                          fontSize: 14,
                          color: '#6b7280',
                          marginLeft: 8,
                        }}>
                          {event.rsvps.length} RSVPs
                        </Text>
                      </View>

                      {/* Cost */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <Ionicons name="card-outline" size={16} color="#6b7280" />
                        <Text style={{
                          fontSize: 14,
                          color: '#6b7280',
                          marginLeft: 8,
                        }}>
                          {event.isFree ? 'Free' : `$${event.cost}`}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={{
                      flexDirection: 'row',
                      gap: 8,
                    }}>
                      {canEditEvent(event) ? (
                        <>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#f3f4f6',
                              paddingVertical: 12,
                              borderRadius: 8,
                              alignItems: 'center',
                            }}
                            onPress={(e) => {
                              e.stopPropagation();
                              Alert.alert('Edit Event', 'Edit functionality coming soon');
                            }}
                          >
                            <Text style={{
                              fontSize: 14,
                              fontWeight: '600',
                              color: '#374151',
                            }}>
                              Edit
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#3b82f6',
                              paddingVertical: 12,
                              borderRadius: 8,
                              alignItems: 'center',
                            }}
                            onPress={() => handleEventPress(event)}
                          >
                            <Text style={{
                              fontSize: 14,
                              fontWeight: '600',
                              color: 'white',
                            }}>
                              View Details
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: '#3b82f6',
                            paddingVertical: 12,
                            borderRadius: 8,
                            alignItems: 'center',
                          }}
                          onPress={() => handleEventPress(event)}
                        >
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: 'white',
                          }}>
                            View Details
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Tournament Button */}
                    {hasTournament && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#1e40af',
                          paddingVertical: 12,
                          borderRadius: 8,
                          alignItems: 'center',
                          marginTop: 8,
                          flexDirection: 'row',
                          justifyContent: 'center',
                        }}
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert('Tournament', 'Tournament functionality coming soon');
                        }}
                      >
                        <Ionicons name="trophy-outline" size={16} color="white" />
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: 'white',
                          marginLeft: 8,
                        }}>
                          View Tournament
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
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