import { Platform, Dimensions, StatusBar } from 'react-native';
import * as Device from 'expo-device';
// import { getStatusBarHeight } from 'react-native-status-bar-height'; // Removed for compatibility

export interface PlatformInfo {
  os: 'ios' | 'android' | 'web';
  isTablet: boolean;
  isTV: boolean;
  deviceType: Device.DeviceType | null;
  hasNotch: boolean;
  statusBarHeight: number;
  screenDimensions: {
    width: number;
    height: number;
    scale: number;
    fontScale: number;
  };
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export class PlatformUtils {
  private static _info: PlatformInfo | null = null;

  /**
   * Get comprehensive platform information
   */
  static getPlatformInfo(): PlatformInfo {
    if (this._info) {
      return this._info;
    }

    const { width, height, scale, fontScale } = Dimensions.get('window');
    const screenData = Dimensions.get('screen');

    // Detect if device has notch (iOS)
    const hasNotch = Platform.OS === 'ios' && 
      (height >= 812 || width >= 812); // iPhone X and newer

    // Calculate safe area insets
    const statusBarHeight = getStatusBarHeight();
    const bottomInset = hasNotch ? 34 : 0;

    this._info = {
      os: Platform.OS as 'ios' | 'android' | 'web',
      isTablet: Device.deviceType === Device.DeviceType.TABLET,
      isTV: Device.deviceType === Device.DeviceType.TV,
      deviceType: Device.deviceType,
      hasNotch,
      statusBarHeight,
      screenDimensions: {
        width,
        height,
        scale,
        fontScale,
      },
      safeAreaInsets: {
        top: statusBarHeight,
        bottom: bottomInset,
        left: 0,
        right: 0,
      },
    };

    return this._info;
  }

  /**
   * Refresh platform info (call after orientation changes)
   */
  static refreshPlatformInfo(): PlatformInfo {
    this._info = null;
    return this.getPlatformInfo();
  }

  /**
   * Check if running on iOS
   */
  static isIOS(): boolean {
    return Platform.OS === 'ios';
  }

  /**
   * Check if running on Android
   */
  static isAndroid(): boolean {
    return Platform.OS === 'android';
  }

  /**
   * Check if running on web
   */
  static isWeb(): boolean {
    return Platform.OS === 'web';
  }

  /**
   * Check if device is a tablet
   */
  static isTablet(): boolean {
    return this.getPlatformInfo().isTablet;
  }

  /**
   * Check if device has a notch
   */
  static hasNotch(): boolean {
    return this.getPlatformInfo().hasNotch;
  }

  /**
   * Get status bar height
   */
  static getStatusBarHeight(): number {
    return this.getPlatformInfo().statusBarHeight;
  }

  /**
   * Get safe area insets
   */
  static getSafeAreaInsets() {
    return this.getPlatformInfo().safeAreaInsets;
  }

  /**
   * Check if device supports haptic feedback
   */
  static supportsHaptics(): boolean {
    return Platform.OS === 'ios' || (Platform.OS === 'android' && Platform.Version >= 23);
  }

  /**
   * Check if device supports biometric authentication
   */
  static supportsBiometrics(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Get platform-specific styling
   */
  static getPlatformStyles() {
    const info = this.getPlatformInfo();
    
    return {
      shadow: Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        android: {
          elevation: 5,
        },
        default: {},
      }),
      
      headerHeight: Platform.select({
        ios: info.hasNotch ? 88 : 64,
        android: 56,
        default: 64,
      }),
      
      tabBarHeight: Platform.select({
        ios: info.hasNotch ? 83 : 49,
        android: 56,
        default: 56,
      }),
      
      borderRadius: Platform.select({
        ios: 8,
        android: 4,
        default: 8,
      }),
      
      hitSlop: Platform.select({
        ios: { top: 10, bottom: 10, left: 10, right: 10 },
        android: { top: 15, bottom: 15, left: 15, right: 15 },
        default: { top: 10, bottom: 10, left: 10, right: 10 },
      }),
    };
  }

  /**
   * Get responsive dimensions based on screen size
   */
  static getResponsiveDimensions() {
    const { width, height } = this.getPlatformInfo().screenDimensions;
    const isLandscape = width > height;
    const isSmallScreen = Math.min(width, height) < 400;
    const isLargeScreen = Math.min(width, height) > 500;
    
    return {
      isLandscape,
      isSmallScreen,
      isLargeScreen,
      
      // Container padding
      containerPadding: isSmallScreen ? 12 : isLargeScreen ? 20 : 16,
      
      // Typography scale
      fontSize: {
        xs: isSmallScreen ? 10 : 12,
        sm: isSmallScreen ? 12 : 14,
        base: isSmallScreen ? 14 : 16,
        lg: isSmallScreen ? 16 : 18,
        xl: isSmallScreen ? 18 : 20,
        '2xl': isSmallScreen ? 20 : 24,
        '3xl': isSmallScreen ? 24 : 30,
      },
      
      // Spacing scale
      spacing: {
        xs: isSmallScreen ? 2 : 4,
        sm: isSmallScreen ? 4 : 8,
        md: isSmallScreen ? 6 : 12,
        lg: isSmallScreen ? 8 : 16,
        xl: isSmallScreen ? 12 : 20,
        '2xl': isSmallScreen ? 16 : 24,
      },
      
      // Icon sizes
      iconSize: {
        xs: isSmallScreen ? 12 : 16,
        sm: isSmallScreen ? 16 : 20,
        md: isSmallScreen ? 20 : 24,
        lg: isSmallScreen ? 24 : 28,
        xl: isSmallScreen ? 28 : 32,
      },
    };
  }

