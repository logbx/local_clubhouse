import { Platform, AppState, AppStateStatus } from 'react-native';
import { sentryMonitoring } from './sentry';
import { analytics } from './analytics';
import { performanceMonitor } from './performance';

// Main monitoring setup and coordination
class MonitoringService {
  private isInitialized = false;

  initialize(): void {
    if (this.isInitialized) return;

    console.log('🔧 Initializing monitoring services...');

    // Initialize error tracking
    sentryMonitoring.initialize();

    // Set platform-specific tags
    sentryMonitoring.setTags({
      platform: Platform.OS,
      version: Platform.Version?.toString() || 'unknown',
      environment: __DEV__ ? 'development' : 'production',
    });

    // Track app launch
    analytics.trackAppLaunch();
    performanceMonitor.measureAppStartup();

    // Setup app state monitoring
    this.setupAppStateMonitoring();

    // Setup error boundary integration
    this.setupErrorBoundaryIntegration();

    this.isInitialized = true;
    console.log('✅ Monitoring services initialized');
  }

  private setupAppStateMonitoring(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        analytics.trackAppBackground();
        performanceMonitor.endTimer('app_foreground_session');
      } else if (nextAppState === 'active') {
        analytics.trackAppForeground();
        performanceMonitor.startTimer('app_foreground_session');
      }
    });
  }

  private setupErrorBoundaryIntegration(): void {
    // Global error handler for unhandled promise rejections
    if (typeof global !== 'undefined') {
      const originalHandler = global.ErrorUtils?.getGlobalHandler();
      
      global.ErrorUtils?.setGlobalHandler((error: Error, isFatal?: boolean) => {
        sentryMonitoring.captureError(error, {
          isFatal,
          source: 'global_error_handler',
        });
        
        analytics.trackError('unhandled_error', error.message);
        
        // Call original handler if it exists
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    // Handle unhandled promise rejections
    if (typeof global !== 'undefined' && global.HermesInternal?.hasPromise) {
      global.addEventListener?.('unhandledrejection', (event: any) => {
        sentryMonitoring.captureError(new Error(event.reason), {
          source: 'unhandled_promise_rejection',
        });
        
        analytics.trackError('promise_rejection', event.reason?.toString() || 'Unknown');
      });
    }
  }

  // User management
  setUser(user: {
    id: string;
    email?: string;
    username?: string;
    clubId?: string;
    membershipType?: string;
  }): void {
    sentryMonitoring.setUser(user);
    analytics.identifyUser({
      userId: user.id,
      email: user.email,
      username: user.username,
      clubId: user.clubId,
      membershipType: user.membershipType,
      registrationDate: new Date().toISOString(),
    });
  }

  clearUser(): void {
    sentryMonitoring.clearUser();
    analytics.clearUser();
  }

  // Screen tracking
  trackScreen(screenName: string, properties?: Record<string, any>): void {
    analytics.trackScreen(screenName, properties);
    sentryMonitoring.addBreadcrumb({
      category: 'navigation',
      message: `Screen: ${screenName}`,
      level: 'info',
      data: properties,
    });
  }

  // API monitoring
  createAPIMonitor(url: string, method: string = 'GET') {
    const sentryMonitor = sentryMonitoring.monitorAPIRequest(url, method);
    const performanceTimer = `api_${method}_${url}`;
    
    performanceMonitor.startNetworkRequest(url, method);
    performanceMonitor.startTimer(performanceTimer);

    return {
      onSuccess: (status: number, responseSize?: number) => {
        const duration = performanceMonitor.endTimer(performanceTimer);
        performanceMonitor.endNetworkRequest(url, method, status, responseSize);
        sentryMonitor.onSuccess(status, duration || 0);
        
        // Track slow API calls
        if (duration && duration > 3000) {
          analytics.trackPerformance('slow_api_call', duration, 'ms');
        }
      },
      onError: (error: Error, status?: number) => {
        const duration = performanceMonitor.endTimer(performanceTimer);
        performanceMonitor.endNetworkRequest(url, method, status, undefined, error.message);
        sentryMonitor.onError(error, status);
        
        analytics.trackError('api_error', error.message, url);
      },
    };
  }

  // Database monitoring
  createDatabaseMonitor(operation: string, table: string) {
    const sentryMonitor = sentryMonitoring.monitorDatabaseOperation(operation, table);
    
    return performanceMonitor.measureDatabaseOperation(
      `${operation}_${table}`,
      async () => {
        // This would wrap your actual database operation
        throw new Error('Database operation not implemented');
      }
    ).then(
      result => {
        sentryMonitor.onSuccess(0); // Duration would be measured by performanceMonitor
        return result;
      },
      error => {
        sentryMonitor.onError(error);
        throw error;
      }
    );
  }

  // Feature usage tracking
  trackFeature(featureName: string, action: string, metadata?: Record<string, any>): void {
    analytics.trackFeatureUsage(featureName, action, metadata);
    sentryMonitoring.addBreadcrumb({
      category: 'feature',
      message: `${featureName}: ${action}`,
      level: 'info',
      data: metadata,
    });
  }

  // Business events
  trackBusinessEvent(eventType: string, properties: Record<string, any>): void {
    switch (eventType) {
      case 'club_joined':
        analytics.trackClubJoin(properties.clubId, properties.clubName);
        break;
      case 'event_created':
        analytics.trackEventCreated(properties.eventId, properties.eventType);
        break;
      case 'tournament_created':
        analytics.trackTournamentCreated(
          properties.tournamentId,
          properties.tournamentType,
          properties.playerCount
        );
        break;
      case 'match_completed':
        analytics.trackMatchResult(properties.matchId, properties.result);
        break;
      case 'image_uploaded':
        analytics.trackImageUpload(properties.type, properties.size, properties.duration);
        break;
      default:
        analytics.trackEvent(eventType, properties);
    }

    sentryMonitoring.addBreadcrumb({
      category: 'business',
      message: `Business event: ${eventType}`,
      level: 'info',
      data: properties,
    });
  }

  // Performance issue reporting
  reportPerformanceIssue(
    type: 'slow_api' | 'slow_screen' | 'memory_warning' | 'frame_drop',
    details: Record<string, any>
  ): void {
    sentryMonitoring.reportPerformanceIssue({ type, details });
    analytics.trackPerformance(`issue_${type}`, 1, 'count');
    performanceMonitor.trackCustomMetric(`performance_issue_${type}`, details);
  }

  // Image upload monitoring
  createImageUploadMonitor(type: string, size: number) {
    const sentryMonitor = sentryMonitoring.monitorImageUpload(type, size);
    const performanceTimer = `image_upload_${type}`;
    
    performanceMonitor.startTimer(performanceTimer);

    return {
      onSuccess: (url: string) => {
        const duration = performanceMonitor.endTimer(performanceTimer);
        sentryMonitor.onSuccess(duration || 0, url);
        analytics.trackImageUpload(type, size, duration || 0);
      },
      onError: (error: Error) => {
        performanceMonitor.endTimer(performanceTimer);
        sentryMonitor.onError(error);
        analytics.trackError('image_upload_error', error.message);
      },
    };
  }

  // A/B testing and experiments
  trackExperiment(experimentName: string, variant: string): void {
    analytics.trackExperiment(experimentName, variant);
    sentryMonitoring.trackABTest(experimentName, variant);
  }

  // Privacy and compliance
  async exportUserData(): Promise<any> {
    const analyticsData = await analytics.exportUserData();
    
    return {
      analytics: analyticsData,
      monitoring: {
        platform: Platform.OS,
        version: Platform.Version,
        lastSession: Date.now(),
      },
    };
  }

  async deleteUserData(): Promise<void> {
    await analytics.deleteUserData();
    sentryMonitoring.clearUser();
  }

  // Debug and development
  getDebugInfo(): any {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      isInitialized: this.isInitialized,
      environment: __DEV__ ? 'development' : 'production',
      analytics: analytics.getDebugInfo(),
      performance: performanceMonitor.getSyncStatus?.() || 'not available',
    };
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down monitoring services...');
    
    await Promise.all([
      sentryMonitoring.flush(5000),
      analytics.destroy(),
      performanceMonitor.destroy?.(),
    ]);
    
    console.log('✅ Monitoring services shut down');
  }
}

export const monitoring = new MonitoringService();

// Convenience exports
export { sentryMonitoring, analytics, performanceMonitor };
export default monitoring;

// Auto-initialize in production
if (!__DEV__) {
  monitoring.initialize();
}