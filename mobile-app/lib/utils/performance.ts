import { InteractionManager, Platform } from 'react-native';
import { useCallback, useEffect, useRef, useMemo } from 'react';

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();
  private static measures: Map<string, number> = new Map();

  /**
   * Start a performance measurement
   */
  static mark(name: string): void {
    this.marks.set(name, Date.now());
  }

  /**
   * End a performance measurement
   */
  static measure(name: string, startMark: string): number {
    const startTime = this.marks.get(startMark);
    if (!startTime) {
      console.warn(`Performance mark "${startMark}" not found`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.measures.set(name, duration);
    
    if (__DEV__) {
      console.log(`⏱️ ${name}: ${duration}ms`);
    }
    
    return duration;
  }

  /**
   * Get all measurements
   */
  static getMeasures(): Record<string, number> {
    return Object.fromEntries(this.measures);
  }

  /**
   * Clear all measurements
   */
  static clear(): void {
    this.marks.clear();
    this.measures.clear();
  }
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Hook for debouncing values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttling function calls
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const throttledFunc = useRef<T>();
  
  if (!throttledFunc.current) {
    throttledFunc.current = throttle(func, delay) as T;
  }
  
  return throttledFunc.current;
}

/**
 * Hook for running expensive operations after interactions
 */
export function useAfterInteractions(callback: () => void, deps: any[] = []) {
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      callback();
    });

    return () => task.cancel();
  }, deps);
}

/**
 * Memoization with size limit
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Hook for memoizing expensive computations with LRU cache
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  cacheSize: number = 10
): T {
  const cache = useRef(new LRUCache<string, ReturnType<T>>(cacheSize));
  
  return useCallback((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    const cached = cache.current.get(key);
    
    if (cached !== undefined) {
      return cached;
    }
    
    const result = callback(...args);
    cache.current.set(key, result);
    return result;
  }, [callback]) as T;
}

/**
 * Image loading optimization
 */
export const imageOptimizations = {
  /**
   * Get optimized image props based on platform and size
   */
  getImageProps: (width: number, height: number) => ({
    resizeMode: Platform.select({
      ios: 'cover',
      android: 'cover',
      default: 'contain',
    }) as any,
    fadeDuration: Platform.select({
      ios: 0,
      android: 300,
      default: 0,
    }),
    // Add progressive loading for large images
    progressiveRenderingEnabled: width > 400 || height > 400,
    // Reduce memory usage for large images
    resizeMethod: Platform.OS === 'android' ? 'resize' : undefined,
  }),

  /**
   * Generate srcSet for responsive images (web)
   */
  generateSrcSet: (baseUrl: string, sizes: number[]) => {
    if (Platform.OS !== 'web') return undefined;
    
    return sizes
      .map(size => `${baseUrl}?w=${size} ${size}w`)
      .join(', ');
  },
};

/**
 * List optimization utilities
 */
export const listOptimizations = {
  /**
   * Get optimal FlatList props for platform
   */
  getFlatListProps: (itemHeight?: number) => ({
    removeClippedSubviews: Platform.OS === 'android',
    maxToRenderPerBatch: Platform.select({
      ios: 10,
      android: 5,
      default: 10,
    }),
    windowSize: Platform.select({
      ios: 21,
      android: 11,
      default: 21,
    }),
    initialNumToRender: Platform.select({
      ios: 10,
      android: 5,
      default: 10,
    }),
    updateCellsBatchingPeriod: 100,
    getItemLayout: itemHeight ? (data: any, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }) : undefined,
    keyExtractor: (item: any, index: number) => item.id || item._id || index.toString(),
  }),

  /**
   * Virtualized list item renderer
   */
  createVirtualizedRenderer: <T>(
    renderItem: (item: T, index: number) => React.ReactElement,
    itemHeight: number
  ) => {
    const cache = new LRUCache<string, React.ReactElement>(50);
    
    return (item: T, index: number) => {
      const key = JSON.stringify({ item, index });
      const cached = cache.get(key);
      
      if (cached) {
        return cached;
      }
      
      const rendered = renderItem(item, index);
      cache.set(key, rendered);
      return rendered;
    };
  },
};