  /**
   * Get platform-specific animation configurations
   */
  static getAnimationConfig() {
    return {
      // Default spring animation
      spring: Platform.select({
        ios: {
          damping: 15,
          stiffness: 150,
          mass: 1,
        },
        android: {
          damping: 20,
          stiffness: 100,
          mass: 1,
        },
        default: {
          damping: 15,
          stiffness: 150,
          mass: 1,
        },
      }),
      
      // Timing animation
      timing: Platform.select({
        ios: {
          duration: 300,
          useNativeDriver: true,
        },
        android: {
          duration: 250,
          useNativeDriver: true,
        },
        default: {
          duration: 300,
          useNativeDriver: false,
        },
      }),
      
      // Layout animation preset
      layoutAnimation: Platform.select({
        ios: 'easeInEaseOut',
        android: 'linear',
        default: 'easeInEaseOut',
      }),
    };
  }
}

/**
 * Platform-specific component wrapper
 */
export function PlatformComponent<T = any>({
  ios,
  android,
  web,
  fallback,
}: {
  ios?: T;
  android?: T;
  web?: T;
  fallback?: T;
}): T | null {
  return Platform.select({
    ios: ios || fallback,
    android: android || fallback,
    web: web || fallback,
    default: fallback,
  }) || null;
}

/**
 * Responsive text size hook
 */
export function useResponsiveText() {
  const { fontSize } = PlatformUtils.getResponsiveDimensions();
  
  return {
    xs: `text-[${fontSize.xs}px]`,
    sm: `text-[${fontSize.sm}px]`,
    base: `text-[${fontSize.base}px]`,
    lg: `text-[${fontSize.lg}px]`,
    xl: `text-[${fontSize.xl}px]`,
    '2xl': `text-[${fontSize['2xl']}px]`,
    '3xl': `text-[${fontSize['3xl']}px]`,
  };
}

/**
 * Responsive spacing hook
 */
export function useResponsiveSpacing() {
  const { spacing } = PlatformUtils.getResponsiveDimensions();
  
  return {
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
    '2xl': spacing['2xl'],
  };
}

/**
 * Platform-specific navigation options
 */
export const platformNavigationOptions = {
  headerStyle: Platform.select({
    ios: {
      backgroundColor: 'transparent',
      blurEffect: 'regular',
    },
    android: {
      backgroundColor: '#FFFFFF',
      elevation: 4,
    },
    default: {
      backgroundColor: '#FFFFFF',
    },
  }),
  
  headerTitleStyle: Platform.select({
    ios: {
      fontSize: 17,
      fontWeight: '600',
    },
    android: {
      fontSize: 20,
      fontWeight: '500',
    },
    default: {
      fontSize: 18,
      fontWeight: '600',
    },
  }),
  
  tabBarStyle: Platform.select({
    ios: {
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(20px)',
    },
    android: {
      backgroundColor: '#FFFFFF',
      elevation: 8,
    },
    default: {
      backgroundColor: '#FFFFFF',
    },
  }),
};

/**
 * Performance optimizations by platform
 */
export const platformOptimizations = {
  // List optimization
  list: {
    removeClippedSubviews: Platform.OS === 'android',
    maxToRenderPerBatch: Platform.select({
      ios: 10,
      android: 5,
      default: 10,
    }),
    windowSize: Platform.select({
      ios: 10,
      android: 5,
      default: 10,
    }),
    initialNumToRender: Platform.select({
      ios: 10,
      android: 5,
      default: 10,
    }),
    getItemLayout: Platform.OS === 'ios' ? undefined : (data: any, index: number) => ({
      length: 80, // Estimated item height
      offset: 80 * index,
      index,
    }),
  },
  
  // Image optimization
  image: {
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
  },
  
  // Animation optimization
  animation: {
    useNativeDriver: Platform.OS !== 'web',
    reduceMotion: false, // Can be set based on accessibility settings
  },
};

/**
 * Platform-specific constants
 */
export const platformConstants = {
  // Hit slop for touchable components
  hitSlop: Platform.select({
    ios: { top: 10, bottom: 10, left: 10, right: 10 },
    android: { top: 15, bottom: 15, left: 15, right: 15 },
    default: { top: 10, bottom: 10, left: 10, right: 10 },
  }),
  
  // Default border radius
  borderRadius: Platform.select({
    ios: 8,
    android: 4,
    default: 8,
  }),
  
  // Default elevation/shadow
  elevation: Platform.select({
    ios: undefined,
    android: 2,
    default: undefined,
  }),
  
  // Icon sizes
  iconSize: {
    small: Platform.select({ ios: 16, android: 18, default: 16 }),
    medium: Platform.select({ ios: 20, android: 22, default: 20 }),
    large: Platform.select({ ios: 24, android: 26, default: 24 }),
  },
  
  // Font weights (iOS uses different system)
  fontWeight: {
    light: Platform.select({ ios: '300', android: '300', default: '300' }),
    normal: Platform.select({ ios: '400', android: 'normal', default: '400' }),
    medium: Platform.select({ ios: '500', android: '500', default: '500' }),
    semibold: Platform.select({ ios: '600', android: '600', default: '600' }),
    bold: Platform.select({ ios: '700', android: 'bold', default: '700' }),
  },
};

/**
 * Accessibility helpers
 */
export const accessibilityHelpers = {
  // Screen reader announcements
  announce: (message: string) => {
    // Implementation would depend on the accessibility library used
    console.log('Accessibility announcement:', message);
  },
  
  // Focus management
  setFocus: (ref: any) => {
    if (ref?.current?.focus) {
      ref.current.focus();
    }
  },
  
  // Generate accessibility label
  generateLabel: (text: string, hint?: string) => ({
    accessibilityLabel: text,
    accessibilityHint: hint,
    accessibilityRole: 'button' as const,
  }),
};