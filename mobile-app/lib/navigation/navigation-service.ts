// Navigation Service - Core navigation management and utilities
import { router, usePathname, useLocalSearchParams } from 'expo-router';
import { storage } from '../storage';
import { logger } from '../monitoring/logger';
import { 
  NavigationState, 
  NavigationEvent, 
  NavigationPermission,
  NavigationError,
  NavigationMiddleware,
  NavigationGuard,
  NavigationAnalytics,
  NavigationPerformance,
  NAVIGATION_PERMISSIONS,
  NAVIGATION_CONSTANTS,
  ROUTES,
} from './types';

class NavigationService {
  private navigationHistory: NavigationState[] = [];
  private currentRoute: string = '';
  private sessionId: string = '';
  private startTime: number = 0;
  private routeStartTimes: Map<string, number> = new Map();
  private middleware: NavigationMiddleware[] = [];
  private guards: NavigationGuard[] = [];
  private analytics: NavigationAnalytics = {
    screenViews: {},
    timeSpent: {},
    navigationPaths: [],
    dropOffPoints: [],
  };
  private isInitialized = false;
  private listeners: Array<(event: NavigationEvent) => void> = [];

  constructor() {
    // Initialize service asynchronously without blocking app startup
    this.initializeService().catch(error => 
      console.warn('Navigation service initialization failed:', error)
    );
  }

