import { io, Socket } from 'socket.io-client';
import { envConfig } from '../config/env';

class WebSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private connectionCallbacks: (() => void)[] = [];

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.token = token;
    this.socket = io(envConfig.wsUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      // Notify any waiting callbacks
      this.connectionCallbacks.forEach(callback => callback());
      this.connectionCallbacks = [];
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Debug: Log all incoming events
    const originalOn = this.socket.on.bind(this.socket);
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

  // Join sub-group chat room
  joinSubgroupChat(subGroupId: string) {
    if (this.socket) {
      this.socket.emit('join-subgroup-chat', { subGroupId });
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