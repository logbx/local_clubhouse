import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Animated, Dimensions, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// import Svg, { Path, G } from 'react-native-svg';
// import WelcomeFallbackScreen from './welcome-fallback';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const [hasAnimationError, setHasAnimationError] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    try {
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
      
      // Create orbital animation
      Animated.loop(
        Animated.timing(orbitAnim, {
          toValue: 1,
          duration: 20000, // 20 seconds for full rotation
          useNativeDriver: true,
        })
      ).start();
    } catch (error) {
      console.error('Animation error:', error);
      setHasAnimationError(true);
    }
  }, []);

  // Calculate circular positions - single orbital ring
  const centerX = width / 2;
  const centerY = height / 2 - 20; // Slightly higher for better visual balance
  const orbitRadius = Math.min(width, height) * 0.38; // Single orbital radius

  const floatingIcons = [
    { icon: 'cube', color: '#E74C3C' },         // Red dice/cube
    { icon: 'trophy', color: '#F39C12' },       // Orange trophy
    { icon: 'location', color: '#52C41A' },    // Green location
    { icon: 'basketball', color: '#FF6B35' },   // Orange basketball
    { icon: 'people', color: '#1890FF' },       // Blue people
    { icon: 'flash', color: '#722ED1' },        // Purple lightning
  ];

  // Use fallback screen if animations fail
  if (hasAnimationError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
        <Text style={{ color: 'white', fontSize: 24 }}>Local Clubhouse</Text>
      </View>
    );
  }

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

      {/* Simplified Background */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.04,
        zIndex: 1,
      }}>
        <Text style={{ fontSize: 200, color: 'white', fontWeight: 'bold' }}>🏆</Text>
      </View>

      {/* Central Content */}
      <Animated.View 
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: 60,
          paddingHorizontal: 32,
          opacity: fadeAnim,
          zIndex: 2,
        }}
      >
        {/* Single Orbital Ring with Icons */}
        <View style={{ 
          position: 'absolute', 
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Orbital Ring Path (visual guide) */}
          <View style={{
            position: 'absolute',
            width: orbitRadius * 2,
            height: orbitRadius * 2,
            borderRadius: orbitRadius,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }} />

          {/* Rotating Orbit Container */}
          <Animated.View
            style={{
              position: 'absolute',
              width: orbitRadius * 2,
              height: orbitRadius * 2,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [
                {
                  rotate: orbitAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            }}
          >
            {floatingIcons.map((item, index) => {
              // Calculate even distribution around the circle
              const angleInDegrees = (index / floatingIcons.length) * 360;
              const angleInRadians = (angleInDegrees * Math.PI) / 180;
              
              // Calculate exact position on the circle
              const x = orbitRadius + orbitRadius * Math.cos(angleInRadians) - 30; // -30 to center icon
              const y = orbitRadius + orbitRadius * Math.sin(angleInRadians) - 30; // -30 to center icon
              
              return (
                <View
                  key={index}
                  style={{
                    position: 'absolute',
                    width: 60,
                    height: 60,
                    left: x,
                    top: y,
                  }}
                >
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 16,
                      backgroundColor: item.color + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: item.color,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 4,
                    }}
                  >
                    <Ionicons name={item.icon as any} size={28} color={item.color} />
                  </View>
                </View>
              );
            })}
          </Animated.View>
        </View>

        {/* Main Message */}
        <View style={{ 
          alignItems: 'center', 
          paddingHorizontal: 20,
          zIndex: 10,
          maxWidth: width * 0.9,
        }}>
          {/* Primary heading - bold and prominent */}
          <Text style={{ 
            color: 'white', 
            fontSize: width > 400 ? 32 : 28, // Reduced size for better fit
            fontWeight: 'bold', // 700 weight like web
            textAlign: 'center',
            marginBottom: 12,
            lineHeight: width > 400 ? 38 : 34,
            letterSpacing: -0.5,
          }}>
            Every community{'\n'}is unique
          </Text>
          
          {/* Secondary heading - lighter weight and gray */}
          <Text style={{ 
            color: 'rgba(156, 163, 175, 1)', // Similar to text-gray-400
            fontSize: width > 400 ? 32 : 28, // Smaller than primary (2.25rem/36px)
            fontWeight: '400', // Normal weight like web
            textAlign: 'center',
            lineHeight: width > 400 ? 38 : 34,
            letterSpacing: -0.25,
          }}>
            Your platform should be too
          </Text>
        </View>
      </Animated.View>

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