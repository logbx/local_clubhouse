// Navigation Hooks - React hooks for navigation functionality
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { navigationService } from './navigation-service';
import { NavigationEvent, NavigationState, NavigationAnalytics } from './types';
import { logger } from '../monitoring/logger';

/**
 * Hook for navigation with guards and middleware
 */
export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  
  const navigate = useCallback((route: string, params?: Record<string, any>) => {
    return navigationService.navigate(route, params);
  }, []);

  const replace = useCallback((route: string, params?: Record<string, any>) => {
    return navigationService.replace(route, params);
  }, []);

  const back = useCallback(() => {
    return navigationService.back();
  }, []);

  const canGoBack = useCallback(() => {
    return navigationService.canGoBack();
  }, []);

  const buildDeepLink = useCallback((route: string, params?: Record<string, any>) => {
    return navigationService.buildDeepLink(route, params);
  }, []);

  const parseDeepLink = useCallback((url: string) => {
    return navigationService.parseDeepLink(url);
  }, []);

  return {
    navigate,
    replace,
    back,
    canGoBack,
    buildDeepLink,
    parseDeepLink,
    currentRoute: pathname,
    router,
  };
}

/**
 * Hook for navigation events and state
 */
export function useNavigationState() {
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([]);
  const [currentRoute, setCurrentRoute] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [analytics, setAnalytics] = useState<NavigationAnalytics>({
    screenViews: {},
    timeSpent: {},
    navigationPaths: [],
    dropOffPoints: [],
  });

  useEffect(() => {
    // Initialize state from navigation service
    const updateState = () => {
      setNavigationHistory(navigationService.getNavigationHistory());
      setCurrentRoute(navigationService.getCurrentRoute());
      setSessionId(navigationService.getSessionId());
      setAnalytics(navigationService.getAnalytics());
    };

    updateState();

    // Listen for navigation events
    const unsubscribe = navigationService.addEventListener((event: NavigationEvent) => {
      updateState();
    });

    return unsubscribe;
  }, []);

  return {
    navigationHistory,
    currentRoute,
    sessionId,
    analytics,
  };
}

/**
 * Hook for navigation permissions and guards
 */
export function useNavigationPermissions() {
  const isProtectedRoute = useCallback((route: string) => {
    return navigationService.isProtectedRoute(route);
  }, []);

  const getRequiredPermissions = useCallback((route: string) => {
    return navigationService.getRequiredPermissions(route);
  }, []);

  const getRequiredRoles = useCallback((route: string) => {
    return navigationService.getRequiredRoles(route);
  }, []);

  const addGuard = useCallback((guard: (route: string, params?: Record<string, any>) => Promise<boolean>) => {
    navigationService.addGuard(guard);
    return () => navigationService.removeGuard(guard);
  }, []);

  const addMiddleware = useCallback((middleware: (to: string, from: string, params?: Record<string, any>) => Promise<boolean | string>) => {
    navigationService.addMiddleware(middleware);
    return () => navigationService.removeMiddleware(middleware);
  }, []);

  return {
    isProtectedRoute,
    getRequiredPermissions,
    getRequiredRoles,
    addGuard,
    addMiddleware,
  };
}

/**
 * Hook for route-specific logic and lifecycle
 */
export function useRouteLifecycle(routeName: string) {
  const [isActive, setIsActive] = useState(false);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [visitCount, setVisitCount] = useState(0);
  const mountTimeRef = useRef<number>(Date.now());
  const pathname = usePathname();

  useEffect(() => {
    const isCurrentRoute = pathname === routeName;
    setIsActive(isCurrentRoute);

    if (isCurrentRoute) {
      const loadTime = Date.now() - mountTimeRef.current;
      setLoadTime(loadTime);
      setVisitCount(prev => prev + 1);

      // Record performance metrics
      navigationService.recordPerformance({
        routeName,
        loadTime,
        renderTime: loadTime,
        interactionTime: 0,
        memoryUsage: 0,
      });

      logger.debug('Route activated', {
        routeName,
        loadTime,
        visitCount,
      });
    }
  }, [pathname, routeName]);

  // Track time spent on route
  useEffect(() => {
    let startTime: number;
    
    if (isActive) {
      startTime = Date.now();
    }

    return () => {
      if (isActive && startTime) {
        const timeSpent = Date.now() - startTime;
        logger.debug('Route deactivated', {
          routeName,
          timeSpent,
        });
      }
    };
  }, [isActive, routeName]);

  return {
    isActive,
    loadTime,
    visitCount,
  };
}

