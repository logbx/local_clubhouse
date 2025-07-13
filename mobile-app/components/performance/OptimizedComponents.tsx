import React, { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { FlatList, VirtualizedList, Image, Pressable, View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

// Optimized Tournament List Component
interface Tournament {
  id: string;
  name: string;
  playerCount: number;
  status: string;
  imageUrl?: string;
}

interface OptimizedTournamentListProps {
  tournaments: Tournament[];
  onTournamentPress: (id: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const TournamentItem = memo(({ 
  tournament, 
  onPress 
}: { 
  tournament: Tournament; 
  onPress: (id: string) => void;
}) => {
  const handlePress = useCallback(() => {
    onPress(tournament.id);
  }, [tournament.id, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      className="bg-white p-4 mb-2 rounded-lg shadow-sm"
    >
      <View className="flex-row items-center">
        {tournament.imageUrl && (
          <ExpoImage
            source={{ uri: tournament.imageUrl }}
            style={{ width: 50, height: 50 }}
            contentFit="cover"
            transition={200}
            placeholder="https://via.placeholder.com/50"
            cachePolicy="memory-disk"
          />
        )}
        <View className="ml-3 flex-1">
          <Text className="text-lg font-semibold">{tournament.name}</Text>
          <Text className="text-gray-600">{tournament.playerCount} players</Text>
          <Text className="text-sm text-blue-600">{tournament.status}</Text>
        </View>
      </View>
    </Pressable>
  );
});

export const OptimizedTournamentList = memo<OptimizedTournamentListProps>(({
  tournaments,
  onTournamentPress,
  onRefresh,
  refreshing = false
}) => {
  // Memoize render function to prevent recreations
  const renderTournament = useCallback(({ item }: { item: Tournament }) => (
    <TournamentItem tournament={item} onPress={onTournamentPress} />
  ), [onTournamentPress]);

  // Memoize key extractor
  const keyExtractor = useCallback((item: Tournament) => item.id, []);

  // Optimize FlatList props
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 70, // Fixed height for better performance
    offset: 70 * index,
    index,
  }), []);

  return (
    <FlatList
      data={tournaments}
      renderItem={renderTournament}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      onRefresh={onRefresh}
      refreshing={refreshing}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      initialNumToRender={15}
      windowSize={10}
      updateCellsBatchingPeriod={50}
      // Memory optimization
      disableVirtualization={false}
    />
  );
});

// Optimized Image Component with Smart Caching
interface OptimizedImageProps {
  uri: string;
  width: number;
  height: number;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage = memo<OptimizedImageProps>(({
  uri,
  width,
  height,
  placeholder = 'https://via.placeholder.com/300x200',
  onLoad,
  onError
}) => {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  const handleLoad = useCallback(() => {
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  // Memoize style to prevent recreations
  const imageStyle = useMemo(() => ({
    width,
    height,
    borderRadius: 8
  }), [width, height]);

  if (hasError) {
    return (
      <View 
        style={imageStyle}
        className="bg-gray-200 items-center justify-center"
      >
        <Text className="text-gray-500 text-xs">Image unavailable</Text>
      </View>
    );
  }

  return (
    <ExpoImage
      source={{ uri }}
      style={imageStyle}
      contentFit="cover"
      transition={200}
      placeholder={placeholder}
      onLoad={handleLoad}
      onError={handleError}
      cachePolicy="memory-disk"
      priority="normal"
    />
  );
});

// Memory-Efficient Chat Messages Component
interface ChatMessage {
  id: string;
  text: string;
  timestamp: number;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface OptimizedChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

const ChatMessageItem = memo(({ message }: { message: ChatMessage }) => {
  const formattedTime = useMemo(() => {
    return new Date(message.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, [message.timestamp]);

  return (
    <View className="flex-row p-3 border-b border-gray-100">
      {message.sender.avatar && (
        <OptimizedImage
          uri={message.sender.avatar}
          width={40}
          height={40}
        />
      )}
      <View className="ml-3 flex-1">
        <View className="flex-row items-center mb-1">
          <Text className="font-semibold text-gray-800">{message.sender.name}</Text>
          <Text className="text-xs text-gray-500 ml-2">{formattedTime}</Text>
        </View>
        <Text className="text-gray-700">{message.text}</Text>
      </View>
    </View>
  );
});

export const OptimizedChat = memo<OptimizedChatProps>(({ messages, onSendMessage }) => {
  const flatListRef = useRef<FlatList>(null);

  // Memoize reversed messages for better performance
  const reversedMessages = useMemo(() => 
    [...messages].reverse(), 
    [messages]
  );

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <ChatMessageItem message={item} />
  ), []);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [messages.length]);

  return (
    <FlatList
      ref={flatListRef}
      data={reversedMessages}
      renderItem={renderMessage}
      keyExtractor={keyExtractor}
      inverted={true}
      removeClippedSubviews={true}
      maxToRenderPerBatch={20}
      initialNumToRender={30}
      windowSize={20}
      // Performance optimizations for chat
      keyboardShouldPersistTaps="handled"
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10
      }}
    />
  );
});

// Performance monitoring HOC
export function withPerformanceMonitoring<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return memo((props: T) => {
    const renderStart = useRef(Date.now());
    
    useEffect(() => {
      const renderTime = Date.now() - renderStart.current;
      if (renderTime > 100) { // Log slow renders
        console.warn(`🐌 Slow render: ${componentName} took ${renderTime}ms`);
      }
    });

    return <Component {...props} />;
  });
}