import axiosInstance from './api';
import { webSocketService } from './websocket.service';
import { messageService } from './message.service';

export interface NotificationMessage {
  id: string;
  type: 'direct' | 'group' | 'event' | 'subgroup' | 'friend-group';
  chatId: string;
  chatName: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface UnreadCount {
  direct: number;
  group: number;
  event: number;
  subgroup: number;
  friendGroup: number;
  total: number;
}

class NotificationService {
  private listeners: ((notifications: NotificationMessage[]) => void)[] = [];
  private countListeners: ((count: UnreadCount) => void)[] = [];
  private notifications: NotificationMessage[] = [];
  private unreadCount: UnreadCount = {
    direct: 0,
    group: 0,
    event: 0,
    subgroup: 0,
    friendGroup: 0,
    total: 0
  };

  constructor() {
    console.log('🔔 NotificationService: Initializing notification service');
    this.initializeWebSocketListeners();
    this.initializeConversationRooms();
  }

  private initializeWebSocketListeners() {
    // Wait for WebSocket connection before setting up listeners
    const setupListeners = () => {
      console.log('🔔 NotificationService: Setting up WebSocket listeners');
      
      // Listen for new direct messages
      webSocketService.onNewMessage((message: any) => {
      console.log('🔔 NotificationService: ✅ NEW MESSAGE RECEIVED!', message);
      console.log('🔔 NotificationService: Current user ID:', this.getCurrentUserId());
      
      // The backend now sends message with populated sender object
      // message.sender is the full user object with _id, username, fullName, profileImage
      const senderId = message.sender?._id || message.sender?.id || message.senderId;
      const senderName = message.sender?.username || message.sender?.fullName || message.senderName || 'Someone';
      const senderImage = message.sender?.profileImage || message.senderImage;
      
      console.log('🔔 NotificationService: Extracted sender info:', {
        senderId,
        senderName,
        senderImage,
        messageId: message._id,
        content: message.content,
        fullSender: message.sender
      });
      
      // Only add notification if we have valid sender info
      if (senderId && senderName) {
        console.log('🔔 NotificationService: ✅ Adding notification for message from', senderName);
        this.addNotification({
          id: message._id || Date.now().toString(),
          type: 'direct',
          chatId: senderId,
          chatName: `Direct Message from ${senderName}`,
          senderId: senderId,
          senderName: senderName,
          senderImage: senderImage,
          content: message.content,
          timestamp: message.timestamp || new Date().toISOString(),
          read: false
        });
      } else {
        console.warn('🔔 NotificationService: ❌ Could not extract sender info from message:', message);
      }
    });

    // Listen for new friend group messages
    webSocketService.onNewFriendGroupMessage((message: any) => {
      console.log('🔔 NotificationService: Received new friend group message:', message);
      
      const senderId = message.senderId || message.sender?._id || message.sender;
      const senderName = message.senderName || message.sender?.username || message.sender?.name || 'Someone';
      const senderImage = message.senderImage || message.sender?.profileImage;
      
      this.addNotification({
        id: message._id || Date.now().toString(),
        type: 'friend-group',
        chatId: message.friendGroupId || message.groupId,
        chatName: message.groupName || 'Friend Group',
        senderId: senderId,
        senderName: senderName,
        senderImage: senderImage,
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
        read: false
      });
    });

    // Listen for new club chat messages
    webSocketService.onNewClubMessage((message: any) => {
      console.log('🔔 NotificationService: Received new club message:', message);
      
      const senderId = message.senderId || message.sender?._id || message.sender;
      const senderName = message.senderName || message.sender?.username || message.sender?.name || 'Someone';
      const senderImage = message.senderImage || message.sender?.profileImage;
      
      this.addNotification({
        id: message._id || Date.now().toString(),
        type: 'group', // Using 'group' for club messages to match existing UI
        chatId: message.clubId || message.clubUsername,
        chatName: message.clubName || 'Club Chat',
        senderId: senderId,
        senderName: senderName,
        senderImage: senderImage,
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
        read: false
      });
    });

    // Listen for new club group chat messages
    webSocketService.onNewClubGroupMessage((message: any) => {
      console.log('🔔 NotificationService: Received new club group message:', message);
      
      const senderId = message.senderId || message.sender?._id || message.sender;
      const senderName = message.senderName || message.sender?.username || message.sender?.name || 'Someone';
      const senderImage = message.senderImage || message.sender?.profileImage;
      
      this.addNotification({
        id: message._id || Date.now().toString(),
        type: 'group',
        chatId: message.groupChatId,
        chatName: message.groupChatName || 'Club Group Chat',
        senderId: senderId,
        senderName: senderName,
        senderImage: senderImage,
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
        read: false
      });
    });

    // Listen for new event messages
    webSocketService.onNewEventMessage((message: any) => {
      this.addNotification({
        id: message._id,
        type: 'event',
        chatId: message.eventId,
        chatName: `Event Chat`,
        senderId: message.sender._id,
        senderName: message.sender.username || 'Someone',
        senderImage: message.sender.profileImage,
        content: message.content,
        timestamp: message.timestamp,
        read: false
      });
    });

    // Listen for new subgroup messages
    webSocketService.onNewSubgroupMessage((message: any) => {
      this.addNotification({
        id: message._id,
        type: 'subgroup',
        chatId: message.subGroupId,
        chatName: message.subGroupName || 'Sub-Group',
        senderId: message.sender._id,
        senderName: message.sender.username || 'Someone',
        senderImage: message.sender.profileImage,
        content: message.content,
        timestamp: message.timestamp,
        read: false
      });
    });
    };
    
    // Set up listeners immediately if WebSocket is already connected
    if (webSocketService.isConnected()) {
      console.log('🔔 NotificationService: WebSocket already connected, setting up listeners immediately');
      setupListeners();
    } else {
      console.log('🔔 NotificationService: WebSocket not connected, waiting for connection');
      // Wait for WebSocket connection
      webSocketService.onConnected(() => {
        console.log('🔔 NotificationService: WebSocket connected, setting up listeners now');
        setupListeners();
      });
    }
    
    // Also set up listeners after a short delay to handle any timing issues
    setTimeout(() => {
      if (webSocketService.isConnected()) {
        console.log('🔔 NotificationService: Setting up listeners after delay (backup)');
        setupListeners();
      }
    }, 2000);
  }

