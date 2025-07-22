import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api-client-mobile';

export interface NotificationData {
  type: 'event_reminder' | 'rsvp_confirmation' | 'event_update' | 'event_cancelled' | 'check_in' | 'waitlist_promoted';
  eventId: string;
  eventTitle: string;
  data?: Record<string, any>;
}

export interface ScheduledNotification {
  id: string;
  eventId: string;
  type: string;
  scheduledTime: Date;
  title: string;
  body: string;
}

export interface NotificationSettings {
  enabled: boolean;
  rsvpConfirmation: boolean;
  eventReminders: boolean;
  reminder24h: boolean;
  reminder1h: boolean;
  reminder15m: boolean;
  eventUpdates: boolean;
  eventCancellation: boolean;
  waitlistUpdates: boolean;
  checkInReminders: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const STORAGE_KEYS = {
  NOTIFICATION_SETTINGS: '@notification_settings',
  SCHEDULED_NOTIFICATIONS: '@scheduled_notifications',
  PUSH_TOKEN: '@push_token',
};

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;
  private settings: NotificationSettings = {
    enabled: true,
    rsvpConfirmation: true,
    eventReminders: true,
    reminder24h: true,
    reminder1h: true,
    reminder15m: false,
    eventUpdates: true,
    eventCancellation: true,
    waitlistUpdates: true,
    checkInReminders: true,
    soundEnabled: true,
    vibrationEnabled: true,
  };

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    try {
      await this.loadSettings();
      await this.requestPermissions();
      await this.registerForPushNotifications();
      this.setupNotificationListeners();
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for Push Notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications require physical device');
        return null;
      }

      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.warn('Push notifications disabled: No permissions');
        return null;
      }

      // Check if projectId is configured
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      if (!projectId) {
        console.warn('Push notifications disabled: No projectId configured');
        return null; // Graceful degradation
      }

      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      })).data;
      this.pushToken = token;

      // Save token to storage
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);

      // Send token to server
      try {
        await api.post('/notifications/register-token', {
          token,
          platform: Platform.OS,
        });
      } catch (error: any) {
        // Graceful degradation for missing backend endpoint
        if (error?.status === 404) {
          console.warn('Push token registration endpoint not implemented');
          return token; // Still return token for local use
        }
        console.error('Failed to register push token with server:', error);
      }

      return token;
    } catch (error: any) {
      // Graceful degradation for missing projectId
      if (error?.message?.includes('projectId')) {
        console.warn('Push notifications unavailable: No projectId configured');
        return null; // Don't crash app
      }
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Setup notification event listeners
   */
  private setupNotificationListeners(): void {
    // Handle notification received while app is running
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle received notification
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    const data = notification.request.content.data as NotificationData;
    
    // Update badge count
    this.updateBadgeCount();
    
    // Handle specific notification types
    switch (data.type) {
      case 'event_reminder':
        this.handleEventReminder(data);
        break;
      case 'rsvp_confirmation':
        this.handleRSVPConfirmation(data);
        break;
      case 'event_update':
        this.handleEventUpdate(data);
        break;
      // Add more handlers as needed
    }
  }

  /**
   * Handle notification tap response
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data as NotificationData;
    
    // Navigate to appropriate screen based on notification type
    // This would integrate with your navigation system
    console.log('Navigate to event:', data.eventId);
  }

  /**
   * Schedule event reminder notifications
   */
  async scheduleEventReminders(eventId: string, eventTitle: string, startDate: Date): Promise<void> {
    if (!this.settings.enabled || !this.settings.eventReminders) {
      return;
    }

    const now = new Date();
    const eventDate = new Date(startDate);
    
    const reminders = [];

    // 24 hour reminder
    if (this.settings.reminder24h) {
      const reminder24h = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
      if (reminder24h > now) {
        reminders.push({
          time: reminder24h,
          title: 'Event Tomorrow',
          body: `${eventTitle} is tomorrow at ${eventDate.toLocaleTimeString()}`,
          type: 'reminder_24h',
        });
      }
    }

    // 1 hour reminder
    if (this.settings.reminder1h) {
      const reminder1h = new Date(eventDate.getTime() - 60 * 60 * 1000);
      if (reminder1h > now) {
        reminders.push({
          time: reminder1h,
          title: 'Event Starting Soon',
          body: `${eventTitle} starts in 1 hour`,
          type: 'reminder_1h',
        });
      }
    }

    // 15 minute reminder
    if (this.settings.reminder15m) {
      const reminder15m = new Date(eventDate.getTime() - 15 * 60 * 1000);
      if (reminder15m > now) {
        reminders.push({
          time: reminder15m,
          title: 'Event Starting Soon',
          body: `${eventTitle} starts in 15 minutes`,
          type: 'reminder_15m',
        });
      }
    }

    // Schedule all reminders
    for (const reminder of reminders) {
      await this.scheduleLocalNotification({
        eventId,
        title: reminder.title,
        body: reminder.body,
        scheduledTime: reminder.time,
        data: {
          type: 'event_reminder',
          eventId,
          eventTitle,
          reminderType: reminder.type,
        },
      });
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(notification: {
    eventId: string;
    title: string;
    body: string;
    scheduledTime: Date;
    data?: NotificationData;
  }): Promise<string | null> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          sound: this.settings.soundEnabled ? 'default' : undefined,
          vibrate: this.settings.vibrationEnabled ? [0, 250, 250, 250] : undefined,
          data: notification.data,
        },
        trigger: {
          date: notification.scheduledTime,
        },
      });

      // Save to scheduled notifications
      await this.saveScheduledNotification({
        id: identifier,
        eventId: notification.eventId,
        type: notification.data?.type || 'unknown',
        scheduledTime: notification.scheduledTime,
        title: notification.title,
        body: notification.body,
      });

      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancel scheduled notifications for an event
   */
  async cancelEventNotifications(eventId: string): Promise<void> {
    try {
      const scheduledNotifications = await this.getScheduledNotifications();
      const eventNotifications = scheduledNotifications.filter(n => n.eventId === eventId);
      
      const identifiers = eventNotifications.map(n => n.id);
      await Notifications.cancelScheduledNotificationsAsync(identifiers);
      
      // Remove from stored notifications
      const remainingNotifications = scheduledNotifications.filter(n => n.eventId !== eventId);
      await this.saveScheduledNotifications(remainingNotifications);
    } catch (error) {
      console.error('Error canceling event notifications:', error);
    }
  }

  /**
   * Send immediate notification for RSVP confirmation
   */
  async sendRSVPConfirmation(eventId: string, eventTitle: string, status: string): Promise<void> {
    if (!this.settings.enabled || !this.settings.rsvpConfirmation) {
      return;
    }

    const title = 'RSVP Confirmed';
    const body = `You're ${status} for ${eventTitle}`;

    await Notifications.presentNotificationAsync({
      title,
      body,
      data: {
        type: 'rsvp_confirmation',
        eventId,
        eventTitle,
        status,
      } as NotificationData,
    });
  }

  /**
   * Send event update notification
   */
  async sendEventUpdate(eventId: string, eventTitle: string, updateMessage: string): Promise<void> {
    if (!this.settings.enabled || !this.settings.eventUpdates) {
      return;
    }

    await Notifications.presentNotificationAsync({
      title: `Event Update: ${eventTitle}`,
      body: updateMessage,
      data: {
        type: 'event_update',
        eventId,
        eventTitle,
        updateMessage,
      } as NotificationData,
    });
  }

  /**
   * Send event cancellation notification
   */
  async sendEventCancellation(eventId: string, eventTitle: string, reason?: string): Promise<void> {
    if (!this.settings.enabled || !this.settings.eventCancellation) {
      return;
    }

    const body = reason 
      ? `${eventTitle} has been cancelled. Reason: ${reason}`
      : `${eventTitle} has been cancelled.`;

    await Notifications.presentNotificationAsync({
      title: 'Event Cancelled',
      body,
      data: {
        type: 'event_cancelled',
        eventId,
        eventTitle,
        reason,
      } as NotificationData,
    });
  }

  /**
   * Send waitlist promotion notification
   */
  async sendWaitlistPromotion(eventId: string, eventTitle: string): Promise<void> {
    if (!this.settings.enabled || !this.settings.waitlistUpdates) {
      return;
    }

    await Notifications.presentNotificationAsync({
      title: 'Spot Available!',
      body: `A spot opened up for ${eventTitle}. You've been moved from the waitlist.`,
      data: {
        type: 'waitlist_promoted',
        eventId,
        eventTitle,
      } as NotificationData,
    });
  }

  /**
   * Update notification settings
   */
  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    
    // If notifications are disabled, cancel all scheduled notifications
    if (!this.settings.enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await this.clearScheduledNotifications();
    }
  }

  /**
   * Get current notification settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Get notification permission status
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    const { status } = await Notifications.getPermissionsAsync();
    return status as 'granted' | 'denied' | 'undetermined';
  }

  /**
   * Update app badge count
   */
  async updateBadgeCount(): Promise<void> {
    try {
      // Get unread notifications count from server
      const response = await api.get('/notifications/unread-count');
      const count = response?.data?.count || 0;
      
      if (Notifications?.setBadgeCountAsync && typeof Notifications.setBadgeCountAsync === 'function') {
        await Notifications.setBadgeCountAsync(count);
      }
    } catch (error: any) {
      // Graceful degradation - don't spam console for missing endpoints
      if (error?.status === 404) {
        console.warn('Badge count endpoint not implemented - skipping badge updates');
        return; // Silent failure for missing endpoint
      }
      
      // Only log actual errors, not missing features
      if (error?.status !== 404) {
        console.error('Error updating badge count:', error);
      }
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    if (Notifications?.dismissAllNotificationsAsync) {
      await Notifications.dismissAllNotificationsAsync();
    }
    if (Notifications?.setBadgeCountAsync) {
      await Notifications.setBadgeCountAsync(0);
    }
  }

  // Private helper methods

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_SETTINGS,
        JSON.stringify(this.settings)
      );
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  private async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_NOTIFICATIONS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
      return [];
    }
  }

  private async saveScheduledNotifications(notifications: ScheduledNotification[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SCHEDULED_NOTIFICATIONS,
        JSON.stringify(notifications)
      );
    } catch (error) {
      console.error('Error saving scheduled notifications:', error);
    }
  }

  private async saveScheduledNotification(notification: ScheduledNotification): Promise<void> {
    const existing = await this.getScheduledNotifications();
    existing.push(notification);
    await this.saveScheduledNotifications(existing);
  }

  private async clearScheduledNotifications(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.SCHEDULED_NOTIFICATIONS);
  }

  // Event handlers
  private handleEventReminder(data: NotificationData): void {
    // Handle event reminder logic
    console.log('Event reminder:', data);
  }

  private handleRSVPConfirmation(data: NotificationData): void {
    // Handle RSVP confirmation logic
    console.log('RSVP confirmation:', data);
  }

  private handleEventUpdate(data: NotificationData): void {
    // Handle event update logic
    console.log('Event update:', data);
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Utility functions
export const NotificationUtils = {
  /**
   * Format notification time for display
   */
  formatNotificationTime: (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  },

  /**
   * Get notification icon based on type
   */
  getNotificationIcon: (type: string): string => {
    switch (type) {
      case 'event_reminder': return 'time-outline';
      case 'rsvp_confirmation': return 'checkmark-circle-outline';
      case 'event_update': return 'information-circle-outline';
      case 'event_cancelled': return 'close-circle-outline';
      case 'waitlist_promoted': return 'arrow-up-circle-outline';
      case 'check_in': return 'location-outline';
      default: return 'notifications-outline';
    }
  },

  /**
   * Get notification color based on type
   */
  getNotificationColor: (type: string): string => {
    switch (type) {
      case 'event_reminder': return '#3B82F6';
      case 'rsvp_confirmation': return '#10B981';
      case 'event_update': return '#F59E0B';
      case 'event_cancelled': return '#EF4444';
      case 'waitlist_promoted': return '#8B5CF6';
      case 'check_in': return '#06B6D4';
      default: return '#6B7280';
    }
  },
};