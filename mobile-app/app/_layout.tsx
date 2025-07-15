import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../hooks/useAuth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../contexts/ThemeContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { LocationProvider } from '../contexts/LocationContext';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { queryClient, ReactQueryDevTools, QueryPerformanceMonitor } from '../lib/react-query';
import { ErrorBoundary, QueryErrorBoundary } from '../lib/react-query';
import { initializeDeepLinking } from '../lib/navigation';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const hideSplashScreen = async () => {
      // Wait a bit for the app to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      await SplashScreen.hideAsync();
    };

    // Initialize deep linking
    const cleanup = initializeDeepLinking();

    hideSplashScreen();
    
    return cleanup;
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <QueryErrorBoundary>
              <ThemeProvider>
                <NotificationProvider>
                  <LocationProvider>
                    <AuthProvider>
                      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen 
                          name="modal" 
                          options={{ 
                            presentation: 'modal',
                            headerShown: true,
                            title: 'Settings' 
                          }} 
                        />
                      </Stack>
                      
                      {/* Development Tools */}
                      <ReactQueryDevTools />
                      <QueryPerformanceMonitor />
                    </AuthProvider>
                  </LocationProvider>
                </NotificationProvider>
              </ThemeProvider>
            </QueryErrorBoundary>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}