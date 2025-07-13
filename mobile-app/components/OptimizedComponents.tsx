import React, { memo, useMemo, useCallback, forwardRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  ScrollView,
  TextInput,
  ViewStyle,
  TextStyle,
  ImageStyle,
  FlatListProps,
  ScrollViewProps,
  ImageProps,
  PressableProps,
  TextInputProps,
} from 'react-native';
import { PlatformUtils, platformOptimizations, platformConstants } from '@/lib/utils/platform';
import { imageOptimizations, listOptimizations } from '@/lib/utils/performance';

// Optimized Image Component
interface OptimizedImageProps extends Omit<ImageProps, 'style'> {
  style?: ImageStyle;
  width?: number;
  height?: number;
  placeholder?: string;
  fallback?: string;
  lazy?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

export const OptimizedImage = memo<OptimizedImageProps>(({
  style,
  width,
  height,
  placeholder,
  fallback,
  lazy = true,
  quality = 'medium',
  source,
  ...props
}) => {
  const imageProps = useMemo(() => {
    if (width && height) {
      return imageOptimizations.getImageProps(width, height);
    }
    return platformOptimizations.image;
  }, [width, height]);

  const optimizedSource = useMemo(() => {
    if (typeof source === 'object' && source && 'uri' in source) {
      let uri = source.uri;
      
      // Add quality parameter for supported formats
      if (uri && (uri.includes('.jpg') || uri.includes('.jpeg') || uri.includes('.webp'))) {
        const qualityValue = quality === 'low' ? 60 : quality === 'medium' ? 80 : 95;
        const separator = uri.includes('?') ? '&' : '?';
        uri += `${separator}q=${qualityValue}`;
        
        // Add dimensions if provided
        if (width && height) {
          uri += `&w=${width}&h=${height}&fit=crop`;
        }
      }
      
      return { ...source, uri };
    }
    return source;
  }, [source, quality, width, height]);

  return (
    <Image
      source={optimizedSource}
      style={[
        style,
        width && height && { width, height },
      ]}
      {...imageProps}
      {...props}
    />
  );
});

// Optimized FlatList Component
interface OptimizedFlatListProps<T> extends Omit<FlatListProps<T>, 'getItemLayout'> {
  itemHeight?: number;
  optimized?: boolean;
}

export const OptimizedFlatList = memo(<T,>({
  itemHeight,
  optimized = true,
  ...props
}: OptimizedFlatListProps<T>) => {
  const optimizedProps = useMemo(() => {
    if (!optimized) return {};
    return listOptimizations.getFlatListProps(itemHeight);
  }, [optimized, itemHeight]);

  return (
    <FlatList
      {...optimizedProps}
      {...props}
    />
  );
}) as <T>(props: OptimizedFlatListProps<T>) => React.ReactElement;

// Platform-aware Pressable
interface PlatformPressableProps extends PressableProps {
  haptic?: boolean;
  debounce?: number;
  throttle?: number;
}

export const PlatformPressable = memo<PlatformPressableProps>(({
  onPress,
  haptic = true,
  debounce,
  throttle,
  style,
  children,
  ...props
}) => {
  const optimizedOnPress = useMemo(() => {
    if (!onPress) return undefined;

    let handler = onPress;

    // Add haptic feedback
    if (haptic && PlatformUtils.supportsHaptics()) {
      const originalHandler = handler;
      handler = (event) => {
        // Trigger haptic feedback
        if (PlatformUtils.isIOS()) {
          // iOS haptic implementation would go here
          console.log('iOS haptic feedback');
        } else if (PlatformUtils.isAndroid()) {
          // Android haptic implementation would go here
          console.log('Android haptic feedback');
        }
        originalHandler(event);
      };
    }

    // Add debouncing
    if (debounce) {
      const originalHandler = handler;
      let timeoutId: NodeJS.Timeout;
      handler = (event) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => originalHandler(event), debounce);
      };
    }

    // Add throttling
    if (throttle) {
      const originalHandler = handler;
      let isThrottled = false;
      handler = (event) => {
        if (!isThrottled) {
          originalHandler(event);
          isThrottled = true;
          setTimeout(() => {
            isThrottled = false;
          }, throttle);
        }
      };
    }

    return handler;
  }, [onPress, haptic, debounce, throttle]);

  const platformStyle = useMemo(() => {
    const baseStyle = Array.isArray(style) ? Object.assign({}, ...style) : style || {};
    return [
      baseStyle,
      {
        borderRadius: baseStyle.borderRadius || platformConstants.borderRadius,
      },
    ];
  }, [style]);

  return (
    <Pressable
      onPress={optimizedOnPress}
      style={platformStyle}
      hitSlop={platformConstants.hitSlop}
      {...props}
    >
      {children}
    </Pressable>
  );
});