/**
 * Hook for deep linking functionality
 */
export function useDeepLinking() {
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { navigate } = useNavigation();

  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        const { route, params } = navigationService.parseDeepLink(url);
        
        logger.info('Deep link received', {
          url,
          route,
          params,
        });

        // Navigate to the deep linked route
        await navigate(route, params);
      } catch (error) {
        logger.error('Deep link parsing failed', { url, error });
      }
    };

    // Handle initial URL when app starts
    const initializeDeepLinking = async () => {
      try {
        // In a real app, you'd get the initial URL from Linking.getInitialURL()
        // For now, we'll simulate this
        const url = await getInitialURL();
        
        if (url) {
          setInitialUrl(url);
          await handleDeepLink(url);
        }
        
        setIsReady(true);
      } catch (error) {
        logger.error('Deep link initialization failed', error);
        setIsReady(true);
      }
    };

    initializeDeepLinking();

    // Listen for deep link changes
    const subscription = addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription?.remove();
    };
  }, [navigate]);

  const createDeepLink = useCallback((route: string, params?: Record<string, any>) => {
    return navigationService.buildDeepLink(route, params);
  }, []);

  return {
    initialUrl,
    isReady,
    createDeepLink,
  };
}

/**
 * Hook for navigation analytics
 */
export function useNavigationAnalytics() {
  const [analytics, setAnalytics] = useState<NavigationAnalytics>({
    screenViews: {},
    timeSpent: {},
    navigationPaths: [],
    dropOffPoints: [],
  });

  useEffect(() => {
    const updateAnalytics = () => {
      setAnalytics(navigationService.getAnalytics());
    };

    updateAnalytics();

    const unsubscribe = navigationService.addEventListener(() => {
      updateAnalytics();
    });

    return unsubscribe;
  }, []);

  const getMostVisitedScreens = useCallback(() => {
    return Object.entries(analytics.screenViews)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([screen, views]) => ({ screen, views }));
  }, [analytics.screenViews]);

  const getCommonNavigationPaths = useCallback(() => {
    return analytics.navigationPaths
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [analytics.navigationPaths]);

  const getScreenTimeSpent = useCallback(() => {
    return Object.entries(analytics.timeSpent)
      .sort(([, a], [, b]) => b - a)
      .map(([screen, time]) => ({ screen, time }));
  }, [analytics.timeSpent]);

  return {
    analytics,
    getMostVisitedScreens,
    getCommonNavigationPaths,
    getScreenTimeSpent,
  };
}

/**
 * Hook for preloading screens
 */
export function useScreenPreloader() {
  const [preloadedScreens, setPreloadedScreens] = useState<Set<string>>(new Set());
  const [isPreloading, setIsPreloading] = useState(false);

  const preloadScreen = useCallback(async (screenName: string) => {
    if (preloadedScreens.has(screenName)) {
      return;
    }

    setIsPreloading(true);
    
    try {
      // Simulate screen preloading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setPreloadedScreens(prev => new Set([...prev, screenName]));
      
      logger.debug('Screen preloaded', { screenName });
    } catch (error) {
      logger.error('Screen preload failed', { screenName, error });
    } finally {
      setIsPreloading(false);
    }
  }, [preloadedScreens]);

  const preloadScreens = useCallback(async (screenNames: string[]) => {
    const promises = screenNames.map(preloadScreen);
    await Promise.all(promises);
  }, [preloadScreen]);

  return {
    preloadedScreens,
    isPreloading,
    preloadScreen,
    preloadScreens,
  };
}

// Placeholder functions for deep linking (would be replaced with actual Linking API)
async function getInitialURL(): Promise<string | null> {
  // In a real app: return await Linking.getInitialURL();
  return null;
}

function addEventListener(event: string, handler: (event: { url: string }) => void) {
  // In a real app: return Linking.addEventListener(event, handler);
  return { remove: () => {} };
}