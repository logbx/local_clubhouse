import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { registerWithFirebaseEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 1) return 'bg-red-500';
    if (score <= 2) return 'bg-orange-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (score: number) => {
    if (score <= 1) return 'Weak';
    if (score <= 2) return 'Fair';
    if (score <= 3) return 'Good';
    if (score <= 4) return 'Strong';
    return 'Very Strong';
  };

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      if (registerWithFirebaseEmail) {
        await registerWithFirebaseEmail(data.name, data.email, data.password);
      } else {
        throw new Error('Firebase authentication not available');
      }
      
      Alert.alert(
        'Registration Successful',
        'Your account has been created successfully!',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.message || 'An error occurred during registration. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const strengthScore = getPasswordStrength(password);

  return (
    <>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        className="flex-1"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Navigation Header */}
            <View className="pt-16 pb-6 px-6 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-blue-600 rounded-lg items-center justify-center mr-3">
                  <Ionicons name="people" size={20} color="white" />
                </View>
                <Text className="text-xl font-bold text-white">Local Clubhouse</Text>
              </View>
              <TouchableOpacity>
                <Text className="text-gray-300 text-sm">Already have an account?</Text>
              </TouchableOpacity>
            </View>

            {/* Welcome Section */}
            <View className="px-6 py-8">
              <Text className="text-3xl font-extrabold text-white mb-2">
                Create your account
              </Text>
              <Text className="text-gray-300 text-base">
                Or{' '}
                <Link href="/login" className="font-medium text-blue-400">
                  sign in to your existing account
                </Link>
              </Text>
            </View>

            {/* Form Container */}
            <View className="flex-1 mx-6 mb-8">
              <View className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <View className="space-y-6">
                  {/* Name Input */}
                  <View>
                    <Text className="text-sm font-medium text-gray-300 mb-2">
                      Name
                    </Text>
                    <Controller
                      control={control}
                      name="name"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View className="relative">
                          <TextInput
                            className="w-full h-12 px-4 pr-12 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:bg-white/20"
                            placeholder="Enter your name"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            autoCapitalize="words"
                            autoComplete="name"
                            placeholderTextColor="#9CA3AF"
                          />
                          <View className="absolute right-4 top-3">
                            <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                          </View>
                        </View>
                      )}
                    />
                    {errors.name && (
                      <Text className="text-red-400 text-sm mt-2">{errors.name.message}</Text>
                    )}
                  </View>

                  {/* Email Input */}
                  <View>
                    <Text className="text-sm font-medium text-gray-300 mb-2">
                      Email
                    </Text>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View className="relative">
                          <TextInput
                            className="w-full h-12 px-4 pr-12 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:bg-white/20"
                            placeholder="Enter your email"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            placeholderTextColor="#9CA3AF"
                          />
                          <View className="absolute right-4 top-3">
                            <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                          </View>
                        </View>
                      )}
                    />
                    {errors.email && (
                      <Text className="text-red-400 text-sm mt-2">{errors.email.message}</Text>
                    )}
                  </View>

                  {/* Password Input */}
                  <View>
                    <Text className="text-sm font-medium text-gray-300 mb-2">
                      Password
                    </Text>
                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View className="relative">
                          <TextInput
                            className="w-full h-12 px-4 pr-12 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:bg-white/20"
                            placeholder="Enter your password"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            secureTextEntry={!showPassword}
                            autoComplete="new-password"
                            placeholderTextColor="#9CA3AF"
                          />
                          <TouchableOpacity
                            className="absolute right-4 top-3"
                            onPress={() => setShowPassword(!showPassword)}
                          >
                            <Ionicons 
                              name={showPassword ? "eye-off-outline" : "eye-outline"} 
                              size={20} 
                              color="#9CA3AF" 
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                    {errors.password && (
                      <Text className="text-red-400 text-sm mt-2">{errors.password.message}</Text>
                    )}
                    
                    {/* Password Strength Indicator */}
                    {password && (
                      <View className="mt-3">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-xs text-gray-400">Password strength</Text>
                          <Text className="text-xs text-gray-400">{getPasswordStrengthText(strengthScore)}</Text>
                        </View>
                        <View className="w-full bg-gray-700 rounded-full h-2">
                          <View
                            className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(strengthScore)}`}
                            style={{ width: `${(strengthScore / 5) * 100}%` }}
                          />
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Confirm Password Input */}
                  <View>
                    <Text className="text-sm font-medium text-gray-300 mb-2">
                      Confirm Password
                    </Text>
                    <Controller
                      control={control}
                      name="confirmPassword"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View className="relative">
                          <TextInput
                            className="w-full h-12 px-4 pr-12 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:bg-white/20"
                            placeholder="Confirm your password"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            secureTextEntry={!showConfirmPassword}
                            autoComplete="new-password"
                            placeholderTextColor="#9CA3AF"
                          />
                          <TouchableOpacity
                            className="absolute right-4 top-3"
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            <Ionicons 
                              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                              size={20} 
                              color="#9CA3AF" 
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                    {errors.confirmPassword && (
                      <Text className="text-red-400 text-sm mt-2">{errors.confirmPassword.message}</Text>
                    )}
                  </View>

                  {/* Create Account Button */}
                  <TouchableOpacity
                    className={`w-full h-12 rounded-lg flex-row items-center justify-center ${
                      isLoading ? 'bg-blue-700' : 'bg-blue-600'
                    }`}
                    onPress={handleSubmit(onSubmit)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <View className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                    ) : null}
                    <Text className="text-white font-medium text-base">
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View className="px-6 py-4">
              <Text className="text-center text-gray-400 text-sm">
                © 2025 Local Clubhouse. All rights reserved.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}