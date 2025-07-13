import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { performanceMonitor } from './monitoring/performance';
import type { 
  ApiResponse, 
  User, 
  Club, 
  Event, 
  Tournament, 
  PaginationQuery,
  ClubSearchFilters,
  EventSearchFilters,
  TournamentSearchFilters,
  CreateClubForm,
  CreateEventForm,
  CreateTournamentForm,
  LoginCredentials,
  RegisterData,
  AuthResponse
} from '../../shared/types';

// API Configuration based on existing backend structure
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const REQUEST_TIMEOUT = 30000;

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  cache?: boolean;
  queueIfOffline?: boolean;
}

interface QueuedRequest {
  id: string;
  url: string;
  config: RequestConfig;
  timestamp: number;
  retryCount: number;
}

class LocalClubhouseAPIClient {
  private baseURL: string;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private requestQueue: QueuedRequest[] = [];
  private isOnline: boolean = true;
  private retryQueue: Map<string, NodeJS.Timeout> = new Map();

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.loadStoredTokens();
    this.setupNetworkListener();
  }

  private async loadStoredTokens() {
    try {
      const [token, refresh] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('refresh_token'),
      ]);
      this.authToken = token;
      this.refreshToken = refresh;
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
    }
  }

  private setupNetworkListener() {
    if (Platform.OS === 'web') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
      this.isOnline = navigator.onLine;
    }
    // For React Native, NetInfo would be handled in the monitoring service
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  private async refreshAuthToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.refreshToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.authToken = data.token;
        this.refreshToken = data.refreshToken || this.refreshToken;
        
        await Promise.all([
          AsyncStorage.setItem('auth_token', this.authToken),
          AsyncStorage.setItem('refresh_token', this.refreshToken),
        ]);

        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    // Clear invalid tokens
    this.authToken = null;
    this.refreshToken = null;
    await Promise.all([
      AsyncStorage.removeItem('auth_token'),
      AsyncStorage.removeItem('refresh_token'),
    ]);

    return false;
  }

  private async makeRequest<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const {
      method = 'GET',
      body,
      timeout = REQUEST_TIMEOUT,
      cache = false,
      queueIfOffline = false,
    } = config;

    // Check if offline and should queue
    if (!this.isOnline && queueIfOffline) {
      return this.queueRequest(endpoint, config);
    }

    // Performance monitoring
    const perfId = performanceMonitor.startNetworkRequest(url, method);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const requestConfig: RequestInit = {
        method,
        headers: {
          ...this.getAuthHeaders(),
          ...config.headers,
        },
        signal: controller.signal,
      };

      if (body && method !== 'GET') {
        if (body instanceof FormData) {
          // Remove Content-Type for FormData (browser will set it with boundary)
          delete requestConfig.headers!['Content-Type'];
          requestConfig.body = body;
        } else {
          requestConfig.body = JSON.stringify(body);
        }
      }

      const response = await fetch(url, requestConfig);
      clearTimeout(timeoutId);

      // Handle 401 - token expired
      if (response.status === 401 && this.authToken) {
        const refreshed = await this.refreshAuthToken();
        if (refreshed) {
          // Retry with new token
          return this.makeRequest(endpoint, config);
        } else {
          // Redirect to login or emit auth error event
          throw new Error('Authentication failed');
        }
      }

      const responseData = await response.json();

      if (!response.ok) {
        performanceMonitor.endNetworkRequest(
          url,
          method,
          response.status,
          undefined,
          responseData.message || `HTTP ${response.status}`
        );
        throw new Error(responseData.message || `HTTP ${response.status}`);
      }

      performanceMonitor.endNetworkRequest(
        url,
        method,
        response.status,
        JSON.stringify(responseData).length
      );

      return responseData;
    } catch (error: any) {
      performanceMonitor.endNetworkRequest(
        url,
        method,
        0,
        undefined,
        error.message
      );

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  private async queueRequest<T>(
    endpoint: string,
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    const requestId = `${Date.now()}_${Math.random()}`;
    const queuedRequest: QueuedRequest = {
      id: requestId,
      url: endpoint,
      config,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.requestQueue.push(queuedRequest);
    
    // Return a pending response
    return {
      success: false,
      message: 'Request queued for when connection is restored',
    };
  }

  private async processQueue() {
    if (!this.isOnline || this.requestQueue.length === 0) return;

    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const request of queue) {
      try {
        await this.makeRequest(request.url, request.config);
      } catch (error) {
        // Re-queue failed requests with exponential backoff
        if (request.retryCount < 3) {
          request.retryCount++;
          const delay = Math.pow(2, request.retryCount) * 1000;
          
          const timeoutId = setTimeout(() => {
            this.requestQueue.push(request);
            this.retryQueue.delete(request.id);
            this.processQueue();
          }, delay);
          
          this.retryQueue.set(request.id, timeoutId);
        }
      }
    }
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: credentials,
    });

    if (response.success && response.data) {
      this.authToken = response.data.token;
      this.refreshToken = response.data.refreshToken || null;
      
      await Promise.all([
        AsyncStorage.setItem('auth_token', this.authToken),
        this.refreshToken && AsyncStorage.setItem('refresh_token', this.refreshToken),
      ]);
    }

    return response.data!;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: data,
    });

    if (response.success && response.data) {
      this.authToken = response.data.token;
      this.refreshToken = response.data.refreshToken || null;
      
      await Promise.all([
        AsyncStorage.setItem('auth_token', this.authToken),
        this.refreshToken && AsyncStorage.setItem('refresh_token', this.refreshToken),
      ]);
    }

    return response.data!;
  }

  async logout(): Promise<void> {
    this.authToken = null;
    this.refreshToken = null;
    
    await Promise.all([
      AsyncStorage.removeItem('auth_token'),
      AsyncStorage.removeItem('refresh_token'),
    ]);
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.makeRequest<User>('/auth/profile');
    return response.data!;
  }

  // Club endpoints (matching existing backend structure)
  async getClubs(query: PaginationQuery & ClubSearchFilters = {}): Promise<ApiResponse<Club[]>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    return this.makeRequest<Club[]>(`/clubs?${params.toString()}`);
  }

  async getClub(username: string): Promise<Club> {
    const response = await this.makeRequest<Club>(`/clubs/${username}`);
    return response.data!;
  }

  async createClub(clubData: CreateClubForm): Promise<Club> {
    const response = await this.makeRequest<Club>('/clubs', {
      method: 'POST',
      body: clubData,
      queueIfOffline: true,
    });
    return response.data!;
  }

  async updateClub(clubId: string, updates: Partial<CreateClubForm>): Promise<Club> {
    const response = await this.makeRequest<Club>(`/clubs/${clubId}`, {
      method: 'PUT',
      body: updates,
      queueIfOffline: true,
    });
    return response.data!;
  }

  async joinClub(username: string): Promise<void> {
    await this.makeRequest(`/clubs/${username}/join`, {
      method: 'POST',
      queueIfOffline: true,
    });
  }

  async leaveClub(username: string): Promise<void> {
    await this.makeRequest(`/clubs/${username}/leave`, {
      method: 'POST',
      queueIfOffline: true,
    });
  }

  async getClubMembers(username: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>(`/clubs/${username}/members`);
  }

  async getMyClubs(): Promise<ApiResponse<Club[]>> {
    return this.makeRequest<Club[]>('/clubs/my-clubs');
  }

  // Event endpoints
  async getEvents(query: PaginationQuery & EventSearchFilters = {}): Promise<ApiResponse<Event[]>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    return this.makeRequest<Event[]>(`/events?${params.toString()}`);
  }

  async getEvent(eventId: string): Promise<Event> {
    const response = await this.makeRequest<Event>(`/events/${eventId}`);
    return response.data!;
  }

  async createEvent(eventData: CreateEventForm): Promise<Event> {
    const response = await this.makeRequest<Event>('/events', {
      method: 'POST',
      body: eventData,
      queueIfOffline: true,
    });
    return response.data!;
  }

  async updateEvent(eventId: string, updates: Partial<CreateEventForm>): Promise<Event> {
    const response = await this.makeRequest<Event>(`/events/${eventId}`, {
      method: 'PUT',
      body: updates,
      queueIfOffline: true,
    });
    return response.data!;
  }

  async rsvpToEvent(eventId: string, status: 'going' | 'maybe' | 'not_going'): Promise<void> {
    await this.makeRequest(`/events/${eventId}/rsvp`, {
      method: 'POST',
      body: { status },
      queueIfOffline: true,
    });
  }

  async getEventAttendees(eventId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>(`/events/${eventId}/attendees`);
  }

  // Tournament endpoints
  async getTournaments(query: PaginationQuery & TournamentSearchFilters = {}): Promise<ApiResponse<Tournament[]>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    return this.makeRequest<Tournament[]>(`/tournaments?${params.toString()}`);
  }

  async getTournament(tournamentId: string): Promise<Tournament> {
    const response = await this.makeRequest<Tournament>(`/tournaments/${tournamentId}`);
    return response.data!;
  }

  async createTournament(tournamentData: CreateTournamentForm): Promise<Tournament> {
    const response = await this.makeRequest<Tournament>('/tournaments', {
      method: 'POST',
      body: tournamentData,
      queueIfOffline: true,
    });
    return response.data!;
  }

  async joinTournament(tournamentId: string): Promise<void> {
    await this.makeRequest(`/tournaments/${tournamentId}/players`, {
      method: 'POST',
      queueIfOffline: true,
    });
  }

  async getTournamentMatches(tournamentId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>(`/tournaments/${tournamentId}/matches`);
  }

  async submitMatchResult(tournamentId: string, matchId: string, result: any): Promise<void> {
    await this.makeRequest(`/tournaments/${tournamentId}/matches/${matchId}/result`, {
      method: 'POST',
      body: result,
      queueIfOffline: true,
    });
  }

  // Chat endpoints
  async getClubChat(username: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>(`/clubs/${username}/chat`);
  }

  async sendClubMessage(username: string, message: string): Promise<void> {
    await this.makeRequest(`/clubs/${username}/chat`, {
      method: 'POST',
      body: { message },
      queueIfOffline: true,
    });
  }

  // Upload endpoints
  async uploadImage(formData: FormData, type: string = 'general'): Promise<any> {
    formData.append('type', type);
    
    const response = await this.makeRequest('/upload/image', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set content-type for FormData
    });
    
    return response.data!;
  }

  // Search endpoints
  async search(query: string, type?: 'clubs' | 'events' | 'tournaments'): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    
    return this.makeRequest(`/search?${params.toString()}`);
  }

  // Location-based endpoints
  async getNearbyClubs(latitude: number, longitude: number, radius: number = 25): Promise<ApiResponse<Club[]>> {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
      radius: radius.toString(),
    });
    
    return this.makeRequest<Club[]>(`/clubs/nearby?${params.toString()}`);
  }

  async getNearbyEvents(latitude: number, longitude: number, radius: number = 25): Promise<ApiResponse<Event[]>> {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
      radius: radius.toString(),
    });
    
    return this.makeRequest<Event[]>(`/events/nearby?${params.toString()}`);
  }

  // Admin/moderation endpoints
  async reportContent(type: 'club' | 'event' | 'user' | 'message', id: string, reason: string): Promise<void> {
    await this.makeRequest('/reports', {
      method: 'POST',
      body: { type, id, reason },
      queueIfOffline: true,
    });
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  getQueueSize(): number {
    return this.requestQueue.length;
  }

  clearQueue(): void {
    this.requestQueue = [];
    this.retryQueue.forEach(timeout => clearTimeout(timeout));
    this.retryQueue.clear();
  }

  setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
    if (isOnline) {
      this.processQueue();
    }
  }
}

export const localClubhouseAPI = new LocalClubhouseAPIClient();
export default localClubhouseAPI;