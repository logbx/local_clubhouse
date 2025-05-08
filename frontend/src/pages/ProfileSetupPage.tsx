import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole } from '../types/user';

interface User {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  phoneNumber?: string;
  bio?: string;
  profileImage?: string;
  interests: string[];
}

interface ProfileSetupData {
  roles: UserRole[];
  profileImage?: File;
  bio?: string;
  phoneNumber?: string;
  interests: string[];
}

const roles = [
  {
    id: 'Club_Founder' as UserRole,
    title: 'Club Founder',
    description: 'Passionate individuals who initiate and lead a club. They set direction and inspire others to join.',
    icon: '👑'
  },
  {
    id: 'Member' as UserRole,
    title: 'Member',
    description: 'The heart of the community. Participants who engage, attend events, and invite others.',
    icon: '👥'
  },
  {
    id: 'Sponsor' as UserRole,
    title: 'Sponsor',
    description: 'Local brands or businesses who support the community through funding, resources, or hosting.',
    icon: '🏢'
  },
  {
    id: 'Creator' as UserRole,
    title: 'Creator',
    description: 'Content creators who amplify the community\'s message through media, outreach, and online presence.',
    icon: '📸'
  }
];

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState<ProfileSetupData>({
    roles: (user?.roles as UserRole[]) || [],
    bio: user?.bio || '',
    phoneNumber: user?.phoneNumber || '',
    interests: user?.interests || []
  });
  const [imagePreview, setImagePreview] = useState<string | null>(user?.profileImage || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [newInterest, setNewInterest] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size must be less than 5MB');
        return;
      }
      setFormData({ ...formData, profileImage: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRoleToggle = (roleId: UserRole) => {
    console.log('Toggling role:', roleId);
    setFormData(prev => {
      const newRoles = prev.roles.includes(roleId)
        ? prev.roles.filter(r => r !== roleId)
        : [...prev.roles, roleId];
      console.log('Updated roles:', newRoles);
      return { ...prev, roles: newRoles };
    });
  };

  const handleInterestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newInterest.trim()) {
      e.preventDefault();
      if (!formData.interests.includes(newInterest.trim())) {
        setFormData(prev => ({
          ...prev,
          interests: [...prev.interests, newInterest.trim()]
        }));
      }
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.roles.length === 0) {
      setError('Please select at least one role');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      
      // Convert roles array to JSON string
      const rolesJson = JSON.stringify(formData.roles);
      formDataToSend.append('roles', rolesJson);
      
      // Add interests
      formDataToSend.append('interests', JSON.stringify(formData.interests));
      
      // Add other fields
      if (formData.bio) {
        formDataToSend.append('bio', formData.bio);
      }
      if (formData.phoneNumber) {
        formDataToSend.append('phoneNumber', formData.phoneNumber);
      }
      if (formData.profileImage) {
        formDataToSend.append('profileImage', formData.profileImage);
      }

      console.log('Submitting profile data:', {
        roles: formData.roles,
        bio: formData.bio,
        phoneNumber: formData.phoneNumber,
        hasProfileImage: !!formData.profileImage
      });

      const response = await userApi.updateProfile(formDataToSend);
      
      // Accept both response.user and response.data.user for robustness
      const userData = response?.user || response?.data?.user;
      if (userData) {
        console.log('Profile update successful:', userData);
        // Create updated user object with all fields
        const updatedUser = {
          ...user!,
          ...userData,
          roles: formData.roles,
          bio: userData.bio || '',
          phoneNumber: userData.phoneNumber || '',
          profileImage: userData.profileImage || null,
          interests: userData.interests || [],
          profileCompleted: true // Set to true since we've completed the profile setup
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      } else {
        setError('Profile update failed: No user data returned from server.');
        return;
      }
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError(err.response?.data?.error || 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format the number
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length <= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phoneNumber: formatted });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Let's set up your profile to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Profile Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Profile Image</label>
            <div className="mt-2 flex items-center space-x-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Profile preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="h-16 w-16 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Upload profile image"
                  ref={fileInputRef}
                />
              </div>
              <div className="flex flex-col">
                <button
                  type="button"
                  className="text-sm text-primary-600 hover:text-primary-500"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change Photo
                </button>
                <p className="mt-1 text-xs text-gray-500">PNG, JPG up to 5MB</p>
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Select Your Role(s)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${
                    formData.roles.includes(role.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                  onClick={() => handleRoleToggle(role.id)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{role.icon}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">{role.title}</h3>
                      <p className="text-sm text-gray-500">{role.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              Bio
            </label>
            <div className="mt-1">
              <textarea
                id="bio"
                name="bio"
                rows={4}
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
              Phone Number (Optional)
            </label>
            <div className="mt-1">
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="(555) 555-5555"
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
              />
            </div>
          </div>

          {/* Interests */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Interests</h3>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.interests.map((interest) => (
                  <span
                    key={interest}
                    className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    {interest}
                    <button
                      type="button"
                      onClick={() => removeInterest(interest)}
                      className="ml-2 text-green-800 hover:text-green-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div>
                <input
                  type="text"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={handleInterestKeyDown}
                  placeholder="Type an interest and press Enter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Press Enter to add an interest
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetupPage; 