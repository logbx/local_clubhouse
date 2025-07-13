import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, dbUtils } from './db';
import { offlineQueue, apiCache } from './db/schema';
import { eq, and, lt, desc, asc } from 'drizzle-orm';
import type { 
  RequestOptions, 
  QueuedRequest, 
  UploadProgress, 
  UploadOptions,
  ApiError,
  PaginatedResponse 
} from './db/types';

// Constants
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

class APIClient {
  private queue: Map<string, QueuedRequest> = new Map();
  private isOnline = true;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.initializeNetworkListener();
    this.loadAuthTokens();
    this.processQueuePeriodically();
  }

  private async initializeNetworkListener() {
    if (Platform.OS !== 'web') {
      // Listen to network state changes
      NetInfo.addEventListener(state => {
        const wasOffline = !this.isOnline;
        this.isOnline = state.isConnected ?? false;
        
        if (wasOffline && this.isOnline) {
          console.log('📶 Network reconnected, processing offline queue');
          this.processOfflineQueue();
        }
      });

      // Get initial network state
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected ?? false;
    } else {
      // For web, listen to online/offline events
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processOfflineQueue();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
      
      this.isOnline = navigator.onLine;
    }
  }

  private async loadAuthTokens() {
    try {
      if (Platform.OS === 'web') {
        this.authToken = localStorage.getItem('auth_token');
        this.refreshToken = localStorage.getItem('refresh_token');
      } else {
        this.authToken = await AsyncStorage.getItem('auth_token');
        this.refreshToken = await AsyncStorage.getItem('refresh_token');
      }
    } catch (error) {
      console.error('Failed to load auth tokens:', error);
    }
  }

  private async saveAuthTokens(token: string, refresh: string) {
    this.authToken = token;
    this.refreshToken = refresh;
    
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refresh);
      } else {
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('refresh_token', refresh);
      }
    } catch (error) {
      console.error('Failed to save auth tokens:', error);
    }
  }

  private async clearAuthTokens() {
    this.authToken = null;
    this.refreshToken = null;
    
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
      } else {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('refresh_token');
      }
    } catch (error) {
      console.error('Failed to clear auth tokens:', error);
    }
  }

  private async refreshAuthToken(): Promise<string> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      this.isRefreshing = false;
      this.refreshPromise = null;
      return newToken;
    } catch (error) {
      this.isRefreshing = false;
      this.refreshPromise = null;
      throw error;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      await this.clearAuthTokens();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    await this.saveAuthTokens(data.token, data.refreshToken);
    return data.token;
  }

  private generateCacheKey(path: string, options?: RequestOptions): string {
    const method = options?.method || 'GET';
    const params = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${path}:${params}`;
  }

  async login(email: string, password: string, rememberMe?: boolean, deviceInfo?: string) {
    const { data } = await this.client.post('/auth/login', { 
      email, 
      password, 
      rememberMe,
      deviceInfo 
    });
    return data;
  }

  async register(name: string, email: string, password: string, acceptTerms: boolean, newsletter?: boolean, deviceInfo?: string) {
    const { data } = await this.client.post('/auth/register', { 
      name, 
      email, 
      password, 
      acceptTerms,
      newsletter,
      deviceInfo 
    });
    return data;
  }

  async refreshToken(refreshToken?: string) {
    const { data } = await this.client.post('/auth/refresh', { refreshToken });
    return data;
  }

  async revokeRefreshToken(refreshToken: string) {
    const { data } = await this.client.delete('/auth/refresh', { data: { refreshToken } });
    return data;
  }

  async getProfile() {
    const { data } = await this.client.get('/auth/profile');
    return data;
  }

  async updateProfile(profileData: any) {
    const { data } = await this.client.put('/auth/profile', profileData);
    return data;
  }

  async getUserClubs() {
    const { data } = await this.client.get('/clubs/user');
    return data;
  }

  async getClub(username: string) {
    const { data } = await this.client.get(`/clubs/${username}`);
    return data;
  }

  async joinClub(username: string) {
    const { data } = await this.client.post(`/clubs/${username}/join`);
    return data;
  }

  async getUpcomingEvents() {
    const { data } = await this.client.get('/events/upcoming');
    return data;
  }

  async getEvent(id: string) {
    const { data } = await this.client.get(`/events/${id}`);
    return data;
  }

  async rsvpEvent(id: string, status: 'going' | 'maybe' | 'not_going') {
    const { data } = await this.client.post(`/events/${id}/rsvp`, { status });
    return data;
  }

  async getTournaments() {
    const { data } = await this.client.get('/tournaments');
    return data;
  }

  async getTournament(id: string) {
    const { data } = await this.client.get(`/tournaments/${id}`);
    return data;
  }

  // Club methods
  async getClubs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sortBy?: string;
    location?: string;
  }) {
    const { data } = await this.client.get('/clubs', { params });
    return data;
  }

  async getClub(username: string) {
    const { data } = await this.client.get(`/clubs/${username}`);
    return data;
  }

  async createClub(clubData: any) {
    const { data } = await this.client.post('/clubs', clubData);
    return data;
  }

  async updateClub(username: string, clubData: any) {
    const { data } = await this.client.put(`/clubs/${username}`, clubData);
    return data;
  }

  async deleteClub(username: string) {
    const { data } = await this.client.delete(`/clubs/${username}`);
    return data;
  }

  async joinClub(username: string) {
    const { data } = await this.client.post(`/clubs/${username}/join`);
    return data;
  }

  async getClubMembers(username: string, params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }) {
    const { data } = await this.client.get(`/clubs/${username}/members`, { params });
    return data;
  }

  async addClubMember(username: string, memberData: { email: string; role?: string }) {
    const { data } = await this.client.post(`/clubs/${username}/members`, memberData);
    return data;
  }

  async updateClubMember(username: string, memberId: string, memberData: { role: string }) {
    const { data } = await this.client.put(`/clubs/${username}/members?memberId=${memberId}`, memberData);
    return data;
  }

  async removeClubMember(username: string, memberId: string) {
    const { data } = await this.client.delete(`/clubs/${username}/members?memberId=${memberId}`);
    return data;
  }

  async getClubMessages(username: string, params?: {
    page?: number;
    limit?: number;
    before?: string;
    search?: string;
  }) {
    const { data } = await this.client.get(`/clubs/${username}/chat`, { params });
    return data;
  }

  async sendClubMessage(username: string, messageData: {
    content: string;
    replyTo?: string;
    mentions?: string[];
  }) {
    const { data } = await this.client.post(`/clubs/${username}/chat`, messageData);
    return data;
  }

  async editClubMessage(username: string, messageId: string, content: string) {
    const { data } = await this.client.put(`/clubs/${username}/chat?messageId=${messageId}`, { content });
    return data;
  }

  async deleteClubMessage(username: string, messageId: string) {
    const { data } = await this.client.delete(`/clubs/${username}/chat?messageId=${messageId}`);
    return data;
  }

  async uploadImage(uri: string, type: 'avatar' | 'club' | 'event') {
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('image', blob, 'image.jpg');
    } else {
      formData.append('image', {
        uri,
        type: 'image/jpeg',
        name: 'image.jpg',
      } as any);
    }
    
    formData.append('type', type);

    const { data } = await this.client.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  }
}

export const api = new ApiClient();