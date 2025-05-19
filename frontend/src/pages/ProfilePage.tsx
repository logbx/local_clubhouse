import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { userApi } from "../services/api";
import { toast } from "react-toastify";
import { UserRole, User } from "../types/user";
import TagInput from "../components/TagInput";
import { commonInterests } from "../data/suggestions";
import { FileUpload } from "../components/FileUpload";
import { useForm } from 'react-hook-form';
import { userService, ProfileFormData } from '../services/user.service';

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string>('');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileFormData>({
    defaultValues: {
    fullName: user?.fullName || '',
      email: user?.email || '',
    bio: user?.bio || '',
    interests: user?.interests || [],
      phoneNumber: user?.phoneNumber || '',
      profileImage: user?.profileImage || '',
      roles: user?.roles || [],
    }
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      setValue('fullName', user.fullName || '');
      setValue('email', user.email || '');
      setValue('bio', user.bio || '');
      setValue('interests', user.interests || []);
      setValue('phoneNumber', user.phoneNumber || '');
      setValue('profileImage', user.profileImage || '');
      setValue('roles', user.roles || []);
      setProfileImageUrl(user.profileImage || '');
    }
  }, [user, setValue]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const response = await userService.getProfile();
        console.log('Loaded profile data:', response);
        const profile = response.user;
        setValue('fullName', profile.fullName);
        setValue('email', profile.email);
        setValue('bio', profile.bio || '');
        setValue('interests', profile.interests || []);
        setValue('phoneNumber', profile.phoneNumber || '');
        setValue('profileImage', profile.profileImage || '');
        setValue('roles', profile.roles || []);
        setProfileImageUrl(profile.profileImage || '');
        console.log('Profile image URL set to:', profile.profileImage);
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [setValue]);

  // Add debug logging for image rendering
  useEffect(() => {
    console.log('Current profile image URL:', profileImageUrl);
  }, [profileImageUrl]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);

    if (
      typeof data.profileImage === 'object' &&
      data.profileImage !== null &&
      'name' in data.profileImage &&
      'size' in data.profileImage
    ) {
      setError('Profile image upload failed. Please try uploading again.');
      setIsLoading(false);
      return;
    }

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
      setIsLoading(false);
    }
  };

  const handleFileUploadComplete = (fileUrl: string) => {
    setProfileImageUrl(fileUrl);
    setValue('profileImage', fileUrl);
  };

  const handleFileUploadError = (error: Error) => {
    toast.error(error.message || 'Failed to upload image');
  };

  const availableRoles: UserRole[] = ['Member', 'Sponsor', 'Creator', 'Club_Founder'];

  if (!user) {
    return <div>Loading...</div>;
  }

  if (!isEditing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Profile</h1>
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Edit Profile
            </button>
          </div>

          <div className="flex items-center mb-6">
            {profileImageUrl ? (
              <div>
              <img
                  src={profileImageUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover"
                  onError={(e) => {
                    console.error('Error loading profile image:', e);
                    console.log('Failed image URL:', profileImageUrl);
                  }}
              />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 text-2xl">{user.fullName?.[0]?.toUpperCase()}</span>
              </div>
            )}
            <div className="ml-6">
              <h2 className="text-xl font-semibold">{user.fullName}</h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Phone Number</h3>
              <p>{user.phoneNumber || 'Not provided'}</p>
            </div>

            <div>
              <h3 className="font-semibold">Bio</h3>
              <p>{user.bio || 'No bio provided'}</p>
            </div>

            <div>
              <h3 className="font-semibold">Interests</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {user.interests?.map((interest: string) => (
                  <span
                    key={interest}
                    className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
                {(!user.interests || user.interests.length === 0) && (
                  <p className="text-gray-500">No interests added</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold">Roles</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {user.roles?.map((role) => (
                  <span
                    key={role}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
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
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit Profile</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center space-x-6 mb-6">
            <div className="flex-shrink-0">
              {profileImageUrl ? (
                  <img
                  src={profileImageUrl}
                  alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500 text-2xl">
                    {watch('fullName')?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            <div className="flex-grow">
              <FileUpload
                onUploadComplete={handleFileUploadComplete}
                onUploadError={handleFileUploadError}
                accept="image/*"
                maxSize={5 * 1024 * 1024}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
            <input
              type="text"
                {...register('fullName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
            <input
              type="tel"
                {...register('phoneNumber')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
            <textarea
                {...register('bio')}
              rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
            />
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
              Interests
            </label>
              <TagInput
                value={watch('interests') || []}
                suggestions={commonInterests}
                onChange={(tags) => setValue('interests', tags)}
                placeholder="Type to add interests"
              />
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Roles
              </label>
              <div className="flex flex-wrap gap-4">
                {availableRoles.map(role => (
                  <label key={role} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                      value={role}
                      checked={(watch('roles') as string[]).includes(role)}
                      onChange={e => {
                        const currentRoles = watch('roles') as string[];
                        if (e.target.checked) {
                          setValue('roles', [...currentRoles, role]);
                        } else {
                          setValue('roles', currentRoles.filter(r => r !== role));
                        }
                      }}
                      className="form-checkbox h-4 w-4 text-blue-600 bg-white border-gray-300 checked:bg-blue-600 focus:ring-blue-500"
                    />
                    <span>{role}</span>
                </label>
              ))}
              </div>
              {(watch('roles') as string[]).length === 0 && (
                <p className="text-red-500 text-sm mt-2">Please select at least one role.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (watch('roles') as string[]).length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage; 