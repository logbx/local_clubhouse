import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Check if Firebase configuration is available
const isFirebaseConfigured = () => {
  const enabled = process.env.EXPO_PUBLIC_FIREBASE_ENABLED;
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  
  // If explicitly disabled, return false
  if (enabled === 'false') return false;
  
  // Check if we have a valid API key
  return apiKey && apiKey !== '' && !apiKey.includes('demo');
};

// Firebase configuration with validation
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:demo',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-DEMO123456',
};

// Initialize Firebase with error handling
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

try {
  if (isFirebaseConfigured()) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      
      // Initialize Auth with proper persistence for React Native
      if (Platform.OS !== 'web') {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage)
        });
      } else {
        auth = getAuth(app);
      }
    } else {
      app = getApps()[0];
      auth = getAuth(app);
    }
  } else {
    console.warn('Firebase configuration not found. Firebase features will be disabled.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  console.warn('Firebase features will be disabled.');
}

export { app, auth, isFirebaseConfigured };
export default app;