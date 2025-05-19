import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole } from '../types/user';
import { FileUpload } from '../components/FileUpload';
import { toast } from 'react-hot-toast';

interface ProfileFormData {
  fullName: string;
  roles: UserRole[];
  interests: string[];
  profileImage: string;
  bio?: string;
  phoneNumber?: string;
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
  const { user, updateUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: user?.fullName || '',
    roles: user?.roles || [],
    interests: user?.interests || [],
    profileImage: user?.profileImage || '',
    bio: user?.bio || '',
    phoneNumber: user?.phoneNumber || '',
  });
  const [newInterest, setNewInterest] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (formData.roles.length === 0) {
      newErrors.roles = 'Please select at least one role';
    }
    if (formData.interests.length === 0) {
      newErrors.interests = 'Please select at least one interest';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      toast('Updating profile...', { icon: '🔄' });

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          roles: formData.roles,
          interests: formData.interests,
          profileImage: formData.profileImage,
          bio: formData.bio,
          phoneNumber: formData.phoneNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      updateUser(updatedUser);
      toast.success('Profile updated successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(errorMessage);
      setErrors(prev => ({ ...prev, submit: errorMessage }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (fileUrl: string) => {
    setFormData(prev => ({ ...prev, profileImage: fileUrl }));
    setErrors(prev => ({ ...prev, profileImage: '' }));
  };

  const handleImageUploadError = (error: Error) => {
    console.error('Image upload error:', error);
    setErrors(prev => ({ ...prev, profileImage: error.message }));
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

  const renderProfileImage = () => (
    <div className="relative">
      <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
        {formData.profileImage ? (
          <img 
            src={formData.profileImage} 
            alt="Profile preview" 
            className="w-full h-full object-cover"
          />
        ) : (
          <svg className="h-16 w-16 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Complete Your Profile</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Image Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Profile Image
              </label>
              <div className="flex items-center space-x-4">
                {renderProfileImage()}
                <FileUpload
                  onUploadComplete={handleImageUpload}
                  onUploadError={handleImageUploadError}
                  accept="image/*"
                  maxSize={5 * 1024 * 1024} // 5MB
                />
              </div>
              {errors.profileImage && (
                <p className="mt-1 text-sm text-red-600">{errors.profileImage}</p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, fullName: e.target.value }));
                  setErrors(prev => ({ ...prev, fullName: '' }));
                }}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.fullName
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
              )}
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

            {errors.submit && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                  isSubmitting
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  'Complete Profile'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupPage; 