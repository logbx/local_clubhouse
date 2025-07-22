import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { firebaseAuthService } from '@/lib/auth/firebase-auth';
import { useAuth } from '@/hooks/useAuth';

type OnboardingStep = 'phone' | 'sms-code' | 'email' | 'profile' | 'notifications';

import { generateUsername } from '@/lib/utils/username-generator';

export default function CleanPhoneVerifyScreen() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationId, setVerificationId] = useState<string>('');
  
  const { loginWithFirebase } = useAuth();
  const codeInputRefs = useRef<(TextInput | null)[]>([]);

  // Auto-generate username when name changes
  useEffect(() => {
    if (name.trim()) {
      setUsername(generateUsername(name));
    }
  }, [name]);

  const goToNextStep = (nextStep: OnboardingStep) => {
    setCurrentStep(nextStep);
  };

  const handlePhoneChange = (value: string) => {
    // Simple phone number handling - just store digits
    const numbers = value.replace(/\D/g, '');
    setPhoneNumber(numbers);
  };

  const handleSendCode = async () => {
    if (phoneNumber.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
      return;
    }

    const formattedPhone = `+1${phoneNumber}`;
    setIsLoading(true);
    
    try {
      const result = await firebaseAuthService.sendPhoneVerification(formattedPhone);
      setVerificationId(result.verificationId);
      
      // Show development hint if in test mode
      if (__DEV__ && result.verificationId.startsWith('test-verification-id-')) {
        Alert.alert(
          'Development Mode', 
          'For testing, you can enter any 6-digit code (e.g., 123456)',
          [{ text: 'OK', onPress: () => goToNextStep('sms-code') }]
        );
      } else {
        goToNextStep('sms-code');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (value: string, index: number) => {
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const authUser = await firebaseAuthService.confirmPhoneVerification(verificationId, code);
      goToNextStep('email');
    } catch (error: any) {
      Alert.alert('Invalid Code', 'The verification code is incorrect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailStep = () => {
    if (email.trim() && !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    goToNextStep('profile');
  };

  const handleProfileStep = () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name');
      return;
    }
    goToNextStep('notifications');
  };

  const handleFinishOnboarding = async () => {
    setIsLoading(true);
    try {
      // Get Firebase ID token and complete registration
      const idToken = await firebaseAuthService.getIdToken();
      if (idToken && loginWithFirebase) {
        const authUser = {
          uid: firebaseAuthService.getCurrentUser()?.uid,
          email: email || null,
          displayName: name,
          phoneNumber: `+1${phoneNumber}`,
          photoURL: null,
          username: username,
        };
        await loginWithFirebase(idToken, authUser);
      }
      
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete registration');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPhoneStep = () => (
    <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          Enter your phone number
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
          We'll text you a verification code
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <View style={{ 
          flexDirection: 'row', 
          backgroundColor: '#F9FAFB', 
          borderWidth: 1, 
          borderColor: '#D1D5DB',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 16,
          alignItems: 'center'
        }}>
          <Text style={{ fontSize: 16, color: '#111827', marginRight: 8 }}>🇺🇸 +1</Text>
          <TextInput
            style={{ flex: 1, fontSize: 16, color: '#111827' }}
            placeholder="(555) 123-4567"
            placeholderTextColor="#9CA3AF"
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: phoneNumber.length === 10 && !isLoading ? '#1D4ED8' : '#D1D5DB',
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center'
        }}
        onPress={handleSendCode}
        disabled={isLoading || phoneNumber.length !== 10}
      >
        <Text style={{ 
          fontSize: 16, 
          fontWeight: '600', 
          color: phoneNumber.length === 10 && !isLoading ? 'white' : '#9CA3AF'
        }}>
          {isLoading ? 'Sending...' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSMSCodeStep = () => (
    <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          Enter the code
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
          We sent a 6-digit code to +1 {phoneNumber}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 32 }}>
        {verificationCode.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (codeInputRefs.current[index] = ref)}
            style={{
              width: 48,
              height: 56,
              backgroundColor: '#F9FAFB',
              borderWidth: 1,
              borderColor: digit ? '#1D4ED8' : '#D1D5DB',
              borderRadius: 8,
              textAlign: 'center',
              fontSize: 20,
              fontWeight: 'bold',
              color: '#111827',
              marginHorizontal: 4
            }}
            value={digit}
            onChangeText={(value) => handleCodeChange(value, index)}
            onKeyPress={({ nativeEvent }) => handleCodeKeyPress(nativeEvent.key, index)}
            keyboardType="numeric"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: verificationCode.join('').length === 6 && !isLoading ? '#1D4ED8' : '#D1D5DB',
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 16
        }}
        onPress={handleVerifyCode}
        disabled={isLoading || verificationCode.join('').length !== 6}
      >
        <Text style={{ 
          fontSize: 16, 
          fontWeight: '600', 
          color: verificationCode.join('').length === 6 && !isLoading ? 'white' : '#9CA3AF'
        }}>
          {isLoading ? 'Verifying...' : 'Verify'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ alignItems: 'center' }}
        onPress={() => goToNextStep('phone')}
      >
        <Text style={{ fontSize: 16, color: '#6B7280' }}>Didn't receive it? Try again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmailStep = () => (
    <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          What's your email?
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
          We'll use this for account recovery
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <TextInput
          style={{
            backgroundColor: '#F9FAFB',
            borderWidth: 1,
            borderColor: '#D1D5DB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 16,
            fontSize: 16,
            color: '#111827'
          }}
          placeholder="your.email@example.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: '#1D4ED8',
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 16
        }}
        onPress={handleEmailStep}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: 'white' }}>Continue</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ alignItems: 'center' }}
        onPress={() => goToNextStep('profile')}
      >
        <Text style={{ fontSize: 16, color: '#6B7280' }}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProfileStep = () => (
    <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          What's your name?
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
          This is how others will see you
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <TextInput
          style={{
            backgroundColor: '#F9FAFB',
            borderWidth: 1,
            borderColor: '#D1D5DB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 16,
            fontSize: 16,
            color: '#111827',
            marginBottom: 16
          }}
          placeholder="Your full name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
        />
        
        {username && (
          <View style={{
            backgroundColor: '#F9FAFB',
            borderWidth: 1,
            borderColor: '#D1D5DB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 16
          }}>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>Your username</Text>
            <Text style={{ fontSize: 16, color: '#111827', fontWeight: '500' }}>@{username}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: name.trim() ? '#1D4ED8' : '#D1D5DB',
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center'
        }}
        onPress={handleProfileStep}
        disabled={!name.trim()}
      >
        <Text style={{ 
          fontSize: 16, 
          fontWeight: '600', 
          color: name.trim() ? 'white' : '#9CA3AF'
        }}>
          Continue
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderNotificationsStep = () => (
    <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          Stay in the loop
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
          Get notified about events and messages
        </Text>
      </View>

      <View style={{
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginBottom: 32
      }}>
        <View style={{
          width: 64,
          height: 64,
          backgroundColor: '#1D4ED8',
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16
        }}>
          <Ionicons name="notifications" size={32} color="white" />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          Enable Notifications
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
          We'll send you notifications about nearby events, new messages, and community updates.
        </Text>
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: isLoading ? '#D1D5DB' : '#1D4ED8',
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 16
        }}
        onPress={handleFinishOnboarding}
        disabled={isLoading}
      >
        <Text style={{ 
          fontSize: 16, 
          fontWeight: '600', 
          color: isLoading ? '#9CA3AF' : 'white'
        }}>
          {isLoading ? 'Setting up...' : 'Enable Notifications'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ alignItems: 'center' }}
        onPress={handleFinishOnboarding}
        disabled={isLoading}
      >
        <Text style={{ fontSize: 16, color: '#6B7280' }}>Not now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'phone': return renderPhoneStep();
      case 'sms-code': return renderSMSCodeStep();
      case 'email': return renderEmailStep();
      case 'profile': return renderProfileStep();
      case 'notifications': return renderNotificationsStep();
      default: return renderPhoneStep();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar style="dark" />
      
      {/* Clean Header */}
      <View style={{ 
        paddingTop: 16, 
        paddingBottom: 16, 
        paddingHorizontal: 24, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
      }}>
        <TouchableOpacity
          style={{ padding: 8 }}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        
        <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>
          {currentStep === 'phone' && 'Phone'}
          {currentStep === 'sms-code' && 'Verification'}
          {currentStep === 'email' && 'Email'}
          {currentStep === 'profile' && 'Profile'}
          {currentStep === 'notifications' && 'Notifications'}
        </Text>
        
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderCurrentStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* reCAPTCHA container for web */}
      {Platform.OS === 'web' && (
        <View style={{ position: 'absolute', top: -1000, left: -1000 }}>
          <div id="recaptcha-container"></div>
        </View>
      )}
    </SafeAreaView>
  );
}