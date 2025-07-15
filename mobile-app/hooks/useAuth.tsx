import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient as api } from '@/lib/api';
import { storage } from '@/lib/storage';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  emailVerified: boolean;
  preferences: {
    notifications: boolean;
    newsletter: boolean;
    theme: 'light' | 'dark' | 'system';
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isRefreshing: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string, acceptTerms: boolean, newsletter?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await storage.getAccessToken();
      if (token) {
        const response = await api.getProfile();
        setUser(response.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await storage.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceInfo = async () => {
    if (Platform.OS === 'web') {
      return `Web - ${navigator.userAgent.split(' ')[0]}`;
    } else {
      const deviceId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${Platform.OS}-${Platform.Version}-${Date.now()}`
      );
      return `${Platform.OS} - ${deviceId.substring(0, 8)}`;
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    const deviceInfo = await getDeviceInfo();
    const response = await api.login(email, password, rememberMe, deviceInfo);
    const { user, accessToken, refreshToken } = response;
    
    // Store tokens based on platform
    if (Platform.OS === 'web') {
      // For web, the refresh token is stored in HttpOnly cookie by the server
      await storage.setTokens(accessToken, refreshToken);
    } else {
      // For mobile, store in secure storage
      await storage.setTokens(accessToken, refreshToken);
    }
    
    setUser(user);
  };

  const register = async (
    name: string, 
    email: string, 
    password: string, 
    acceptTerms: boolean,
    newsletter: boolean = false
  ) => {
    const deviceInfo = await getDeviceInfo();
    const response = await api.register(name, email, password, acceptTerms, newsletter, deviceInfo);
    const { user, accessToken, refreshToken } = response;
    
    // Store tokens based on platform
    if (Platform.OS === 'web') {
      await storage.setTokens(accessToken, refreshToken);
    } else {
      await storage.setTokens(accessToken, refreshToken);
    }
    
    setUser(user);
  };

  const logout = async () => {
    try {
      // Revoke refresh token on server
      const refreshTokenValue = await storage.getRefreshToken();
      if (refreshTokenValue) {
        await api.revokeRefreshToken(refreshTokenValue);
      }
    } catch (error) {
      console.error('Failed to revoke token:', error);
    } finally {
      // Clear local storage regardless of server response
      await storage.clearTokens();
      setUser(null);
      
      // Clear any saved credentials for biometric auth
      if (user?.email) {
        await storage.remove(`password_${user.email}`);
      }
      
      router.replace('/(auth)/login');
    }
  };

  const refreshToken = async () => {
    if (isRefreshing) return; // Prevent multiple refresh attempts
    
    try {
      setIsRefreshing(true);
      const refreshTokenValue = await storage.getRefreshToken();
      
      if (!refreshTokenValue) {
        throw new Error('No refresh token');
      }

      const response = await api.refreshToken(refreshTokenValue);
      const { accessToken, refreshToken: newRefreshToken } = response;
      
      await storage.setTokens(accessToken, newRefreshToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await api.updateProfile(data);
      setUser(response.user);
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isRefreshing,
      login, 
      register, 
      logout, 
      refreshToken,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}