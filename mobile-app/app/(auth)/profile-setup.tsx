import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileSetupScreen() {
  const { email, verificationCode } = useLocalSearchParams<{ email: string; verificationCode: string }>();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { registerWithFirebaseEmail } = useAuth();

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }

    setIsLoading(true);
    try {
      // Create account with Firebase
      if (registerWithFirebaseEmail) {
        await registerWithFirebaseEmail(name.trim(), email, 'temp-password');
      }
      
      Alert.alert('Welcome!', 'Your profile has been created successfully.', [
        { text: 'Get Started', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      console.error('Profile setup error:', error);
      Alert.alert('Error', 'Failed to create your profile. Please try again.');
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ 
              flex: 1, 
              paddingHorizontal: 24, 
              paddingTop: 80,
              justifyContent: 'flex-start',
            }}>
              {/* Profile Icon */}
              <View style={{
                width: 100,
                height: 100,
                backgroundColor: '#e91e63',
                borderRadius: 50,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 40,
                alignSelf: 'center',
                position: 'relative',
              }}>
                <Text style={{ fontSize: 32, color: 'white' }}>😊</Text>
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    backgroundColor: '#1a1a1a',
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: '#e91e63',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="camera" size={16} color="white" />
                </TouchableOpacity>
              </View>

              {/* Title and Subtitle */}
              <Text style={{ 
                fontSize: 32, 
                fontWeight: 'bold', 
                color: 'white', 
                marginBottom: 12,
                textAlign: 'center',
              }}>
                Your Profile
              </Text>
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontSize: 16,
                lineHeight: 24,
                marginBottom: 48,
                textAlign: 'center',
              }}>
                Introduce yourself to others in{'\n'}your events.
              </Text>

              {/* Name Input */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: 14, 
                  fontWeight: '600',
                  marginBottom: 8,
                }}>
                  Name
                </Text>
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
                  placeholder="Logan"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoFocus={true}
                />
              </View>

              {/* Bio Input */}
              <View style={{ marginBottom: 48 }}>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: 14, 
                  fontWeight: '600',
                  marginBottom: 8,
                }}>
                  Bio
                </Text>
                <TextInput
                  style={{
                    width: '100%',
                    height: 100,
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 16,
                    color: 'white',
                    fontSize: 16,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Share a little about your background..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={bio}
                  onChangeText={setBio}
                  multiline={true}
                />
              </View>

              {/* Save Profile Button */}
              <TouchableOpacity
                style={{
                  width: '100%',
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: name.trim().length > 0 ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isLoading ? 0.7 : 1,
                }}
                onPress={handleSaveProfile}
                disabled={isLoading || name.trim().length === 0}
              >
                <Text style={{ 
                  color: name.trim().length > 0 ? 'white' : 'rgba(255, 255, 255, 0.5)', 
                  fontSize: 16, 
                  fontWeight: '600',
                }}>
                  {isLoading ? 'Creating Profile...' : 'Save Profile'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}