import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { firebaseAuthService } from '@/lib/auth/firebase-auth';
import { useAuth } from '@/hooks/useAuth';

export default function PhoneFlowScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithFirebase } = useAuth();

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneSubmit = async () => {
    if (!phoneNumber) {
      Alert.alert('Phone Required', 'Please enter your phone number.');
      return;
    }

    // Convert formatted number to E.164 format
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return;
    }

    const e164Phone = `+1${digits}`;
    
    setIsLoading(true);

    try {
      console.log('Starting phone authentication for:', e164Phone);
      
      // Start Firebase phone authentication
      const authUser = await firebaseAuthService.signInWithPhone(e164Phone);
      const idToken = await firebaseAuthService.getIdToken();
      
      if (idToken && loginWithFirebase) {
        await loginWithFirebase(idToken, authUser);
        Alert.alert('Success', 'Signed in successfully!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') }
        ]);
      }
    } catch (error: any) {
      console.error('Phone authentication error:', error);
      
      if (error.message?.includes('captcha')) {
        Alert.alert(
          'Verification Required', 
          'Phone verification is not available in Expo Go. Please use a development build for full phone authentication.'
        );
      } else {
        Alert.alert(
          'Authentication Error',
          error.message || 'Phone authentication failed. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
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
        >
          <View style={{ 
            flex: 1, 
            paddingHorizontal: 24, 
            paddingTop: 20,
            justifyContent: 'center',
          }}>
            {/* Phone Icon */}
            <View style={{
              width: 60,
              height: 60,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}>
              <Ionicons name="call-outline" size={30} color="white" />
            </View>

            {/* Title and Subtitle */}
            <Text style={{ 
              fontSize: 24, 
              fontWeight: 'bold', 
              color: 'white', 
              marginBottom: 12,
            }}>
              Continue with Phone
            </Text>
            <Text style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: 16,
              lineHeight: 24,
              marginBottom: 32,
            }}>
              Sign in or sign up with your phone number.
            </Text>

            {/* Phone Input */}
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
                placeholder="(555) 123-4567"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                keyboardType="phone-pad"
                autoFocus={true}
                maxLength={14} // (XXX) XXX-XXXX format
              />
            </View>

            {/* Next Button */}
            <TouchableOpacity
              style={{
                width: '100%',
                height: 56,
                borderRadius: 16,
                backgroundColor: phoneNumber.length >= 10 ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLoading ? 0.7 : 1,
              }}
              onPress={handlePhoneSubmit}
              disabled={isLoading || phoneNumber.length < 10}
            >
              {isLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="refresh" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 16, 
                    fontWeight: '600',
                  }}>
                    Verifying...
                  </Text>
                </View>
              ) : (
                <Text style={{ 
                  color: phoneNumber.length >= 10 ? 'white' : 'rgba(255, 255, 255, 0.5)', 
                  fontSize: 16, 
                  fontWeight: '600',
                }}>
                  Next
                </Text>
              )}
            </TouchableOpacity>

            {/* Info Text */}
            <Text style={{ 
              color: 'rgba(255, 255, 255, 0.5)', 
              fontSize: 12,
              lineHeight: 16,
              marginTop: 16,
              textAlign: 'center',
            }}>
              We'll send you a verification code via SMS
            </Text>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}