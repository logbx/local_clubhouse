import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Performance monitoring interfaces
interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags?: Record<string, string>;
  context?: any;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface NetworkMetric {
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  responseSize?: number;
  error?: string;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private networkMetrics: NetworkMetric[] = [];
  private frameDrops: number = 0;
  private isEnabled: boolean = true;

  constructor() {
    this.setupFrameDropMonitoring();
    this.setupMemoryMonitoring();
  }

  // Performance timing
  startTimer(name: string, tags?: Record<string, string>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      tags,
    };

    this.metrics.set(name, metric);
  }

  endTimer(name: string, context?: any): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance timer "${name}" not found`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.context = context;

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration}ms`, metric);
    }

    // Send to analytics
    this.trackPerformanceMetric(metric);

    // Clean up
    this.metrics.delete(name);

    return duration;
  }

  // Network monitoring
  startNetworkRequest(url: string, method: string = 'GET'): string {
    if (!this.isEnabled) return '';

    const requestId = `${method}_${url}_${Date.now()}`;
    const metric: NetworkMetric = {
      url,
      method,
      startTime: Date.now(),
    };

    this.networkMetrics.push(metric);

    // Keep only last 100 network metrics
    if (this.networkMetrics.length > 100) {
      this.networkMetrics.shift();
    }

    return requestId;
  }

  endNetworkRequest(
    url: string,
    method: string,
    status?: number,
    responseSize?: number,
    error?: string
  ): void {
    if (!this.isEnabled) return;

    const metric = this.networkMetrics.find(
      m => m.url === url && m.method === method && !m.endTime
    );

    if (!metric) return;

    const endTime = Date.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.status = status;
    metric.responseSize = responseSize;
    metric.error = error;

    // Log slow requests
    if (metric.duration && metric.duration > 3000) {
      console.warn(`Slow network request: ${method} ${url} took ${metric.duration}ms`);
    }

    // Track network performance
    this.trackNetworkMetric(metric);
  }

  // Memory monitoring
  private setupMemoryMonitoring(): void {
    if (Platform.OS === 'web') {
      setInterval(() => {
        this.checkMemoryUsage();
      }, 30000); // Check every 30 seconds
    }
  }

  private checkMemoryUsage(): void {
    if (Platform.OS === 'web' && 'memory' in performance) {
      const memory = (performance as any).memory as MemoryInfo;
      
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      if (usagePercentage > 80) {
        console.warn(`High memory usage: ${usagePercentage.toFixed(2)}%`, memory);
        
        this.trackCustomMetric('memory_warning', {
          usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          totalMB: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
          usagePercentage: usagePercentage.toFixed(2),
        });
      }
    }
  }

  // Frame drop monitoring
  private setupFrameDropMonitoring(): void {
    if (Platform.OS !== 'web') {
      // For React Native, we can use the frame drop detection
      let lastFrameTime = Date.now();
      
      const checkFrames = () => {
        const currentTime = Date.now();
        const timeDiff = currentTime - lastFrameTime;
        
        // If more than 33ms passed (roughly 30fps), consider it a frame drop
        if (timeDiff > 33) {
          this.frameDrops++;
          
          // Reset counter every minute
          setTimeout(() => {
            if (this.frameDrops > 10) {
              console.warn(`Frame drops detected: ${this.frameDrops} in the last minute`);
              this.trackCustomMetric('frame_drops', {
                count: this.frameDrops,
                timeWindow: '1min',
              });
            }
            this.frameDrops = 0;
          }, 60000);
        }
        
        lastFrameTime = currentTime;
        requestAnimationFrame(checkFrames);
      };
      
      requestAnimationFrame(checkFrames);
    }
  }

  // App startup monitoring
  measureAppStartup(): void {
    const startupTime = Date.now();
    
    // Measure time to interactive
    const measureTTI = () => {
      const tti = Date.now() - startupTime;
      this.trackCustomMetric('app_startup_time', {
        duration: tti,
        platform: Platform.OS,
      });
    };

    // Wait for next tick to ensure app is fully loaded
    setTimeout(measureTTI, 0);
  }

  // Screen transition monitoring
  measureScreenTransition(fromScreen: string, toScreen: string): void {
    const transitionId = `transition_${fromScreen}_to_${toScreen}`;
    this.startTimer(transitionId, {
      fromScreen,
      toScreen,
      type: 'screen_transition',
    });

    // End timer after navigation completes
    setTimeout(() => {
      this.endTimer(transitionId);
    }, 100);
  }

  // Custom metrics
  trackCustomMetric(name: string, data: Record<string, any>): void {
    if (!this.isEnabled) return;

    console.log(`Performance metric: ${name}`, data);
    
    // Store locally for debugging
    this.storeMetricLocally(name, data);
  }

  // Database operation monitoring
  measureDatabaseOperation<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const timerId = `db_${operation}`;
    this.startTimer(timerId, {
      type: 'database',
      operation,
    });

    return fn()
      .then(result => {
        this.endTimer(timerId, { success: true });
        return result;
      })
      .catch(error => {
        this.endTimer(timerId, { success: false, error: error.message });
        throw error;
      });
  }

  // Bundle size monitoring
  measureBundleLoadTime(bundleName: string): void {
    const timerId = `bundle_load_${bundleName}`;
    this.startTimer(timerId, {
      type: 'bundle_load',
      bundle: bundleName,
    });

    // This would be called when the bundle finishes loading
    // Implementation depends on your bundling strategy
  }

  // Image loading monitoring
  measureImageLoad(imageUrl: string): {
    onLoad: () => void;
    onError: (error: any) => void;
  } {
    const timerId = `image_load_${imageUrl}`;
    this.startTimer(timerId, {
      type: 'image_load',
      url: imageUrl,
    });

    return {
      onLoad: () => {
        this.endTimer(timerId, { success: true });
      },
      onError: (error: any) => {
        this.endTimer(timerId, { success: false, error: error.message });
      },
    };
  }

  // Analytics integration
  private trackPerformanceMetric(metric: PerformanceMetric): void {
    // Integration with your analytics service
    if (Platform.OS === 'web') {
      // Web analytics (Google Analytics, etc.)
      if (typeof gtag !== 'undefined') {
        (window as any).gtag('event', 'timing_complete', {
          name: metric.name,
          value: metric.duration,
          custom_map: metric.tags,
        });
      }
    }
    
    // You could also send to your backend for custom analytics
    this.sendToBackend('performance_metric', metric);
  }

  private trackNetworkMetric(metric: NetworkMetric): void {
    // Track API performance
    this.sendToBackend('network_metric', metric);
  }

  private async sendToBackend(type: string, data: any): Promise<void> {
    try {
      // Only send in production and if enabled
      if (__DEV__ || !this.isEnabled) return;

      // Batch metrics to avoid overwhelming the backend
      const stored = await AsyncStorage.getItem('pending_metrics');
      const pendingMetrics = stored ? JSON.parse(stored) : [];
      
      pendingMetrics.push({ type, data, timestamp: Date.now() });
      
      // Send if we have enough metrics or after a timeout
      if (pendingMetrics.length >= 10) {
        await this.flushMetrics(pendingMetrics);
        await AsyncStorage.removeItem('pending_metrics');
      } else {
        await AsyncStorage.setItem('pending_metrics', JSON.stringify(pendingMetrics));
      }
    } catch (error) {
      console.error('Failed to send metrics:', error);
    }
  }

  private async flushMetrics(metrics: any[]): Promise<void> {
    try {
      // Replace with your actual analytics endpoint
      await fetch('/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics }),
      });
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  private async storeMetricLocally(name: string, data: any): Promise<void> {
    try {
      const key = `metric_${Date.now()}_${name}`;
      await AsyncStorage.setItem(key, JSON.stringify(data));
      
      // Clean up old metrics (keep only last 100)
      const keys = await AsyncStorage.getAllKeys();
      const metricKeys = keys.filter(k => k.startsWith('metric_'));
      
      if (metricKeys.length > 100) {
        const oldKeys = metricKeys.slice(0, metricKeys.length - 100);
        await AsyncStorage.multiRemove(oldKeys);
      }
    } catch (error) {
      console.error('Failed to store metric locally:', error);
    }
  }

  // Performance report generation
  async generatePerformanceReport(): Promise<any> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const metricKeys = keys.filter(k => k.startsWith('metric_'));
      const metrics = await AsyncStorage.multiGet(metricKeys);
      
      const report = {
        totalMetrics: metrics.length,
        averageAppStartup: 0,
        networkRequests: this.networkMetrics.length,
        frameDrops: this.frameDrops,
        timestamp: Date.now(),
        platform: Platform.OS,
      };
      
      return report;
    } catch (error) {
      console.error('Failed to generate performance report:', error);
      return null;
    }
  }

  // Control methods
  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  clear(): void {
    this.metrics.clear();
    this.networkMetrics.length = 0;
    this.frameDrops = 0;
  }
}

export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;

// React Native Performance API polyfill for consistency
if (Platform.OS !== 'web' && typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: (name: string) => performanceMonitor.startTimer(name),
    measure: (name: string, startMark?: string, endMark?: string) => {
      // Basic implementation
      return { duration: 0, name };
    },
  } as any;
}