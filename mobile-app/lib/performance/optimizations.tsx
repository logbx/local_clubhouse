import React, { lazy, Suspense, memo, useMemo, useCallback } from 'react';
import { Platform, Dimensions, View, Text, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { performanceMonitor } from '../monitoring/performance';

// Lazy loading components
export const LazyTournamentBracket = lazy(() => 
  import('../components/tournament/BracketView').then(module => ({
    default: module.BracketView
  }))
);

export const LazyClubEvents = lazy(() => 
  import('../components/ClubEventsSection').then(module => ({
    default: module.ClubEventsSection
  }))
);

export const LazyTournamentManage = lazy(() => 
  import('../pages/TournamentManagePage').then(module => ({
    default: module.default
  }))
);

export const LazySocialHub = lazy(() => 
  import('../pages/SocialHub').then(module => ({
    default: module.default
  }))
);

// Optimized loading component
export const LoadingSpinner = memo(({ size = 'large', color = '#007AFF' }: {
  size?: 'small' | 'large';
  color?: string;
}) => (
  <View className="flex-1 justify-center items-center p-4">
    <ActivityIndicator size={size} color={color} />
    <Text className="text-gray-500 mt-2 text-sm">Loading...</Text>
  </View>
));

// Lazy wrapper with error boundary
export const LazyComponent = memo(({ 
  component: Component, 
  fallback = <LoadingSpinner />,
  errorFallback = <Text className="text-red-500 text-center p-4">Failed to load component</Text>,
  ...props 
}: {
  component: React.LazyExoticComponent<any>;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  [key: string]: any;
}) => (
  <Suspense fallback={fallback}>
    <ErrorBoundary fallback={errorFallback}>
      <Component {...props} />
    </ErrorBoundary>
  </Suspense>
));

// Simple error boundary for lazy components
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
    performanceMonitor.trackCustomMetric('lazy_component_error', {
      error: error.message,
      component: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Optimized image component with performance monitoring
export const OptimizedImage = memo(({ 
  source, 
  placeholder,
  className = '',
  onLoad,
  onError,
  ...props 
}: {
  source: any;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: (error: any) => void;
  [key: string]: any;
}) => {
  const imageUrl = typeof source === 'string' ? source : source?.uri;
  const loadingMonitor = useMemo(() => {
    if (imageUrl) {
      return performanceMonitor.measureImageLoad(imageUrl);
    }
    return null;
  }, [imageUrl]);

  const handleLoad = useCallback(() => {
    loadingMonitor?.onLoad();
    onLoad?.();
  }, [loadingMonitor, onLoad]);

  const handleError = useCallback((error: any) => {
    loadingMonitor?.onError(error);
    onError?.(error);
  }, [loadingMonitor, onError]);

  return (
    <Image
      source={source}
      placeholder={placeholder}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
});

// Optimized list with performance monitoring
export const OptimizedList = memo(<T,>({
  data,
  renderItem,
  keyExtractor,
  estimatedItemSize = 100,
  getItemType,
  onScroll,
  ListHeaderComponent,
  ListFooterComponent,
  ...props
}: {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  estimatedItemSize?: number;
  getItemType?: (item: T, index: number) => string;
  onScroll?: (event: any) => void;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement;
  [key: string]: any;
}) => {
  const listId = useMemo(() => `list_${Date.now()}`, []);

  const monitoredRenderItem = useCallback(({ item, index }: { item: T; index: number }) => {
    const timerId = `list_item_${listId}_${index}`;
    performanceMonitor.startTimer(timerId);
    
    const component = renderItem({ item, index });
    
    // End timer on next tick
    setTimeout(() => {
      performanceMonitor.endTimer(timerId);
    }, 0);
    
    return component;
  }, [renderItem, listId]);

  const monitoredScroll = useCallback((event: any) => {
    performanceMonitor.trackCustomMetric('list_scroll', {
      listId,
      offset: event.nativeEvent.contentOffset.y,
    });
    onScroll?.(event);
  }, [onScroll, listId]);

  return (
    <FlashList
      data={data}
      renderItem={monitoredRenderItem}
      keyExtractor={keyExtractor}
      estimatedItemSize={estimatedItemSize}
      getItemType={getItemType}
      onScroll={monitoredScroll}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      {...props}
    />
  );
});

// Platform-specific optimizations
export const PlatformOptimizedView = memo(({
  children,
  webStyle,
  mobileStyle,
  ...props
}: {
  children: React.ReactNode;
  webStyle?: object;
  mobileStyle?: object;
  [key: string]: any;
}) => {
  const optimizedStyle = useMemo(() => {
    if (Platform.OS === 'web') {
      return {
        // Web-specific optimizations
        willChange: 'transform',
        transform: [{ translateZ: 0 }], // Force hardware acceleration
        ...webStyle,
      };
    }
    return mobileStyle || {};
  }, [webStyle, mobileStyle]);

  return (
    <View style={optimizedStyle} {...props}>
      {children}
    </View>
  );
});

// Responsive helper for different screen sizes
export const useResponsiveDimensions = () => {
  return useMemo(() => {
    const { width, height } = Dimensions.get('window');
    
    return {
      isTablet: width >= 768,
      isDesktop: width >= 1024,
      screenWidth: width,
      screenHeight: height,
      isLandscape: width > height,
      columns: width >= 1024 ? 3 : width >= 768 ? 2 : 1,
    };
  }, []);
};

// Debounced search optimization
export const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Memory-efficient state management
export const useOptimizedState = <T,>(initialValue: T) => {
  const [state, setState] = React.useState<T>(initialValue);
  
  const setOptimizedState = useCallback((newState: T | ((prevState: T) => T)) => {
    setState(currentState => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prevState: T) => T)(currentState)
        : newState;
      
      // Only update if state actually changed
      if (JSON.stringify(nextState) !== JSON.stringify(currentState)) {
        return nextState;
      }
      return currentState;
    });
  }, []);

  return [state, setOptimizedState] as const;
};

// Bundle splitting helper
export const loadChunk = (chunkName: string) => {
  const timerId = `chunk_load_${chunkName}`;
  performanceMonitor.startTimer(timerId);
  
  return new Promise((resolve, reject) => {
    // This would be implemented based on your bundling strategy
    // For now, we'll simulate chunk loading
    setTimeout(() => {
      try {
        performanceMonitor.endTimer(timerId);
        resolve(true);
      } catch (error) {
        performanceMonitor.endTimer(timerId);
        reject(error);
      }
    }, 100);
  });
};

// Image preloading utility
export const preloadImages = async (urls: string[]): Promise<void> => {
  const preloadPromises = urls.map(url => {
    if (Platform.OS === 'web') {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
    } else {
      // For React Native, use Image.prefetch
      return Image.prefetch?.(url) || Promise.resolve();
    }
  });

  try {
    await Promise.all(preloadPromises);
    performanceMonitor.trackCustomMetric('images_preloaded', {
      count: urls.length,
    });
  } catch (error) {
    console.error('Failed to preload images:', error);
    performanceMonitor.trackCustomMetric('image_preload_error', {
      count: urls.length,
      error: (error as Error).message,
    });
  }
};

// Performance-aware animation wrapper
export const PerformantAnimatedView = memo(({
  children,
  animationConfig,
  ...props
}: {
  children: React.ReactNode;
  animationConfig?: any;
  [key: string]: any;
}) => {
  const shouldReduceMotion = useMemo(() => {
    // Check for reduced motion preference
    if (Platform.OS === 'web') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    // For mobile, you could check accessibility settings
    return false;
  }, []);

  if (shouldReduceMotion) {
    return <View {...props}>{children}</View>;
  }

  // Return animated view (implementation depends on animation library)
  return <View {...props}>{children}</View>;
});

// Resource cleanup helper
export const useResourceCleanup = (cleanup: () => void) => {
  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);
};

// Export performance optimization hooks and components
export const PerformanceOptimizations = {
  LazyComponent,
  OptimizedImage,
  OptimizedList,
  PlatformOptimizedView,
  PerformantAnimatedView,
  LoadingSpinner,
  useResponsiveDimensions,
  useDebouncedValue,
  useOptimizedState,
  useResourceCleanup,
  preloadImages,
  loadChunk,
};