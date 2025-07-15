import { io, Socket } from 'socket.io-client';
// Removed envConfig import - using environment variables directly

class WebSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private connectionCallbacks: (() => void)[] = [];

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.token = token;
    
    // Use localhost for development, production URL otherwise
    const wsUrl = import.meta.env.VITE_WS_URL || 
                  (import.meta.env.DEV ? 'http://localhost:3001' : 'wss://localclubhouse.com');
    
    console.log('🔌 WebSocketService: Connecting to:', wsUrl);
    
    this.socket = io(wsUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected successfully');
      // Notify any waiting callbacks
      this.connectionCallbacks.forEach(callback => callback());
      this.connectionCallbacks = [];
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 WebSocket reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔌 WebSocket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('🔌 WebSocket failed to reconnect after maximum attempts');
    });

    // Debug: Log all incoming events
    this.socket.onAny((eventName, ...args) => {
      console.log(`🔌 WebSocket Event: ${eventName}`, args);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join conversation room for one-on-one messages
  joinConversation(conversationId: string) {
    if (this.socket && this.socket.connected) {
      console.log('🔌 WebSocketService: Joining conversation room:', conversationId);
      this.socket.emit('join-conversation', { conversationId });
    } else {
      console.warn('🔌 WebSocketService: Cannot join conversation - socket not connected', {
        hasSocket: !!this.socket,
        isConnected: this.socket?.connected || false
      });
    }
  }

  // Leave conversation room
  leaveConversation(conversationId: string) {
    if (this.socket) {
      this.socket.emit('leave-conversation', { conversationId });
    }
  }

  // Join event chat room
  joinEventChat(eventId: string) {
    if (this.socket) {
      this.socket.emit('join-event-chat', { eventId });
    }
  }

  // Leave event chat room
  leaveEventChat(eventId: string) {
    if (this.socket) {
      this.socket.emit('leave-event-chat', { eventId });
    }
  }

  // Join sub-group chat room
  joinSubgroupChat(subGroupId: string) {
    if (this.socket) {
      this.socket.emit('join-subgroup-chat', { subGroupId });
    }
  }

  // Join club chat room
  joinClubChat(clubUsername: string) {
    if (this.socket) {
      this.socket.emit('join-club-chat', { clubUsername });
    }
  }

  // Leave club chat room
  leaveClubChat(clubUsername: string) {
    if (this.socket) {
      this.socket.emit('leave-club-chat', { clubUsername });
    }
  }

  // Join club group chat room
  joinClubGroupChat(groupChatId: string) {
    if (this.socket) {
      this.socket.emit('join-club-group-chat', { groupChatId });
    }
  }

  // Leave club group chat room
  leaveClubGroupChat(groupChatId: string) {
    if (this.socket) {
      this.socket.emit('leave-club-group-chat', { groupChatId });
    }
  }

  // Join public events room for dashboard updates
  joinPublicEvents() {
    if (this.socket) {
      this.socket.emit('join-public-events');
    }
  }

  // Leave public events room
  leavePublicEvents() {
    if (this.socket) {
      this.socket.emit('leave-public-events');
    }
  }

  // Join tournament room
  joinTournament(tournamentId: string) {
    if (this.socket) {
      this.socket.emit('join-tournament', { tournamentId });
    }
  }

  // Leave tournament room
  leaveTournament(tournamentId: string) {
    if (this.socket) {
      this.socket.emit('leave-tournament', { tournamentId });
    }
  }

  // Listen for new messages
  onNewMessage(callback: (message: any) => void) {
    if (this.socket) {
      console.log('🔌 WebSocketService: Setting up new-message listener');
      this.socket.on('new-message', (message) => {
        console.log('🔌 WebSocketService: Received new-message event:', message);
        callback(message);
      });
    }
  }

  // Listen for new event messages
  onNewEventMessage(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('new-event-message', callback);
    }
  }

  // Listen for new sub-group messages
  onNewSubgroupMessage(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('new-subgroup-message', callback);
    }
  }

  // Listen for new club chat messages
  onNewClubMessage(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('new-club-message', callback);
    }
  }

  // Listen for new club group chat messages
  onNewClubGroupMessage(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('new-club-group-message', callback);
    }
  }

  // Listen for new friend group messages
  onNewFriendGroupMessage(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('new-friend-group-message', callback);
    }
  }

  // Listen for friend requests
  onNewFriendRequest(callback: (request: any) => void) {
    if (this.socket) {
      this.socket.on('new-friend-request', callback);
    }
  }

  // Listen for friend request updates
  onFriendRequestUpdate(callback: (update: any) => void) {
    if (this.socket) {
      this.socket.on('friend-request-update', callback);
    }
  }

  // Listen for user online/offline status
  onUserOnline(callback: (data: { userId: string }) => void) {
    if (this.socket) {
      this.socket.on('user-online', callback);
    }
  }

  onUserOffline(callback: (data: { userId: string }) => void) {
    if (this.socket) {
      this.socket.on('user-offline', callback);
    }
  }

  // Listen for tournament updates
  onTournamentUpdate(callback: (update: any) => void) {
    if (this.socket) {
      this.socket.on('tournament-update', callback);
    }
  }

  // Listen for match updates
  onMatchUpdate(callback: (update: any) => void) {
    if (this.socket) {
      this.socket.on('match-update', callback);
    }
  }

  // Listen for event creation
  onEventCreated(callback: (event: any) => void) {
    if (this.socket) {
      this.socket.on('event-created', callback);
    }
  }

  // Listen for event updates
  onEventUpdated(callback: (event: any) => void) {
    if (this.socket) {
      this.socket.on('event-updated', callback);
    }
  }

  // Listen for event deletion
  onEventDeleted(callback: (data: { eventId: string }) => void) {
    if (this.socket) {
      this.socket.on('event-deleted', callback);
    }
  }

  // Listen for RSVP updates
  onEventRsvpUpdated(callback: (data: { eventId: string, rsvpData: any }) => void) {
    if (this.socket) {
      this.socket.on('event-rsvp-updated', callback);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Remove tournament listeners
  removeTournamentListeners() {
    if (this.socket) {
      this.socket.off('tournament-update');
      this.socket.off('match-update');
    }
  }

  // Remove event listeners
  removeEventListeners() {
    if (this.socket) {
      this.socket.off('event-created');
      this.socket.off('event-updated');
      this.socket.off('event-deleted');
      this.socket.off('event-rsvp-updated');
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Wait for connection to be established
  onConnected(callback: () => void) {
    if (this.isConnected()) {
      callback();
    } else {
      this.connectionCallbacks.push(callback);
    }
  }
}

export const webSocketService = new WebSocketService(); 