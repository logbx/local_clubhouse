import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Switch, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '@/lib/storage';

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const rememberMe = watch('rememberMe');

  useEffect(() => {
    checkBiometricAvailability();
    loadSavedEmail();
  }, []);

  const checkBiometricAvailability = async () => {
    if (Platform.OS === 'web') return;
    
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);
  };

  const loadSavedEmail = async () => {
    const email = await storage.get<string>('savedEmail');
    if (email) {
      setSavedEmail(email);
      setValue('email', email);
      setValue('rememberMe', true);
    }
  };

  const handleBiometricAuth = async () => {
    if (!savedEmail || Platform.OS === 'web') return;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to login',
      fallbackLabel: 'Use password',
      cancelLabel: 'Cancel',
    });

    if (result.success) {
      const savedPassword = await storage.get<string>(`password_${savedEmail}`);
      if (savedPassword) {
        try {
          setIsLoading(true);
          await login(savedEmail, savedPassword, true);
          router.replace('/(tabs)');
        } catch (error) {
          Alert.alert('Login Failed', 'Please enter your password manually.');
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      await login(data.email, data.password, data.rememberMe);
      
      // Save email if remember me is checked
      if (data.rememberMe) {
        await storage.set('savedEmail', data.email);
        // Only save password hash for biometric auth on mobile
        if (Platform.OS !== 'web' && biometricAvailable) {
          await storage.set(`password_${data.email}`, data.password);
        }
      } else {
        await storage.remove('savedEmail');
        await storage.remove(`password_${data.email}`);
      }
      
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.response?.data?.error || 'Please check your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-8 pt-safe-top pb-safe-bottom">
          <View className="mb-8">
            <Text className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome Back
            </Text>
            <Text className="text-gray-600 dark:text-gray-400">
              Sign in to continue
            </Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="input"
                    placeholder="Enter your email"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                )}
              />
              {errors.email && (
                <Text className="text-red-500 text-sm mt-1">{errors.email.message}</Text>
              )}
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </Text>
              <View className="relative">
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="input pr-12"
                      placeholder="Enter your password"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      secureTextEntry={!showPassword}
                    />
                  )}
                />
                <TouchableOpacity
                  className="absolute right-3 top-2.5"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text className="text-red-500 text-sm mt-1">{errors.password.message}</Text>
              )}
            </View>

            <TouchableOpacity
              className={`btn btn-primary ${isLoading ? 'opacity-50' : ''}`}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              <Text className="text-white font-semibold">
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <View className="flex-row items-center justify-between mt-4">
              <View className="flex-row items-center">
                <Controller
                  control={control}
                  name="rememberMe"
                  render={({ field: { onChange, value } }) => (
                    <Switch
                      value={value}
                      onValueChange={onChange}
                      trackColor={{ false: '#d1d5db', true: '#0ea5e9' }}
                      thumbColor={value ? '#fff' : '#f4f4f5'}
                      ios_backgroundColor="#d1d5db"
                    />
                  )}
                />
                <Text className="text-gray-600 dark:text-gray-400 ml-2">
                  Remember me
                </Text>
              </View>
              
              <Link href="/forgot-password" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-600 text-sm">Forgot password?</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {savedEmail && biometricAvailable && Platform.OS !== 'web' && (
              <TouchableOpacity
                className="btn btn-outline mt-4"
                onPress={handleBiometricAuth}
              >
                <View className="flex-row items-center">
                  <Ionicons name="finger-print" size={20} color="#0ea5e9" />
                  <Text className="ml-2 text-primary-600 font-semibold">
                    Login with Biometrics
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
              </Text>
              <Link href="/register" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-600 font-semibold">Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}