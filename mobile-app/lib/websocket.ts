import { io, Socket } from 'socket.io-client';
import { storage } from './storage';
import { Platform } from 'react-native';

const WS_URL = Platform.select({
  web: process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3000',
  default: process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3000',
});

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

interface ChatMessage {
  _id: string;
  club: string;
  sender: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
  replyTo?: any;
  mentions?: any[];
  readBy: Array<{
    user: string;
    readAt: string;
  }>;
}

interface MessageQueue {
  id: string;
  clubId: string;
  content: string;
  tempId: string;
  timestamp: number;
  retries: number;
}

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private messageQueue: MessageQueue[] = [];
  private typingUsers: Map<string, TypingUser[]> = new Map();
  private typingTimeout: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  async connect() {
    if (this.socket?.connected) return;

    const token = await storage.getAccessToken();
    if (!token) throw new Error('No access token');

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
      this.processMessageQueue();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('max_reconnect_attempts_reached');
      }
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    // Chat events
    this.socket.on('new_message', (data: ChatMessage) => {
      this.emit('new_message', data);
    });

    this.socket.on('message_edited', (data: ChatMessage) => {
      this.emit('message_edited', data);
    });

    this.socket.on('message_deleted', (data: { messageId: string; clubId: string }) => {
      this.emit('message_deleted', data);
    });

    this.socket.on('user_typing', (data: { clubId: string; user: { _id: string; name: string }; isTyping: boolean }) => {
      this.handleTypingEvent(data);
    });

    this.socket.on('message_read', (data: { messageId: string; clubId: string; userId: string; readAt: string }) => {
      this.emit('message_read', data);
    });

    // Club events
    this.socket.on('member_joined', (data: { clubId: string; member: any }) => {
      this.emit('member_joined', data);
    });

    this.socket.on('member_left', (data: { clubId: string; userId: string }) => {
      this.emit('member_left', data);
    });

    this.socket.on('club_updated', (data: { clubId: string; updates: any }) => {
      this.emit('club_updated', data);
    });

    // Notification events
    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    // Tournament events
    this.socket.on('tournament_update', (data) => {
      this.emit('tournament_update', data);
    });

    // Message acknowledgment
    this.socket.on('message_ack', (data: { tempId: string; messageId: string }) => {
      this.removeFromQueue(data.tempId);
      this.emit('message_sent', data);
    });

    this.socket.on('message_error', (data: { tempId: string; error: string }) => {
      this.handleMessageError(data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.messageQueue = [];
    this.typingUsers.clear();
    this.clearAllTypingTimeouts();
  }

  // Room management
  joinClub(clubId: string) {
    this.socket?.emit('join_club', clubId);
  }

  leaveClub(clubId: string) {
    this.socket?.emit('leave_club', clubId);
  }

  // Message sending with offline support
  sendMessage(clubId: string, content: string, replyTo?: string, mentions?: string[]) {
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const message = {
      clubId,
      content,
      replyTo,
      mentions,
      tempId,
    };

    if (this.socket?.connected) {
      this.socket.emit('send_message', message);
    } else {
      // Queue message for later sending
      this.queueMessage({
        id: `queued_${Date.now()}`,
        clubId,
        content,
        tempId,
        timestamp: Date.now(),
        retries: 0,
      });
    }

    return tempId;
  }

  // Typing indicators
  setTyping(clubId: string, isTyping: boolean) {
    this.socket?.emit('typing', { clubId, isTyping });
  }

  private handleTypingEvent(data: { clubId: string; user: { _id: string; name: string }; isTyping: boolean }) {
    const { clubId, user, isTyping } = data;
    
    if (!this.typingUsers.has(clubId)) {
      this.typingUsers.set(clubId, []);
    }

    const users = this.typingUsers.get(clubId)!;
    const existingIndex = users.findIndex(u => u.userId === user._id);

    if (isTyping) {
      const typingUser: TypingUser = {
        userId: user._id,
        userName: user.name,
        timestamp: Date.now(),
      };

      if (existingIndex >= 0) {
        users[existingIndex] = typingUser;
      } else {
        users.push(typingUser);
      }

      // Clear existing timeout
      const timeoutKey = `${clubId}_${user._id}`;
      if (this.typingTimeout.has(timeoutKey)) {
        clearTimeout(this.typingTimeout.get(timeoutKey)!);
      }

      // Set new timeout
      this.typingTimeout.set(timeoutKey, setTimeout(() => {
        this.removeTypingUser(clubId, user._id);
      }, 5000));
    } else {
      this.removeTypingUser(clubId, user._id);
    }

    this.emit('typing_updated', { clubId, typingUsers: users });
  }

  private removeTypingUser(clubId: string, userId: string) {
    const users = this.typingUsers.get(clubId);
    if (users) {
      const filteredUsers = users.filter(u => u.userId !== userId);
      this.typingUsers.set(clubId, filteredUsers);
      this.emit('typing_updated', { clubId, typingUsers: filteredUsers });
    }

    const timeoutKey = `${clubId}_${userId}`;
    if (this.typingTimeout.has(timeoutKey)) {
      clearTimeout(this.typingTimeout.get(timeoutKey)!);
      this.typingTimeout.delete(timeoutKey);
    }
  }

  // Message queue management
  private queueMessage(message: MessageQueue) {
    this.messageQueue.push(message);
    this.emit('message_queued', message);
    
    // Store in local storage for persistence
    storage.set('message_queue', this.messageQueue);
  }

  private async processMessageQueue() {
    if (!this.socket?.connected || this.messageQueue.length === 0) return;

    const messagesToSend = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messagesToSend) {
      if (message.retries < 3) {
        this.socket.emit('send_message', {
          clubId: message.clubId,
          content: message.content,
          tempId: message.tempId,
        });
      } else {
        this.emit('message_failed', message);
      }
    }

    // Clear stored queue
    await storage.remove('message_queue');
  }

  private removeFromQueue(tempId: string) {
    this.messageQueue = this.messageQueue.filter(msg => msg.tempId !== tempId);
  }

  private handleMessageError(data: { tempId: string; error: string }) {
    const messageIndex = this.messageQueue.findIndex(msg => msg.tempId === data.tempId);
    
    if (messageIndex >= 0) {
      const message = this.messageQueue[messageIndex];
      message.retries++;
      
      if (message.retries >= 3) {
        this.messageQueue.splice(messageIndex, 1);
        this.emit('message_failed', { ...message, error: data.error });
      }
    }
  }

  // Read receipts
  markMessageAsRead(messageId: string, clubId: string) {
    this.socket?.emit('mark_read', { messageId, clubId });
  }

  // Get typing users for a club
  getTypingUsers(clubId: string): TypingUser[] {
    return this.typingUsers.get(clubId) || [];
  }

  // Event listeners
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off(event: string, callback?: Function) {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
    } else {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach((callback) => {
      callback(...args);
    });
  }

  private clearAllTypingTimeouts() {
    this.typingTimeout.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.typingTimeout.clear();
  }

  // Connection status
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  get hasQueuedMessages(): boolean {
    return this.messageQueue.length > 0;
  }

  // Initialize from stored queue
  async initialize() {
    const storedQueue = await storage.get<MessageQueue[]>('message_queue');
    if (storedQueue) {
      this.messageQueue = storedQueue;
    }
  }
}

export const websocket = new WebSocketService();