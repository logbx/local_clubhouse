import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Tournament {
  _id: string;
  name: string;
  description: string;
  type: 'single_elimination' | 'double_elimination' | 'swiss' | 'round_robin';
  status: 'draft' | 'registration' | 'active' | 'completed' | 'cancelled';
  maxPlayers: number;
  currentPlayers: number;
  currentRound: number;
  totalRounds: number;
  startDate: string;
  registrationDeadline: string;
  settings: {
    allowLateRegistration: boolean;
    requireApproval: boolean;
    showLiveBracket: boolean;
    allowSpectators: boolean;
    randomizeSeeds: boolean;
    pointsForWin: number;
    pointsForDraw: number;
    pointsForLoss: number;
  };
  entryFee: {
    amount: number;
    currency: string;
    required: boolean;
  };
}

interface Player {
  _id: string;
  player: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  seed: number;
  rating?: number;
  status: 'registered' | 'checked_in' | 'playing' | 'eliminated' | 'withdrawn';
  registeredAt: string;
  checkedInAt?: string;
}

interface TournamentAdminPanelProps {
  tournament: Tournament;
  players: Player[];
  onUpdate: () => void;
  isOrganizer: boolean;
}

export function TournamentAdminPanel({
  tournament,
  players,
  onUpdate,
  isOrganizer,
}: TournamentAdminPanelProps) {
  const [loading, setLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editingSettings, setEditingSettings] = useState(tournament.settings);
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleStatusChange = useCallback(async (newStatus: Tournament['status']) => {
    if (!isOrganizer) return;

    let confirmMessage = '';
    switch (newStatus) {
      case 'registration':
        confirmMessage = 'Open tournament for registration?';
        break;
      case 'active':
        confirmMessage = 'Start the tournament? This will generate the first round.';
        break;
      case 'completed':
        confirmMessage = 'Mark tournament as completed?';
        break;
      case 'cancelled':
        confirmMessage = 'Cancel the tournament? This action cannot be undone.';
        break;
      default:
        return;
    }

    Alert.alert('Confirm Action', confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: newStatus === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          setLoading(true);
          try {
            const response = await fetch(`/api/tournaments/${tournament._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
              onUpdate();
            } else {
              const error = await response.json();
              Alert.alert('Error', error.error || 'Failed to update tournament status');
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to update tournament status');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }, [tournament._id, isOrganizer, onUpdate]);

  const handleSaveSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tournaments/${tournament._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: editingSettings }),
      });

      if (response.ok) {
        setShowSettingsModal(false);
        onUpdate();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to update settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  }, [tournament._id, editingSettings, onUpdate]);

  const handleAddPlayer = useCallback(async () => {
    if (!newPlayerEmail && !newPlayerName) {
      Alert.alert('Error', 'Please provide either email or name');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/tournaments/${tournament._id}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newPlayerEmail || undefined,
          name: newPlayerName || undefined,
        }),
      });

      if (response.ok) {
        setNewPlayerEmail('');
        setNewPlayerName('');
        setShowPlayerModal(false);
        onUpdate();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to add player');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add player');
    } finally {
      setLoading(false);
    }
  }, [tournament._id, newPlayerEmail, newPlayerName, onUpdate]);

  const handleRemovePlayer = useCallback(async (playerId: string, playerName: string) => {
    Alert.alert(
      'Remove Player',
      `Remove ${playerName} from the tournament?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await fetch(
                `/api/tournaments/${tournament._id}/players?playerId=${playerId}`,
                { method: 'DELETE' }
              );

              if (response.ok) {
                onUpdate();
              } else {
                const error = await response.json();
                Alert.alert('Error', error.error || 'Failed to remove player');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove player');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [tournament._id, onUpdate]);

  const handleGenerateNextRound = useCallback(async () => {
    Alert.alert(
      'Generate Round',
      `Generate round ${tournament.currentRound + 1}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await fetch(`/api/tournaments/${tournament._id}/rounds`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ autoGenerate: true }),
              });

              if (response.ok) {
                onUpdate();
              } else {
                const error = await response.json();
                Alert.alert('Error', error.error || 'Failed to generate round');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to generate round');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [tournament._id, tournament.currentRound, onUpdate]);

  if (!isOrganizer) {
    return (
      <View className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
        <Text className="text-yellow-800 dark:text-yellow-200 text-center">
          Only tournament organizers can access the admin panel
        </Text>
      </View>
    );
  }

  const getStatusColor = (status: Tournament['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      case 'registration': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'active': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'completed': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'cancelled': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getNextActions = () => {
    switch (tournament.status) {
      case 'draft':
        return ['registration'];
      case 'registration':
        return ['active', 'cancelled'];
      case 'active':
        return ['completed', 'cancelled'];
      case 'completed':
        return [];
      case 'cancelled':
        return [];
      default:
        return [];
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="p-4 space-y-4">
        {/* Tournament Status */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Tournament Status
          </Text>
          
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-gray-600 dark:text-gray-400">Current Status:</Text>
            <View className={`px-3 py-1 rounded-full ${getStatusColor(tournament.status)}`}>
              <Text className="text-sm font-medium capitalize">
                {tournament.status.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View className="space-y-2 mb-4">
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-400">Players:</Text>
              <Text className="text-gray-900 dark:text-gray-100">
                {tournament.currentPlayers} / {tournament.maxPlayers}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-400">Current Round:</Text>
              <Text className="text-gray-900 dark:text-gray-100">
                {tournament.currentRound} / {tournament.totalRounds}
              </Text>
            </View>
          </View>

          {getNextActions().length > 0 && (
            <View className="space-y-2">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Available Actions:
              </Text>
              {getNextActions().map((action) => (
                <Pressable
                  key={action}
                  onPress={() => handleStatusChange(action as Tournament['status'])}
                  disabled={loading}
                  className={`py-2 px-4 rounded-lg ${
                    action === 'cancelled'
                      ? 'bg-red-600'
                      : action === 'active'
                      ? 'bg-green-600'
                      : 'bg-blue-600'
                  } ${loading ? 'opacity-50' : ''}`}
                >
                  <Text className="text-white text-center font-medium">
                    {action === 'registration' && 'Open Registration'}
                    {action === 'active' && 'Start Tournament'}
                    {action === 'completed' && 'Mark Complete'}
                    {action === 'cancelled' && 'Cancel Tournament'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Tournament Settings */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Tournament Settings
            </Text>
            <Pressable
              onPress={() => setShowSettingsModal(true)}
              className="p-2"
            >
              <Ionicons name="settings" size={20} color="#6B7280" />
            </Pressable>
          </View>

          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-400">Late Registration:</Text>
              <Text className="text-gray-900 dark:text-gray-100">
                {tournament.settings.allowLateRegistration ? 'Allowed' : 'Not Allowed'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-400">Live Bracket:</Text>
              <Text className="text-gray-900 dark:text-gray-100">
                {tournament.settings.showLiveBracket ? 'Visible' : 'Hidden'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-400">Spectators:</Text>
              <Text className="text-gray-900 dark:text-gray-100">
                {tournament.settings.allowSpectators ? 'Allowed' : 'Not Allowed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Player Management */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Player Management
            </Text>
            <Pressable
              onPress={() => setShowPlayerModal(true)}
              className="bg-blue-600 px-3 py-1.5 rounded-lg"
            >
              <Text className="text-white text-sm font-medium">Add Player</Text>
            </Pressable>
          </View>

          <ScrollView className="max-h-64">
            {players.map((player) => (
              <View 
                key={player._id}
                className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700"
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {player.player.name}
                  </Text>
                  <Text className="text-xs text-gray-600 dark:text-gray-400">
                    Seed: {player.seed} • {player.status}
                  </Text>
                </View>
                
                <Pressable
                  onPress={() => handleRemovePlayer(player.player._id, player.player.name)}
                  className="p-2"
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Round Management */}
        {tournament.status === 'active' && (
          <View className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Round Management
            </Text>
            
            <Pressable
              onPress={handleGenerateNextRound}
              disabled={loading || tournament.currentRound >= tournament.totalRounds}
              className={`py-3 px-4 rounded-lg ${
                tournament.currentRound >= tournament.totalRounds
                  ? 'bg-gray-300 dark:bg-gray-600'
                  : 'bg-green-600'
              } ${loading ? 'opacity-50' : ''}`}
            >
              <Text className="text-white text-center font-medium">
                {tournament.currentRound >= tournament.totalRounds
                  ? 'Tournament Complete'
                  : `Generate Round ${tournament.currentRound + 1}`}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Settings Modal */}
        <Modal
          visible={showSettingsModal}
          animationType="slide"
          presentationStyle="formSheet"
        >
          <View className="flex-1 bg-white dark:bg-gray-900 p-4">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Tournament Settings
              </Text>
              <Pressable onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView className="flex-1">
              <View className="space-y-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-900 dark:text-gray-100">Allow Late Registration</Text>
                  <Switch
                    value={editingSettings.allowLateRegistration}
                    onValueChange={(value) =>
                      setEditingSettings(prev => ({ ...prev, allowLateRegistration: value }))
                    }
                  />
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-900 dark:text-gray-100">Show Live Bracket</Text>
                  <Switch
                    value={editingSettings.showLiveBracket}
                    onValueChange={(value) =>
                      setEditingSettings(prev => ({ ...prev, showLiveBracket: value }))
                    }
                  />
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-900 dark:text-gray-100">Allow Spectators</Text>
                  <Switch
                    value={editingSettings.allowSpectators}
                    onValueChange={(value) =>
                      setEditingSettings(prev => ({ ...prev, allowSpectators: value }))
                    }
                  />
                </View>

                <View>
                  <Text className="text-gray-900 dark:text-gray-100 mb-2">Points for Win</Text>
                  <TextInput
                    value={editingSettings.pointsForWin.toString()}
                    onChangeText={(text) =>
                      setEditingSettings(prev => ({ ...prev, pointsForWin: parseInt(text) || 3 }))
                    }
                    keyboardType="numeric"
                    className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-900 dark:text-gray-100"
                  />
                </View>

                <View>
                  <Text className="text-gray-900 dark:text-gray-100 mb-2">Points for Draw</Text>
                  <TextInput
                    value={editingSettings.pointsForDraw.toString()}
                    onChangeText={(text) =>
                      setEditingSettings(prev => ({ ...prev, pointsForDraw: parseInt(text) || 1 }))
                    }
                    keyboardType="numeric"
                    className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-900 dark:text-gray-100"
                  />
                </View>
              </View>
            </ScrollView>

            <View className="flex-row gap-3 mt-6">
              <Pressable
                onPress={() => setShowSettingsModal(false)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 py-3 rounded-lg"
              >
                <Text className="text-gray-800 dark:text-gray-200 text-center font-medium">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveSettings}
                disabled={loading}
                className="flex-1 bg-blue-600 py-3 rounded-lg"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-center font-medium">Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Add Player Modal */}
        <Modal
          visible={showPlayerModal}
          animationType="slide"
          presentationStyle="formSheet"
        >
          <View className="flex-1 bg-white dark:bg-gray-900 p-4">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Add Player
              </Text>
              <Pressable onPress={() => setShowPlayerModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-gray-900 dark:text-gray-100 mb-2">Player Email</Text>
                <TextInput
                  value={newPlayerEmail}
                  onChangeText={setNewPlayerEmail}
                  placeholder="Enter player email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-900 dark:text-gray-100"
                />
              </View>

              <Text className="text-center text-gray-600 dark:text-gray-400">OR</Text>

              <View>
                <Text className="text-gray-900 dark:text-gray-100 mb-2">Player Name</Text>
                <TextInput
                  value={newPlayerName}
                  onChangeText={setNewPlayerName}
                  placeholder="Enter player name"
                  className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-900 dark:text-gray-100"
                />
              </View>
            </View>

            <View className="flex-row gap-3 mt-6">
              <Pressable
                onPress={() => setShowPlayerModal(false)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 py-3 rounded-lg"
              >
                <Text className="text-gray-800 dark:text-gray-200 text-center font-medium">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAddPlayer}
                disabled={loading || (!newPlayerEmail && !newPlayerName)}
                className={`flex-1 py-3 rounded-lg ${
                  loading || (!newPlayerEmail && !newPlayerName)
                    ? 'bg-gray-300 dark:bg-gray-600'
                    : 'bg-blue-600'
                }`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-center font-medium">Add Player</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>

      {loading && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      )}
    </ScrollView>
  );
}