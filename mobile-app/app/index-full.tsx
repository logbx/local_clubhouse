import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Show loading or splash screen
  }

  // Redirect to appropriate screen based on auth status
  if (user) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/(auth)/welcome" />;
  }
}