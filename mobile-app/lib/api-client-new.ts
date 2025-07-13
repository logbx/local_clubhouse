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
      NetInfo.addEventListener(state => {
        const wasOffline = !this.isOnline;
        this.isOnline = state.isConnected ?? false;
        
        if (wasOffline && this.isOnline) {
          console.log('📶 Network reconnected, processing offline queue');
          this.processOfflineQueue();
        }
      });

      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected ?? false;
    } else {
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

  private async getCachedResponse(cacheKey: string): Promise<any | null> {
    try {
      const database = await dbUtils.waitForDB();
      const cached = await database
        .select()
        .from(apiCache)
        .where(eq(apiCache.id, cacheKey))
        .limit(1);

      if (cached.length === 0) return null;

      const item = cached[0];
      const now = Date.now();
      
      if (item.expiresAt && now > item.expiresAt) {
        await database
          .delete(apiCache)
          .where(eq(apiCache.id, cacheKey));
        return null;
      }

      await database
        .update(apiCache)
        .set({ accessedAt: now })
        .where(eq(apiCache.id, cacheKey));

      return JSON.parse(item.response);
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  private async setCachedResponse(
    cacheKey: string, 
    path: string, 
    response: any, 
    options?: RequestOptions
  ): Promise<void> {
    try {
      const database = await dbUtils.waitForDB();
      const now = Date.now();
      const timeout = options?.cacheTimeout || CACHE_TIMEOUT;
      
      await database
        .insert(apiCache)
        .values({
          id: cacheKey,
          endpoint: path,
          method: options?.method || 'GET',
          params: options?.body ? JSON.stringify(options.body) : null,
          response: JSON.stringify(response),
          headers: options?.headers ? JSON.stringify(options.headers) : null,
          expiresAt: now + timeout,
          createdAt: now,
          accessedAt: now,
        })
        .onConflictDoUpdate({
          target: apiCache.id,
          set: {
            response: JSON.stringify(response),
            expiresAt: now + timeout,
            accessedAt: now,
          },
        });
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  private async queueRequest(path: string, options: RequestOptions): Promise<any> {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const database = await dbUtils.waitForDB();
    
    try {
      await database
        .insert(offlineQueue)
        .values({
          id,
          operation: options.method === 'POST' ? 'create' : 
                   options.method === 'PUT' || options.method === 'PATCH' ? 'update' : 
                   options.method === 'DELETE' ? 'delete' : 'create',
          tableName: this.extractTableFromPath(path),
          recordId: this.extractIdFromPath(path) || id,
          data: options.body ? JSON.stringify(options.body) : null,
          endpoint: path,
          method: options.method || 'GET',
          headers: JSON.stringify(options.headers || {}),
          retryCount: 0,
          maxRetries: options.retries || MAX_RETRY_ATTEMPTS,
          priority: options.priority || 0,
          createdAt: Date.now(),
        });

      console.log(`📥 Queued request: ${options.method || 'GET'} ${path}`);
      
      return new Promise((resolve, reject) => {
        this.queue.set(id, {
          id,
          endpoint: path,
          options,
          timestamp: Date.now(),
          retryCount: 0,
          resolve,
          reject,
        });
      });
    } catch (error) {
      console.error('Failed to queue request:', error);
      throw error;
    }
  }

  private extractTableFromPath(path: string): string {
    const segments = path.split('/').filter(Boolean);
    return segments[0] || 'unknown';
  }

  private extractIdFromPath(path: string): string | null {
    const segments = path.split('/').filter(Boolean);
    if (segments.length >= 2 && !isNaN(Number(segments[1]))) {
      return segments[1];
    }
    return null;
  }

  private async processOfflineQueue(): Promise<void> {
    if (!this.isOnline) return;

    try {
      const database = await dbUtils.waitForDB();
      const queuedItems = await database
        .select()
        .from(offlineQueue)
        .orderBy(desc(offlineQueue.priority), asc(offlineQueue.createdAt));

      console.log(`📤 Processing ${queuedItems.length} queued requests`);

      for (const item of queuedItems) {
        try {
          const headers = item.headers ? JSON.parse(item.headers) : {};
          const body = item.data ? JSON.parse(item.data) : undefined;

          const response = await this.performRequest(item.endpoint, {
            method: item.method as any,
            headers,
            body,
          });

          await database
            .delete(offlineQueue)
            .where(eq(offlineQueue.id, item.id));

          const queuedRequest = this.queue.get(item.id);
          if (queuedRequest) {
            queuedRequest.resolve(response);
            this.queue.delete(item.id);
          }

          console.log(`✅ Processed queued request: ${item.method} ${item.endpoint}`);
        } catch (error) {
          await this.handleQueueItemError(item, error);
        }
      }
    } catch (error) {
      console.error('Failed to process offline queue:', error);
    }
  }

  private async handleQueueItemError(item: any, error: any): Promise<void> {
    const database = await dbUtils.waitForDB();
    const newRetryCount = item.retryCount + 1;

    if (newRetryCount >= item.maxRetries) {
      await database
        .delete(offlineQueue)
        .where(eq(offlineQueue.id, item.id));

      const queuedRequest = this.queue.get(item.id);
      if (queuedRequest) {
        queuedRequest.reject(error);
        this.queue.delete(item.id);
      }

      console.error(`❌ Failed to process queued request after ${item.maxRetries} attempts:`, error);
    } else {
      const delay = RETRY_DELAY_BASE * Math.pow(2, newRetryCount);
      
      await database
        .update(offlineQueue)
        .set({
          retryCount: newRetryCount,
          lastAttemptAt: Date.now(),
          scheduledFor: Date.now() + delay,
          errorMessage: error.message,
        })
        .where(eq(offlineQueue.id, item.id));

      console.warn(`⚠️ Retrying queued request in ${delay}ms (attempt ${newRetryCount}/${item.maxRetries})`);
    }
  }

  private processQueuePeriodically(): void {
    setInterval(() => {
      if (this.isOnline) {
        this.processOfflineQueue();
      }
    }, 30000);
  }

  private async performRequest(path: string, options: RequestOptions = {}): Promise<any> {
    const url = `${API_BASE_URL}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers,
    };

    if (options.body && options.method !== 'GET') {
      fetchOptions.body = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    if (response.status === 401 && this.refreshToken) {
      try {
        const newToken = await this.refreshAuthToken();
        headers.Authorization = `Bearer ${newToken}`;
        
        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers,
        });
        
        if (!retryResponse.ok) {
          throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
        }
        
        return retryResponse.json();
      } catch (refreshError) {
        await this.clearAuthTokens();
        throw new Error('Authentication failed');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        code: errorData.code || 'API_ERROR',
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        details: errorData.details,
      };
      throw error;
    }

    return response.json();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (options.cache !== false && (options.method || 'GET') === 'GET') {
      const cacheKey = this.generateCacheKey(path, options);
      const cached = await this.getCachedResponse(cacheKey);
      if (cached) {
        console.log(`💾 Cache hit: ${path}`);
        return cached;
      }
    }

    if (!this.isOnline && options.queueIfOffline) {
      console.log(`📱 Offline, queueing request: ${options.method || 'GET'} ${path}`);
      return this.queueRequest(path, options);
    }

    try {
      const response = await this.performRequest(path, options);

      if (options.cache !== false && (options.method || 'GET') === 'GET') {
        const cacheKey = this.generateCacheKey(path, options);
        await this.setCachedResponse(cacheKey, path, response, options);
      }

      return response;
    } catch (error) {
      if (options.queueIfOffline) {
        console.log(`⚠️ Request failed, queueing: ${options.method || 'GET'} ${path}`);
        return this.queueRequest(path, options);
      }
      throw error;
    }
  }

  // Convenience methods
  async get<T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T>(path: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body: data });
  }

  async put<T>(path: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body: data });
  }

  async delete<T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  // Upload with progress
  async upload<T>(
    path: string, 
    formData: FormData, 
    options: UploadOptions & Omit<RequestOptions, 'body'> = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${path}`;
    const headers: Record<string, string> = { ...options.headers };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    delete headers['Content-Type'];

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          };
          options.onProgress?.(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            options.onComplete?.(response);
            resolve(response);
          } catch (error) {
            options.onError?.(error as Error);
            reject(error);
          }
        } else {
          const error = new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`);
          options.onError?.(error);
          reject(error);
        }
      });

      xhr.addEventListener('error', () => {
        const error = new Error('Upload failed');
        options.onError?.(error);
        reject(error);
      });

      xhr.open('POST', url);

      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(formData);
    });
  }

  // Legacy method compatibility
  async login(email: string, password: string, rememberMe?: boolean, deviceInfo?: string) {
    const response = await this.post('/auth/login', { 
      email, 
      password, 
      rememberMe,
      deviceInfo 
    });
    
    if (response.accessToken && response.refreshToken) {
      await this.saveAuthTokens(response.accessToken, response.refreshToken);
    }
    
    return response;
  }

  async register(name: string, email: string, password: string, acceptTerms: boolean, newsletter?: boolean, deviceInfo?: string) {
    return this.post('/auth/register', { 
      name, 
      email, 
      password, 
      acceptTerms,
      newsletter,
      deviceInfo 
    });
  }

  async getProfile() {
    return this.get('/auth/profile');
  }

  async updateProfile(profileData: any) {
    return this.put('/auth/profile', profileData);
  }

  async getClubs(params?: any) {
    return this.get('/clubs', { queueIfOffline: true, cache: true });
  }

  async getClub(username: string) {
    return this.get(`/clubs/${username}`, { queueIfOffline: true, cache: true });
  }

  async createClub(clubData: any) {
    return this.post('/clubs', clubData, { queueIfOffline: true });
  }

  async joinClub(username: string) {
    return this.post(`/clubs/${username}/join`, {}, { queueIfOffline: true });
  }

  async getUpcomingEvents() {
    return this.get('/events/upcoming', { queueIfOffline: true, cache: true });
  }

  async getEvent(id: string) {
    return this.get(`/events/${id}`, { queueIfOffline: true, cache: true });
  }

  async rsvpEvent(id: string, status: 'going' | 'maybe' | 'not_going') {
    return this.post(`/events/${id}/rsvp`, { status }, { queueIfOffline: true });
  }

  async getTournaments() {
    return this.get('/tournaments', { queueIfOffline: true, cache: true });
  }

  async getTournament(id: string) {
    return this.get(`/tournaments/${id}`, { queueIfOffline: true, cache: true });
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

    return this.upload('/upload/image', formData);
  }

  // Utility methods
  isOnlineStatus(): boolean {
    return this.isOnline;
  }

  getQueueSize(): number {
    return this.queue.size;
  }

  async clearCache(): Promise<void> {
    try {
      const database = await dbUtils.waitForDB();
      await database.delete(apiCache);
      console.log('🗑️ API cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

export const apiClient = new APIClient();
export const api = apiClient; // Legacy export
export default apiClient;