import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clubApi } from '../services/club.service';
import { Club, ClubStats, UpdateClubProfileDto } from '../types/club';
import { LoadingSpinner } from '../components/LoadingSpinner';
import ClubProfileEditor from '../components/ClubProfileEditor';
import ClubMemberList from '../components/ClubMemberList';
import ClubCommentModerator from '../components/ClubCommentModerator';

import { toast } from 'react-toastify';
import {
  HomeIcon,
  CogIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

type TabType = 'overview' | 'profile' | 'members' | 'comments';

const ClubAdminDashboard: React.FC = () => {
  const { clubUsername } = useParams<{ clubUsername: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [club, setClub] = useState<Club | null>(null);
  const [stats, setStats] = useState<ClubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!clubUsername) return;

      try {
        setLoading(true);
        const [clubData, statsData] = await Promise.all([
          clubApi.getClubForAdmin(clubUsername),
          clubApi.getClubStats(clubUsername)
        ]);
        
        setClub(clubData);
        setStats(statsData);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch admin data:', err);
        setError(err.response?.data?.message || 'Failed to load admin dashboard');
        
        if (err.response?.status === 403) {
          toast.error('You do not have admin access to this club');
          navigate(`/clubs/${clubUsername}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [clubUsername, navigate]);

  const handleProfileUpdate = async (updateData: UpdateClubProfileDto) => {
    if (!clubUsername) return;

    try {
      const updatedClub = await clubApi.updateClubProfile(clubUsername, updateData);
      setClub(updatedClub);
      toast.success('Club profile updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
      throw err;
    }
  };

  const refreshData = async () => {
    if (!clubUsername) return;

    try {
      const [clubData, statsData] = await Promise.all([
        clubApi.getClubForAdmin(clubUsername),
        clubApi.getClubStats(clubUsername)
      ]);
      
      setClub(clubData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to refresh data:', err);
    }
  };



  if (loading) return <LoadingSpinner />;
  
  if (error || !club || !stats) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
            {error || 'Access Denied'}
          </h3>
          <p className="text-red-700 dark:text-red-300 mb-4">
            {error || 'You do not have permission to access this admin dashboard.'}
          </p>
          <button
            onClick={() => navigate(`/clubs/${clubUsername}`)}
            className="btn btn-secondary"
          >
            Back to Club
          </button>
        </div>
      </div>
    );
  }

  const isCreator = user?.id === club.createdBy._id || user?.id === club.club_founder?._id;

  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: ChartBarIcon },
    { id: 'profile' as TabType, name: 'Edit Profile', icon: CogIcon },
    { id: 'members' as TabType, name: 'Manage Members', icon: UsersIcon },
    { id: 'comments' as TabType, name: 'Moderate Comments', icon: ChatBubbleLeftRightIcon },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
              {club.name} • @{club.username}
            </p>
          </div>
          <button
            onClick={() => navigate(`/clubs/${club.username}`)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <HomeIcon className="h-4 w-4" />
            View Club
          </button>
        </div>

        {isCreator && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Club Founder:</strong> You have full administrative privileges for this club.
            </p>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
                  <div className="flex items-center">
                    <UsersIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        Total Members
                      </p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {stats.totalMembers}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900 p-6 rounded-lg">
                  <div className="flex items-center">
                    <CogIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Admins
                      </p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {stats.totalAdmins}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900 p-6 rounded-lg">
                  <div className="flex items-center">
                    <ChatBubbleLeftRightIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        Comments
                      </p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {stats.totalComments}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900 p-6 rounded-lg">
                  <div className="flex items-center">
                    <ChatBubbleLeftRightIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                        Chat Messages
                      </p>
                      <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                        {stats.totalChatMessages}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="p-4 text-left bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <CogIcon className="h-6 w-6 text-primary-600 dark:text-primary-400 mb-2" />
                    <p className="font-medium text-gray-900 dark:text-white">Edit Club Profile</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Update name, description, logo, and settings
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTab('members')}
                    className="p-4 text-left bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <UsersIcon className="h-6 w-6 text-primary-600 dark:text-primary-400 mb-2" />
                    <p className="font-medium text-gray-900 dark:text-white">Manage Members</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      View members, assign roles, remove users
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTab('comments')}
                    className="p-4 text-left bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-primary-600 dark:text-primary-400 mb-2" />
                    <p className="font-medium text-gray-900 dark:text-white">Moderate Comments</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Review and manage public comments
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <ClubProfileEditor
              club={club}
              onUpdate={handleProfileUpdate}
            />
          )}

          {activeTab === 'members' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Member Management
              </h3>
              <ClubMemberList
                clubUsername={club.username}
                isAdmin={true}
                club={club}
              />
            </div>
          )}

          {activeTab === 'comments' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Comment Moderation
              </h3>
              <ClubCommentModerator
                clubUsername={club.username}
                comments={club.comments}
                onCommentDeleted={refreshData}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClubAdminDashboard; 