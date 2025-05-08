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
    const formData = new FormData();
    formData.append('fullName', data.fullName);
    formData.append('email', data.email);
    if (data.bio) formData.append('bio', data.bio);
    formData.append('interests', JSON.stringify(data.interests));
    formData.append('roles', JSON.stringify(data.roles));
    if (data.profileImage) formData.append('profileImage', data.profileImage);
    if (data.phoneNumber) formData.append('phoneNumber', data.phoneNumber);
    return userApi.updateProfile(formData);
  },

  getPresignedUrl: async (filename: string, contentType: string) => {
    const response = await fetch(`/api/users/profile/upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`);
    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }
    return response.text();
  }
}; 