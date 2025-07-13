import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Player {
  _id: string;
  player: {
    _id: string;
    name: string;
    avatar?: string;
    rating?: number;
  };
  seed: number;
  rating?: number;
  status: string;
  stats: {
    wins: number;
    losses: number;
    draws: number;
    points: number;
    gamesWon: number;
    gamesLost: number;
    buchholz?: number;
    tiebreakPoints?: number;
  };
}

interface Match {
  _id: string;
  player1: {
    _id: string;
    name: string;
    avatar?: string;
  } | null;
  player2: {
    _id: string;
    name: string;
    avatar?: string;
  } | null;
  result?: {
    winner: string;
    score: {
      player1Score: number;
      player2Score: number;
    };
    isDraw: boolean;
  };
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  tableNumber?: number;
  round: {
    roundNumber: number;
    name: string;
    status: string;
  };
}

interface Tournament {
  _id: string;
  name: string;
  type: string;
  status: string;
  currentRound: number;
  totalRounds: number;
  settings: {
    pointsForWin: number;
    pointsForDraw: number;
    pointsForLoss: number;
    tiebreakers: string[];
  };
}

interface SwissTournamentViewProps {
  tournament: Tournament;
  players: Player[];
  matches: Match[];
  currentUserId?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  canManage?: boolean;
}

