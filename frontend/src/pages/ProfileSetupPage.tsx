import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import { ImageUpload } from '../components/ImageUpload';
import TagInput from '../components/TagInput';
import { commonInterests } from '../data/suggestions';
import { toast } from 'react-hot-toast';
import { userService, ProfileFormData } from '../services/user.service';
import { uploadService } from '../services/upload.service';

const AVAILABLE_ROLES: UserRole[] = [UserRole.Club_Founder, UserRole.Member, UserRole.Sponsor, UserRole.Creator];

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  Club_Founder: 'Passionate individuals who initiate and lead a club. They set direction and inspire others to join.',
  Member: 'The heart of the community. Participants who engage, attend events, and invite others.',
  Sponsor: 'Local brands or businesses who support the community through funding, resources, or hosting.',
  Creator: 'Content creators who amplify the community\'s message through media, outreach, and online presence.'
};

const ROLE_ICONS: Record<UserRole, JSX.Element> = {
  Club_Founder: <span role="img" aria-label="Club Founder" className="text-2xl mr-2">👑</span>,
  Member: <span role="img" aria-label="Member" className="text-2xl mr-2">👥</span>,
  Sponsor: <span role="img" aria-label="Sponsor" className="text-2xl mr-2">🏢</span>,
  Creator: <span role="img" aria-label="Creator" className="text-2xl mr-2">📸</span>,
};

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState<ProfileFormData>({
    username: user?.username || '',
    email: user?.email || '',
    roles: user?.roles || [],
    interests: user?.interests || [],
    profileImage: user?.profileImage || '',
    bio: user?.bio || '',
    phoneNumber: user?.phoneNumber ? String(user.phoneNumber) : ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({
    username: '',
    roles: '',
    phoneNumber: '',
    interests: '',
    profileImage: '',
    bio: '',
    submit: ''
  });
  const [imagePreview, setImagePreview] = useState<string>(user?.profileImage || '');
  const [interestedRoles, setInterestedRoles] = useState<UserRole[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = () => {
    const newErrors = { username: '', roles: '', phoneNumber: '', interests: '', profileImage: '', bio: '', submit: '' };
    let isValid = true;
    
    console.log('[ProfileSetupPage] Validating form with data:', {
      username: formData.username,
      roles: formData.roles,
      interests: formData.interests,
      profileImage: formData.profileImage,
      profileImageType: typeof formData.profileImage,
      phoneNumber: formData.phoneNumber
    });
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
      isValid = false;
      console.log('[ProfileSetupPage] Validation failed: Username required');
    } else if (!/^[a-z0-9_]+$/.test(formData.username.trim())) {
      newErrors.username = 'Username can only contain lowercase letters, numbers, and underscores';
      isValid = false;
      console.log('[ProfileSetupPage] Validation failed: Username format invalid');
    }
    if (!formData.roles || !formData.roles.length) {
      newErrors.roles = 'At least one role is required';
      isValid = false;
      console.log('[ProfileSetupPage] Validation failed: Roles required');
    }
    if (!formData.interests || !formData.interests.length) {
      newErrors.interests = 'At least one interest is required';
      isValid = false;
      console.log('[ProfileSetupPage] Validation failed: Interests required');
    }
    // Make profile image optional for now to test
    // if (!formData.profileImage || typeof formData.profileImage !== 'string') {
    //   newErrors.profileImage = 'Please upload your profile image before submitting.';
    //   console.log('[ProfileSetupPage] Profile image validation failed:', {
    //     hasImage: !!formData.profileImage,
    //     imageType: typeof formData.profileImage
    //   });
    //   isValid = false;
    // }
    if (formData.phoneNumber && formData.phoneNumber.length !== 0 && formData.phoneNumber.length !== 10) {
      newErrors.phoneNumber = 'Phone number must be exactly 10 digits.';
      isValid = false;
      console.log('[ProfileSetupPage] Validation failed: Phone number invalid');
    }

    console.log('[ProfileSetupPage] Validation result:', { isValid, errors: newErrors });
    setErrors(newErrors);
    return isValid;
  };

  const handleImageUpload = (url: string) => {
    console.log('[ProfileSetupPage] Image upload success, received URL:', url);
    setFormData(prev => {
      const newData = { ...prev, profileImage: url };
      console.log('[ProfileSetupPage] Updated form data with new image URL:', newData);
      return newData;
    });
    setImagePreview(url);
    setErrors(prev => ({ ...prev, profileImage: '' }));
    toast.success('Profile image uploaded successfully');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ProfileSetupPage] Form submission started with data:', formData);
    console.log('[ProfileSetupPage] Current user from auth context:', user);
    console.log('[ProfileSetupPage] Navigation function available:', typeof navigate);
    
    if (!validateForm()) {
      console.log('[ProfileSetupPage] Form validation failed');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('[ProfileSetupPage] Setting isSubmitting to true');
      toast.loading('Updating profile...', { id: 'profile-update' });

      // Remove the profile image requirement check since it's now optional
      // if (!formData.profileImage || typeof formData.profileImage !== 'string') {
      //   throw new Error('Please upload a profile image before submitting');
      // }

      const profileData: ProfileFormData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        roles: formData.roles,
        interests: formData.interests,
        bio: formData.bio?.trim(),
        phoneNumber: formData.phoneNumber?.trim(),
        profileImage: formData.profileImage || undefined // Allow undefined for optional image
      };

      console.log('[ProfileSetupPage] Sending profile update with data:', profileData);
      console.log('[ProfileSetupPage] About to call userService.updateProfile...');

      const response = await userService.updateProfile(profileData);
      
      console.log('[ProfileSetupPage] Received response from updateProfile:', response);
      
      if (!response?.user) {
        console.error('[ProfileSetupPage] No user data in response:', response);
        throw new Error('No user data returned from server');
      }

      console.log('[ProfileSetupPage] Profile update successful:', response.user);
      console.log('[ProfileSetupPage] About to call setUser...');
      setUser(response.user);
      console.log('[ProfileSetupPage] setUser called, about to show success toast...');
      toast.success('Profile updated successfully', { id: 'profile-update' });
      console.log('[ProfileSetupPage] About to navigate to dashboard...');
      navigate('/dashboard');
      console.log('[ProfileSetupPage] Navigate called!');
    } catch (error: any) {
      console.error('[ProfileSetupPage] Profile update error:', error);
      console.error('[ProfileSetupPage] Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status
      });
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(errorMessage, { id: 'profile-update' });
      setErrors(prev => ({ ...prev, submit: errorMessage }));
    } finally {
      console.log('[ProfileSetupPage] Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const handleRoleToggle = (role: UserRole) => {
    setFormData(prev => {
      const currentRoles = prev.roles || [];
      const roles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role];
      return { ...prev, roles };
    });
    setErrors(prev => ({ ...prev, roles: '' }));
  };

  const handleInterestedRoleToggle = (role: UserRole) => {
    setInterestedRoles(prev => 
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = 'profile-image-upload';
    setErrors(prev => ({ ...prev, profileImage: '' }));
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, profileImage: 'Please select an image file' }));
        toast.error('Please select an image file', { id: toastId });
        return;
      }
      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrors(prev => ({ ...prev, profileImage: 'Image size should be less than 5MB' }));
        toast.error('Image size should be less than 5MB', { id: toastId });
        return;
      }
      toast.loading('Preparing upload...', { id: toastId });
      // Get signed URL
      const { signedUrl, publicUrl } = await uploadService.getSignedUrl(file.name, file.type, 'profile-image');
      toast.loading('Uploading image...', { id: toastId });
      // Upload to S3
      await uploadService.uploadToS3(file, signedUrl);
      // Update state
      setFormData(prev => ({ ...prev, profileImage: publicUrl }));
      setImagePreview(publicUrl);
      toast.success('Profile image uploaded successfully', { id: toastId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      setErrors(prev => ({ ...prev, profileImage: errorMessage }));
      toast.error(errorMessage, { id: toastId });
    } finally {
      e.target.value = '';
    }
  };

  // Add a helper function for formatting
  function formatPhoneNumber(value: string) {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return '';
    let formatted = '';
    if (match[1]) {
      formatted = `(${match[1]}`;
    }
    if (match[2]) {
      formatted += match[2].length === 3 ? `) ${match[2]}` : match[2];
    }
    if (match[3]) {
      formatted += match[3] ? `-${match[3]}` : '';
    }
    return formatted;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shadow-lg dark:shadow-gray-900/20 sm:rounded-lg border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Complete Your Profile
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
              <p>Please provide some information about yourself to get started.</p>
            </div>
            <form onSubmit={handleSubmit} className="mt-5 space-y-6">
              {/* Profile Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Profile Image
                </label>
                <div className="flex items-center space-x-8">
                  {/* Avatar preview or placeholder */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Profile preview"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14c3.866 0 7 1.343 7 3v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1c0-1.657 3.134-3 7-3zm0-2a4 4 0 100-8 4 4 0 000 8z" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {/* Change Photo link and note (using a label to trigger the hidden input) */}
                  <div>
                    <label className="inline-block text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline">
                      Change Photo
                      <input
                        type="file"
                        accept="image/png, image/jpeg"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                    <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">PNG, JPG up to 5MB</div>
                  </div>
                </div>
                {errors.profileImage && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.profileImage}</p>
                )}
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Username <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Choose a unique handle for @mentions and search (e.g., john_doe123). Only lowercase letters, numbers, and underscores allowed.
                </p>
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={(e) => {
                    // Only allow lowercase letters, numbers, and underscores
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setFormData(prev => ({ ...prev, username: value }));
                    setErrors(prev => ({ ...prev, username: '' }));
                  }}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.username ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors`}
                  placeholder="your_username123"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
                )}
              </div>

              {/* Roles */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Select Your Role(s)
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">You can select more than one role.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {AVAILABLE_ROLES.map((role) => (
                    <label
                      key={role}
                      htmlFor={`role-${role}`}
                      className={`flex items-start p-4 rounded-lg border cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors ${(formData.roles || []).includes(role) ? 'ring-2 ring-blue-500 dark:ring-blue-400 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50'}`}
                    >
                      <input
                        type="checkbox"
                        id={`role-${role}`}
                        checked={(formData.roles || []).includes(role)}
                        onChange={() => handleRoleToggle(role)}
                        className="sr-only peer"
                      />
                      <span
                        className="mr-3 mt-1 flex items-center justify-center w-5 h-5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors"
                        aria-hidden="true"
                      >
                        {(formData.roles || []).includes(role) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <div>
                        <div className="flex items-center mb-1">
                          {ROLE_ICONS[role]}
                          <span className="font-medium text-gray-900 dark:text-white text-base">{role.replace('_', ' ')}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{ROLE_DESCRIPTIONS[role]}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.roles && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.roles}</p>
                )}
              </div>

              {/* Phone Number (moved below Roles, restrict to 10 digits, numbers only) */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone Number <span className="text-gray-400">(Optional)</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="phoneNumber"
                    value={formatPhoneNumber(formData.phoneNumber || '')}
                    maxLength={14} // (XXX) XXX-XXXX is 14 chars
                    inputMode="numeric"
                    onChange={(e) => {
                      // Strip non-digit characters and update formData (storing a 10-digit string)
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData(prev => ({ ...prev, phoneNumber: digits }));
                      setErrors(prev => ({ ...prev, phoneNumber: '' }));
                    }}
                    className="shadow-sm focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                    placeholder="(555) 123-4567"
                  />
                  {errors.phoneNumber && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.phoneNumber}</p>
                  )}
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Interests <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Start typing to see suggestions, or type your own interests and press Enter to add them.
                </p>
                <div className="mt-2">
                  <TagInput
                    value={formData.interests || []}
                    onChange={(newInterests) => {
                      setFormData(prev => ({
                        ...prev,
                        interests: newInterests
                      }));
                      setErrors(prev => ({ ...prev, interests: '' }));
                    }}
                    suggestions={commonInterests}
                    placeholder="Type to search and add interests..."
                  />
                  {errors.interests && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.interests}</p>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bio
                </label>
                <div className="mt-1">
                  <textarea
                    id="bio"
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    className="shadow-sm focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                    placeholder="Tell us about yourself"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors
                    ${isSubmitting 
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                      : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400'
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
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">{errors.submit}</p>
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
