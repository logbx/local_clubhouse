// Error Boundary Components for React Query and App Errors
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { QueryErrorResetBoundary, useQueryErrorResetBoundary } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

// Types
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: string) => void;
}

interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
  title?: string;
  subtitle?: string;
}

// Basic Error Boundary
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: error.stack || 'No stack trace available',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <ErrorFallback
          error={this.state.error}
          retry={this.handleRetry}
          title="Something went wrong"
          subtitle="An unexpected error occurred in the application"
        />
      );
    }

    return this.props.children;
  }
}

// Query Error Boundary
export function QueryErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onError={(error, errorInfo) => {
            console.error('Query Error Boundary:', error, errorInfo);
          }}
          fallback={(error, retry) => (
            <ErrorFallback
              error={error}
              retry={() => {
                reset();
                retry();
              }}
              title="Data Loading Error"
              subtitle="Failed to load data. Please try again."
            />
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

// Auth Error Boundary
export function AuthErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Auth Error Boundary:', error, errorInfo);
        // Could integrate with auth service to handle token refresh, logout, etc.
      }}
      fallback={(error, retry) => (
        <ErrorFallback
          error={error}
          retry={retry}
          title="Authentication Error"
          subtitle="There was a problem with authentication. Please try logging in again."
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Network Error Boundary
export function NetworkErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Network Error Boundary:', error, errorInfo);
      }}
      fallback={(error, retry) => (
        <ErrorFallback
          error={error}
          retry={retry}
          title="Network Error"
          subtitle="Unable to connect to the server. Please check your internet connection."
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Retry Button Component
export function RetryButton({ 
  onRetry, 
  disabled = false, 
  text = 'Try Again' 
}: { 
  onRetry: () => void; 
  disabled?: boolean; 
  text?: string; 
}) {
  return (
    <TouchableOpacity
      style={[styles.retryButton, disabled && styles.retryButtonDisabled]}
      onPress={onRetry}
      disabled={disabled}
    >
      <Ionicons name="refresh" size={20} color="#ffffff" style={styles.retryIcon} />
      <Text style={styles.retryButtonText}>{text}</Text>
    </TouchableOpacity>
  );
}

// Loading Error Wrapper
export function LoadingErrorWrapper({ 
  isLoading, 
  error, 
  onRetry, 
  children 
}: { 
  isLoading: boolean; 
  error: Error | null; 
  onRetry: () => void; 
  children: ReactNode; 
}) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ErrorFallback
        error={error}
        retry={onRetry}
        title="Loading Error"
        subtitle="Failed to load content. Please try again."
      />
    );
  }

  return <>{children}</>;
}

// Error Fallback Component
function ErrorFallback({ error, retry, title, subtitle }: ErrorFallbackProps) {
  const isDev = __DEV__;

  return (
    <View style={styles.errorContainer}>
      <ScrollView contentContainerStyle={styles.errorContent}>
        <View style={styles.errorIcon}>
          <Ionicons name="warning" size={64} color="#ef4444" />
        </View>
        
        <Text style={styles.errorTitle}>{title}</Text>
        <Text style={styles.errorSubtitle}>{subtitle}</Text>
        
        <RetryButton onRetry={retry} />
        
        {isDev && (
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>Debug Information:</Text>
            <ScrollView style={styles.debugScrollView}>
              <Text style={styles.debugText}>{error.message}</Text>
              {error.stack && (
                <Text style={styles.debugStack}>{error.stack}</Text>
              )}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Hook to use query error reset boundary
export function useQueryErrorBoundary() {
  return useQueryErrorResetBoundary();
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  errorContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  retryButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  debugSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  debugScrollView: {
    maxHeight: 200,
  },
  debugText: {
    fontSize: 12,
    color: '#ef4444',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  debugStack: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
});