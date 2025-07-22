import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Dimensions, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WelcomeFallbackScreen() {
  const floatingIcons = [
    { name: 'cube', color: '#E74C3C', top: height * 0.15, left: width * 0.15 },
    { name: 'trophy', color: '#F39C12', top: height * 0.25, right: width * 0.15 },
    { name: 'location', color: '#52C41A', top: height * 0.75, left: width * 0.10 },
    { name: 'people', color: '#1890FF', top: height * 0.80, right: width * 0.20 },
  ];

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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

      {/* Static floating icons */}
      {floatingIcons.map((icon, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            ...icon,
            width: 60,
            height: 60,
            borderRadius: 16,
            backgroundColor: icon.color + '20',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: icon.color,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          <Ionicons name={icon.name as any} size={28} color={icon.color} />
        </View>
      ))}

      {/* Central Content */}
      <View 
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: 60,
          paddingHorizontal: 32,
          zIndex: 2,
        }}
      >
        {/* Main Message */}
        <View style={{ 
          alignItems: 'center', 
          paddingHorizontal: 20,
          maxWidth: width * 0.9,
        }}>
          <Text style={{ 
            color: 'white', 
            fontSize: width > 400 ? 32 : 28,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 12,
            lineHeight: width > 400 ? 38 : 34,
            letterSpacing: -0.5,
          }}>
            Every community{'\n'}is unique
          </Text>
          
          <Text style={{ 
            color: 'rgba(156, 163, 175, 1)',
            fontSize: width > 400 ? 32 : 28,
            fontWeight: '400',
            textAlign: 'center',
            lineHeight: width > 400 ? 38 : 34,
            letterSpacing: -0.25,
          }}>
            Your platform should be too
          </Text>
        </View>
      </View>

      {/* Get Started Button */}
      <View style={{ 
        paddingHorizontal: 32, 
        paddingBottom: Platform.OS === 'ios' ? 50 : 40,
        zIndex: 3,
      }}>
        <TouchableOpacity
          style={{
            width: '100%',
            height: 56,
            backgroundColor: 'white',
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
          onPress={() => router.push('/(auth)/auth-options')}
          activeOpacity={0.9}
        >
          <Text style={{ 
            color: '#1f2937', 
            fontSize: 18, 
            fontWeight: '600',
          }}>
            Get Started
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}