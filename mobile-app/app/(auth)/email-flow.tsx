import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api-client-mobile';
import { useAuth } from '@/hooks/useAuth';

export default function EmailFlowScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const { login, loginWithFirebaseEmail } = useAuth();

  const handleEmailSubmit = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setIsCheckingEmail(true);

    try {
      // Check if user exists
      console.log('Checking user type for:', email);
      const response = await api.checkUserType(email);
      console.log('User type response:', response);

      if (response.exists) {
        // User exists - go to password entry
        if (response.authMethod === 'password') {
          // Web user - use password flow
          router.push({
            pathname: '/(auth)/login',
            params: { email, userType: 'password' }
          });
        } else {
          // Firebase user - use Firebase flow
          router.push({
            pathname: '/(auth)/login', 
            params: { email, userType: 'firebase' }
          });
        }
      } else {
        // New user - start signup flow
        router.push({
          pathname: '/(auth)/email-verification',
          params: { email, isSignup: 'true' }
        });
      }
    } catch (error: any) {
      console.error('Error checking email:', error);
      Alert.alert(
        'Error', 
        'Unable to verify email. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
      setIsCheckingEmail(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
        style={{ flex: 1 }}
      >
        {/* Drag Indicator */}
        <View style={{
          alignItems: 'center',
          paddingTop: 12,
          paddingBottom: 8,
        }}>
          <View style={{
            width: 40,
            height: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: 2,
          }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -300}
        >
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 24, 
              paddingTop: 20,
              justifyContent: 'center',
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Email Icon */}
            <View style={{
              width: 60,
              height: 60,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}>
              <Ionicons name="mail-outline" size={30} color="white" />
            </View>

            {/* Title and Subtitle */}
            <Text style={{ 
              fontSize: 24, 
              fontWeight: 'bold', 
              color: 'white', 
              marginBottom: 12,
            }}>
              Continue with Email
            </Text>
            <Text style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: 16,
              lineHeight: 24,
              marginBottom: 32,
            }}>
              Sign in or sign up with your email.
            </Text>

            {/* Email Input */}
            <View style={{ marginBottom: 24 }}>
              <TextInput
                style={{
                  width: '100%',
                  height: 56,
                  paddingHorizontal: 20,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 16,
                  color: 'white',
                  fontSize: 16,
                }}
                placeholder="Email Address"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                autoFocus={true}
              />
            </View>

            {/* Next Button */}
            <TouchableOpacity
              style={{
                width: '100%',
                height: 56,
                borderRadius: 16,
                backgroundColor: email.length > 0 ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLoading ? 0.7 : 1,
              }}
              onPress={handleEmailSubmit}
              disabled={isLoading || email.length === 0}
            >
              {isCheckingEmail ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="refresh" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 16, 
                    fontWeight: '600',
                  }}>
                    Checking...
                  </Text>
                </View>
              ) : (
                <Text style={{ 
                  color: email.length > 0 ? 'white' : 'rgba(255, 255, 255, 0.5)', 
                  fontSize: 16, 
                  fontWeight: '600',
                }}>
                  Next
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}