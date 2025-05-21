import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/user';
import { ImageUpload } from '../components/ImageUpload';
import { toast } from 'react-hot-toast';
import { userService, ProfileFormData } from '../services/user.service';

const AVAILABLE_ROLES: UserRole[] = ['Member', 'Sponsor', 'Creator', 'Club_Founder'];

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: user?.fullName || '',
    email: user?.email || '',
    roles: user?.roles || [],
    interests: user?.interests || [],
    profileImage: user?.profileImage || '',
    bio: user?.bio || '',
    phoneNumber: user?.phoneNumber || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    console.log('[ProfileSetupPage] Validating form with data:', {
      profileImage: formData.profileImage,
      profileImageType: typeof formData.profileImage
    });
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!formData.roles.length) {
      newErrors.roles = 'At least one role is required';
    }
    if (!formData.interests.length) {
      newErrors.interests = 'At least one interest is required';
    }
    if (!formData.profileImage || typeof formData.profileImage !== 'string') {
      newErrors.profileImage = 'Please upload your profile image before submitting.';
      console.log('[ProfileSetupPage] Profile image validation failed:', {
        hasImage: !!formData.profileImage,
        imageType: typeof formData.profileImage
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ProfileSetupPage] Form submission started with data:', formData);
    
    if (!validateForm()) {
      console.log('[ProfileSetupPage] Form validation failed');
      return;
    }

    try {
      setIsSubmitting(true);
      toast('Updating profile...', { icon: '🔄' });

      if (typeof formData.profileImage !== 'string') {
        console.error('[ProfileSetupPage] Profile image is not a string:', formData.profileImage);
        throw new Error('Profile image must be uploaded before submitting');
      }

      const profileData: ProfileFormData = {
        fullName: formData.fullName.trim(),
        email: formData.email,
        roles: formData.roles,
        interests: formData.interests,
        bio: formData.bio,
        phoneNumber: formData.phoneNumber,
        profileImage: formData.profileImage,
      };

      console.log('[ProfileSetupPage] Sending profile update with data:', profileData);

      const response = await userService.updateProfile(profileData);
      
      if (!response || !response.user) {
        console.error('[ProfileSetupPage] Invalid response from server:', response);
        throw new Error('Invalid user data returned from server');
      }

      console.log('[ProfileSetupPage] Profile update successful:', response.user);
      updateUser(response.user);
      toast.success('Profile updated successfully');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('[ProfileSetupPage] Profile update error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(errorMessage);
      setErrors(prev => ({ ...prev, submit: errorMessage }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (fileUrl: string) => {
    console.log('[ProfileSetupPage] Image upload success, received URL:', fileUrl);
    setFormData(prev => {
      const newData = { ...prev, profileImage: fileUrl };
      console.log('[ProfileSetupPage] Updated form data:', newData);
      return newData;
    });
    setErrors(prev => ({ ...prev, profileImage: '' }));
  };

  const handleRoleToggle = (role: UserRole) => {
    setFormData(prev => {
      const roles = prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles };
    });
    setErrors(prev => ({ ...prev, roles: '' }));
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()]
      }));
      setNewInterest('');
      setErrors(prev => ({ ...prev, interests: '' }));
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Complete Your Profile
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Please provide some information about yourself to get started.</p>
            </div>
            <form onSubmit={handleSubmit} className="mt-5 space-y-6">
              {/* Profile Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Profile Image
                </label>
                <div className="mt-1">
                  <ImageUpload
                    endpoint="profile-image"
                    onUploadSuccess={handleImageUpload}
                    className="w-full"
                  />
                  {errors.profileImage && (
                    <p className="mt-2 text-sm text-red-600">{errors.profileImage}</p>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, fullName: e.target.value }));
                      setErrors(prev => ({ ...prev, fullName: '' }));
                    }}
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      errors.fullName ? 'border-red-300' : ''
                    }`}
                  />
                  {errors.fullName && (
                    <p className="mt-2 text-sm text-red-600">{errors.fullName}</p>
                  )}
                </div>
              </div>

              {/* Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Roles
                </label>
                <div className="mt-2 space-y-2">
                  {AVAILABLE_ROLES.map((role) => (
                    <label key={role} className="inline-flex items-center mr-4">
                      <input
                        type="checkbox"
                        checked={formData.roles.includes(role)}
                        onChange={() => handleRoleToggle(role)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{role.replace('_', ' ')}</span>
                    </label>
                  ))}
                  {errors.roles && (
                    <p className="mt-2 text-sm text-red-600">{errors.roles}</p>
                  )}
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Interests
                </label>
                <div className="mt-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      placeholder="Add an interest"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={handleAddInterest}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.interests.map((interest) => (
                      <span
                        key={interest}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => handleRemoveInterest(interest)}
                          className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-blue-200 focus:outline-none focus:bg-blue-200"
                        >
                          <span className="sr-only">Remove interest</span>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  {errors.interests && (
                    <p className="mt-2 text-sm text-red-600">{errors.interests}</p>
                  )}
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
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Tell us about yourself"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1">
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                    ${isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating Profile...
                    </>
                  ) : (
                    'Complete Profile'
                  )}
                </button>
                {errors.submit && (
                  <p className="mt-2 text-sm text-red-600 text-center">{errors.submit}</p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupPage;
