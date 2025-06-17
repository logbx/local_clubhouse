import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PublicUserProfile, UserRole } from '../types/user';
import { useAuth } from '../context/AuthContext';
import { publicApi, friendApi } from '../services/api';
import { format } from 'date-fns';
import FriendButton from '../components/FriendButton';
import { useQuery } from '@tanstack/react-query';

const PublicProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get friend status
  const { data: friendStatus } = useQuery({
    queryKey: ['friendStatus', userId],
    queryFn: async () => {
      if (!userId) return 'none';
      const response = await friendApi.getFriendStatus(userId);
      return response.status;
    },
    enabled: !!userId
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const response = await publicApi.getUserProfile(userId);
        if (response?.data) {
          setProfile(response.data as unknown as PublicUserProfile);
        } else {
          setError('Profile data not found');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 text-lg">{error || 'Profile not found'}</p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">The requested profile could not be loaded.</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const displayName = profile.username || 'Anonymous User';
  const userInitial = displayName.charAt(0).toUpperCase();
  const joinedDate = profile.createdAt ? format(new Date(profile.createdAt), 'MMMM yyyy') : 'Recently';

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Member':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'Sponsor':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case 'Creator':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'Club_Founder':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
    <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors duration-200">
        {/* Header Section */}
        <div className="flex items-center space-x-4 mb-6">
          {profile.profileImage ? (
            <img
              src={profile.profileImage}
              alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
            />
          ) : profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
            />
          ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
                <span className="text-2xl text-gray-500 dark:text-gray-400">{userInitial}</span>
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
                {profile.username && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{profile.username}</p>
                )}
              </div>
              <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Joined {joinedDate}</p>
                {!isOwnProfile && userId && (
                  <div className="mt-4">
                    <FriendButton userId={userId} />
                  </div>
                )}
                {profile.profileCompleted && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 mt-2">
                    Verified Profile
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Roles Section */}
        {profile.roles && profile.roles.length > 0 && (
          <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Roles</h2>
            <div className="flex flex-wrap gap-2">
              {[...new Set(profile.roles)].map((role, index) => (
                <span
                  key={`${role}-${index}`}
                  className={`px-3 py-1 rounded-full text-sm ${getRoleBadgeColor(role)}`}
                >
                  {role.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bio Section */}
        {profile.bio && (
          <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">About</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}

        {/* Contact Information */}
        {profile.phoneNumber && (
          <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Contact</h2>
              <p className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Phone:</span> {profile.phoneNumber}
            </p>
          </div>
        )}

        {/* Tags Section */}
        {profile.tags && profile.tags.length > 0 && (
          <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {profile.tags.map((tag) => (
                <span
                  key={tag}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interests Section */}
        {profile.interests && profile.interests.length > 0 && (
          <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <span
                  key={interest}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage; 