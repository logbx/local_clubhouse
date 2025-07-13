import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Switch, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  newsletter: z.boolean(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    trigger,
    watch,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
      newsletter: false,
    },
  });

  const password = watch('password');

  const validateAndNext = async () => {
    let fieldsToValidate: (keyof RegisterForm)[] = [];
    
    if (currentStep === 1) {
      fieldsToValidate = ['name', 'email'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['password', 'confirmPassword'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true);
      await register(data.name, data.email, data.password, data.acceptTerms, data.newsletter);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.response?.data?.error || 'Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, text: '', color: '#d1d5db' };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    const strengthLevels = [
      { strength: 0, text: '', color: '#d1d5db' },
      { strength: 1, text: 'Weak', color: '#ef4444' },
      { strength: 2, text: 'Fair', color: '#f59e0b' },
      { strength: 3, text: 'Good', color: '#eab308' },
      { strength: 4, text: 'Strong', color: '#22c55e' },
      { strength: 5, text: 'Very Strong', color: '#10b981' },
    ];

    return strengthLevels[strength];
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
              Create Account
            </Text>
            <Text className="text-gray-600 dark:text-gray-400">
              Sign up to get started
            </Text>
          </View>

          {/* Progress Indicator */}
          <View className="flex-row justify-center mb-6">
            {[1, 2, 3].map((step) => (
              <View key={step} className="flex-row items-center">
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    step <= currentStep ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${
                    step <= currentStep ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}>
                    {step}
                  </Text>
                </View>
                {step < 3 && (
                  <View
                    className={`w-16 h-1 ${
                      step < currentStep ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                )}
              </View>
            ))}
          </View>

          <View className="space-y-4">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <>
                <View>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </Text>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        className="input"
                        placeholder="Enter your name"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        autoCapitalize="words"
                      />
                    )}
                  />
                  {errors.name && (
                    <Text className="text-red-500 text-sm mt-1">{errors.name.message}</Text>
                  )}
                </View>

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

                <TouchableOpacity
                  className="btn btn-primary"
                  onPress={validateAndNext}
                >
                  <Text className="text-white font-semibold">Next</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Step 2: Password */}
            {currentStep === 2 && (
              <>
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
                          placeholder="Create a strong password"
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
                  
                  {/* Password Strength Indicator */}
                  {password && (
                    <View className="mt-2">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-xs text-gray-600 dark:text-gray-400">
                          Password strength:
                        </Text>
                        <Text 
                          className="text-xs font-semibold"
                          style={{ color: getPasswordStrength(password).color }}
                        >
                          {getPasswordStrength(password).text}
                        </Text>
                      </View>
                      <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <View
                          className="h-full transition-all"
                          style={{
                            width: `${(getPasswordStrength(password).strength / 5) * 100}%`,
                            backgroundColor: getPasswordStrength(password).color,
                          }}
                        />
                      </View>
                    </View>
                  )}
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password
                  </Text>
                  <View className="relative">
                    <Controller
                      control={control}
                      name="confirmPassword"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          className="input pr-12"
                          placeholder="Confirm your password"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          secureTextEntry={!showConfirmPassword}
                        />
                      )}
                    />
                    <TouchableOpacity
                      className="absolute right-3 top-2.5"
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword && (
                    <Text className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</Text>
                  )}
                </View>

                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    className="btn btn-outline flex-1"
                    onPress={() => setCurrentStep(1)}
                  >
                    <Text className="text-gray-700 dark:text-gray-300 font-semibold">Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="btn btn-primary flex-1"
                    onPress={validateAndNext}
                  >
                    <Text className="text-white font-semibold">Next</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step 3: Terms & Submit */}
            {currentStep === 3 && (
              <>
                <View className="space-y-4">
                  <View className="flex-row items-start">
                    <Controller
                      control={control}
                      name="acceptTerms"
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
                    <View className="flex-1 ml-3">
                      <Text className="text-sm text-gray-700 dark:text-gray-300">
                        I accept the{' '}
                        <Text className="text-primary-600" onPress={() => Alert.alert('Terms', 'Terms and conditions content...')}>
                          Terms and Conditions
                        </Text>
                        {' '}and{' '}
                        <Text className="text-primary-600" onPress={() => Alert.alert('Privacy', 'Privacy policy content...')}>
                          Privacy Policy
                        </Text>
                      </Text>
                      {errors.acceptTerms && (
                        <Text className="text-red-500 text-xs mt-1">{errors.acceptTerms.message}</Text>
                      )}
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    <Controller
                      control={control}
                      name="newsletter"
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
                    <Text className="text-sm text-gray-700 dark:text-gray-300 ml-3">
                      Send me tips, updates and offers
                    </Text>
                  </View>
                </View>

                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    className="btn btn-outline flex-1"
                    onPress={() => setCurrentStep(2)}
                  >
                    <Text className="text-gray-700 dark:text-gray-300 font-semibold">Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`btn btn-primary flex-1 ${isLoading ? 'opacity-50' : ''}`}
                    onPress={handleSubmit(onSubmit)}
                    disabled={isLoading}
                  >
                    <Text className="text-white font-semibold">
                      {isLoading ? 'Creating...' : 'Create Account'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View className="flex-row justify-center mt-4">
              <Text className="text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
              </Text>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-600 font-semibold">Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}