  private async initializeService() {
    try {
      // Generate session ID
      this.sessionId = `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Set up default guards and middleware first (these are synchronous)
      this.setupDefaultGuards();
      this.setupDefaultMiddleware();
      
      // Mark as initialized early so navigation can work
      this.isInitialized = true;
      
      // Load navigation history asynchronously
      await this.loadNavigationHistory();
      
      // Load analytics asynchronously
      await this.loadAnalytics();
      
      logger.info('Navigation service initialized', {
        sessionId: this.sessionId,
        historyLength: this.navigationHistory.length,
      });
    } catch (error) {
      // Still mark as initialized even if async operations fail
      this.isInitialized = true;
      logger.warn('Navigation service partially initialized with errors', error);
    }
  }

  private async loadNavigationHistory() {
    try {
      const history = await storage.get<NavigationState[]>('navigation_history');
      if (history) {
        this.navigationHistory = history.slice(-NAVIGATION_CONSTANTS.MAX_HISTORY_LENGTH);
      }
    } catch (error) {
      logger.error('Failed to load navigation history', error);
    }
  }

  private async saveNavigationHistory() {
    try {
      await storage.set('navigation_history', this.navigationHistory);
    } catch (error) {
      logger.error('Failed to save navigation history', error);
    }
  }

  private async loadAnalytics() {
    try {
      const analytics = await storage.get<NavigationAnalytics>('navigation_analytics');
      if (analytics) {
        this.analytics = analytics;
      }
    } catch (error) {
      logger.error('Failed to load navigation analytics', error);
    }
  }

  private async saveAnalytics() {
    try {
      await storage.set('navigation_analytics', this.analytics);
    } catch (error) {
      logger.error('Failed to save navigation analytics', error);
    }
  }

  private setupDefaultGuards() {
    // Authentication guard
    this.addGuard(async (route: string) => {
      const permission = NAVIGATION_PERMISSIONS.find(p => p.route === route);
      if (permission?.requiresAuth) {
        const token = await storage.getAccessToken();
        if (!token) {
          this.navigate(ROUTES.AUTH.LOGIN);
          return false;
        }
      }
      return true;
    });

    // Email verification guard
    this.addGuard(async (route: string) => {
      const permission = NAVIGATION_PERMISSIONS.find(p => p.route === route);
      if (permission?.requiresVerification) {
        const user = await storage.get('current_user');
        if (!user?.emailVerified) {
          this.navigate(ROUTES.AUTH.VERIFY_EMAIL);
          return false;
        }
      }
      return true;
    });

    // Permission-based guard
    this.addGuard(async (route: string) => {
      const permission = NAVIGATION_PERMISSIONS.find(p => p.route === route);
      if (permission?.requiredPermissions?.length) {
        const userPermissions = await storage.get<string[]>('user_permissions') || [];
        const hasPermission = permission.requiredPermissions.every(p => 
          userPermissions.includes(p)
        );
        
        if (!hasPermission) {
          logger.warn('Navigation blocked: insufficient permissions', {
            route,
            required: permission.requiredPermissions,
            user: userPermissions,
          });
          return false;
        }
      }
      return true;
    });
  }

  private setupDefaultMiddleware() {
    // Analytics middleware
    this.addMiddleware(async (to: string, from: string) => {
      this.trackScreenView(to);
      this.trackNavigation(from, to);
      return true;
    });

    // Performance middleware
    this.addMiddleware(async (to: string, from: string) => {
      this.startRouteTimer(to);
      
      if (from) {
        this.endRouteTimer(from);
      }
      
      return true;
    });

    // Logging middleware
    this.addMiddleware(async (to: string, from: string, params) => {
      logger.info('Navigation event', {
        to,
        from,
        params,
        sessionId: this.sessionId,
        timestamp: Date.now(),
      });
      return true;
    });
  }

  // Public API
  async navigate(route: string, params?: Record<string, any>) {
    if (!this.isInitialized) {
      logger.warn('Navigation service not initialized');
      return;
    }

    try {
      const from = this.currentRoute;
      
      // Run guards
      for (const guard of this.guards) {
        const allowed = await guard(route, params);
        if (!allowed) {
          logger.info('Navigation blocked by guard', { route, params });
          return;
        }
      }

      // Run middleware
      for (const middleware of this.middleware) {
        const result = await middleware(route, from, params);
        if (result === false) {
          logger.info('Navigation blocked by middleware', { route, params });
          return;
        }
        if (typeof result === 'string') {
          // Middleware wants to redirect
          route = result;
        }
      }

      // Perform navigation
      if (params) {
        router.push({ pathname: route, params });
      } else {
        router.push(route);
      }

      // Update state
      this.updateNavigationState(route, params);
      
      // Notify listeners
      this.notifyListeners({
        type: 'navigate',
        routeName: route,
        params,
        timestamp: Date.now(),
        previousRoute: from,
      });

    } catch (error) {
      logger.error('Navigation failed', { route, params, error });
      throw error;
    }
  }

  async replace(route: string, params?: Record<string, any>) {
    try {
      const from = this.currentRoute;
      
      // Run guards and middleware (similar to navigate)
      for (const guard of this.guards) {
        const allowed = await guard(route, params);
        if (!allowed) return;
      }

      for (const middleware of this.middleware) {
        const result = await middleware(route, from, params);
        if (result === false) return;
        if (typeof result === 'string') {
          route = result;
        }
      }

      // Perform replace
      if (params) {
        router.replace({ pathname: route, params });
      } else {
        router.replace(route);
      }

      this.updateNavigationState(route, params);
      
      this.notifyListeners({
        type: 'navigate',
        routeName: route,
        params,
        timestamp: Date.now(),
        previousRoute: from,
      });

    } catch (error) {
      logger.error('Navigation replace failed', { route, params, error });
      throw error;
    }
  }

  back() {
    try {
      router.back();
      
      this.notifyListeners({
        type: 'back',
        routeName: this.currentRoute,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Navigation back failed', error);
    }
  }

  canGoBack(): boolean {
    return router.canGoBack();
  }

  private updateNavigationState(route: string, params?: Record<string, any>) {
    const state: NavigationState = {
      routeName: route,
      params,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    // Add to history
    this.navigationHistory.push(state);
    
    // Keep history size manageable
    if (this.navigationHistory.length > NAVIGATION_CONSTANTS.MAX_HISTORY_LENGTH) {
      this.navigationHistory = this.navigationHistory.slice(-NAVIGATION_CONSTANTS.MAX_HISTORY_LENGTH);
    }

    this.currentRoute = route;
    
    // Save to storage
    this.saveNavigationHistory();
  }

  private trackScreenView(route: string) {
    this.analytics.screenViews[route] = (this.analytics.screenViews[route] || 0) + 1;
    this.saveAnalytics();
  }

  private trackNavigation(from: string, to: string) {
    if (!from) return;
    
    const path = this.analytics.navigationPaths.find(p => p.from === from && p.to === to);
    if (path) {
      path.count++;
    } else {
      this.analytics.navigationPaths.push({
        from,
        to,
        count: 1,
        avgDuration: 0,
      });
    }
    
    this.saveAnalytics();
  }

  private startRouteTimer(route: string) {
    this.routeStartTimes.set(route, Date.now());
  }

  private endRouteTimer(route: string) {
    const startTime = this.routeStartTimes.get(route);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.analytics.timeSpent[route] = (this.analytics.timeSpent[route] || 0) + duration;
      this.routeStartTimes.delete(route);
    }
  }

  // Middleware and Guards
  addMiddleware(middleware: NavigationMiddleware) {
    this.middleware.push(middleware);
  }

  removeMiddleware(middleware: NavigationMiddleware) {
    this.middleware = this.middleware.filter(m => m !== middleware);
  }

  addGuard(guard: NavigationGuard) {
    this.guards.push(guard);
  }

  removeGuard(guard: NavigationGuard) {
    this.guards = this.guards.filter(g => g !== guard);
  }

  // Event Listeners
  addEventListener(listener: (event: NavigationEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(event: NavigationEvent) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('Navigation listener error', error);
      }
    });
  }

  // Analytics and Performance
  getAnalytics(): NavigationAnalytics {
    return { ...this.analytics };
  }

  getNavigationHistory(): NavigationState[] {
    return [...this.navigationHistory];
  }

  getCurrentRoute(): string {
    return this.currentRoute;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // Performance monitoring
  recordPerformance(performance: NavigationPerformance) {
    logger.info('Navigation performance', performance);
    
    // Store performance data
    const key = `nav_perf_${Date.now()}`;
    storage.set(key, performance);
    
    // Clean up old performance data
    this.cleanupPerformanceData();
  }

  private async cleanupPerformanceData() {
    // Keep only last 24 hours of performance data
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    // Implementation would clean up old performance entries
  }

  // Route utilities
  isProtectedRoute(route: string): boolean {
    return NAVIGATION_PERMISSIONS.some(p => p.route === route && p.requiresAuth);
  }

  getRequiredPermissions(route: string): string[] {
    const permission = NAVIGATION_PERMISSIONS.find(p => p.route === route);
    return permission?.requiredPermissions || [];
  }

  getRequiredRoles(route: string): string[] {
    const permission = NAVIGATION_PERMISSIONS.find(p => p.route === route);
    return permission?.requiredRoles || [];
  }

  // Deep linking helpers
  buildDeepLink(route: string, params?: Record<string, any>): string {
    let url = `localclubhouse://app${route}`;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }
    
    return url;
  }

  parseDeepLink(url: string): { route: string; params: Record<string, any> } {
    const parsedUrl = new URL(url);
    const route = parsedUrl.pathname.replace('/app', '');
    const params: Record<string, any> = {};
    
    parsedUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return { route, params };
  }

  // Reset service state
  async reset() {
    this.navigationHistory = [];
    this.currentRoute = '';
    this.analytics = {
      screenViews: {},
      timeSpent: {},
      navigationPaths: [],
      dropOffPoints: [],
    };
    this.routeStartTimes.clear();
    
    await storage.remove('navigation_history');
    await storage.remove('navigation_analytics');
    
    logger.info('Navigation service reset');
  }
}

export const navigationService = new NavigationService();