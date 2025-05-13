import { UserRole } from '../types/user';
import { userApi } from './api';

export interface ProfileFormData {
  fullName: string;
  email: string;
  bio?: string;
  interests: string[];
  profileImage?: string;
  phoneNumber?: string;
  roles: string[];
}

export const userService = {
  getProfile: async () => {
    return userApi.getProfile();
  },

  updateProfile: async (data: ProfileFormData) => {
    const profileData = {
      fullName: data.fullName,
      email: data.email,
      bio: data.bio || '',
      interests: Array.isArray(data.interests) ? data.interests : [],
      roles: Array.isArray(data.roles) ? data.roles : [],
      phoneNumber: data.phoneNumber || '',
      profileImage: data.profileImage // This should be a URL string
    };

    console.log('[UserService] Sending profile update with data:', profileData);
    return userApi.updateProfile(profileData);
  },

  getPresignedUrl: async (filename: string, contentType: string) => {
    const response = await fetch(`/api/users/profile/upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`);
    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }
    return response.text();
  }
}; 