/**
 * Memory management utilities
 */
export class MemoryManager {
  private static timers: Set<NodeJS.Timeout> = new Set();
  private static intervals: Set<NodeJS.Timeout> = new Set();
  private static listeners: Set<() => void> = new Set();

  /**
   * Track a timer for cleanup
   */
  static trackTimer(timer: NodeJS.Timeout): void {
    this.timers.add(timer);
  }

  /**
   * Track an interval for cleanup
   */
  static trackInterval(interval: NodeJS.Timeout): void {
    this.intervals.add(interval);
  }

  /**
   * Track a listener for cleanup
   */
  static trackListener(listener: () => void): void {
    this.listeners.add(listener);
  }

  /**
   * Clean up all tracked resources
   */
  static cleanup(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.intervals.forEach(interval => clearInterval(interval));
    this.listeners.forEach(listener => listener());
    
    this.timers.clear();
    this.intervals.clear();
    this.listeners.clear();
  }

  /**
   * Safe setTimeout with automatic tracking
   */
  static setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    
    this.trackTimer(timer);
    return timer;
  }

  /**
   * Safe setInterval with automatic tracking
   */
  static setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.trackInterval(interval);
    return interval;
  }
}

/**
 * Hook for automatic cleanup on unmount
 */
export function useCleanup() {
  const cleanup = useRef<(() => void)[]>([]);

  const addCleanup = useCallback((cleanupFn: () => void) => {
    cleanup.current.push(cleanupFn);
  }, []);

  const runCleanup = useCallback(() => {
    cleanup.current.forEach(fn => fn());
    cleanup.current = [];
  }, []);

  useEffect(() => {
    return () => {
      runCleanup();
    };
  }, [runCleanup]);

  return { addCleanup, runCleanup };
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(name: string) {
  const startTime = useRef<number>();

  useEffect(() => {
    startTime.current = Date.now();
    PerformanceMonitor.mark(`${name}_start`);

    return () => {
      if (startTime.current) {
        PerformanceMonitor.measure(
          `${name}_total`,
          `${name}_start`
        );
      }
    };
  }, [name]);

  const markStep = useCallback((stepName: string) => {
    PerformanceMonitor.mark(`${name}_${stepName}`);
  }, [name]);

  const measureStep = useCallback((stepName: string, fromStep: string) => {
    return PerformanceMonitor.measure(
      `${name}_${stepName}`,
      `${name}_${fromStep}`
    );
  }, [name]);

  return { markStep, measureStep };
}

/**
 * Bundle size optimization utilities
 */
export const bundleOptimizations = {
  /**
   * Dynamic import with fallback
   */
  dynamicImport: async <T>(importFn: () => Promise<T>, fallback?: T): Promise<T> => {
    try {
      return await importFn();
    } catch (error) {
      console.warn('Dynamic import failed:', error);
      if (fallback) {
        return fallback;
      }
      throw error;
    }
  },

  /**
   * Lazy load component with suspense
   */
  lazyComponent: <T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default: T }>
  ) => {
    return React.lazy(importFn);
  },

  /**
   * Code splitting by route
   */
  splitByRoute: (routes: Record<string, () => Promise<any>>) => {
    const loadedRoutes = new Map<string, any>();
    
    return {
      async loadRoute(routeName: string) {
        if (loadedRoutes.has(routeName)) {
          return loadedRoutes.get(routeName);
        }
        
        const loader = routes[routeName];
        if (!loader) {
          throw new Error(`Route "${routeName}" not found`);
        }
        
        const module = await loader();
        loadedRoutes.set(routeName, module.default || module);
        return loadedRoutes.get(routeName);
      },
      
      preloadRoute(routeName: string) {
        if (!loadedRoutes.has(routeName) && routes[routeName]) {
          // Preload in background
          this.loadRoute(routeName).catch(console.warn);
        }
      },
    };
  },
};

// Export React import for bundle optimizations
import React, { useState } from 'react';