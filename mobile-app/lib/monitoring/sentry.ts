import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import type { User } from '../db/types';

// Sentry configuration
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  dist?: string;
  enableAutoPerformanceTracing: boolean;
  enableAutoSessionTracking: boolean;
  enableNative: boolean;
  enableNativeCrashHandling: boolean;
  debug: boolean;
}

class SentryMonitoring {
  private isInitialized = false;

  initialize(): void {
    if (this.isInitialized || !SENTRY_DSN) {
      return;
    }

    const config: SentryConfig = {
      dsn: SENTRY_DSN,
      environment: __DEV__ ? 'development' : 'production',
      enableAutoPerformanceTracing: true,
      enableAutoSessionTracking: true,
      enableNative: Platform.OS !== 'web',
      enableNativeCrashHandling: Platform.OS !== 'web',
      debug: __DEV__,
    };

    // Add release and dist for production builds
    if (!__DEV__) {
      config.release = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';
      config.dist = process.env.EXPO_PUBLIC_BUILD_NUMBER || '1';
    }

    Sentry.init({
      ...config,
      beforeSend: (event, hint) => {
        // Filter out sensitive information
        if (event.exception) {
          const error = hint.originalException;
          if (error && typeof error === 'object' && 'message' in error) {
            // Filter out common non-critical errors
            const message = (error as Error).message.toLowerCase();
            if (
              message.includes('network request failed') ||
              message.includes('connection timeout') ||
              message.includes('cancelled')
            ) {
              return null; // Don't send these errors
            }
          }
        }

        // Remove sensitive data from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            if (breadcrumb.data) {
              // Remove sensitive fields
              const { password, token, key, secret, ...safeData } = breadcrumb.data;
              breadcrumb.data = safeData;
            }
            return breadcrumb;
          });
        }

