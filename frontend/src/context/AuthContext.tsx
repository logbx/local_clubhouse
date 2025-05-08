import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/api';
import { User } from '../types/user';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  setUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update localStorage when user changes
  useEffect(() => {
    if (user) {
      console.log('Updating user in localStorage:', user);
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  // Login user
  const login = async (email: string, password: string) => {
    if (isLoading) {
      throw new Error('Login already in progress');
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login({ email, password });
      
      if (!response.token || !response.user) {
        throw new Error('Invalid login response');
      }
      
      const { token, user: userData } = response;
      
      setToken(token);
      setUser(userData);
      localStorage.setItem('accessToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  };

  // Clear error message
  const clearError = () => setError(null);

  // Update user data
  const updateUser = (userData: Partial<User> | User) => {
    setUser(prev => {
      if (!prev && !('id' in userData)) return null;
      const updated = {
        ...(prev || {}),
        ...userData,
        roles: Array.isArray(userData.roles) ? userData.roles : (prev?.roles || []),
        profileCompleted: userData.profileCompleted ?? prev?.profileCompleted ?? false
      } as User;
      console.log('Updating user in context:', updated);
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
    error,
    clearError,
    setUser: updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 