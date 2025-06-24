import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import { userService } from '../services/user.service';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { User } from '../types/user';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phoneNumber: string | undefined) => {
    if (!phoneNumber) return 'Not provided';
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phoneNumber;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div>No profile data found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shadow-lg dark:shadow-gray-900/20 sm:rounded-lg border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 w-full sm:w-auto">
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                    {profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt={`${profile.username}'s profile`}
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
                    {profile.fullName || profile.username || 'Loading...'}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base break-words">
                    @{profile.username || 'username'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/profile/edit')}
                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors w-full sm:w-auto flex-shrink-0"
              >
                Edit Profile
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Bio</h3>
                <p className="text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">
                  {profile.bio || 'No bio provided'}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Contact Information</h3>
                <div className="space-y-2">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm">Email</h4>
                    <p className="text-gray-700 dark:text-gray-300 break-words">
                      {profile.email || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm">Phone Number</h4>
                    <p className="text-gray-700 dark:text-gray-300 break-words">
                      {formatPhoneNumber(profile.phoneNumber)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Roles</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.roles?.map((role: UserRole) => (
                    <span
                      key={role}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm break-words"
                    >
                      {role.replace('_', ' ')}
                    </span>
                  ))}
                  {(!profile.roles || profile.roles.length === 0) && (
                    <p className="text-gray-500 dark:text-gray-400">No roles assigned</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests?.map((interest: string) => (
                    <span
                      key={interest}
                      className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-sm break-words"
                    >
                      {interest}
                    </span>
                  ))}
                  {(!profile.interests || profile.interests.length === 0) && (
                    <p className="text-gray-500 dark:text-gray-400">No interests added</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
