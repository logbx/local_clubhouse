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
    console.log('[userService] Raw profile data received:', data);
    
    // Ensure roles and interests are arrays, not strings
    const sanitizedData = {
      ...data,
      roles: Array.isArray(data.roles) ? data.roles : JSON.parse(data.roles as unknown as string),
      interests: Array.isArray(data.interests) ? data.interests : JSON.parse(data.interests as unknown as string),
      // Ensure profileImage is a URL string, not a File object
      profileImage: typeof data.profileImage === 'string' ? data.profileImage : null
    };
    
    console.log('[userService] Sanitized profile data:', sanitizedData);
    
    try {
      const response = await userApi.updateProfile(sanitizedData);
      console.log('[userService] Profile update response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[userService] Profile update error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  },

  getPresignedUrl: async (filename: string, contentType: string) => {
    const response = await fetch(`/api/users/profile/upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`);
    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }
    return response.text();
  }
}; 