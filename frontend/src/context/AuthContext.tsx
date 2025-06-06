import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { User } from '../types/user';
import { webSocketService } from '../services/websocket.service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  refreshToken: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ 
  children: React.ReactNode;
  initialUser?: User | null;
}> = ({ children, initialUser }) => {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.log('No refresh token found in localStorage');
        throw new Error('No refresh token available');
      }

      console.log('Attempting to refresh token...');
      const response = await api.post('/api/auth/refresh', { refreshToken });
      console.log('Refresh token response:', response.data);
      const { accessToken, refreshToken: newRefreshToken, user: userData } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      setUser(userData);
      setError(null);
      console.log('Token refresh successful');
    } catch (err: any) {
      console.error('Token refresh failed:', err.response?.data || err.message);
      // Clear all tokens when refresh fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      throw err;
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear any existing tokens before login attempt
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Use email as identifier (could be email or username)
      const response = await api.post('/api/auth/login', { 
        identifier: email.toLowerCase(), // Convert to lowercase for case-insensitive comparison
        password 
      });
      
      console.log('Login response:', response.data);
      const { accessToken, refreshToken, user: userData } = response.data;

      console.log('User data from login:', userData);
      console.log('Profile completed status:', userData.profileCompleted);

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(userData);
      
      // Connect to WebSocket after successful login
      webSocketService.connect(accessToken);
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err.response?.data);
      setError(err.response?.data?.message || 'Login failed');
      
      // Clear any tokens on login failure
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    
    // Disconnect WebSocket on logout
    webSocketService.disconnect();
    
    navigate('/login');
  };

  const updateUser = (data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/api/auth/verify');
        setUser(response.data.user);
        
        // Connect to WebSocket if user is verified
        webSocketService.connect(accessToken);
      } catch (err: any) {
        if (err.response?.status === 401) {
          // Only attempt refresh if we have a refresh token
          const refreshTokenFromStorage = localStorage.getItem('refreshToken');
          if (refreshTokenFromStorage) {
            try {
              await refreshToken();
            } catch (refreshErr) {
              console.error('Token refresh failed during initialization:', refreshErr);
              // Clear tokens and reset state
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              setUser(null);
            }
          } else {
            // No refresh token available, just clear the invalid access token
            console.log('No refresh token available, clearing invalid access token');
            localStorage.removeItem('accessToken');
            setUser(null);
          }
        } else {
          console.error('Auth verification failed:', err);
          // For non-401 errors, clear tokens as they might be corrupted
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [refreshToken]);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    refreshToken,
    setUser,
    clearError,
    isLoading: loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 