export function SwissTournamentView({
  tournament,
  players,
  matches,
  currentUserId,
  onRefresh,
  refreshing = false,
  canManage = false,
}: SwissTournamentViewProps) {
  const [activeTab, setActiveTab] = useState<'standings' | 'rounds' | 'pairings'>('standings');
  const [selectedRound, setSelectedRound] = useState(tournament.currentRound);

  // Calculate current standings with tiebreakers
  const standings = useMemo(() => {
    const standingsWithTiebreaks = players.map(player => {
      const playerMatches = matches.filter(match => 
        (match.player1?._id === player.player._id || match.player2?._id === player.player._id) &&
        match.status === 'completed'
      );

      // Calculate Buchholz score (sum of opponents' total points)
      let buchholzScore = 0;
      const opponents = new Set<string>();
      
      playerMatches.forEach(match => {
        const opponentId = match.player1?._id === player.player._id 
          ? match.player2?._id 
          : match.player1?._id;
        
        if (opponentId) {
          opponents.add(opponentId);
        }
      });

      opponents.forEach(opponentId => {
        const opponent = players.find(p => p.player._id === opponentId);
        if (opponent) {
          buchholzScore += opponent.stats.points;
        }
      });

      // Calculate game difference
      const gameDifference = player.stats.gamesWon - player.stats.gamesLost;

      return {
        ...player,
        calculatedStats: {
          ...player.stats,
          buchholz: buchholzScore,
          gameDifference,
          matchPoints: player.stats.wins * tournament.settings.pointsForWin + 
                      player.stats.draws * tournament.settings.pointsForDraw,
        },
      };
    });

    // Sort by tiebreakers
    return standingsWithTiebreaks.sort((a, b) => {
      // Primary: Total points
      if (b.stats.points !== a.stats.points) {
        return b.stats.points - a.stats.points;
      }

      // Apply tiebreakers in order
      for (const tiebreaker of tournament.settings.tiebreakers) {
        switch (tiebreaker) {
          case 'head_to_head':
            // TODO: Implement head-to-head comparison
            break;
          case 'buchholz':
            if (b.calculatedStats.buchholz !== a.calculatedStats.buchholz) {
              return b.calculatedStats.buchholz - a.calculatedStats.buchholz;
            }
            break;
          case 'points_diff':
            if (b.calculatedStats.gameDifference !== a.calculatedStats.gameDifference) {
              return b.calculatedStats.gameDifference - a.calculatedStats.gameDifference;
            }
            break;
          case 'games_won':
            if (b.stats.gamesWon !== a.stats.gamesWon) {
              return b.stats.gamesWon - a.stats.gamesWon;
            }
            break;
        }
      }

      // Final tiebreaker: seed (lower is better)
      return a.seed - b.seed;
    }).map((player, index) => ({
      ...player,
      position: index + 1,
    }));
  }, [players, matches, tournament.settings]);

  // Group matches by round
  const matchesByRound = useMemo(() => {
    const grouped = new Map<number, Match[]>();
    
    matches.forEach(match => {
      const roundNumber = match.round.roundNumber;
      if (!grouped.has(roundNumber)) {
        grouped.set(roundNumber, []);
      }
      grouped.get(roundNumber)!.push(match);
    });

    return grouped;
  }, [matches]);

  // Get rounds list
  const rounds = useMemo(() => {
    const roundNumbers = Array.from(matchesByRound.keys()).sort((a, b) => a - b);
    return roundNumbers.map(num => ({
      number: num,
      matches: matchesByRound.get(num) || [],
      isComplete: matchesByRound.get(num)?.every(match => match.status === 'completed') || false,
    }));
  }, [matchesByRound]);

  const handleGenerateNextRound = useCallback(() => {
    if (!canManage) return;

    Alert.alert(
      'Generate Next Round',
      `Generate round ${tournament.currentRound + 1} with automatic Swiss pairings?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              const response = await fetch(`/api/tournaments/${tournament._id}/rounds`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ autoGenerate: true }),
              });

              if (response.ok) {
                onRefresh?.();
              } else {
                const error = await response.json();
                Alert.alert('Error', error.error || 'Failed to generate round');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to generate round');
            }
          },
        },
      ]
    );
  }, [tournament, canManage, onRefresh]);

  const renderStandings = () => (
    <View className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
      <View className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Current Standings
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          After {tournament.currentRound} round{tournament.currentRound !== 1 ? 's' : ''}
        </Text>
      </View>

      <View className="px-4 py-2 bg-gray-50 dark:bg-gray-900">
        <View className="flex-row">
          <Text className="w-12 text-xs font-medium text-gray-600 dark:text-gray-400">#</Text>
          <Text className="flex-1 text-xs font-medium text-gray-600 dark:text-gray-400">Player</Text>
          <Text className="w-16 text-xs font-medium text-gray-600 dark:text-gray-400 text-center">Pts</Text>
          <Text className="w-16 text-xs font-medium text-gray-600 dark:text-gray-400 text-center">W-L-D</Text>
          <Text className="w-16 text-xs font-medium text-gray-600 dark:text-gray-400 text-center">Game Diff</Text>
          <Text className="w-16 text-xs font-medium text-gray-600 dark:text-gray-400 text-center">Buch</Text>
        </View>
      </View>

      <ScrollView className="max-h-96">
        {standings.map((player, index) => (
          <View 
            key={player._id}
            className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 ${
              player.player._id === currentUserId ? 'bg-blue-50 dark:bg-blue-900' : ''
            }`}
          >
            <View className="flex-row items-center">
              <Text className="w-12 text-sm font-medium text-gray-900 dark:text-gray-100">
                {player.position}
              </Text>
              
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100" numberOfLines={1}>
                  {player.player.name}
                </Text>
                {player.player.rating && (
                  <Text className="text-xs text-gray-600 dark:text-gray-400">
                    Rating: {player.player.rating}
                  </Text>
                )}
              </View>

              <Text className="w-16 text-sm font-bold text-center text-gray-900 dark:text-gray-100">
                {player.stats.points}
              </Text>

              <Text className="w-16 text-sm text-center text-gray-600 dark:text-gray-400">
                {player.stats.wins}-{player.stats.losses}-{player.stats.draws}
              </Text>

              <Text className="w-16 text-sm text-center text-gray-600 dark:text-gray-400">
                {player.calculatedStats.gameDifference > 0 ? '+' : ''}{player.calculatedStats.gameDifference}
              </Text>

              <Text className="w-16 text-sm text-center text-gray-600 dark:text-gray-400">
                {player.calculatedStats.buchholz.toFixed(1)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderRounds = () => (
    <View className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
      <View className="p-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Tournament Rounds
          </Text>
          {canManage && tournament.status === 'active' && (
            <Pressable
              onPress={handleGenerateNextRound}
              className="bg-blue-600 px-3 py-1.5 rounded-lg"
            >
              <Text className="text-white text-sm font-medium">
                Generate Round {tournament.currentRound + 1}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-4">
        <View className="flex-row gap-4">
          {rounds.map((round) => (
            <Pressable
              key={round.number}
              onPress={() => setSelectedRound(round.number)}
              className={`min-w-[120px] p-3 rounded-lg border-2 ${
                selectedRound === round.number
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
              }`}
            >
              <Text className={`text-sm font-medium text-center ${
                selectedRound === round.number
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                Round {round.number}
              </Text>
              <Text className={`text-xs text-center ${
                round.isComplete 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {round.matches.length} matches
              </Text>
              {round.isComplete && (
                <View className="flex-row justify-center mt-1">
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderPairings = () => {
    const currentRoundMatches = matchesByRound.get(selectedRound) || [];
    
    return (
      <View className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
        <View className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Round {selectedRound} Pairings
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {currentRoundMatches.length} matches
          </Text>
        </View>

        <ScrollView className="max-h-96">
          {currentRoundMatches.map((match, index) => (
            <Pressable
              key={match._id}
              onPress={() => {
                router.push(`/tournaments/${tournament._id}/matches/${match._id}`);
              }}
              className="p-4 border-b border-gray-100 dark:border-gray-700"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {match.player1?.name || 'TBD'}
                    </Text>
                    {match.result && (
                      <Text className="text-sm font-mono text-gray-600 dark:text-gray-400">
                        {match.result.score.player1Score}
                      </Text>
                    )}
                  </View>
                  
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {match.player2?.name || 'BYE'}
                    </Text>
                    {match.result && match.player2 && (
                      <Text className="text-sm font-mono text-gray-600 dark:text-gray-400">
                        {match.result.score.player2Score}
                      </Text>
                    )}
                  </View>

                  {match.tableNumber && (
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Table {match.tableNumber}
                    </Text>
                  )}
                </View>

                <View className="ml-4 items-center">
                  <View className={`px-2 py-1 rounded-full ${
                    match.status === 'completed' 
                      ? 'bg-green-100 dark:bg-green-900'
                      : match.status === 'in_progress'
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Text className={`text-xs font-medium ${
                      match.status === 'completed'
                        ? 'text-green-800 dark:text-green-200'
                        : match.status === 'in_progress'
                        ? 'text-blue-800 dark:text-blue-200'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {match.status === 'completed' ? 'Complete' : 
                       match.status === 'in_progress' ? 'Live' : 'Scheduled'}
                    </Text>
                  </View>

                  {match.result?.isDraw && (
                    <Text className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      DRAW
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="p-4">
        {/* Tab Navigation */}
        <View className="flex-row bg-white dark:bg-gray-800 rounded-lg p-1 mb-4">
          {[
            { key: 'standings', label: 'Standings' },
            { key: 'rounds', label: 'Rounds' },
            { key: 'pairings', label: 'Pairings' },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2 px-3 rounded-md ${
                activeTab === tab.key
                  ? 'bg-blue-600'
                  : 'bg-transparent'
              }`}
            >
              <Text className={`text-sm font-medium text-center ${
                activeTab === tab.key
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'standings' && renderStandings()}
        {activeTab === 'rounds' && renderRounds()}
        {activeTab === 'pairings' && renderPairings()}
      </View>
    </ScrollView>
  );
}