  private async initializeConversationRooms() {
    try {
      console.log('🔔 NotificationService: Initializing conversation rooms for notifications');
      
      // Wait for WebSocket to be connected using the callback system
      webSocketService.onConnected(async () => {
        console.log('🔔 NotificationService: WebSocket connected, proceeding with room initialization');
        
        try {
          // Get user's recent conversations and join their rooms for notifications
          const conversations = await messageService.getConversations();
          console.log('🔔 NotificationService: Found conversations:', conversations.length);
          
          conversations.forEach((conv: any) => {
            // Create conversation ID using the same format as the backend
            // Sort user IDs to ensure consistent room naming
            const currentUserId = this.getCurrentUserId();
            if (currentUserId) {
              const conversationId = [currentUserId, conv.userId].sort().join('_');
              console.log('🔔 NotificationService: Joining conversation room for notifications:', conversationId);
              webSocketService.joinConversation(conversationId);
            }
          });
        } catch (error) {
          console.error('🔔 NotificationService: Failed to load conversations:', error);
        }
      });
    } catch (error) {
      console.error('🔔 NotificationService: Failed to initialize conversation rooms:', error);
    }
  }

  private getCurrentUserId(): string | null {
    // Try to get user ID from localStorage or other auth source
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.id || payload._id;
      }
    } catch (error) {
      console.error('🔔 NotificationService: Failed to get current user ID:', error);
    }
    return null;
  }

  addNotification(notification: NotificationMessage) {
    console.log('🔔 NotificationService: Attempting to add notification:', notification);
    
    // Don't add notification if we're currently viewing this chat
    const isCurrentlyViewing = this.isCurrentlyViewingChat(notification.type, notification.chatId);
    console.log('🔔 NotificationService: Currently viewing this chat?', isCurrentlyViewing, 'Current path:', window.location.pathname);
    
    if (isCurrentlyViewing) {
      console.log('🔔 NotificationService: Skipping notification - currently viewing this chat');
      return;
    }

    // Check if notification already exists
    const existingIndex = this.notifications.findIndex(n => n.id === notification.id);
    if (existingIndex >= 0) {
      console.log('🔔 NotificationService: Skipping notification - already exists');
      return; // Don't add duplicates
    }

    console.log('🔔 NotificationService: Adding notification to list');
    this.notifications.unshift(notification);
    
    // Keep only the latest 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    this.updateUnreadCount();
    this.notifyListeners();
    
    console.log('🔔 NotificationService: Notification added successfully. Total notifications:', this.notifications.length);
    console.log('🔔 NotificationService: Current unread counts:', this.getUnreadCountsByChat());
  }

  private isCurrentlyViewingChat(type: string, chatId: string): boolean {
    const currentPath = window.location.pathname;
    
    // Check if we're in Social Hub and if there's a selected chat
    const isSocialHub = currentPath === '/social-hub';
    if (isSocialHub) {
      // Get the currently selected chat from the Social Hub
      // We'll use a global variable or localStorage to track this
      const selectedChatId = (window as any).selectedChatId;
      const selectedChatType = (window as any).selectedChatType;
      
      if (selectedChatId && selectedChatType) {
        // Map notification types to chat types
        const typeMapping: Record<string, string[]> = {
          'direct': ['individual'],
          'group': ['club-chat', 'group'],
          'event': ['event-chat'],
          'subgroup': ['event-subgroup'],
          'friend-group': ['friend-group']
        };
        
        const allowedTypes = typeMapping[type] || [];
        return allowedTypes.includes(selectedChatType) && selectedChatId === chatId;
      }
    }
    
    switch (type) {
      case 'direct':
        return currentPath === `/messages/${chatId}`;
      case 'group':
        // Handle both club chats and general group chats
        return (currentPath === '/messages' && currentPath.includes('group')) ||
               currentPath.includes(`/clubs/${chatId}`);
      case 'event':
        return currentPath.includes(`/events/${chatId}`);
      case 'subgroup':
        return currentPath.includes('subgroup') && currentPath.includes(chatId);
      case 'friend-group':
        return currentPath.includes(`/friend-groups/${chatId}`);
      default:
        return false;
    }
  }

  private updateUnreadCount() {
    const counts = {
      direct: 0,
      group: 0,
      event: 0,
      subgroup: 0,
      friendGroup: 0,
      total: 0
    };

    this.notifications.forEach(notification => {
      if (!notification.read) {
        switch (notification.type) {
          case 'direct':
            counts.direct++;
            break;
          case 'group':
            counts.group++;
            break;
          case 'event':
            counts.event++;
            break;
          case 'subgroup':
            counts.subgroup++;
            break;
          case 'friend-group':
            counts.friendGroup++;
            break;
        }
        counts.total++;
      }
    });

    this.unreadCount = counts;
    this.notifyCountListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  private notifyCountListeners() {
    this.countListeners.forEach(listener => listener({ ...this.unreadCount }));
  }

  // Public methods
  getNotifications(): NotificationMessage[] {
    return [...this.notifications];
  }

  getUnreadCount(): UnreadCount {
    return { ...this.unreadCount };
  }

  // Get unread count for a specific chat
  getUnreadCountForChat(type: string, chatId: string): number {
    return this.notifications.filter(n => 
      !n.read && 
      n.type === type && 
      n.chatId === chatId
    ).length;
  }

  // Get all unread counts by chat
  getUnreadCountsByChat(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    this.notifications.forEach(notification => {
      if (!notification.read) {
        const key = `${notification.type}-${notification.chatId}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    
    return counts;
  }

  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.updateUnreadCount();
      this.notifyListeners();
    }
  }

  markAllAsRead() {
    let hasChanges = false;
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.updateUnreadCount();
      this.notifyListeners();
    }
  }

  markChatAsRead(type: string, chatId: string) {
    let hasChanges = false;
    this.notifications.forEach(notification => {
      if (notification.type === type && notification.chatId === chatId && !notification.read) {
        notification.read = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.updateUnreadCount();
      this.notifyListeners();
    }
  }

  clearAllNotifications() {
    this.notifications = [];
    this.updateUnreadCount();
    this.notifyListeners();
  }

  // Subscription methods
  subscribe(listener: (notifications: NotificationMessage[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  subscribeToCount(listener: (count: UnreadCount) => void) {
    this.countListeners.push(listener);
    return () => {
      this.countListeners = this.countListeners.filter(l => l !== listener);
    };
  }

  // Navigation helpers
  navigateToChat(notification: NotificationMessage) {
    this.markAsRead(notification.id);
    
    // Navigate to the social page with the specific chat selected
    // We'll use URL parameters to indicate which chat to open
    const chatType = notification.type === 'direct' ? 'individual' : 
                    notification.type === 'group' ? 'club-chat' : 
                    notification.type === 'event' ? 'event-chat' : 
                    notification.type === 'friend-group' ? 'friend-group' : 
                    notification.type;
    
    // Navigate to social page with chat parameters
    const socialUrl = `/social-hub?chatType=${chatType}&chatId=${notification.chatId}&chatName=${encodeURIComponent(notification.chatName)}`;
    window.location.href = socialUrl;
  }

  // Debug methods for testing
  testNotification() {
    console.log('🧪 Testing notification system...');
    const testNotification: NotificationMessage = {
      id: `test-${Date.now()}`,
      type: 'direct',
      chatId: 'test-user-id',
      chatName: 'Test User',
      senderId: 'test-sender-id',
      senderName: 'Test Sender',
      content: 'This is a test notification',
      timestamp: new Date().toISOString(),
      read: false
    };
    
    this.addNotification(testNotification);
    console.log('🧪 Test notification added');
  }
  
  testWebSocketListeners() {
    console.log('🧪 Testing WebSocket listeners...');
    console.log('🧪 WebSocket connected:', webSocketService.isConnected());
    
    // Test by manually triggering the listener
    const testMessage = {
      _id: 'test-message-id',
      sender: {
        _id: 'test-sender-id',
        username: 'TestUser',
        profileImage: null
      },
      content: 'Test message from WebSocket listener',
      timestamp: new Date().toISOString()
    };
    
    console.log('🧪 Manually triggering message listener with:', testMessage);
    // This should trigger the notification service to process the message
    webSocketService.onNewMessage((message) => {
      console.log('🧪 Manual WebSocket listener triggered:', message);
    });
  }

  testWebSocketConnection() {
    console.log('🧪 Testing WebSocket connection...');
    console.log('🧪 WebSocket connected:', webSocketService.isConnected());
    
    // Test sending a ping
    if (webSocketService.isConnected()) {
      console.log('🧪 WebSocket is connected - testing ping...');
    } else {
      console.log('🧪 WebSocket is NOT connected');
    }
  }

  getDebugInfo() {
    return {
      notifications: this.notifications,
      unreadCount: this.unreadCount,
      listeners: this.listeners.length,
      countListeners: this.countListeners.length,
      webSocketConnected: webSocketService.isConnected(),
      currentPath: window.location.pathname,
      selectedChat: {
        id: (window as any).selectedChatId,
        type: (window as any).selectedChatType
      }
    };
  }

  async testSendMessage(receiverId: string, content: string = 'Test notification message') {
    console.log('🧪 Sending test message to:', receiverId);
    try {
      const response = await messageService.sendMessage(receiverId, content);
      console.log('🧪 Test message sent successfully:', response);
      return response;
    } catch (error) {
      console.error('🧪 Failed to send test message:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();

// Expose debug functions globally for testing
if (typeof window !== 'undefined') {
  (window as any).notificationService = notificationService;
  (window as any).testNotification = () => notificationService.testNotification();
  (window as any).testWebSocket = () => notificationService.testWebSocketConnection();
  (window as any).testWebSocketListeners = () => notificationService.testWebSocketListeners();
  (window as any).getNotificationDebug = () => notificationService.getDebugInfo();
  (window as any).testSendMessage = (receiverId: string, content?: string) => 
    notificationService.testSendMessage(receiverId, content);
  
  console.log('🧪 Notification debug functions available:');
  console.log('🧪 - testNotification() - Add a test notification');
  console.log('🧪 - testWebSocket() - Check WebSocket connection');
  console.log('🧪 - testWebSocketListeners() - Test WebSocket listeners');
  console.log('🧪 - getNotificationDebug() - Get debug info');
  console.log('🧪 - testSendMessage(receiverId, content?) - Send real test message');
} 