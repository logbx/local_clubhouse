import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client-mobile';

type TournamentStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED';

interface Tournament {
  id: string;
  name: string;
  description: string;
  type: 'SINGLE_ELIMINATION' | 'SWISS';
  status: TournamentStatus;
  maxPlayers: number;
  currentPlayers: number;
  startDate: string;
  eventId?: string;
  event?: {
    title: string;
  };
  settings: {
    isPublic: boolean;
    allowSpectators: boolean;
  };
}

export default function TournamentsScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TournamentStatus>('ACTIVE');

  // Load tournaments
  const { 
    data: tournaments, 
    isLoading, 
    refetch: refetchTournaments 
  } = useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => {
      try {
        const response = await api.getTournaments();
        return response.data || [];
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        return [];
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchTournaments();
    setRefreshing(false);
  };

  const filteredTournaments = tournaments?.filter((tournament: Tournament) => 
    tournament.status === activeTab
  ) || [];

  const getStatusColor = (status: TournamentStatus) => {
    switch (status) {
      case 'PENDING':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'ACTIVE':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'COMPLETED':
        return { backgroundColor: '#f3f4f6', color: '#374151' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  const handleCreateTournament = () => {
    Alert.alert('Create Tournament', 'Tournament creation will be implemented soon');
  };

  const handleTournamentPress = (tournament: Tournament) => {
    router.push(`/(tabs)/tournaments/${tournament.id}`);
  };

  const handleJoinTournament = async (tournamentId: string) => {
    if (!user) return;
    
    try {
      await api.registerForTournament(tournamentId);
      refetchTournaments();
      Alert.alert('Success', 'You have joined the tournament!');
    } catch (error) {
      console.error('Error joining tournament:', error);
      Alert.alert('Error', 'Failed to join tournament. Please try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{
        backgroundColor: 'white',
        paddingTop: 20,
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
            Tournaments
          </Text>
          <TouchableOpacity
            style={{
              width: 44,
              height: 44,
              backgroundColor: '#1e40af',
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={handleCreateTournament}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <Text style={{
          fontSize: 16,
          color: '#6b7280',
          marginBottom: 20,
        }}>
          Compete in tournaments and climb the leaderboards
        </Text>

        {/* Tabs */}
        <View style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}>
          {(['PENDING', 'ACTIVE', 'COMPLETED'] as TournamentStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: activeTab === status ? '#1e40af' : 'transparent',
                alignItems: 'center',
              }}
              onPress={() => setActiveTab(status)}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: activeTab === status ? '600' : '500',
                color: activeTab === status ? '#1e40af' : '#6b7280',
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
                Loading tournaments...
              </Text>
            </View>
          ) : filteredTournaments.length === 0 ? (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 60,
            }}>
              <Ionicons name="trophy-outline" size={48} color="#9ca3af" />
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#111827',
                marginTop: 16,
                marginBottom: 8,
              }}>
                No tournaments found
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#6b7280',
                textAlign: 'center',
              }}>
                {activeTab === 'PENDING' 
                  ? 'No upcoming tournaments. Create one to get started!'
                  : activeTab === 'ACTIVE'
                  ? 'No active tournaments right now.'
                  : 'No completed tournaments yet.'
                }
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {filteredTournaments.map((tournament: Tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  onPress={() => handleTournamentPress(tournament)}
                  onJoin={() => handleJoinTournament(tournament.id)}
                  user={user}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Tournament Card Component
interface TournamentCardProps {
  tournament: Tournament;
  onPress: () => void;
  onJoin: () => void;
  user: any;
}

function TournamentCard({ tournament, onPress, onJoin, user }: TournamentCardProps) {
  const getStatusColor = (status: TournamentStatus) => {
    switch (status) {
      case 'PENDING':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'ACTIVE':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'COMPLETED':
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
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return 'TBD';
    }
  };

  const statusStyle = getStatusColor(tournament.status);
  const isFull = tournament.currentPlayers >= tournament.maxPlayers;

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
            {tournament.status}
          </Text>
        </View>
        
        <View style={{
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
          backgroundColor: '#f3f4f6',
        }}>
          <Text style={{
            fontSize: 12,
            fontWeight: '500',
            color: '#374151',
            textTransform: 'uppercase',
          }}>
            {tournament.type.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Tournament Name */}
      <Text style={{
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
      }}>
        {tournament.name}
      </Text>

      {/* Event Link */}
      {tournament.event && (
        <Text style={{
          fontSize: 14,
          color: '#3b82f6',
          marginBottom: 8,
        }}>
          Part of: {tournament.event.title}
        </Text>
      )}

      {/* Description */}
      <Text style={{
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 12,
        lineHeight: 20,
      }}
      numberOfLines={2}
      >
        {tournament.description}
      </Text>

      {/* Details */}
      <View style={{ gap: 8, marginBottom: 16 }}>
        {/* Players */}
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
            {tournament.currentPlayers} / {tournament.maxPlayers} players
          </Text>
          {isFull && (
            <Text style={{
              fontSize: 12,
              color: '#ef4444',
              marginLeft: 8,
              fontWeight: '600',
            }}>
              FULL
            </Text>
          )}
        </View>

        {/* Start Date */}
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
            Starts: {formatDate(tournament.startDate)}
          </Text>
        </View>

        {/* Visibility */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Ionicons 
            name={tournament.settings.isPublic ? "globe-outline" : "lock-closed-outline"} 
            size={16} 
            color="#6b7280" 
          />
          <Text style={{
            fontSize: 14,
            color: '#6b7280',
            marginLeft: 8,
          }}>
            {tournament.settings.isPublic ? 'Public' : 'Private'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={{
        flexDirection: 'row',
        gap: 8,
      }}>
        {tournament.status === 'PENDING' && !isFull && (
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#10b981',
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={(e) => {
              e.stopPropagation();
              onJoin();
            }}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: 'white',
            }}>
              Join Tournament
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#1e40af',
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
      </View>
    </TouchableOpacity>
  );
}