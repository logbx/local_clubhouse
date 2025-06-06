import React, { useState } from 'react';
import { ImageUpload } from '../components/ImageUpload';
import axios from 'axios';

interface User {
  username: string;
  email: string;
  avatarUrl?: string;
}

export const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleAvatarUpload = async (url: string) => {
    try {
      await axios.patch('/api/users/me', { avatarUrl: url });
      setUser((prev) => prev ? { ...prev, avatarUrl: url } : null);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Picture
          </label>
          <ImageUpload
            endpoint="profile-pic"
            onUploadSuccess={handleAvatarUpload}
            currentImage={user?.avatarUrl}
            className="w-48 h-48"
          />
        </div>

        {/* Add other profile fields here */}
      </div>
    </div>
  );
}; 