import api from './api';
import { User, UserRole } from '../types/user';

export interface ProfileFormData {
  username: string;
  email: string;
  phoneNumber?: string;
  bio?: string;
  interests?: string[];
  profileImage?: string;
  roles?: UserRole[];
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

class UserService {
  async getProfile(): Promise<{ user: User }> {
    const response = await api.get('/api/auth/verify');
    return response.data;
  }

  async updateProfile(data: ProfileFormData): Promise<{ user: User }> {
    const currentUserResponse = await api.get('/api/auth/verify');
    const userId = currentUserResponse.data.user.id;
    
    const response = await api.put(`/api/users/${userId}`, data);
    return { user: response.data };
  }

  async updatePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    const currentUserResponse = await api.get('/api/auth/verify');
    const userId = currentUserResponse.data.user.id;
    
    await api.put(`/api/users/${userId}/password`, data);
  }

  async uploadProfileImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/upload/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const userService = new UserService(); 