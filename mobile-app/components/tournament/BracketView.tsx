import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PinchGestureHandler,
  GestureHandlerRootView,
  State,
} from 'react-native-gesture-handler';

interface Match {
  _id: string;
  player1: {
    _id: string;
    name: string;
    avatar?: string;
    seed?: number;
  } | null;
  player2: {
    _id: string;
    name: string;
    avatar?: string;
    seed?: number;
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
  roundNumber: number;
  position: number;
}

interface BracketViewProps {
  tournament: {
    _id: string;
    name: string;
    type: 'single_elimination' | 'double_elimination' | 'swiss' | 'round_robin';
    status: string;
    currentRound: number;
    totalRounds: number;
  };
  matches: Match[];
  onMatchPress?: (match: Match) => void;
  isLive?: boolean;
  canEdit?: boolean;
}

interface WebBracketViewProps extends BracketViewProps {}

interface MobileBracketViewProps extends BracketViewProps {}

// Web-optimized bracket view
function WebBracketView({ tournament, matches, onMatchPress, isLive, canEdit }: WebBracketViewProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const rounds = useMemo(() => {
    const roundsMap = new Map<number, Match[]>();
    matches.forEach(match => {
      if (!roundsMap.has(match.roundNumber)) {
        roundsMap.set(match.roundNumber, []);
      }
      roundsMap.get(match.roundNumber)!.push(match);
    });

    return Array.from(roundsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNumber, roundMatches]) => ({
        roundNumber,
        matches: roundMatches.sort((a, b) => a.position - b.position),
      }));
  }, [matches]);

  const bracketDimensions = useMemo(() => {
    const matchHeight = 80;
    const matchWidth = 200;
    const roundGap = 250;
    const verticalGap = 20;

    const totalWidth = rounds.length * (matchWidth + roundGap);
    const maxMatchesInRound = Math.max(...rounds.map(r => r.matches.length));
    const totalHeight = maxMatchesInRound * (matchHeight + verticalGap);

    return {
      width: totalWidth,
      height: totalHeight,
      matchHeight,
      matchWidth,
      roundGap,
      verticalGap,
    };
  }, [rounds]);

  const handleMatchClick = useCallback((match: Match) => {
    setSelectedMatch(match._id);
    onMatchPress?.(match);
  }, [onMatchPress]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Web Controls */}
      <View className="flex-row items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {tournament.name}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Round {tournament.currentRound} of {tournament.totalRounds}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
            onPress={handleZoomOut}
          >
            <Ionicons name="remove" size={20} color="#6B7280" />
          </Pressable>
          
          <Text className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
            {Math.round(zoomLevel * 100)}%
          </Text>
          
          <Pressable
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
            onPress={handleZoomIn}
          >
            <Ionicons name="add" size={20} color="#6B7280" />
          </Pressable>

          {isLive && (
            <View className="flex-row items-center ml-4">
              <View className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2" />
              <Text className="text-sm font-medium text-red-600 dark:text-red-400">
                LIVE
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Bracket Container */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
        style={{ flex: 1 }}
        contentContainerStyle={{
          width: bracketDimensions.width * zoomLevel,
          height: bracketDimensions.height * zoomLevel,
          padding: 20,
        }}
      >
        <View style={{ transform: [{ scale: zoomLevel }] }}>
          <View className="flex-row" style={{ gap: bracketDimensions.roundGap }}>
            {rounds.map((round, roundIndex) => (
              <RoundColumn
                key={round.roundNumber}
                round={round}
                roundIndex={roundIndex}
                totalRounds={rounds.length}
                dimensions={bracketDimensions}
                selectedMatch={selectedMatch}
                onMatchPress={handleMatchClick}
                isElimination={tournament.type.includes('elimination')}
                canEdit={canEdit}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Mobile-optimized bracket view
function MobileBracketView({ tournament, matches, onMatchPress, isLive, canEdit }: MobileBracketViewProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  const rounds = useMemo(() => {
    const roundsMap = new Map<number, Match[]>();
    matches.forEach(match => {
      if (!roundsMap.has(match.roundNumber)) {
        roundsMap.set(match.roundNumber, []);
      }
      roundsMap.get(match.roundNumber)!.push(match);
    });

    return Array.from(roundsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNumber, roundMatches]) => ({
        roundNumber,
        matches: roundMatches.sort((a, b) => a.position - b.position),
      }));
  }, [matches]);

  const bracketDimensions = useMemo(() => {
    const matchHeight = 70;
    const matchWidth = 180;
    const roundGap = 200;
    const verticalGap = 15;

    return {
      matchHeight,
      matchWidth,
      roundGap,
      verticalGap,
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const onPanGestureEvent = useCallback((event: any) => {
    'worklet';
    translateX.value = event.translationX;
    translateY.value = event.translationY;
  }, []);

  const onPinchGestureEvent = useCallback((event: any) => {
    'worklet';
    scale.value = Math.max(0.5, Math.min(2, event.scale));
  }, []);

  const handleMatchPress = useCallback((match: Match) => {
    setSelectedMatch(match._id);
    onMatchPress?.(match);
  }, [onMatchPress]);

  return (
    <GestureHandlerRootView className="flex-1">
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        {/* Mobile Header */}
        <View className="flex-row items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {tournament.name}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Round {tournament.currentRound} of {tournament.totalRounds}
            </Text>
          </View>

          {isLive && (
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
              <Text className="text-xs font-medium text-red-600 dark:text-red-400">
                LIVE
              </Text>
            </View>
          )}
        </View>

        {/* Gesture-enabled Bracket */}
        <PinchGestureHandler onGestureEvent={onPinchGestureEvent}>
          <Animated.View className="flex-1">
            <PanGestureHandler onGestureEvent={onPanGestureEvent}>
              <Animated.View className="flex-1">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  className="flex-1"
                >
                  <Animated.View style={[{ padding: 20 }, animatedStyle]}>
                    <View className="flex-row" style={{ gap: bracketDimensions.roundGap }}>
                      {rounds.map((round, roundIndex) => (
                        <RoundColumn
                          key={round.roundNumber}
                          round={round}
                          roundIndex={roundIndex}
                          totalRounds={rounds.length}
                          dimensions={bracketDimensions}
                          selectedMatch={selectedMatch}
                          onMatchPress={handleMatchPress}
                          isElimination={tournament.type.includes('elimination')}
                          canEdit={canEdit}
                        />
                      ))}
                    </View>
                  </Animated.View>
                </ScrollView>
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
      </View>
    </GestureHandlerRootView>
  );
}

// Round column component
interface RoundColumnProps {
  round: { roundNumber: number; matches: Match[] };
  roundIndex: number;
  totalRounds: number;
  dimensions: {
    matchHeight: number;
    matchWidth: number;
    roundGap: number;
    verticalGap: number;
  };
  selectedMatch: string | null;
  onMatchPress: (match: Match) => void;
  isElimination: boolean;
  canEdit?: boolean;
}

function RoundColumn({
  round,
  roundIndex,
  totalRounds,
  dimensions,
  selectedMatch,
  onMatchPress,
  isElimination,
  canEdit,
}: RoundColumnProps) {
  const roundName = useMemo(() => {
    if (isElimination) {
      const remaining = Math.pow(2, totalRounds - roundIndex);
      if (remaining === 2) return 'Final';
      if (remaining === 4) return 'Semi-Final';
      if (remaining === 8) return 'Quarter-Final';
      return `Round of ${remaining}`;
    }
    return `Round ${round.roundNumber}`;
  }, [round.roundNumber, roundIndex, totalRounds, isElimination]);

  return (
    <View style={{ width: dimensions.matchWidth }}>
      {/* Round Header */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-center">
          {roundName}
        </Text>
        <Text className="text-xs text-gray-600 dark:text-gray-400 text-center">
          {round.matches.length} match{round.matches.length !== 1 ? 'es' : ''}
        </Text>
      </View>

      {/* Matches */}
      <View style={{ gap: dimensions.verticalGap }}>
        {round.matches.map((match, matchIndex) => (
          <MatchCard
            key={match._id}
            match={match}
            dimensions={dimensions}
            isSelected={selectedMatch === match._id}
            onPress={() => onMatchPress(match)}
            canEdit={canEdit}
          />
        ))}
      </View>
    </View>
  );
}

// Match card component
interface MatchCardProps {
  match: Match;
  dimensions: {
    matchHeight: number;
    matchWidth: number;
  };
  isSelected: boolean;
  onPress: () => void;
  canEdit?: boolean;
}

function MatchCard({ match, dimensions, isSelected, onPress, canEdit }: MatchCardProps) {
  const getPlayerDisplayName = (player: Match['player1'], isWinner: boolean) => {
    if (!player) return 'TBD';
    const name = player.name;
    const seed = player.seed ? `(${player.seed})` : '';
    return `${name} ${seed}`.trim();
  };

  const getMatchStatusColor = () => {
    switch (match.status) {
      case 'in_progress':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900';
      case 'completed':
        return 'border-green-500 bg-green-50 dark:bg-green-900';
      case 'cancelled':
        return 'border-red-500 bg-red-50 dark:bg-red-900';
      default:
        return 'border-gray-300 dark:border-gray-600';
    }
  };

  const isPlayer1Winner = match.result?.winner === match.player1?._id;
  const isPlayer2Winner = match.result?.winner === match.player2?._id;

  return (
    <Pressable
      onPress={onPress}
      className={`border-2 rounded-lg p-2 bg-white dark:bg-gray-800 ${
        isSelected ? 'border-blue-500' : getMatchStatusColor()
      }`}
      style={{
        width: dimensions.matchWidth,
        minHeight: dimensions.matchHeight,
      }}
    >
      {/* Match Status Indicator */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          Match {match.position}
        </Text>
        {match.status === 'in_progress' && (
          <View className="flex-row items-center">
            <View className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1" />
            <Text className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              LIVE
            </Text>
          </View>
        )}
        {canEdit && (
          <Ionicons name="create-outline" size={12} color="#6B7280" />
        )}
      </View>

      {/* Players */}
      <View className="space-y-1">
        {/* Player 1 */}
        <View className={`flex-row items-center justify-between p-1 rounded ${
          isPlayer1Winner ? 'bg-green-100 dark:bg-green-800' : ''
        }`}>
          <Text className={`text-sm ${
            isPlayer1Winner ? 'font-bold text-green-800 dark:text-green-200' : 'text-gray-900 dark:text-gray-100'
          }`} numberOfLines={1}>
            {getPlayerDisplayName(match.player1, isPlayer1Winner)}
          </Text>
          {match.result && (
            <Text className={`text-sm font-mono ${
              isPlayer1Winner ? 'font-bold text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'
            }`}>
              {match.result.score.player1Score}
            </Text>
          )}
        </View>

        {/* Player 2 */}
        <View className={`flex-row items-center justify-between p-1 rounded ${
          isPlayer2Winner ? 'bg-green-100 dark:bg-green-800' : ''
        }`}>
          <Text className={`text-sm ${
            isPlayer2Winner ? 'font-bold text-green-800 dark:text-green-200' : 'text-gray-900 dark:text-gray-100'
          }`} numberOfLines={1}>
            {getPlayerDisplayName(match.player2, isPlayer2Winner)}
          </Text>
          {match.result && (
            <Text className={`text-sm font-mono ${
              isPlayer2Winner ? 'font-bold text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'
            }`}>
              {match.result.score.player2Score}
            </Text>
          )}
        </View>
      </View>

      {/* Draw indicator */}
      {match.result?.isDraw && (
        <Text className="text-xs text-yellow-600 dark:text-yellow-400 text-center mt-1 font-medium">
          DRAW
        </Text>
      )}
    </Pressable>
  );
}

// Main BracketView component
export function BracketView(props: BracketViewProps) {
  if (Platform.OS === 'web') {
    return <WebBracketView {...props} />;
  }
  
  return <MobileBracketView {...props} />;
}