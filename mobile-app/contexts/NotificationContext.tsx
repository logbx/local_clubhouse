import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { notificationService, NotificationSettings, NotificationData } from '@/lib/services/notification.service';

interface NotificationState {
  settings: NotificationSettings;
  isInitialized: boolean;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  unreadCount: number;
  recentNotifications: NotificationItem[];
  isLoading: boolean;
  error: string | null;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: NotificationData;
  timestamp: Date;
  read: boolean;
}

type NotificationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_SETTINGS'; payload: NotificationSettings }
  | { type: 'SET_PERMISSION_STATUS'; payload: 'granted' | 'denied' | 'undetermined' }
  | { type: 'SET_UNREAD_COUNT'; payload: number }
  | { type: 'ADD_NOTIFICATION'; payload: NotificationItem }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'CLEAR_NOTIFICATIONS' };

interface NotificationContextType extends NotificationState {
  initialize: () => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  scheduleEventReminders: (eventId: string, eventTitle: string, startDate: Date) => Promise<void>;
  cancelEventNotifications: (eventId: string) => Promise<void>;
  sendRSVPConfirmation: (eventId: string, eventTitle: string, status: string) => Promise<void>;
  sendEventUpdate: (eventId: string, eventTitle: string, message: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearAllNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const initialState: NotificationState = {
  settings: {
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
  },
  isInitialized: false,
  permissionStatus: 'undetermined',
  unreadCount: 0,
  recentNotifications: [],
  isLoading: false,
  error: null,
};

function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    
    case 'SET_PERMISSION_STATUS':
      return { ...state, permissionStatus: action.payload };
    
    case 'SET_UNREAD_COUNT':
      return { ...state, unreadCount: action.payload };
    
    case 'ADD_NOTIFICATION':
      return { 
        ...state, 
        recentNotifications: [action.payload, ...state.recentNotifications].slice(0, 50), // Keep last 50
        unreadCount: state.unreadCount + 1,
      };
    
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        recentNotifications: state.recentNotifications.map(n => 
          n.id === action.payload ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    
    case 'MARK_ALL_READ':
      return {
        ...state,
        recentNotifications: state.recentNotifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      };
    
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        recentNotifications: [],
        unreadCount: 0,
      };
    
    default:
      return state;
  }
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Initialize notification service on mount
  useEffect(() => {
    initialize();
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        refreshUnreadCount();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const initialize = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Initialize notification service
      await notificationService.initialize();
      
      // Load current settings
      const settings = notificationService.getSettings();
      dispatch({ type: 'SET_SETTINGS', payload: settings });
      
      // Check permission status
      const permissionStatus = await notificationService.getPermissionStatus();
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: permissionStatus });
      
      // Refresh unread count
      await refreshUnreadCount();
      
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize notifications';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Notification initialization error:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>): Promise<void> => {
    try {
      await notificationService.updateSettings(newSettings);
      const updatedSettings = notificationService.getSettings();
      dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await notificationService.requestPermissions();
      const status = granted ? 'granted' : 'denied';
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: status });
      return granted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request permissions';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return false;
    }
  }, []);

  const scheduleEventReminders = useCallback(async (
    eventId: string, 
    eventTitle: string, 
    startDate: Date
  ): Promise<void> => {
    try {
      await notificationService.scheduleEventReminders(eventId, eventTitle, startDate);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to schedule reminders';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const cancelEventNotifications = useCallback(async (eventId: string): Promise<void> => {
    try {
      await notificationService.cancelEventNotifications(eventId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel notifications';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const sendRSVPConfirmation = useCallback(async (
    eventId: string, 
    eventTitle: string, 
    status: string
  ): Promise<void> => {
    try {
      await notificationService.sendRSVPConfirmation(eventId, eventTitle, status);
      
      // Add to recent notifications
      const notification: NotificationItem = {
        id: `rsvp_${eventId}_${Date.now()}`,
        type: 'rsvp_confirmation',
        title: 'RSVP Confirmed',
        body: `You're ${status} for ${eventTitle}`,
        data: {
          type: 'rsvp_confirmation',
          eventId,
          eventTitle,
          data: { status },
        },
        timestamp: new Date(),
        read: false,
      };
      
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send RSVP confirmation';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const sendEventUpdate = useCallback(async (
    eventId: string, 
    eventTitle: string, 
    message: string
  ): Promise<void> => {
    try {
      await notificationService.sendEventUpdate(eventId, eventTitle, message);
      
      // Add to recent notifications
      const notification: NotificationItem = {
        id: `update_${eventId}_${Date.now()}`,
        type: 'event_update',
        title: `Event Update: ${eventTitle}`,
        body: message,
        data: {
          type: 'event_update',
          eventId,
          eventTitle,
          data: { message },
        },
        timestamp: new Date(),
        read: false,
      };
      
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send event update';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const markNotificationRead = useCallback((id: string): void => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  }, []);

  const markAllNotificationsRead = useCallback((): void => {
    dispatch({ type: 'MARK_ALL_READ' });
    notificationService.updateBadgeCount();
  }, []);

  const clearAllNotifications = useCallback(async (): Promise<void> => {
    try {
      await notificationService.clearAllNotifications();
      dispatch({ type: 'CLEAR_NOTIFICATIONS' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear notifications';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const refreshUnreadCount = useCallback(async (): Promise<void> => {
    try {
      await notificationService.updateBadgeCount();
      // In a real app, you might fetch the count from your API
      // For now, we'll use the local count
    } catch (error) {
      console.error('Failed to refresh unread count:', error);
    }
  }, []);

  const contextValue: NotificationContextType = {
    ...state,
    initialize,
    updateSettings,
    requestPermissions,
    scheduleEventReminders,
    cancelEventNotifications,
    sendRSVPConfirmation,
    sendEventUpdate,
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications,
    refreshUnreadCount,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Convenience hooks for specific notification features
export function useNotificationSettings() {
  const { settings, updateSettings, permissionStatus, requestPermissions } = useNotifications();
  
  return {
    settings,
    updateSettings,
    permissionStatus,
    requestPermissions,
    isEnabled: settings.enabled && permissionStatus === 'granted',
  };
}

export function useEventNotifications() {
  const { 
    scheduleEventReminders, 
    cancelEventNotifications, 
    sendRSVPConfirmation,
    sendEventUpdate 
  } = useNotifications();
  
  return {
    scheduleReminders: scheduleEventReminders,
    cancelNotifications: cancelEventNotifications,
    sendRSVPConfirmation,
    sendEventUpdate,
  };
}

export function useNotificationBadge() {
  const { unreadCount, markAllNotificationsRead, refreshUnreadCount } = useNotifications();
  
  return {
    count: unreadCount,
    hasUnread: unreadCount > 0,
    markAllRead: markAllNotificationsRead,
    refresh: refreshUnreadCount,
  };
}