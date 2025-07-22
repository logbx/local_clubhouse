import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { firebaseAuthService } from '@/lib/auth/firebase-auth';
import { api } from '@/lib/api-client-mobile';

// Import Apple Authentication conditionally
let AppleAuthentication: any;
try {
  AppleAuthentication = require('expo-apple-authentication');
} catch (error) {
  console.warn('Apple Authentication not available');
  AppleAuthentication = null;
}

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { email: paramEmail, userType: paramUserType } = useLocalSearchParams<{ email: string; userType: string }>();
  const { loginWithFirebaseEmail, loginWithFirebase, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<'unknown' | 'password' | 'firebase'>('unknown');
  const [isCheckingUserType, setIsCheckingUserType] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: paramEmail || '',
      password: '',
      rememberMe: false,
    },
  });

  useEffect(() => {
    // Set user type from params if provided
    if (paramUserType) {
      setUserType(paramUserType as 'password' | 'firebase');
    }
    
    // Pre-fill email if provided
    if (paramEmail) {
      setValue('email', paramEmail);
    }
  }, [paramEmail, paramUserType, setValue]);

  const checkUserType = async (email: string) => {
    if (!email || email.length === 0) {
      setUserType('unknown');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setUserType('unknown');
      return;
    }

    setIsCheckingUserType(true);
    try {
      const response = await api.checkUserType(email);
      console.log('Check user type response:', response);
      if (response.exists) {
        setUserType(response.authMethod === 'password' ? 'password' : 'firebase');
      } else {
        setUserType('unknown');
      }
    } catch (error) {
      console.error('Error checking user type:', error);
      setUserType('unknown');
    } finally {
      setIsCheckingUserType(false);
    }
  };

  const handleLoginSubmission = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      // Always check user type before login to ensure accuracy
      console.log('Checking user type for:', data.email);
      const response = await api.checkUserType(data.email);
      console.log('User type check response:', JSON.stringify(response, null, 2));
      
      if (response.exists && response.authMethod === 'password') {
        // Use standard email/password login for web-registered users
        console.log('Using standard login for web user');
        await login(data.email, data.password, data.rememberMe);
      } else if (response.exists && response.authMethod !== 'password') {
        // Use Firebase authentication for Firebase users
        console.log('Using Firebase login for mobile user');
        if (loginWithFirebaseEmail) {
          await loginWithFirebaseEmail(data.email, data.password);
        } else {
          throw new Error('Firebase authentication not available');
        }
      } else {
        // No existing user - try Firebase for new registration
        console.log('No existing user found, attempting Firebase login');
        if (loginWithFirebaseEmail) {
          await loginWithFirebaseEmail(data.email, data.password);
        } else {
          throw new Error('Authentication not available');
        }
      }
      
      // Navigate directly after successful login
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.status,
        code: error.code,
      });
      
      let errorMessage = 'Please check your credentials and try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Add more specific error messages
      if (error.message?.includes('Network request failed')) {
        errorMessage = 'Unable to connect to server. Please check your connection.';
      } else if (error.message?.includes('auth/invalid-credential')) {
        errorMessage = 'Invalid email or password. Please try again.';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const authUser = await firebaseAuthService.signInWithGoogle();
      const idToken = await firebaseAuthService.getIdToken();
      const { loginWithFirebase: firebaseLogin } = useAuth();
      
      if (idToken && firebaseLogin) {
        await firebaseLogin(idToken, authUser);
      }
      
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Google Sign-In Error', error.message || 'Failed to sign in with Google');
    }
  };

  const handleAppleAuth = async () => {
    try {
      if (!AppleAuthentication) {
        Alert.alert('Apple Sign-In', 'Apple Sign-In is not available in this environment');
        return;
      }

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Apple Sign-In', 'Apple Sign-In is not available on this device');
        return;
      }

      const authUser = await firebaseAuthService.signInWithApple();
      const idToken = await firebaseAuthService.getIdToken();
      const { loginWithFirebase: firebaseLogin } = useAuth();
      
      if (idToken && firebaseLogin) {
        await firebaseLogin(idToken, authUser);
      }
      
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Apple Sign-In Error', error.message || 'Failed to sign in with Apple');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
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
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Professional Header */}
        <View style={{ 
          paddingTop: Platform.OS === 'ios' ? 60 : 40,
          paddingHorizontal: 24,
          paddingBottom: 16,
        }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 32,
                height: 32,
                backgroundColor: '#3b82f6',
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="sparkles" size={16} color="white" />
              </View>
              <Text style={{ 
                color: 'white', 
                fontSize: 18, 
                fontWeight: '600' 
              }}>
                Local Clubhouse
              </Text>
            </View>
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
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Main Content */}
          <View style={{ 
            flex: 1, 
            paddingHorizontal: 24, 
            paddingTop: 40,
            justifyContent: 'center',
          }}>
            {/* Header */}
            <View style={{ marginBottom: 48 }}>
              <Text style={{ 
                fontSize: 36, 
                fontWeight: 'bold', 
                color: 'white', 
                marginBottom: 12,
                textAlign: 'center',
              }}>
                Sign in to your account
              </Text>
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontSize: 16,
                textAlign: 'center',
                lineHeight: 24,
              }}>
                Welcome back! Please enter your details.
              </Text>
            </View>

            {/* Glass Morphism Form Card */}
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 24,
              padding: 32,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.37,
              shadowRadius: 16,
              elevation: 16,
            }}>
              {/* Email Input */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: 14, 
                  fontWeight: '600',
                  marginBottom: 8,
                }}>
                  Email
                </Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={{ position: 'relative' }}>
                      <TextInput
                        style={{
                          width: '100%',
                          height: 56,
                          paddingHorizontal: 48,
                          paddingRight: 48,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: 1,
                          borderColor: errors.email ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
                          borderRadius: 12,
                          color: 'white',
                          fontSize: 16,
                        }}
                        placeholder="Enter your email"
                        onBlur={(e) => {
                          onBlur(e);
                          checkUserType(value);
                        }}
                        onChangeText={(text) => {
                          onChange(text);
                          if (userType !== 'unknown') {
                            setUserType('unknown');
                          }
                        }}
                        value={value}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                        placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      />
                      <View style={{ 
                        position: 'absolute', 
                        left: 16, 
                        top: 18,
                      }}>
                        <Ionicons name="mail-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                      </View>
                      {isCheckingUserType && (
                        <View style={{ 
                          position: 'absolute', 
                          right: 16, 
                          top: 18,
                        }}>
                          <Ionicons name="refresh" size={20} color="rgba(255, 255, 255, 0.6)" />
                        </View>
                      )}
                    </View>
                  )}
                />
                {errors.email && (
                  <Text style={{ 
                    color: '#ef4444', 
                    fontSize: 14, 
                    marginTop: 4,
                  }}>
                    {errors.email.message}
                  </Text>
                )}
                {userType === 'password' && (
                  <Text style={{ 
                    color: '#10b981', 
                    fontSize: 12, 
                    marginTop: 4,
                  }}>
                    ✓ Web account detected - using email/password login
                  </Text>
                )}
                {userType === 'firebase' && (
                  <Text style={{ 
                    color: '#3b82f6', 
                    fontSize: 12, 
                    marginTop: 4,
                  }}>
                    ✓ Mobile account detected - using Firebase login
                  </Text>
                )}
              </View>

              {/* Password Input */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: 14, 
                  fontWeight: '600',
                  marginBottom: 8,
                }}>
                  Password
                </Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={{ position: 'relative' }}>
                      <TextInput
                        style={{
                          width: '100%',
                          height: 56,
                          paddingHorizontal: 48,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: 1,
                          borderColor: errors.password ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
                          borderRadius: 12,
                          color: 'white',
                          fontSize: 16,
                        }}
                        placeholder="Enter your password"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        secureTextEntry={!showPassword}
                        autoComplete="password"
                        placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      />
                      <View style={{ 
                        position: 'absolute', 
                        left: 16, 
                        top: 18,
                      }}>
                        <Ionicons name="lock-closed-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                      </View>
                      <TouchableOpacity
                        style={{ 
                          position: 'absolute', 
                          right: 16, 
                          top: 18,
                        }}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons 
                          name={showPassword ? "eye-off-outline" : "eye-outline"} 
                          size={20} 
                          color="rgba(255, 255, 255, 0.6)" 
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                />
                {errors.password && (
                  <Text style={{ 
                    color: '#ef4444', 
                    fontSize: 14, 
                    marginTop: 4,
                  }}>
                    {errors.password.message}
                  </Text>
                )}
              </View>

              {/* Remember Me & Forgot Password */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: 32,
              }}>
                <Controller
                  control={control}
                  name="rememberMe"
                  render={({ field: { onChange, value } }) => (
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => onChange(!value)}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        borderWidth: 2,
                        borderColor: value ? '#3b82f6' : 'rgba(255, 255, 255, 0.4)',
                        backgroundColor: value ? '#3b82f6' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}>
                        {value && <Ionicons name="checkmark" size={12} color="white" />}
                      </View>
                      <Text style={{ 
                        color: 'rgba(255, 255, 255, 0.8)', 
                        fontSize: 14,
                      }}>
                        Remember me
                      </Text>
                    </TouchableOpacity>
                  )}
                />

                <TouchableOpacity>
                  <Text style={{ 
                    color: '#3b82f6', 
                    fontSize: 14, 
                    fontWeight: '500',
                  }}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Premium Sign In Button */}
              <TouchableOpacity
                style={{
                  width: '100%',
                  height: 56,
                  borderRadius: 12,
                  backgroundColor: '#3b82f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                  opacity: isLoading ? 0.7 : 1,
                }}
                onPress={handleSubmit(handleLoginSubmission)}
                disabled={isLoading}
              >
                <Text style={{ 
                  color: 'white', 
                  fontSize: 18, 
                  fontWeight: '600',
                }}>
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginVertical: 24,
              }}>
                <View style={{ 
                  flex: 1, 
                  height: 1, 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }} />
                <Text style={{ 
                  marginHorizontal: 16, 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  fontSize: 14,
                }}>
                  or continue with
                </Text>
                <View style={{ 
                  flex: 1, 
                  height: 1, 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }} />
              </View>

              {/* Enhanced Social Login */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'center', 
                gap: 16,
              }}>
                <TouchableOpacity 
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={handleGoogleAuth}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-google" size={24} color="#4285F4" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={handleAppleAuth}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-apple" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Link */}
            <View style={{ marginTop: 32, marginBottom: 40 }}>
              <Text style={{ 
                textAlign: 'center', 
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 16,
              }}>
                Don't have an account?{' '}
                <Link href="/(auth)/register" asChild>
                  <Text style={{ 
                    color: '#3b82f6', 
                    fontWeight: '600',
                  }}>
                    Sign up
                  </Text>
                </Link>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}