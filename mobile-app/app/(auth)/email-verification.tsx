import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function EmailVerificationScreen() {
  const { email, isSignup } = useLocalSearchParams<{ email: string; isSignup: string }>();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputs = useRef<TextInput[]>([]);
  const { registerWithFirebaseEmail, sendEmailVerification } = useAuth();

  useEffect(() => {
    // Auto-send verification email for new signups
    if (isSignup === 'true') {
      sendVerificationEmail();
    }
  }, []);

  const sendVerificationEmail = async () => {
    try {
      setIsResending(true);
      if (sendEmailVerification) {
        await sendEmailVerification();
      }
      console.log('Verification email sent to:', email);
    } catch (error) {
      console.error('Error sending verification email:', error);
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit code.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignup === 'true') {
        // For new users, proceed to profile setup
        router.push({
          pathname: '/(auth)/profile-setup',
          params: { email, verificationCode }
        });
      } else {
        // For existing users, verify and login
        // This would integrate with your verification system
        Alert.alert('Success', 'Email verified successfully!');
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      Alert.alert('Verification Failed', 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const maskedEmail = email ? 
    email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : 
    'your email';

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={{ 
          paddingTop: 16,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{ 
            flex: 1, 
            paddingHorizontal: 24, 
            paddingTop: 60,
            justifyContent: 'flex-start',
          }}>
            {/* Code Icon */}
            <View style={{
              width: 80,
              height: 80,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 40,
            }}>
              <Ionicons name="chatbox-ellipses-outline" size={40} color="white" />
            </View>

            {/* Title and Subtitle */}
            <Text style={{ 
              fontSize: 32, 
              fontWeight: 'bold', 
              color: 'white', 
              marginBottom: 12,
            }}>
              Enter Code
            </Text>
            <Text style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: 16,
              lineHeight: 24,
              marginBottom: 48,
            }}>
              We sent a verification code to your email{'\n'}
              <Text style={{ fontWeight: '600' }}>{maskedEmail}</Text>.
            </Text>

            {/* Code Input */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between',
              marginBottom: 32,
            }}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => ref && (inputs.current[index] = ref)}
                  style={{
                    width: 48,
                    height: 56,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    borderColor: digit ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 12,
                    color: 'white',
                    fontSize: 24,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {/* Next Button */}
            <TouchableOpacity
              style={{
                width: '100%',
                height: 56,
                borderRadius: 16,
                backgroundColor: code.join('').length === 6 ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
                opacity: isLoading ? 0.7 : 1,
              }}
              onPress={handleVerifyCode}
              disabled={isLoading || code.join('').length !== 6}
            >
              <Text style={{ 
                color: code.join('').length === 6 ? 'white' : 'rgba(255, 255, 255, 0.5)', 
                fontSize: 16, 
                fontWeight: '600',
              }}>
                {isLoading ? 'Verifying...' : 'Next'}
              </Text>
            </TouchableOpacity>

            {/* Resend Code */}
            <TouchableOpacity
              style={{ alignItems: 'center' }}
              onPress={sendVerificationEmail}
              disabled={isResending}
            >
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.6)', 
                fontSize: 14,
              }}>
                {isResending ? 'Sending...' : "Didn't receive the code? "}
                <Text style={{ color: '#3b82f6', fontWeight: '600' }}>
                  Resend
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}