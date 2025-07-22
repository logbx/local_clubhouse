// Mobile-focused API client without server dependencies
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from './storage';

// Types
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Constants
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

// Create timeout signal compatible with React Native
const createTimeoutSignal = (timeout: number): AbortSignal => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller.signal;
};

class MobileAPIClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private isOnline: boolean = true;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': `LocalClubhouse-Mobile/${Platform.OS}`,
    };

    // Listen for network changes
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
    });
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await storage.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = DEFAULT_TIMEOUT,
      retries = MAX_RETRY_ATTEMPTS,
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const authHeaders = await this.getAuthHeaders();
    
    const requestHeaders = {
      ...this.defaultHeaders,
      ...authHeaders,
      ...headers,
    };

    const config: RequestInit = {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: createTimeoutSignal(timeout),
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          const error = await this.handleErrorResponse(response);
          throw error;
        }

        const data = await response.json();
        return data;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => 
          setTimeout(resolve, RETRY_DELAY_BASE * Math.pow(2, attempt))
        );
      }
    }

    throw new Error('Max retry attempts reached');
  }

  private async handleErrorResponse(response: Response): Promise<ApiError> {
    let errorData: any;
    
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    const error = new Error(errorData.message || 'Request failed') as ApiError;
    error.status = response.status;
    error.code = errorData.code;
    error.details = errorData.details;

    return error;
  }

  // Public API methods
  async get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'POST', body: data });
  }

  async put<T>(endpoint: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PUT', body: data });
  }

  async patch<T>(endpoint: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PATCH', body: data });
  }

  async delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Upload method for file uploads
  async upload<T>(endpoint: string, file: File | Blob, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const authHeaders = await this.getAuthHeaders();
    
    const config: RequestInit = {
      method: 'POST',
      headers: authHeaders,
      body: formData,
      signal: createTimeoutSignal(options?.timeout || DEFAULT_TIMEOUT * 2),
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await this.handleErrorResponse(response);
      throw error;
    }

    return response.json();
  }

  // Utility methods
  isNetworkAvailable(): boolean {
    return this.isOnline;
  }

  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  // Club-related methods
  async getClubs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sortBy?: string;
  }): Promise<PaginatedResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    
    const query = queryParams.toString();
    return this.get(`/clubs${query ? `?${query}` : ''}`);
  }

  async getClub(username: string): Promise<any> {
    return this.get(`/clubs/${username}`);
  }

  async createClub(data: any): Promise<any> {
    return this.post('/clubs', data);
  }

  async updateClub(username: string, data: any): Promise<any> {
    return this.put(`/clubs/${username}`, data);
  }

  async deleteClub(username: string): Promise<any> {
    return this.delete(`/clubs/${username}`);
  }

  async joinClub(username: string): Promise<any> {
    return this.post(`/clubs/${username}/join`);
  }

  async leaveClub(username: string): Promise<any> {
    return this.post(`/clubs/${username}/leave`);
  }

  // Event-related methods
  async getEvents(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    clubId?: string;
  }): Promise<PaginatedResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.clubId) queryParams.append('clubId', params.clubId);
    
    const query = queryParams.toString();
    return this.get(`/events${query ? `?${query}` : ''}`);
  }

  async getEvent(id: string): Promise<any> {
    return this.get(`/events/${id}`);
  }

  async createEvent(data: any): Promise<any> {
    return this.post('/events', data);
  }

  async updateEvent(id: string, data: any): Promise<any> {
    return this.put(`/events/${id}`, data);
  }

  async deleteEvent(id: string): Promise<any> {
    return this.delete(`/events/${id}`);
  }

  async rsvpEvent(id: string, status: string): Promise<any> {
    return this.post(`/events/${id}/rsvp`, { status });
  }

  // Tournament-related methods
  async getTournaments(params?: {
    page?: number;
    limit?: number;
    status?: string;
    eventId?: string;
  }): Promise<PaginatedResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.eventId) queryParams.append('eventId', params.eventId);
    
    const query = queryParams.toString();
    return this.get(`/tournaments${query ? `?${query}` : ''}`);
  }

  async getTournament(id: string): Promise<any> {
    return this.get(`/tournaments/${id}`);
  }

  async createTournament(data: any): Promise<any> {
    return this.post('/tournaments', data);
  }

  async updateTournament(id: string, data: any): Promise<any> {
    return this.put(`/tournaments/${id}`, data);
  }

  async deleteTournament(id: string): Promise<any> {
    return this.delete(`/tournaments/${id}`);
  }

  async registerForTournament(id: string): Promise<any> {
    return this.post(`/tournaments/${id}/register`);
  }

  async startTournament(id: string): Promise<any> {
    return this.post(`/tournaments/${id}/start`);
  }

  async submitMatchResult(tournamentId: string, matchId: string, data: any): Promise<any> {
    return this.post(`/tournaments/${tournamentId}/matches/${matchId}/result`, data);
  }

  // Auth-related methods
  async login(credentials: { email: string; password: string }): Promise<any> {
    // Convert email to identifier for backend compatibility
    return this.post('/auth/login', {
      identifier: credentials.email,
      password: credentials.password
    });
  }

  async register(data: any): Promise<any> {
    return this.post('/auth/register', data);
  }

  async logout(): Promise<any> {
    return this.post('/auth/logout');
  }

  async refreshToken(): Promise<any> {
    return this.post('/auth/refresh');
  }

  async getProfile(): Promise<any> {
    return this.get('/auth/profile');
  }

  async updateProfile(data: any): Promise<any> {
    return this.put('/auth/profile', data);
  }

  async forgotPassword(email: string): Promise<any> {
    return this.post('/auth/forgot-password', { email });
  }

  async checkUserType(email: string): Promise<any> {
    return this.post('/auth/check-user-type', { email });
  }

  async resetPassword(token: string, password: string): Promise<any> {
    return this.post('/auth/reset-password', { token, password });
  }

  async loginWithFirebase(data: { idToken: string; authUser: any }): Promise<any> {
    return this.post('/auth/firebase-login', data);
  }

  async registerWithFirebaseEmail(data: { idToken: string; authUser: any; userData: any }): Promise<any> {
    return this.post('/auth/firebase-email-register', data);
  }

  // User-related methods
  async getUser(id: string): Promise<any> {
    return this.get(`/users/${id}`);
  }

  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const query = queryParams.toString();
    return this.get(`/users${query ? `?${query}` : ''}`);
  }

  async searchUsers(query: string): Promise<any[]> {
    return this.get(`/users/search?q=${encodeURIComponent(query)}`);
  }

  // Friend-related methods
  async getFriends(): Promise<any[]> {
    return this.get('/friends');
  }

  async sendFriendRequest(userId: string): Promise<any> {
    return this.post('/friends/request', { userId });
  }

  async acceptFriendRequest(requestId: string): Promise<any> {
    return this.post(`/friends/request/${requestId}/accept`);
  }

  async rejectFriendRequest(requestId: string): Promise<any> {
    return this.post(`/friends/request/${requestId}/reject`);
  }

  async removeFriend(userId: string): Promise<any> {
    return this.delete(`/friends/${userId}`);
  }

  // Message-related methods
  async getMessages(conversationId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return this.get(`/messages/${conversationId}${query ? `?${query}` : ''}`);
  }

  async sendMessage(conversationId: string, content: string): Promise<any> {
    return this.post(`/messages/${conversationId}`, { content });
  }

  async markMessageAsRead(messageId: string): Promise<any> {
    return this.put(`/messages/${messageId}/read`);
  }

  // Notification-related methods
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<PaginatedResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.unreadOnly) queryParams.append('unreadOnly', params.unreadOnly.toString());
    
    const query = queryParams.toString();
    return this.get(`/notifications${query ? `?${query}` : ''}`);
  }

  async markNotificationAsRead(id: string): Promise<any> {
    return this.put(`/notifications/${id}/read`);
  }

  async markAllNotificationsAsRead(): Promise<any> {
    return this.put('/notifications/read-all');
  }

  // Additional methods for specific use cases
  async getUserClubs(): Promise<any[]> {
    return this.get('/clubs/user');
  }

  async getUpcomingEvents(): Promise<any[]> {
    return this.get('/events/upcoming');
  }

  // Event-related methods
  async getEvents(): Promise<any[]> {
    return this.get('/events');
  }

  async getEvent(id: string): Promise<any> {
    return this.get(`/events/${id}`);
  }

  async createEvent(data: any): Promise<any> {
    return this.post('/events', data);
  }

  async updateEvent(id: string, data: any): Promise<any> {
    return this.put(`/events/${id}`, data);
  }

  async deleteEvent(id: string): Promise<any> {
    return this.delete(`/events/${id}`);
  }

  async toggleRsvp(eventId: string): Promise<any> {
    return this.post(`/events/${eventId}/rsvp`);
  }
}

export const api = new MobileAPIClient();