import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated, StatusBar, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// Import Apple Authentication conditionally
let AppleAuthentication: any;
try {
  AppleAuthentication = require('expo-apple-authentication');
} catch (error) {
  console.warn('Apple Authentication not available');
  AppleAuthentication = null;
}
import { firebaseAuthService } from '@/lib/auth/firebase-auth';
import { useAuth } from '@/hooks/useAuth';

const { width, height } = Dimensions.get('window');

export default function AuthOptionsScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Stagger animations for smooth entry
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Floating icons for visual interest
  const floatingIcons = [
    { name: 'people', color: '#4ECDC4', size: 28, position: { top: height * 0.12, left: width * 0.12 } },
    { name: 'calendar', color: '#FF6B6B', size: 26, position: { top: height * 0.18, right: width * 0.15 } },
    { name: 'location', color: '#FFE66D', size: 24, position: { top: height * 0.78, left: width * 0.08 } },
    { name: 'heart', color: '#A8E6CF', size: 22, position: { top: height * 0.82, right: width * 0.12 } },
  ];

  const handlePhoneAuth = () => {
    router.push('/(auth)/phone-flow');
  };

  const handleEmailAuth = () => {
    router.push('/(auth)/email-flow');
  };

  const handleAppleAuth = async () => {
    try {
      if (!AppleAuthentication) {
        Alert.alert('Apple Sign-In', 'Apple Sign-In is not available in this environment');
        return;
      }

      // Check if Apple authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Apple Sign-In', 'Apple Sign-In is not available on this device');
        return;
      }

      const authUser = await firebaseAuthService.signInWithApple();
      
      // Get Firebase ID token and integrate with your backend
      const idToken = await firebaseAuthService.getIdToken();
      const { loginWithFirebase } = useAuth();
      if (idToken && loginWithFirebase) {
        await loginWithFirebase(idToken, authUser);
      }
      
      Alert.alert('Success', 'Signed in with Apple successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      Alert.alert('Apple Sign-In Error', error.message || 'Failed to sign in with Apple');
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const authUser = await firebaseAuthService.signInWithGoogle();
      
      // Get Firebase ID token and integrate with your backend
      const idToken = await firebaseAuthService.getIdToken();
      const { loginWithFirebase } = useAuth();
      if (idToken && loginWithFirebase) {
        await loginWithFirebase(idToken, authUser);
      }
      
      Alert.alert('Success', 'Signed in with Google successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      Alert.alert('Google Sign-In Error', error.message || 'Failed to sign in with Google');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />

      {/* Close Button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? 60 : 40,
          right: 24,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={20} color="white" />
      </TouchableOpacity>

      {/* Floating Icons */}
      {floatingIcons.map((icon, index) => (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            ...icon.position,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            width: 56,
            height: 56,
            backgroundColor: icon.color + '20',
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: icon.color,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Ionicons name={icon.name as any} size={icon.size} color={icon.color} />
        </Animated.View>
      ))}

      {/* Content */}
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        paddingHorizontal: 32,
        paddingTop: 80,
        paddingBottom: 60,
      }}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            alignItems: 'center',
            marginBottom: 64,
          }}
        >
          <Text style={{ 
            color: 'white', 
            fontSize: 32, 
            fontWeight: 'bold', 
            marginBottom: 16,
            textAlign: 'center',
          }}>
            Join Your Community
          </Text>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            textAlign: 'center', 
            fontSize: 16,
            lineHeight: 24,
            maxWidth: 300,
          }}>
            Choose how you'd like to connect with your local community and start building meaningful relationships.
          </Text>
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Continue with Phone */}
          <TouchableOpacity
            style={{
              width: '100%',
              height: 56,
              backgroundColor: 'white',
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 8,
            }}
            onPress={handlePhoneAuth}
            activeOpacity={0.9}
          >
            <Ionicons name="call-outline" size={20} color="#1f2937" style={{ marginRight: 12 }} />
            <Text style={{ 
              color: '#1f2937', 
              fontSize: 16, 
              fontWeight: '600',
            }}>
              Continue with Phone
            </Text>
          </TouchableOpacity>

          {/* Continue with Email */}
          <TouchableOpacity
            style={{
              width: '100%',
              height: 56,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 32,
            }}
            onPress={handleEmailAuth}
            activeOpacity={0.9}
          >
            <Ionicons name="mail-outline" size={20} color="white" style={{ marginRight: 12 }} />
            <Text style={{ 
              color: 'white', 
              fontSize: 16, 
              fontWeight: '600',
            }}>
              Continue with Email
            </Text>
          </TouchableOpacity>

          {/* Social Login Row */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'center',
            gap: 16,
            marginBottom: 40,
          }}>
            {/* Apple Sign In */}
            <TouchableOpacity
              style={{
                width: 64,
                height: 64,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 4,
              }}
              onPress={handleAppleAuth}
              activeOpacity={0.9}
            >
              <Ionicons name="logo-apple" size={28} color="white" />
            </TouchableOpacity>

            {/* Google Sign In */}
            <TouchableOpacity
              style={{
                width: 64,
                height: 64,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 4,
              }}
              onPress={handleGoogleAuth}
              activeOpacity={0.9}
            >
              <Ionicons name="logo-google" size={28} color="#4285F4" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Terms and Privacy */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            textAlign: 'center', 
            fontSize: 14,
            lineHeight: 20,
            paddingHorizontal: 16,
          }}>
            By continuing, you agree to Local Clubhouse's{' '}
            <Text style={{ color: '#3b82f6', textDecorationLine: 'underline' }}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={{ color: '#3b82f6', textDecorationLine: 'underline' }}>Privacy Policy</Text>
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}