        return event;
      },
      integrations: [
        new Sentry.ReactNativeTracing({
          routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
          enableStallTracking: true,
          enableAppStartTracking: true,
          enableUserInteractionTracing: true,
        }),
      ],
      tracesSampleRate: __DEV__ ? 1.0 : 0.1, // Lower sample rate in production
    });

    this.isInitialized = true;
    console.log('✅ Sentry monitoring initialized');
  }

  // User context management
  setUser(user: Partial<User>): void {
    if (!this.isInitialized) return;

    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      // Don't include sensitive information
    });
  }

  clearUser(): void {
    if (!this.isInitialized) return;
    Sentry.setUser(null);
  }

  // Context and tags
  setContext(key: string, context: Record<string, any>): void {
    if (!this.isInitialized) return;
    Sentry.setContext(key, context);
  }

  setTag(key: string, value: string): void {
    if (!this.isInitialized) return;
    Sentry.setTag(key, value);
  }

  setTags(tags: Record<string, string>): void {
    if (!this.isInitialized) return;
    Sentry.setTags(tags);
  }

  // Error reporting
  captureError(error: Error, context?: Record<string, any>): void {
    if (!this.isInitialized) return;

    if (context) {
      Sentry.withScope(scope => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!this.isInitialized) return;
    Sentry.captureMessage(message, level);
  }

  // Performance monitoring
  startTransaction(name: string, op: string): Sentry.Transaction | null {
    if (!this.isInitialized) return null;
    return Sentry.startTransaction({ name, op });
  }

  // API request monitoring
  monitorAPIRequest(url: string, method: string = 'GET'): {
    onSuccess: (status: number, duration: number) => void;
    onError: (error: Error, status?: number) => void;
  } {
    const transaction = this.startTransaction(`API ${method} ${url}`, 'http.client');
    
    return {
      onSuccess: (status: number, duration: number) => {
        if (transaction) {
          transaction.setData('http.status_code', status);
          transaction.setData('http.response_time', duration);
          transaction.finish();
        }
        
        this.addBreadcrumb({
          category: 'http',
          message: `${method} ${url}`,
          level: 'info',
          data: { status, duration },
        });
      },
      onError: (error: Error, status?: number) => {
        if (transaction) {
          transaction.setData('http.status_code', status || 0);
          transaction.finish();
        }
        
        this.captureError(error, {
          api: { url, method, status },
        });
        
        this.addBreadcrumb({
          category: 'http',
          message: `${method} ${url} failed`,
          level: 'error',
          data: { error: error.message, status },
        });
      },
    };
  }

  // Database operation monitoring
  monitorDatabaseOperation(operation: string, table: string): {
    onSuccess: (duration: number, recordCount?: number) => void;
    onError: (error: Error) => void;
  } {
    const transaction = this.startTransaction(`DB ${operation} ${table}`, 'db.query');
    
    return {
      onSuccess: (duration: number, recordCount?: number) => {
        if (transaction) {
          transaction.setData('db.operation', operation);
          transaction.setData('db.table', table);
          transaction.setData('db.duration', duration);
          if (recordCount !== undefined) {
            transaction.setData('db.record_count', recordCount);
          }
          transaction.finish();
        }
        
        this.addBreadcrumb({
          category: 'database',
          message: `${operation} ${table}`,
          level: 'info',
          data: { duration, recordCount },
        });
      },
      onError: (error: Error) => {
        if (transaction) {
          transaction.finish();
        }
        
        this.captureError(error, {
          database: { operation, table },
        });
      },
    };
  }

  // Screen navigation monitoring
  monitorScreenNavigation(fromScreen: string, toScreen: string): void {
    this.addBreadcrumb({
      category: 'navigation',
      message: `Navigate from ${fromScreen} to ${toScreen}`,
      level: 'info',
      data: { fromScreen, toScreen },
    });
  }

  // User action monitoring
  monitorUserAction(action: string, target?: string, data?: Record<string, any>): void {
    this.addBreadcrumb({
      category: 'user',
      message: `User ${action}${target ? ` on ${target}` : ''}`,
      level: 'info',
      data: { action, target, ...data },
    });
  }

  // WebSocket monitoring
  monitorWebSocket(event: string, data?: any): void {
    this.addBreadcrumb({
      category: 'websocket',
      message: `WebSocket ${event}`,
      level: 'info',
      data,
    });
  }

  // Image upload monitoring
  monitorImageUpload(type: string, size: number): {
    onSuccess: (uploadTime: number, url: string) => void;
    onError: (error: Error) => void;
  } {
    const transaction = this.startTransaction(`Image Upload ${type}`, 'upload');
    
    return {
      onSuccess: (uploadTime: number, url: string) => {
        if (transaction) {
          transaction.setData('upload.type', type);
          transaction.setData('upload.size', size);
          transaction.setData('upload.duration', uploadTime);
          transaction.finish();
        }
        
        this.addBreadcrumb({
          category: 'upload',
          message: `Uploaded ${type} image`,
          level: 'info',
          data: { type, size, uploadTime },
        });
      },
      onError: (error: Error) => {
        if (transaction) {
          transaction.finish();
        }
        
        this.captureError(error, {
          upload: { type, size },
        });
      },
    };
  }

  // Breadcrumb utilities
  addBreadcrumb(breadcrumb: {
    message: string;
    category: string;
    level: 'info' | 'warning' | 'error';
    data?: Record<string, any>;
  }): void {
    if (!this.isInitialized) return;
    
    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category,
      level: breadcrumb.level,
      data: breadcrumb.data,
      timestamp: Date.now() / 1000,
    });
  }

  // Performance issue detection
  reportPerformanceIssue(issue: {
    type: 'slow_api' | 'slow_screen' | 'memory_warning' | 'frame_drop';
    details: Record<string, any>;
  }): void {
    this.captureMessage(`Performance Issue: ${issue.type}`, 'warning');
    this.setContext('performance_issue', issue.details);
  }

  // Feature flag integration
  trackFeatureFlag(flagName: string, value: boolean, context?: Record<string, any>): void {
    this.addBreadcrumb({
      category: 'feature_flag',
      message: `Feature flag ${flagName}: ${value}`,
      level: 'info',
      data: { flagName, value, ...context },
    });
  }

  // A/B test tracking
  trackABTest(testName: string, variant: string, context?: Record<string, any>): void {
    this.setTag('ab_test', `${testName}:${variant}`);
    this.addBreadcrumb({
      category: 'ab_test',
      message: `A/B Test ${testName}: ${variant}`,
      level: 'info',
      data: { testName, variant, ...context },
    });
  }

  // Manual session management (for advanced use cases)
  startSession(): void {
    if (!this.isInitialized) return;
    Sentry.startSession();
  }

  endSession(): void {
    if (!this.isInitialized) return;
    Sentry.endSession();
  }

  // Flush pending events (useful before app closes)
  async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.isInitialized) return false;
    return Sentry.flush(timeout);
  }
}

export const sentryMonitoring = new SentryMonitoring();
export default sentryMonitoring;