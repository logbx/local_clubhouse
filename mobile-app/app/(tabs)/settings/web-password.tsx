import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { firebaseAuthService } from '@/lib/auth/firebase-auth';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client-mobile';

export default function SetWebPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const getPasswordStrengthColor = () => {
    const score = getPasswordStrength(password);
    if (score <= 2) return '#EF4444';
    if (score <= 3) return '#F59E0B';
    return '#10B981';
  };

  const getPasswordStrengthText = () => {
    const score = getPasswordStrength(password);
    if (score <= 2) return 'Weak';
    if (score <= 3) return 'Good';
    return 'Strong';
  };

  const handleSetPassword = async () => {
    if (!password || password.length < 8) {
      Alert.alert('Invalid Password', 'Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'User email not found. Please try logging out and back in.');
      return;
    }

    setIsLoading(true);

    try {
      // Get Firebase ID token
      const idToken = await firebaseAuthService.getIdToken();
      
      if (!idToken) {
        throw new Error('Failed to get authentication token');
      }

      // Call backend to set web password
      await api.post('/auth/set-web-password', {
        email: user.email,
        firebaseIdToken: idToken,
        newPassword: password
      });

      Alert.alert(
        'Success!',
        'Web password has been set successfully. You can now login on the website using your email and this password.',
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      );
    } catch (error: any) {
      console.error('Set password error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || error.message || 'Failed to set web password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
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
          Set Web Password
        </Text>
        
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32 }}>
            
            {/* Info Section */}
            <View style={{
              backgroundColor: '#EBF8FF',
              borderWidth: 1,
              borderColor: '#3B82F6',
              borderRadius: 12,
              padding: 16,
              marginBottom: 32
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons name="information-circle" size={24} color="#3B82F6" style={{ marginRight: 12, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E40AF', marginBottom: 8 }}>
                    Access Your Account on Web
                  </Text>
                  <Text style={{ fontSize: 14, color: '#1E40AF', lineHeight: 20 }}>
                    Set a password to login to the website using your email ({user?.email}). This won't affect your mobile login.
                  </Text>
                </View>
              </View>
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                New Web Password
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
                  placeholder="Enter a secure password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
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
              
              {/* Password Strength */}
              {password && (
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Password strength</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginLeft: 'auto' }}>
                      {getPasswordStrengthText()}
                    </Text>
                  </View>
                  <View style={{ width: '100%', backgroundColor: '#E5E7EB', borderRadius: 2, height: 4 }}>
                    <View
                      style={{
                        height: 4,
                        borderRadius: 2,
                        width: `${(getPasswordStrength(password) / 5) * 100}%`,
                        backgroundColor: getPasswordStrengthColor()
                      }}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Confirm Password
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderWidth: 1,
                    borderColor: confirmPassword && password !== confirmPassword ? '#EF4444' : '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 16,
                    paddingRight: 48,
                    fontSize: 16,
                    color: '#111827'
                  }}
                  placeholder="Confirm your password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 16,
                    padding: 4
                  }}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#6B7280" 
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword && password !== confirmPassword && (
                <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                  Passwords do not match
                </Text>
              )}
            </View>

            {/* Set Password Button */}
            <TouchableOpacity
              style={{
                backgroundColor: (password.length >= 8 && password === confirmPassword && !isLoading) 
                  ? '#1D4ED8' : '#D1D5DB',
                paddingVertical: 16,
                borderRadius: 8,
                alignItems: 'center',
                marginBottom: 16
              }}
              onPress={handleSetPassword}
              disabled={isLoading || password.length < 8 || password !== confirmPassword}
            >
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: (password.length >= 8 && password === confirmPassword && !isLoading) 
                  ? 'white' : '#9CA3AF'
              }}>
                {isLoading ? 'Setting Password...' : 'Set Web Password'}
              </Text>
            </TouchableOpacity>

            {/* Requirements */}
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Password Requirements:
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons 
                  name={password.length >= 8 ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={password.length >= 8 ? '#10B981' : '#9CA3AF'} 
                  style={{ marginRight: 8 }} 
                />
                <Text style={{ fontSize: 12, color: '#6B7280' }}>At least 8 characters</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons 
                  name={/[A-Z]/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={/[A-Z]/.test(password) ? '#10B981' : '#9CA3AF'} 
                  style={{ marginRight: 8 }} 
                />
                <Text style={{ fontSize: 12, color: '#6B7280' }}>One uppercase letter</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons 
                  name={/[a-z]/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={/[a-z]/.test(password) ? '#10B981' : '#9CA3AF'} 
                  style={{ marginRight: 8 }} 
                />
                <Text style={{ fontSize: 12, color: '#6B7280' }}>One lowercase letter</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons 
                  name={/[0-9]/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={/[0-9]/.test(password) ? '#10B981' : '#9CA3AF'} 
                  style={{ marginRight: 8 }} 
                />
                <Text style={{ fontSize: 12, color: '#6B7280' }}>One number</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}