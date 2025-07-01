import axios, { AxiosResponse, AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { endpoints } from '../config/api';
import { envConfig } from '../config/env';
import { Event, CreateEventDto, UpdateEventDto, SubGroup } from '../types/event';
import { log, LogCategory } from '../utils/logger';
import { API_BASE_URL } from '../config/api';

const baseURL = envConfig.apiUrl;

// Use logger instead of direct console.log
log.debug(LogCategory.API, 'API Configuration', {
  baseURL,
  envConfig,
  nodeEnv: process.env.NODE_ENV,
  viteMode: import.meta.env.MODE,
  viteDev: import.meta.env.DEV,
  windowLocation: window.location.href
});

export const api = axios.create({
  baseURL: 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Use logger instead of direct console.log
log.debug(LogCategory.API, 'Axios instance created', {
  baseURL: api.defaults.baseURL,
  headers: api.defaults.headers,
  timeout: api.defaults.timeout
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Use logger for request logging - only in debug mode
    log.debug(LogCategory.API, 'Making request', {
      method: config.method?.toUpperCase(),
      url: config.url,
      fullURL: `${config.baseURL}${config.url}`
    });
    
    // Add development-specific cache-busting headers
    const isDev = import.meta.env.DEV;
    if (isDev && config.headers) {
      config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      config.headers['Pragma'] = 'no-cache';
      config.headers['Expires'] = '0';
      
      // Add cache-busting parameter for POST/PUT/DELETE requests
      if (config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
        const separator = config.url?.includes('?') ? '&' : '?';
        config.url = `${config.url}${separator}_t=${Date.now()}`;
      }
    }
    
    // Don't add Authorization header for auth endpoints and public endpoints
    const publicEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/users/public/'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint));
    
    if (!isPublicEndpoint) {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        log.debug(LogCategory.API, 'Added authorization header');
      } else {
        log.warn(LogCategory.API, 'No token found for non-auth endpoint');
      }
    }
    return config;
  },
  (error: AxiosError) => {
    log.error(LogCategory.API, 'Request interceptor error', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Don't auto-refresh for auth endpoints and public endpoints
    const publicEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/users/public/'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => originalRequest.url?.includes(endpoint));
    
    if (error.response?.status === 401 && !originalRequest._retry && !isPublicEndpoint) {
      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedQueue.push({ 
            resolve: (token: unknown) => {
              if (typeof token === 'string' && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(api(originalRequest));
              } else {
                reject(new Error('Invalid token received'));
              }
            }, 
            reject 
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          log.warn(LogCategory.API, 'No refresh token available for auto-refresh');
          throw new Error('No refresh token available');
        }

        log.info(LogCategory.API, 'Auto-refreshing token');
        const response = await api.post('/api/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        log.error(LogCategory.API, 'Auto-refresh failed', refreshError);
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (data: { fullName: string; username?: string; email: string; password: string; phone?: string }) => {
    const response = await api.post(endpoints.auth.register, data);
    return response.data;
  },
  login: async (data: { email: string; password: string }) => {
    const response = await api.post(endpoints.auth.login, data);
    return response.data;
  },
  logout: async () => {
    const response = await api.post(endpoints.auth.logout);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/api/auth/verify');
    return response.data;
  },
  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/api/auth/refresh', { refreshToken });
    return response.data;
  },
  forgotPassword: async (email: string) => {
    const response = await api.post('/api/auth/forgot-password', { email });
    return response.data;
  },
  resetPasswordWithToken: async (token: string, newPassword: string) => {
    const response = await api.post('/api/auth/reset-password', { token, newPassword });
    return response.data;
  },
  resetPassword: async (email: string, newPassword: string) => {
    const response = await api.post('/api/auth/reset-password', { email, newPassword });
    return response.data;
  },
};

// User API
export const userApi = {
  getProfile: async () => {
    const response = await api.get(endpoints.user.me);
    log.debug(LogCategory.API, 'Profile fetched successfully');
    return response.data;
  },
  updateProfile: async (data: any) => {
    log.debug(LogCategory.API, 'Updating profile', { hasData: !!data });
    const response = await api.put(endpoints.user.updateProfile, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    log.debug(LogCategory.API, 'Profile updated successfully');
    return response.data;
  },
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post(endpoints.user.avatar, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Event API
export const eventApi = {
  getEvents: async () => {
    const response = await api.get(endpoints.events.list);
    log.debug(LogCategory.API, 'Events fetched', {
      isArray: Array.isArray(response.data),
      hasEvents: !!(response.data && response.data.events),
      hasData: !!(response.data && response.data.data),
      eventCount: response.data?.events?.length || response.data?.data?.length || (Array.isArray(response.data) ? response.data.length : 0)
    });
    
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray(response.data.events)) {
      return response.data.events;
    }
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  },
  getEvent: async (id: string) => {
    const response = await api.get(endpoints.events.detail(id));
    return response.data;
  },
  createEvent: async (data: any) => {
    const response = await api.post(endpoints.events.create, data);
    return response.data;
  },
  updateEvent: async (id: string, data: any) => {
    const response = await api.put(endpoints.events.update(id), data);
    return response.data;
  },
  deleteEvent: async (id: string) => {
    const response = await api.delete(endpoints.events.delete(id));
    return response.data;
  },
  publishEvent: async (id: string) => {
    const response = await api.post(endpoints.events.publish(id));
    return response.data;
  },
  rsvpEvent: async (id: string, status: 'going' | 'maybe' | 'not_going') => {
    const response = await api.post(endpoints.events.rsvp(id), { status });
    return response.data;
  },
  toggleRsvp: async (id: string) => {
    const response = await api.post(`/events/${id}/rsvp`, {});
    return response.data;
  },
};

// Friend API
export const friendApi = {
  getFriends: async () => {
    const response = await api.get(endpoints.friends.list);
    return response.data;
  },
  getFriendRequests: async () => {
    const response = await api.get(endpoints.friends.requests);
    return response.data;
  },
  sendFriendRequest: async (userId: string) => {
    const response = await api.post(endpoints.friends.request, { receiverId: userId });
    return response.data;
  },
  acceptFriendRequest: async (userId: string) => {
    log.debug(LogCategory.API, 'Accepting friend request', { userId });
    try {
      const response = await api.post(endpoints.friends.accept, { requesterId: userId });
      log.debug(LogCategory.API, 'Friend request accepted successfully');
      return response.data;
    } catch (error: any) {
      log.error(LogCategory.API, 'Error accepting friend request', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },
  declineFriendRequest: async (userId: string) => {
    try {
      const response = await api.post(endpoints.friends.decline, { requesterId: userId });
      return response.data;
    } catch (error: any) {
      log.error(LogCategory.API, 'Error declining friend request', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },
  getFriendStatus: async (userId: string) => {
    const response = await api.get(endpoints.friends.status(userId));
    return response.data;
  },
};

// Public API
export const publicApi = {
  getUserProfile: async (userId: string) => {
    const response = await api.get(endpoints.user.publicProfile(userId));
    
    // The backend now returns the user data directly, not wrapped in { user: {...} }
    const userData = response.data;
    
    // Return in the expected format for the PublicProfilePage
    return {
      data: {
        id: userData._id,
        _id: userData._id,
        username: userData.username,
        fullName: userData.fullName,
        email: userData.email,
        bio: userData.bio,
        interests: userData.interests,
        profileImage: userData.profileImage,
        roles: userData.roles,
        createdAt: userData.createdAt,
        profileCompleted: userData.profileCompleted,
      }
    };
  },
  getPublicEvent: async (eventId: string) => {
    const response = await api.get(`/api/events/public/${eventId}`);
    return response.data;
  },
  createSubGroup: async (data: { eventId: string; name: string; members: string[] }) => {
    const response = await api.post('/sub-groups', data);
    return response.data;
  },
  updateSubGroup: async (subGroupId: string, data: { name: string }) => {
    const response = await api.put(`/sub-groups/${subGroupId}`, data);
    return response.data;
  },
  deleteSubGroup: async (subGroupId: string) => {
    const response = await api.delete(`/sub-groups/${subGroupId}`);
    return response.data;
  },
  addSubGroupMember: async (subGroupId: string, memberId: string) => {
    const response = await api.post(`/sub-groups/${subGroupId}/members`, { memberId });
    return response.data;
  },
  removeSubGroupMember: async (subGroupId: string, memberId: string) => {
    const response = await api.delete(`/sub-groups/${subGroupId}/members/${memberId}`);
    return response.data;
  },
  getSubGroups: async (eventId: string) => {
    const response = await api.get(`/events/${eventId}/sub-groups`);
    return response.data;
  },
  search: async (query: string) => {
    const response = await api.get(`/api/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};

// Friend Group APIs
export const friendGroupApi = {
  getFriendGroups: async () => {
    const response = await api.get('/api/friend-groups');
    return response.data;
  },
  createFriendGroup: async (name: string, members: string[]) => {
    const response = await api.post('/api/friend-groups', { name, members });
    return response.data;
  },
  addFriendGroupMember: async (groupId: string, userId: string) => {
    const response = await api.post(`/api/friend-groups/${groupId}/add-member`, { userId });
    return response.data;
  },
  removeFriendGroupMember: async (groupId: string, userId: string) => {
    const response = await api.post(`/api/friend-groups/${groupId}/remove-member`, { userId });
    return response.data;
  },
  getFriendGroupMessages: async (groupId: string) => {
    const response = await api.get(`/api/friend-groups/${groupId}/messages`);
    return response.data;
  },
  sendFriendGroupMessage: async (groupId: string, content: string) => {
    const response = await api.post(`/api/friend-groups/${groupId}/messages`, { content });
    return response.data;
  },
};

// Event Sub-Group API (updated endpoint)
export const eventSubGroupApi = {
  getSubGroups: async (eventId: string) => {
    const response = await api.get(`/api/event-subgroups/event/${eventId}`);
    return response.data;
  },
  createSubGroup: async (eventId: string, name: string, members: string[]) => {
    const response = await api.post(`/api/event-subgroups`, { eventId, name, members });
    return response.data;
  },
  updateSubGroup: async (subGroupId: string, name: string) => {
    const response = await api.put(`/api/event-subgroups/${subGroupId}`, { name });
    return response.data;
  },
  deleteSubGroup: async (subGroupId: string) => {
    const response = await api.delete(`/api/event-subgroups/${subGroupId}`);
    return response.data;
  },
  addMember: async (subGroupId: string, memberId: string) => {
    const response = await api.post(`/api/event-subgroups/${subGroupId}/members`, { memberId });
    return response.data;
  },
  removeMember: async (subGroupId: string, memberId: string) => {
    const response = await api.delete(`/api/event-subgroups/${subGroupId}/members/${memberId}`);
    return response.data;
  }
};

export default api; 