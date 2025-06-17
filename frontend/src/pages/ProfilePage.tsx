import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { UserRole } from "../types/user";
import TagInput from "../components/TagInput";
import { commonInterests } from "../data/suggestions";
import { ImageUpload } from "../components/ImageUpload";
import { useForm } from 'react-hook-form';
import { userService, ProfileFormData } from '../services/user.service';
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { User } from '../types/user';
import api from '../services/api';
import { UserIcon, PhotoIcon, CheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { register, handleSubmit, setValue, watch } = useForm<ProfileFormData>({
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      bio: user?.bio || '',
      interests: user?.interests || [],
      phoneNumber: user?.phoneNumber || '',
      profileImage: user?.profileImage || '',
      roles: user?.roles || [],
    }
  });

  useEffect(() => {
    if (user) {
      setValue('username', user.username || '');
      setValue('email', user.email || '');
      setValue('bio', user.bio || '');
      setValue('interests', user.interests || []);
      setValue('phoneNumber', user.phoneNumber || '');
      setValue('profileImage', user.profileImage || '');
      setValue('roles', user.roles || []);
      setPreviewUrl(user.profileImage || '');
    }
  }, [user, setValue]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.getProfile();
      const userData = response.user;
      setProfile(userData);
      setFormData(prev => ({
        ...prev,
        username: userData.username || '',
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || '',
      }));
      setPreviewUrl(userData.profileImage || '');
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Current profile image URL:', previewUrl);
  }, [previewUrl]);

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      const response = await userService.updateProfile(data);
      if (user) {
        const updatedUser = { ...user, ...response.user };
        setUser(updatedUser);
      }
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const availableRoles = [UserRole.Member, UserRole.Sponsor, UserRole.Creator, UserRole.Club_Founder];

  if (!user) {
    return <div>Loading...</div>;
  }

  if (!isEditing) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 w-full sm:w-auto">
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={`${profile?.username}'s profile`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                      <UserCircleIcon className="w-12 h-12 sm:w-16 sm:h-16" />
                    </div>
                  )}
                </div>
              </div>
              <div className="text-center sm:text-left min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">
                  {profile?.username || 'Loading...'}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base break-words">
                  @{profile?.username || 'username'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors w-full sm:w-auto flex-shrink-0"
            >
              Edit Profile
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Bio</h3>
              <p className="text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">
                {profile?.bio || 'No bio provided'}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Phone Number</h3>
              <p className="text-gray-700 dark:text-gray-300 break-words">
                {profile?.phoneNumber || 'Not provided'}
              </p>
              <div className="mt-3">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Email</h4>
                <p className="text-gray-700 dark:text-gray-300 break-words">
                  {profile?.email || 'Not provided'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profile?.interests?.map((interest: string) => (
                  <span
                    key={interest}
                    className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-sm break-words"
                  >
                    {interest}
                  </span>
                ))}
                {(!profile?.interests || profile?.interests.length === 0) && (
                  <p className="text-gray-500 dark:text-gray-400">No interests added</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Roles</h3>
              <div className="flex flex-wrap gap-2">
                {profile?.roles?.map((role: UserRole) => (
                  <span
                    key={role}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm break-words"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors duration-200">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h1>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Image Upload using ImageUpload */}
          <div className="flex items-center space-x-6 mb-6">
            <div className="flex-shrink-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400 text-2xl">
                    {watch('username')?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-grow">
              <ImageUpload
                endpoint="profile-image"
                onUploadSuccess={(url) => {
                  setPreviewUrl(url);
                  setValue('profileImage', url);
                }}
                className="w-full"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              {...register('username')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              {...register('phoneNumber')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              {...register('bio')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Interests
            </label>
            <TagInput
              value={watch('interests') || []}
              suggestions={commonInterests}
              onChange={(tags) => setValue('interests', tags)}
              placeholder="Type to add interests"
            />
          </div>

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Roles
            </label>
            <div className="flex flex-wrap gap-4">
              {availableRoles.map(role => (
                <label key={role} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={role}
                    checked={(watch('roles') as UserRole[]).includes(role as UserRole)}
                    onChange={e => {
                      const currentRoles = watch('roles') as UserRole[];
                      if (e.target.checked) {
                        setValue('roles', [...currentRoles, role as UserRole]);
                      } else {
                        setValue('roles', currentRoles.filter(r => r !== role));
                      }
                    }}
                    className="form-checkbox h-4 w-4 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 checked:bg-blue-600 dark:checked:bg-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 rounded"
                  />
                  <span className="text-gray-900 dark:text-white">{role}</span>
                </label>
              ))}
            </div>
            {(watch('roles') as UserRole[]).length === 0 && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-2">Please select at least one role.</p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (watch('roles') as UserRole[]).length === 0}
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
