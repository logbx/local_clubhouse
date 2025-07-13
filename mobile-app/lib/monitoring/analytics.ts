import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Analytics interfaces
interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
  platform: string;
}

interface UserProperties {
  userId: string;
  email?: string;
  username?: string;
  clubId?: string;
  membershipType?: string;
  registrationDate?: string;
  lastActive?: string;
}

interface SessionInfo {
  sessionId: string;
  startTime: number;
  endTime?: number;
  screenViews: number;
  events: number;
  duration?: number;
}

class AnalyticsService {
  private isEnabled = true;
  private sessionId: string;
  private sessionStart: number;
  private currentScreen: string = '';
  private eventQueue: AnalyticsEvent[] = [];
  private userProperties: UserProperties | null = null;
  private sessionInfo: SessionInfo;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.sessionInfo = {
      sessionId: this.sessionId,
      startTime: this.sessionStart,
      screenViews: 0,
      events: 0,
    };

    this.setupAutoFlush();
    this.loadPersistedData();
  }

  // Session management
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupAutoFlush(): void {
    // Flush events every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const userData = await AsyncStorage.getItem('analytics_user');
      if (userData) {
        this.userProperties = JSON.parse(userData);
      }
    } catch (error) {
      console.error('Failed to load persisted analytics data:', error);
    }
  }

  // User identification
  async identifyUser(properties: UserProperties): Promise<void> {
    this.userProperties = {
      ...properties,
      lastActive: new Date().toISOString(),
    };

    try {
      await AsyncStorage.setItem('analytics_user', JSON.stringify(this.userProperties));
    } catch (error) {
      console.error('Failed to persist user properties:', error);
    }

    // Track user identification
    this.trackEvent('user_identified', {
      userId: properties.userId,
      username: properties.username,
      hasClub: !!properties.clubId,
      membershipType: properties.membershipType,
    });
  }

  async clearUser(): Promise<void> {
    this.userProperties = null;
    try {
      await AsyncStorage.removeItem('analytics_user');
    } catch (error) {
      console.error('Failed to clear user properties:', error);
    }
  }

  // Event tracking
  trackEvent(name: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        platform: Platform.OS,
        sessionId: this.sessionId,
        screenName: this.currentScreen,
      },
      timestamp: Date.now(),
      userId: this.userProperties?.userId,
      sessionId: this.sessionId,
      platform: Platform.OS,
    };

    this.eventQueue.push(event);
    this.sessionInfo.events++;

    // Log in development
    if (__DEV__) {
      console.log('📊 Analytics Event:', name, properties);
    }

    // Auto-flush if queue is getting large
    if (this.eventQueue.length >= 20) {
      this.flush();
    }
  }

  // Screen tracking
  trackScreen(screenName: string, properties?: Record<string, any>): void {
    if (this.currentScreen === screenName) return;

    const previousScreen = this.currentScreen;
    this.currentScreen = screenName;
    this.sessionInfo.screenViews++;

    this.trackEvent('screen_view', {
      screenName,
      previousScreen: previousScreen || undefined,
      ...properties,
    });
  }

  // App lifecycle events
  trackAppLaunch(): void {
    this.trackEvent('app_launch', {
      platform: Platform.OS,
      version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
      firstLaunch: !this.userProperties,
    });
  }

  trackAppBackground(): void {
    this.trackEvent('app_background');
    this.endSession();
  }

  trackAppForeground(): void {
    // Start new session if enough time has passed
    const timeSinceBackground = Date.now() - this.sessionStart;
    if (timeSinceBackground > 30000) { // 30 seconds
      this.startNewSession();
    }

    this.trackEvent('app_foreground');
  }

  // Session management
  private startNewSession(): void {
    this.endSession();
    
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.sessionInfo = {
      sessionId: this.sessionId,
      startTime: this.sessionStart,
      screenViews: 0,
      events: 0,
    };
  }

  private endSession(): void {
    const endTime = Date.now();
    this.sessionInfo.endTime = endTime;
    this.sessionInfo.duration = endTime - this.sessionInfo.startTime;

    this.trackEvent('session_end', {
      duration: this.sessionInfo.duration,
      screenViews: this.sessionInfo.screenViews,
      events: this.sessionInfo.events,
    });

    this.flush();
  }

  // Business events
  trackClubJoin(clubId: string, clubName: string): void {
    this.trackEvent('club_joined', {
      clubId,
      clubName,
    });
  }

  trackEventCreated(eventId: string, eventType: string): void {
    this.trackEvent('event_created', {
      eventId,
      eventType,
    });
  }

  trackEventJoin(eventId: string, eventType: string): void {
    this.trackEvent('event_joined', {
      eventId,
      eventType,
    });
  }

  trackTournamentCreated(tournamentId: string, tournamentType: string, playerCount: number): void {
    this.trackEvent('tournament_created', {
      tournamentId,
      tournamentType,
      playerCount,
    });
  }

  trackTournamentJoin(tournamentId: string, tournamentType: string): void {
    this.trackEvent('tournament_joined', {
      tournamentId,
      tournamentType,
    });
  }

  trackMatchResult(matchId: string, result: 'win' | 'loss' | 'draw'): void {
    this.trackEvent('match_completed', {
      matchId,
      result,
    });
  }

  trackImageUpload(type: string, size: number, duration: number): void {
    this.trackEvent('image_uploaded', {
      type,
      sizeMB: Math.round(size / 1024 / 1024 * 100) / 100,
      duration,
    });
  }

  trackSearch(query: string, type: string, resultCount: number): void {
    this.trackEvent('search_performed', {
      query: query.length, // Don't track actual query for privacy
      type,
      resultCount,
    });
  }

  trackShare(contentType: string, platform?: string): void {
    this.trackEvent('content_shared', {
      contentType,
      platform,
    });
  }

  trackNotificationOpen(notificationType: string): void {
    this.trackEvent('notification_opened', {
      type: notificationType,
    });
  }

  // Feature usage tracking
  trackFeatureUsage(featureName: string, action: string, metadata?: Record<string, any>): void {
    this.trackEvent('feature_used', {
      feature: featureName,
      action,
      ...metadata,
    });
  }

  trackError(errorType: string, errorMessage: string, screen?: string): void {
    this.trackEvent('error_occurred', {
      errorType,
      errorMessage: errorMessage.substring(0, 100), // Limit length
      screen: screen || this.currentScreen,
    });
  }

  trackPerformance(metric: string, value: number, unit: string): void {
    this.trackEvent('performance_metric', {
      metric,
      value,
      unit,
    });
  }

  // A/B Testing and Feature Flags
  trackExperiment(experimentName: string, variant: string): void {
    this.trackEvent('experiment_viewed', {
      experimentName,
      variant,
    });
  }

  trackConversion(goalName: string, value?: number): void {
    this.trackEvent('conversion', {
      goal: goalName,
      value,
    });
  }

  // Revenue tracking
  trackPurchase(purchaseId: string, amount: number, currency: string, itemType: string): void {
    this.trackEvent('purchase_completed', {
      purchaseId,
      amount,
      currency,
      itemType,
    });
  }

  trackSubscription(subscriptionType: string, amount: number, period: string): void {
    this.trackEvent('subscription_started', {
      subscriptionType,
      amount,
      period,
    });
  }

  // Data management
  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.sendEvents(eventsToSend);
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Put events back in queue for retry
      this.eventQueue.unshift(...eventsToSend);
    }
  }

  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    if (__DEV__) {
      // In development, just log the events
      console.log('📊 Sending analytics events:', events.length);
      return;
    }

    // Send to your analytics backend
    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events,
        userProperties: this.userProperties,
        sessionInfo: this.sessionInfo,
      }),
    });

    if (!response.ok) {
      throw new Error(`Analytics API error: ${response.status}`);
    }
  }

  // Privacy and compliance
  async exportUserData(): Promise<any> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const analyticsKeys = allKeys.filter(key => key.startsWith('analytics_'));
      const data = await AsyncStorage.multiGet(analyticsKeys);
      
      return {
        userProperties: this.userProperties,
        sessionInfo: this.sessionInfo,
        persistedData: data,
        queuedEvents: this.eventQueue,
      };
    } catch (error) {
      console.error('Failed to export user data:', error);
      return null;
    }
  }

  async deleteUserData(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const analyticsKeys = allKeys.filter(key => key.startsWith('analytics_'));
      await AsyncStorage.multiRemove(analyticsKeys);
      
      this.userProperties = null;
      this.eventQueue = [];
      
      this.trackEvent('user_data_deleted');
      await this.flush();
    } catch (error) {
      console.error('Failed to delete user data:', error);
    }
  }

  // Control methods
  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
    this.eventQueue = [];
  }

  // Debug methods
  getDebugInfo(): any {
    return {
      isEnabled: this.isEnabled,
      sessionId: this.sessionId,
      currentScreen: this.currentScreen,
      queuedEvents: this.eventQueue.length,
      userProperties: this.userProperties,
      sessionInfo: this.sessionInfo,
    };
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

export const analytics = new AnalyticsService();
export default analytics;