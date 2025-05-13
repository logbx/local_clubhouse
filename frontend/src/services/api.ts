import axios from 'axios';
import { endpoints } from '../config/api';
import { PublicUserProfile } from '../types/user';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`,
          { refreshToken }
        );
        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (error) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (data: { username: string; email: string; password: string }) => {
    const response = await axiosInstance.post(endpoints.auth.register, data);
    return response.data;
  },
  login: async (data: { email: string; password: string }) => {
    const response = await axiosInstance.post(endpoints.auth.login, data);
    return response.data;
  },
  logout: async () => {
    const response = await axiosInstance.post(endpoints.auth.logout);
    return response.data;
  },
  refreshToken: async (refreshToken: string) => {
    const response = await axiosInstance.post(endpoints.auth.refreshToken, { refreshToken });
    return response.data;
  },
};

// User API
export const userApi = {
  getProfile: async () => {
    const response = await axiosInstance.get(endpoints.user.me);
    console.log('API Response for getProfile:', response.data);
    return response.data;
  },
  updateProfile: async (data: any) => {
    console.log('Sending update profile request with data:', data);
    const response = await axiosInstance.put(endpoints.user.updateProfile, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('API Response for updateProfile:', response.data);
    return response.data;
  },
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await axiosInstance.post(endpoints.user.avatar, formData, {
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
    const response = await axiosInstance.get(endpoints.events.list);
    return response.data;
  },
  getEvent: async (id: string) => {
    const response = await axiosInstance.get(endpoints.events.detail(id));
    return response.data;
  },
  createEvent: async (data: any) => {
    const response = await axiosInstance.post(endpoints.events.create, data);
    return response.data;
  },
  updateEvent: async (id: string, data: any) => {
    const response = await axiosInstance.put(endpoints.events.update(id), data);
    return response.data;
  },
  deleteEvent: async (id: string) => {
    const response = await axiosInstance.delete(endpoints.events.delete(id));
    return response.data;
  },
  publishEvent: async (id: string) => {
    const response = await axiosInstance.post(endpoints.events.publish(id));
    return response.data;
  },
  rsvpEvent: async (id: string, status: 'going' | 'maybe' | 'not_going') => {
    const response = await axiosInstance.post(endpoints.events.rsvp(id), { status });
    return response.data;
  },
};

// Friend API
export const friendApi = {
  getFriends: async () => {
    const response = await axiosInstance.get(endpoints.friends.list);
    return response.data;
  },
  getFriendRequests: async () => {
    const response = await axiosInstance.get(endpoints.friends.requests);
    return response.data;
  },
  sendFriendRequest: async (userId: string) => {
    const response = await axiosInstance.post(endpoints.friends.request, { receiverId: userId });
    return response.data;
  },
  acceptFriendRequest: async (userId: string) => {
    console.log('Accepting friend request for userId:', userId);
    try {
      const response = await axiosInstance.post(endpoints.friends.accept, { requesterId: userId });
      console.log('Friend request accept response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error accepting friend request:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },
  declineFriendRequest: async (userId: string) => {
    try {
      const response = await axiosInstance.post(endpoints.friends.decline, { requesterId: userId });
      return response.data;
    } catch (error: any) {
      console.error('Error declining friend request:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },
  getFriendStatus: async (userId: string) => {
    const response = await axiosInstance.get(endpoints.friends.status(userId));
    return response.data;
  },
};

// Public API
export const publicApi = {
  getUserProfile: async (userId: string) => {
    try {
      const response = await axiosInstance.get(endpoints.user.publicProfile(userId));
      if (response.data.user && response.data.user.profileImage) {
        response.data.user.profileImage = `${import.meta.env.VITE_API_BASE_URL}/uploads/${response.data.user.profileImage}`;
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  getPublicEvent: async (eventId: string) => {
    try {
      const response = await axiosInstance.get(endpoints.events.detail(eventId));
      return response.data;
    } catch (error) {
      console.error('Error fetching public event:', error);
      throw error;
    }
  }
};

// Friend Group APIs
export const friendGroupApi = {
  getFriendGroups: async () => {
    const response = await axiosInstance.get('/friend-groups');
    return response.data;
  },
  createFriendGroup: async (name: string, members: string[]) => {
    const response = await axiosInstance.post('/friend-groups', { name, members });
    return response.data;
  },
  addFriendGroupMember: async (groupId: string, userId: string) => {
    const response = await axiosInstance.post(`/friend-groups/${groupId}/add-member`, { userId });
    return response.data;
  },
  removeFriendGroupMember: async (groupId: string, userId: string) => {
    const response = await axiosInstance.post(`/friend-groups/${groupId}/remove-member`, { userId });
    return response.data;
  },
  getFriendGroupMessages: async (groupId: string) => {
    const response = await axiosInstance.get(`/friend-groups/${groupId}/messages`);
    return response.data;
  },
  sendFriendGroupMessage: async (groupId: string, content: string) => {
    const response = await axiosInstance.post(`/friend-groups/${groupId}/messages`, { content });
    return response.data;
  },
};

export default axiosInstance; 