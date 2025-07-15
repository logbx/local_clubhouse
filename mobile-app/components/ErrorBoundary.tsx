import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { QueryErrorResetBoundary, useQueryErrorResetBoundary } from '@tanstack/react-query';
import { logger } from '@/lib/monitoring/logger';
import { ErrorType } from '@/lib/api/error-handler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary for catching and handling JavaScript errors
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Error Boundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to crash analytics if configured
    if (!__DEV__) {
      // In production, you might want to report to Sentry, Bugsnag, etc.
      console.error('Production error:', error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    // Navigate to home screen
    router.replace('/(tabs)');
    this.handleReset();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 justify-center items-center p-4 bg-red-50">
          <View className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
            <Text className="text-xl font-bold text-red-600 mb-4 text-center">
              Something went wrong
            </Text>
            
            <Text className="text-gray-700 mb-6 text-center">
              An unexpected error occurred. You can try refreshing the page or contact support if the problem persists.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView className="mb-6 max-h-40 bg-gray-100 p-3 rounded">
                <Text className="text-xs font-mono text-gray-800">
                  {this.state.error.message}
                </Text>
                {this.state.error.stack && (
                  <Text className="text-xs font-mono text-gray-600 mt-2">
                    {this.state.error.stack}
                  </Text>
                )}
              </ScrollView>
            )}

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={this.handleReset}
                className="flex-1 bg-blue-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium text-center">
                  Try Again
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={this.handleReload}
                className="flex-1 bg-gray-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium text-center">
                  Go Home
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Query Error Boundary specifically for React Query errors
 */
export function QueryErrorBoundary({ children, fallback }: {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          fallback={
            fallback ? (
              <QueryErrorFallback
                onReset={reset}
                customFallback={fallback}
              />
            ) : (
              <QueryErrorFallback onReset={reset} />
            )
          }
          onError={(error) => {
            logger.error('Query Error Boundary triggered', {
              error: error.message,
              stack: error.stack,
            });
          }}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

/**
 * Fallback component for query errors
 */
function QueryErrorFallback({ 
  onReset, 
  customFallback 
}: {
  onReset: () => void;
  customFallback?: (error: Error, reset: () => void) => ReactNode;
}) {
  const { reset } = useQueryErrorResetBoundary();
  
  const handleReset = () => {
    reset();
    onReset();
  };

  // This would typically receive the error from the error boundary
  // For now, we'll create a generic error
  const error = new Error('Query failed');

  if (customFallback) {
    return <>{customFallback(error, handleReset)}</>;
  }

  return (
    <View className="flex-1 justify-center items-center p-4 bg-orange-50">
      <View className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
        <Text className="text-xl font-bold text-orange-600 mb-4 text-center">
          Loading Failed
        </Text>
        
        <Text className="text-gray-700 mb-6 text-center">
          We couldn't load the requested data. Please check your internet connection and try again.
        </Text>

        <TouchableOpacity
          onPress={handleReset}
          className="bg-orange-500 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-medium text-center">
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Specific error boundary for authentication errors
 */
export function AuthErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorBoundary
      fallback={(error, reset) => {
        const apiError = error as any;
        
        if (apiError?.type === ErrorType.AUTHENTICATION || apiError?.status === 401) {
          return (
            <View className="flex-1 justify-center items-center p-4 bg-red-50">
              <View className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
                <Text className="text-xl font-bold text-red-600 mb-4 text-center">
                  Authentication Required
                </Text>
                
                <Text className="text-gray-700 mb-6 text-center">
                  Your session has expired. Please log in again to continue.
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    reset();
                    router.replace('/(auth)/login');
                  }}
                  className="bg-red-500 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium text-center">
                    Go to Login
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }

        // Default fallback for other errors
        return (
          <View className="flex-1 justify-center items-center p-4 bg-gray-50">
            <View className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
              <Text className="text-xl font-bold text-gray-600 mb-4 text-center">
                Something went wrong
              </Text>
              
              <Text className="text-gray-700 mb-6 text-center">
                An error occurred while loading your data. Please try again.
              </Text>

              <TouchableOpacity
                onPress={reset}
                className="bg-gray-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium text-center">
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
    >
      {children}
    </QueryErrorBoundary>
  );
}

/**
 * Network error boundary for offline scenarios
 */
export function NetworkErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorBoundary
      fallback={(error, reset) => {
        const apiError = error as any;
        
        if (apiError?.type === ErrorType.NETWORK || apiError?.type === ErrorType.OFFLINE) {
          return (
            <View className="flex-1 justify-center items-center p-4 bg-yellow-50">
              <View className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
                <Text className="text-xl font-bold text-yellow-600 mb-4 text-center">
                  Connection Problem
                </Text>
                
                <Text className="text-gray-700 mb-6 text-center">
                  We're having trouble connecting to our servers. Please check your internet connection and try again.
                </Text>

                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    onPress={reset}
                    className="flex-1 bg-yellow-500 px-4 py-2 rounded-lg"
                  >
                    <Text className="text-white font-medium text-center">
                      Retry
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Offline Mode',
                        'Some features may be limited while offline. Your actions will be synchronized when you reconnect.',
                        [{ text: 'OK' }]
                      );
                    }}
                    className="flex-1 bg-gray-500 px-4 py-2 rounded-lg"
                  >
                    <Text className="text-white font-medium text-center">
                      Continue Offline
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }

        // Default fallback
        return (
          <View className="flex-1 justify-center items-center p-4">
            <TouchableOpacity
              onPress={reset}
              className="bg-blue-500 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-medium text-center">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        );
      }}
    >
      {children}
    </QueryErrorBoundary>
  );
}

/**
 * Retry component for failed queries
 */
export function RetryButton({ 
  onRetry, 
  isLoading = false, 
  error, 
  className = '' 
}: {
  onRetry: () => void;
  isLoading?: boolean;
  error?: Error;
  className?: string;
}) {
  const getRetryText = () => {
    if (isLoading) return 'Retrying...';
    
    const apiError = error as any;
    if (apiError?.type === ErrorType.NETWORK) {
      return 'Check Connection';
    }
    
    return 'Try Again';
  };

  return (
    <TouchableOpacity
      onPress={onRetry}
      disabled={isLoading}
      className={`bg-blue-500 px-4 py-2 rounded-lg ${
        isLoading ? 'opacity-50' : ''
      } ${className}`}
    >
      <Text className="text-white font-medium text-center">
        {getRetryText()}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Component for handling loading states with error fallback
 */
export function LoadingErrorWrapper({
  isLoading,
  error,
  onRetry,
  loadingComponent,
  children,
}: {
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  loadingComponent?: ReactNode;
  children: ReactNode;
}) {
  if (isLoading) {
    return loadingComponent || (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-600">Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-red-600 text-center mb-4">
          {error.message}
        </Text>
        <RetryButton onRetry={onRetry} error={error} />
      </View>
    );
  }

  return <>{children}</>;
}