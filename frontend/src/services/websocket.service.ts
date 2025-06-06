import { io, Socket } from 'socket.io-client';
import { envConfig } from '../config/env';

class WebSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

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
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
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
    if (this.socket) {
      this.socket.emit('join-conversation', { conversationId });
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

  // Listen for new messages
  onNewMessage(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('new-message', callback);
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

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const webSocketService = new WebSocketService(); 