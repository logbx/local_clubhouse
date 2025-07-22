import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { firebaseAuthService } from '@/lib/auth/firebase-auth';
import { useAuth } from '@/hooks/useAuth';
import { generateUsername } from '@/lib/utils/username-generator';

type EmailOnboardingStep = 'email-password' | 'email-verification' | 'profile' | 'notifications';

export default function EmailSignUpFlow() {
  const [currentStep, setCurrentStep] = useState<EmailOnboardingStep>('email-password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignIn, setIsSignIn] = useState(false);
  const [verificationTimer, setVerificationTimer] = useState(0);
  
  const { loginWithFirebase } = useAuth();
  const codeInputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-generate username when name changes
  useEffect(() => {
    if (name.trim()) {
      setUsername(generateUsername(name));
    }
  }, [name]);

  // Countdown timer for email verification
  useEffect(() => {
    if (verificationTimer > 0) {
      timerRef.current = setTimeout(() => {
        setVerificationTimer(verificationTimer - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [verificationTimer]);

  const goToNextStep = (nextStep: EmailOnboardingStep) => {
    setCurrentStep(nextStep);
  };

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation
  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const handleEmailPasswordStep = async () => {
    if (!isValidEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      if (isSignIn) {
        // Sign in existing user
        const authUser = await firebaseAuthService.signInWithEmail(email, password);
        
        // Get Firebase ID token and complete login
        const idToken = await firebaseAuthService.getIdToken();
        if (idToken && loginWithFirebase) {
          await loginWithFirebase(idToken, authUser);
        }
        
        router.replace('/(tabs)');
      } else {
        // Register new user
        const authUser = await firebaseAuthService.registerWithEmail(email, password);
        
        // Send email verification
        await firebaseAuthService.sendEmailVerification();
        setVerificationTimer(60); // 60 second countdown
        goToNextStep('email-verification');
      }
    } catch (error: any) {
      if (error.message.includes('email-already-in-use')) {
        Alert.alert(
          'Account Exists',
          'An account with this email already exists. Would you like to sign in instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => setIsSignIn(true) }
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Authentication failed');
      }
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

  const handleEmailVerification = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      // For now, accept any 6-digit code in development
      // In production, implement actual email verification code validation
      if (__DEV__ && /^\d{6}$/.test(code)) {
        goToNextStep('profile');
      } else {
        // Production email verification logic would go here
        Alert.alert('Invalid Code', 'Please check your email and try again');
      }
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Failed to verify email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (verificationTimer > 0) return;
    
    setIsLoading(true);
    try {
      await firebaseAuthService.sendEmailVerification();
      setVerificationTimer(60);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification code');
    } finally {
      setIsLoading(false);
    }
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
        const currentUser = firebaseAuthService.getCurrentUser();
        const authUser = {
          uid: currentUser?.uid,
          email: email,
          displayName: name,
          phoneNumber: null,
          photoURL: null,
          username: username,
          authMethod: 'email',
          emailVerified: true
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

  const renderEmailPasswordStep = () => (
    <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          {isSignIn ? 'Welcome back' : 'Create your account'}
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
          {isSignIn ? 'Sign in to your existing account' : 'Join the community and start connecting'}
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        {/* Email Input */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
            Email Address
          </Text>
          <TextInput
            style={{
              backgroundColor: '#F9FAFB',
              borderWidth: 1,
              borderColor: email && !isValidEmail(email) ? '#EF4444' : '#D1D5DB',
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
          {email && !isValidEmail(email) && (
            <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
              Please enter a valid email address
            </Text>
          )}
        </View>

        {/* Password Input */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
            Password
          </Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 16,
                paddingRight: 48,
                fontSize: 16,
                color: '#111827'
              }}
              placeholder={isSignIn ? "Enter your password" : "Create a secure password"}
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete={isSignIn ? "password" : "new-password"}
            />
            <TouchableOpacity
              style={{
                position: 'absolute',
                right: 12,
                top: 16,
                padding: 4
              }}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#6B7280" 
              />
            </TouchableOpacity>
          </View>
          
          {/* Password Strength Indicator (only for sign up) */}
          {!isSignIn && password && (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>Password strength</Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginLeft: 'auto' }}>
                  {getPasswordStrength(password) <= 2 ? 'Weak' : 
                   getPasswordStrength(password) <= 3 ? 'Good' : 'Strong'}
                </Text>
              </View>
              <View style={{ width: '100%', backgroundColor: '#E5E7EB', borderRadius: 2, height: 4 }}>
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    width: `${(getPasswordStrength(password) / 5) * 100}%`,
                    backgroundColor: getPasswordStrength(password) <= 2 ? '#EF4444' : 
                                   getPasswordStrength(password) <= 3 ? '#F59E0B' : '#10B981'
                  }}
                />
              </View>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: (isValidEmail(email) && password.length >= 6 && !isLoading) ? '#1D4ED8' : '#D1D5DB',
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 16
        }}
        onPress={handleEmailPasswordStep}
        disabled={isLoading || !isValidEmail(email) || password.length < 6}
      >
        <Text style={{ 
          fontSize: 16, 
          fontWeight: '600', 
          color: (isValidEmail(email) && password.length >= 6 && !isLoading) ? 'white' : '#9CA3AF'
        }}>
          {isLoading ? (isSignIn ? 'Signing in...' : 'Creating account...') : (isSignIn ? 'Sign In' : 'Continue')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ alignItems: 'center' }}
        onPress={() => setIsSignIn(!isSignIn)}
      >
        <Text style={{ fontSize: 16, color: '#6B7280' }}>
          {isSignIn ? "Don't have an account? " : "Already have an account? "}
          <Text style={{ color: '#1D4ED8', fontWeight: '500' }}>
            {isSignIn ? 'Sign up' : 'Sign in'}
          </Text>
        </Text>
      </TouchableOpacity>

      {/* Alternative Auth Options */}
      <View style={{ marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
          Or continue with
        </Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#F9FAFB',
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center'
            }}
            onPress={() => router.push('/(auth)/phone-verify')}
          >
            <Ionicons name="call-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 14, color: '#374151', fontWeight: '500' }}>Phone</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#F9FAFB',
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center'
            }}
          >
            <Ionicons name="logo-google" size={20} color="#4285F4" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 14, color: '#374151', fontWeight: '500' }}>Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmailVerificationStep = () => (
    <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          Check your email
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
          We sent a 6-digit code to{' '}
          <Text style={{ fontWeight: '500', color: '#111827' }}>{email}</Text>
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
        onPress={handleEmailVerification}
        disabled={isLoading || verificationCode.join('').length !== 6}
      >
        <Text style={{ 
          fontSize: 16, 
          fontWeight: '600', 
          color: verificationCode.join('').length === 6 && !isLoading ? 'white' : '#9CA3AF'
        }}>
          {isLoading ? 'Verifying...' : 'Verify Email'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ alignItems: 'center' }}
        onPress={handleResendCode}
        disabled={verificationTimer > 0}
      >
        <Text style={{ fontSize: 16, color: verificationTimer > 0 ? '#9CA3AF' : '#6B7280' }}>
          {verificationTimer > 0 
            ? `Resend code in ${verificationTimer}s` 
            : "Didn't receive it? Resend code"
          }
        </Text>
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
      case 'email-password': return renderEmailPasswordStep();
      case 'email-verification': return renderEmailVerificationStep();
      case 'profile': return renderProfileStep();
      case 'notifications': return renderNotificationsStep();
      default: return renderEmailPasswordStep();
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
          {currentStep === 'email-password' && (isSignIn ? 'Sign In' : 'Sign Up')}
          {currentStep === 'email-verification' && 'Verify Email'}
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
    </SafeAreaView>
  );
}