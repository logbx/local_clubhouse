import { useEffect, useCallback, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { realtimeSync } from './websocket';
import { useAuthStore } from '../stores/auth.store';

// Connection status hook
export function useRealtimeConnection() {
  const [connectionState, setConnectionState] = useState(realtimeSync.getConnectionState());
  const [queueSize, setQueueSize] = useState(realtimeSync.getQueueSize());
  const { isAuthenticated, token } = useAuthStore();

  useEffect(() => {
    // Subscribe to connection state changes
    const unsubscribe = realtimeSync.on('connection:state', ({ state }) => {
      setConnectionState(state);
    });

    // Update queue size periodically
    const queueInterval = setInterval(() => {
      setQueueSize(realtimeSync.getQueueSize());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(queueInterval);
    };
  }, []);

  useEffect(() => {
    // Connect when authenticated
    if (isAuthenticated && token) {
      realtimeSync.connect(token).catch(console.error);
    } else {
      realtimeSync.disconnect();
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      realtimeSync.handleAppStateChange(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const connect = useCallback(() => {
    if (token) {
      return realtimeSync.connect(token);
    }
    return Promise.reject(new Error('No auth token available'));
  }, [token]);

  const disconnect = useCallback(() => {
    realtimeSync.disconnect();
  }, []);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isReconnecting: connectionState === 'reconnecting',
    queueSize,
    connect,
    disconnect,
  };
}

// Event subscription hook
export function useRealtimeEvent(event: string, handler: (data: any) => void, deps: any[] = []) {
  const handlerRef = useRef(handler);
  
  // Update handler ref when deps change
  useEffect(() => {
    handlerRef.current = handler;
  }, deps);

  useEffect(() => {
    const wrappedHandler = (data: any) => {
      handlerRef.current(data);
    };

    const unsubscribe = realtimeSync.on(event, wrappedHandler);
    return unsubscribe;
  }, [event]);
}

// Club subscription hook
export function useClubSubscription(clubId: string | null) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (clubId) {
      unsubscribeRef.current = realtimeSync.subscribeToClub(clubId);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [clubId]);
}

// Event subscription hook
export function useEventSubscription(eventId: string | null) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (eventId) {
      unsubscribeRef.current = realtimeSync.subscribeToEvent(eventId);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [eventId]);
}

// Tournament subscription hook
export function useTournamentSubscription(tournamentId: string | null) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (tournamentId) {
      unsubscribeRef.current = realtimeSync.subscribeToTournament(tournamentId);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [tournamentId]);
}

// Match subscription hook
export function useMatchSubscription(matchId: string | null) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (matchId) {
      unsubscribeRef.current = realtimeSync.subscribeToMatch(matchId);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [matchId]);
}

// Live match hook for tournament organizers
export function useLiveMatch(matchId: string | null) {
  const [isLive, setIsLive] = useState(false);
  const [currentScore, setCurrentScore] = useState<any>(null);

  useRealtimeEvent('match:live:start', (data) => {
    if (data.matchId === matchId) {
      setIsLive(true);
    }
  }, [matchId]);

  useRealtimeEvent('match:live:score', (data) => {
    if (data.matchId === matchId) {
      setCurrentScore(data.score);
    }
  }, [matchId]);

  useRealtimeEvent('match:live:end', (data) => {
    if (data.matchId === matchId) {
      setIsLive(false);
      setCurrentScore(null);
    }
  }, [matchId]);

  const startLiveMatch = useCallback(() => {
    if (matchId) {
      realtimeSync.startLiveMatch(matchId);
    }
  }, [matchId]);

  const updateScore = useCallback((score: any) => {
    if (matchId) {
      realtimeSync.sendLiveScore(matchId, score);
    }
  }, [matchId]);

  const endLiveMatch = useCallback((result: any) => {
    if (matchId) {
      realtimeSync.endLiveMatch(matchId, result);
    }
  }, [matchId]);

  return {
    isLive,
    currentScore,
    startLiveMatch,
    updateScore,
    endLiveMatch,
  };
}

// Presence hook for tracking who's online
export function usePresence(channel: string) {
  const [presenceList, setPresenceList] = useState<any[]>([]);

  useRealtimeEvent('presence:sync', (data) => {
    if (data.channel === channel) {
      setPresenceList(data.presences);
    }
  }, [channel]);

  useRealtimeEvent('presence:join', (data) => {
    if (data.channel === channel) {
      setPresenceList(prev => [...prev, data.presence]);
    }
  }, [channel]);

  useRealtimeEvent('presence:leave', (data) => {
    if (data.channel === channel) {
      setPresenceList(prev => prev.filter(p => p.id !== data.presence.id));
    }
  }, [channel]);

  useEffect(() => {
    // Request current presence when subscribing
    realtimeSync.send({
      type: 'presence:request',
      payload: { channel },
    });
  }, [channel]);

  return presenceList;
}

// Typing indicator hook for chat
export function useTyping(channelId: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useRealtimeEvent('typing:start', (data) => {
    if (data.channelId === channelId) {
      setTypingUsers(prev => {
        if (!prev.includes(data.userId)) {
          return [...prev, data.userId];
        }
        return prev;
      });
    }
  }, [channelId]);

  useRealtimeEvent('typing:stop', (data) => {
    if (data.channelId === channelId) {
      setTypingUsers(prev => prev.filter(id => id !== data.userId));
    }
  }, [channelId]);

  const startTyping = useCallback(() => {
    realtimeSync.send({
      type: 'typing:start',
      payload: { channelId },
    });

    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [channelId]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    realtimeSync.send({
      type: 'typing:stop',
      payload: { channelId },
    });
  }, [channelId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
}

// Notification hook for real-time notifications
export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useRealtimeEvent('notification:new', (data) => {
    setNotifications(prev => [data.notification, ...prev]);
  });

  useRealtimeEvent('notification:read', (data) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === data.notificationId 
          ? { ...notif, isRead: true, readAt: data.readAt }
          : notif
      )
    );
  });

  const markAsRead = useCallback((notificationId: string) => {
    realtimeSync.send({
      type: 'notification:mark_read',
      payload: { notificationId },
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    realtimeSync.send({
      type: 'notification:mark_all_read',
      payload: {},
    });
  }, []);

  return {
    notifications,
    markAsRead,
    markAllAsRead,
  };
}