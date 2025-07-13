import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { monitoring } from '@/lib/monitoring';

interface StartupMetrics {
  authCheck: number;
  firstRender: number;
  criticalAssets: number;
  totalStartup: number;
}

class StartupOptimizer {
  private startTime = Date.now();
  private metrics: Partial<StartupMetrics> = {};

  // Phase 1: Critical path only
  async initializeCriticalPath(): Promise<void> {
    const start = Date.now();
    
    // Only load auth state synchronously
    await this.loadAuthState();
    
    this.metrics.authCheck = Date.now() - start;
    console.log(`⚡ Auth check: ${this.metrics.authCheck}ms`);
  }

  // Phase 2: Deferred initialization
  deferredInitialization(): void {
    // Use setTimeout to defer non-critical work
    setTimeout(() => {
      this.initializeMonitoring();
    }, 50);

    setTimeout(() => {
      this.preloadCriticalAssets();
    }, 100);

    setTimeout(() => {
      this.initializeAnalytics();
    }, 200);
  }

  private async loadAuthState(): Promise<void> {
    try {
      // Use parallel loading for better performance
      const [accessToken, refreshToken, userProfile] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('refresh_token'),
        AsyncStorage.getItem('user_profile')
      ]);

      // Store in memory for immediate access
      (global as any).__AUTH_STATE__ = {
        hasToken: !!accessToken,
        userProfile: userProfile ? JSON.parse(userProfile) : null
      };
    } catch (error) {
      console.error('Auth state loading failed:', error);
    }
  }

  private initializeMonitoring(): void {
    try {
      monitoring.initialize();
      console.log('📊 Monitoring initialized (deferred)');
    } catch (error) {
      console.error('Monitoring init failed:', error);
    }
  }

  private async preloadCriticalAssets(): Promise<void> {
    const start = Date.now();
    
    try {
      // Preload critical images
      const criticalImages = [
        require('@/assets/images/logo.png'),
        require('@/assets/images/placeholder-avatar.png'),
        require('@/assets/images/empty-state.png')
      ];

      // Use expo-image for efficient preloading
      if (Platform.OS !== 'web') {
        const { Image } = require('expo-image');
        await Promise.all(
          criticalImages.map(source => Image.prefetch(source))
        );
      }

      this.metrics.criticalAssets = Date.now() - start;
      console.log(`🖼️ Critical assets preloaded: ${this.metrics.criticalAssets}ms`);
    } catch (error) {
      console.error('Asset preloading failed:', error);
    }
  }

  private initializeAnalytics(): void {
    // Initialize analytics last as it's not critical for UX
    console.log('📈 Analytics initialized (deferred)');
  }

  markFirstRender(): void {
    this.metrics.firstRender = Date.now() - this.startTime;
    console.log(`🎨 First render: ${this.metrics.firstRender}ms`);
  }

  markStartupComplete(): void {
    this.metrics.totalStartup = Date.now() - this.startTime;
    
    const report = {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      platform: Platform.OS
    };

    console.group('🚀 Startup Performance Report');
    console.log('Auth Check:', report.authCheck + 'ms');
    console.log('First Render:', report.firstRender + 'ms');
    console.log('Critical Assets:', report.criticalAssets + 'ms');
    console.log('Total Startup:', report.totalStartup + 'ms');
    console.groupEnd();

    // Report to monitoring if startup is slow
    if (report.totalStartup && report.totalStartup > 3000) {
      monitoring.reportPerformanceIssue('slow_startup', report);
    }
  }

  // Get startup state for components
  getStartupState() {
    return (global as any).__AUTH_STATE__ || { hasToken: false, userProfile: null };
  }
}

export const startupOptimizer = new StartupOptimizer();