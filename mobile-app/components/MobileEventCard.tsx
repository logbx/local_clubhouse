import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Event, EventStatus } from '../shared/components/EventCard/types';

interface MobileEventCardProps {
  event: Event;
  onPress: () => void;
  onRsvp: () => void;
  isRsvped: boolean;
  canEdit: boolean;
  user: any;
  onTournamentPress?: () => void;
}

export function MobileEventCard({ 
  event, 
  onPress, 
  onRsvp, 
  isRsvped, 
  canEdit, 
  user,
  onTournamentPress
}: MobileEventCardProps) {
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
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatTime = (startDate: string, endDate: string) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return `${start.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      })} - ${end.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      })}`;
    } catch {
      return 'Invalid time';
    }
  };

  const statusStyle = getEventStatusColor(event.status);
  const hasTournament = event.features && (
    event.features.includes('SINGLE_ELIMINATION_TOURNAMENT') || 
    event.features.includes('SWISS_TOURNAMENT')
  );

  return (
    <TouchableOpacity
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
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Event Image */}
      {event.imageUrl && (
        <View style={{
          height: 160,
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 12,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: '#f3f4f6',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="image-outline" size={32} color="#9ca3af" />
          </View>
        </View>
      )}

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
        {canEdit ? (
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
                // Handle edit
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
              onPress={onPress}
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
            onPress={onPress}
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

      {/* Tournament Button (if applicable) */}
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
            if (onTournamentPress) {
              onTournamentPress();
            } else {
              router.push(`/(tabs)/tournaments/${event.id}`);
            }
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
}