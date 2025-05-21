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
    
    // Validate required fields
    if (!data.fullName?.trim()) {
      throw new Error('Full name is required');
    }
    if (!Array.isArray(data.roles) || data.roles.length === 0) {
      throw new Error('At least one role is required');
    }
    if (!Array.isArray(data.interests) || data.interests.length === 0) {
      throw new Error('At least one interest is required');
    }

    // Validate profile image
    if (!data.profileImage || typeof data.profileImage !== 'string') {
      throw new Error('Profile image must be uploaded before updating profile');
    }

    // Ensure all data is in the correct format
    const sanitizedData = {
      fullName: data.fullName.trim(),
      email: data.email.trim(),
      roles: data.roles,
      interests: data.interests,
      profileImage: data.profileImage,
      bio: data.bio?.trim() || undefined,
      phoneNumber: data.phoneNumber?.trim() || undefined
    };
    
    console.log('[userService] Sanitized profile data:', sanitizedData);
    
    try {
      const response = await userApi.updateProfile(sanitizedData);
      console.log('[userService] Profile update response:', response);
      
      if (!response?.user) {
        throw new Error('Invalid response from server');
      }
      
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