// Responsive Text Component
interface ResponsiveTextProps extends Omit<React.ComponentProps<typeof Text>, 'style'> {
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  style?: TextStyle;
  responsive?: boolean;
}

export const ResponsiveText = memo<ResponsiveTextProps>(({
  size = 'base',
  weight = 'normal',
  style,
  responsive = true,
  ...props
}) => {
  const textStyle = useMemo(() => {
    const dimensions = PlatformUtils.getResponsiveDimensions();
    
    const fontSize = responsive ? dimensions.fontSize[size] : {
      xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30
    }[size];

    return [
      {
        fontSize,
        fontWeight: platformConstants.fontWeight[weight],
      },
      style,
    ];
  }, [size, weight, style, responsive]);

  return <Text style={textStyle} {...props} />;
});

// Safe Area View with platform optimizations
interface SafeViewProps extends React.ComponentProps<typeof View> {
  useSafeArea?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const SafeView = memo<SafeViewProps>(({
  style,
  useSafeArea = true,
  edges = ['top', 'bottom'],
  ...props
}) => {
  const safeStyle = useMemo(() => {
    if (!useSafeArea) return style;

    const insets = PlatformUtils.getSafeAreaInsets();
    const safeAreaStyle: ViewStyle = {};

    edges.forEach(edge => {
      switch (edge) {
        case 'top':
          safeAreaStyle.paddingTop = insets.top;
          break;
        case 'bottom':
          safeAreaStyle.paddingBottom = insets.bottom;
          break;
        case 'left':
          safeAreaStyle.paddingLeft = insets.left;
          break;
        case 'right':
          safeAreaStyle.paddingRight = insets.right;
          break;
      }
    });

    return [safeAreaStyle, style];
  }, [style, useSafeArea, edges]);

  return <View style={safeStyle} {...props} />;
});

// Optimized Card Component
interface CardProps extends React.ComponentProps<typeof View> {
  elevation?: number;
  shadow?: boolean;
  bordered?: boolean;
  rounded?: boolean;
}

export const Card = memo<CardProps>(({
  style,
  elevation = 2,
  shadow = true,
  bordered = false,
  rounded = true,
  ...props
}) => {
  const cardStyle = useMemo(() => {
    const platformStyles = PlatformUtils.getPlatformStyles();
    
    return [
      {
        backgroundColor: '#FFFFFF',
        ...(shadow && platformStyles.shadow),
        ...(PlatformUtils.isAndroid() && { elevation }),
        ...(bordered && {
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }),
        ...(rounded && {
          borderRadius: platformConstants.borderRadius,
        }),
      },
      style,
    ];
  }, [style, elevation, shadow, bordered, rounded]);

  return <View style={cardStyle} {...props} />;
});

// Optimized Input Component
interface OptimizedInputProps extends TextInputProps {
  error?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const OptimizedInput = forwardRef<TextInput, OptimizedInputProps>(({
  style,
  error = false,
  size = 'medium',
  ...props
}, ref) => {
  const inputStyle = useMemo(() => {
    const dimensions = PlatformUtils.getResponsiveDimensions();
    
    const sizeConfig = {
      small: { padding: dimensions.spacing.sm, fontSize: dimensions.fontSize.sm },
      medium: { padding: dimensions.spacing.md, fontSize: dimensions.fontSize.base },
      large: { padding: dimensions.spacing.lg, fontSize: dimensions.fontSize.lg },
    };

    return [
      {
        borderWidth: 1,
        borderColor: error ? '#EF4444' : '#D1D5DB',
        borderRadius: platformConstants.borderRadius,
        backgroundColor: '#FFFFFF',
        ...sizeConfig[size],
      },
      style,
    ];
  }, [style, error, size]);

  return (
    <TextInput
      ref={ref}
      style={inputStyle}
      placeholderTextColor="#9CA3AF"
      {...props}
    />
  );
});

// Loading Skeleton Component
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  animated?: boolean;
}

export const Skeleton = memo<SkeletonProps>(({
  width = '100%',
  height = 20,
  borderRadius = 4,
  animated = true,
}) => {
  // In a real implementation, you would add animation logic here
  return (
    <View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#E5E7EB',
        // Add shimmer animation styles here
      }}
    />
  );
});

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback;
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} retry={this.retry} />;
      }

      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <ResponsiveText size="lg" weight="semibold" style={{ marginBottom: 10 }}>
            Something went wrong
          </ResponsiveText>
          <ResponsiveText size="sm" style={{ marginBottom: 20, textAlign: 'center', color: '#6B7280' }}>
            An error occurred while rendering this component.
          </ResponsiveText>
          <PlatformPressable
            onPress={this.retry}
            style={{
              backgroundColor: '#3B82F6',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}
          >
            <ResponsiveText style={{ color: 'white' }}>Try Again</ResponsiveText>
          </PlatformPressable>
        </View>
      );
    }

    return this.props.children;
  }
}