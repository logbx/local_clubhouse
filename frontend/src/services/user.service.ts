import { UserRole } from '../types/user';
import { userApi } from './api';

export interface ProfileFormData {
  fullName: string;
  email: string;
  bio?: string;
  interests: string[];
  profileImage?: string | File | null;
  phoneNumber?: string;
  roles: UserRole[];
}

export const userService = {
  getProfile: async () => {
    return userApi.getProfile();
  },

  updateProfile: async (data: ProfileFormData) => {
    console.log('[userService] Raw profile data received:', data);
    
    // Ensure all data is in the correct format
    const sanitizedData = {
      ...data,
      // Ensure roles is an array of UserRole
      roles: Array.isArray(data.roles) 
        ? data.roles 
        : typeof data.roles === 'string' 
          ? JSON.parse(data.roles) 
          : [],
      // Ensure interests is an array of strings
      interests: Array.isArray(data.interests) 
        ? data.interests 
        : typeof data.interests === 'string' 
          ? JSON.parse(data.interests) 
          : [],
      // Ensure profileImage is a string URL
      profileImage: typeof data.profileImage === 'string' 
        ? data.profileImage 
        : data.profileImage instanceof File 
          ? null 
          : data.profileImage || null,
      // Ensure other fields are strings
      fullName: String(data.fullName || ''),
      email: String(data.email || ''),
      bio: data.bio ? String(data.bio) : undefined,
      phoneNumber: data.phoneNumber ? String(data.phoneNumber) : undefined
    };
    
    console.log('[userService] Sanitized profile data:', sanitizedData);
    
    try {
      const response = await userApi.updateProfile(sanitizedData);
      console.log('[userService] Profile update response:', response);
      return response;
    } catch (error: any) {
      console.error('[userService] Profile update error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
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