import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sponsorApi } from '../services/sponsor.service';
import { 
  Sponsor, 
  CollaborationRequest, 
  SponsorStats as ISponsorStats,
  CollaborationStatus 
} from '../types/sponsor';
import { LoadingSpinner } from '../components/LoadingSpinner';
import SponsorProfileEditor from '../components/SponsorProfileEditor';
import CollaborationRequestsList from '../components/CollaborationRequestsList';
import SponsorshipPackagesManager from '../components/SponsorshipPackagesManager';
import SponsorTeamManager from '../components/SponsorTeamManager';
import SponsorshipRequestsManager from '../components/SponsorshipRequestsManager';
import { toast } from 'react-toastify';
import {
  HomeIcon,
  CogIcon,
  StarIcon,
  HandRaisedIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  SparklesIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';

type TabType = 'overview' | 'profile' | 'packages' | 'collaborations' | 'team' | 'requests';

const SponsorDashboard: React.FC = () => {
  const { sponsorUsername } = useParams<{ sponsorUsername: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [stats, setStats] = useState<ISponsorStats | null>(null);
  const [collaborationRequests, setCollaborationRequests] = useState<CollaborationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    if (!sponsorUsername) {
      setError('Sponsor username is required');
      setLoading(false);
      return;
    }

    fetchSponsorData();
  }, [sponsorUsername]);

  const fetchSponsorData = async () => {
    if (!sponsorUsername) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch sponsor data and verify ownership
      const [sponsorData, ownershipStatus] = await Promise.all([
        sponsorApi.getSponsorByUsername(sponsorUsername),
        sponsorApi.getOwnershipStatus(sponsorUsername)
      ]);

      if (!ownershipStatus.isOwner) {
        setError('You do not have permission to manage this sponsor');
        return;
      }

      setSponsor(sponsorData);

      // Fetch additional dashboard data
      const [statsData, requestsData] = await Promise.all([
        sponsorApi.getSponsorStats(sponsorUsername),
        sponsorApi.getCollaborationRequests(sponsorUsername)
      ]);

      setStats(statsData);
      setCollaborationRequests(requestsData);

    } catch (err: any) {
      console.error('Failed to fetch sponsor data:', err);
      setError(err.response?.data?.message || 'Failed to load sponsor dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSponsorUpdate = async (updatedSponsor: Sponsor) => {
    setSponsor(updatedSponsor);
    toast.success('Sponsor profile updated successfully');
  };

  const handleCollaborationUpdate = () => {
    // Refresh collaboration requests
    if (sponsorUsername) {
      sponsorApi.getCollaborationRequests(sponsorUsername)
        .then(setCollaborationRequests)
        .catch(console.error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/sponsors')}
            className="btn btn-primary"
          >
            Back to Sponsors
          </button>
        </div>
      </div>
    );
  }

  if (!sponsor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Sponsor Not Found</h2>
          <button
            onClick={() => navigate('/sponsors')}
            className="btn btn-primary"
          >
            Back to Sponsors
          </button>
        </div>
      </div>
    );
  }

  const pendingRequestsCount = collaborationRequests.filter(
    req => req.status === CollaborationStatus.PENDING
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {sponsor.logoUrl ? (
                <img 
                  src={sponsor.logoUrl} 
                  alt={sponsor.name}
                  className="w-16 h-16 rounded-lg object-cover border-2 border-primary-100 dark:border-primary-800"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-300">
                    {sponsor.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sponsor.name} Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your sponsor profile and collaborations
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/sponsors/${sponsor.username}`)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <HomeIcon className="h-4 w-4" />
              View Public Profile
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Overview', icon: ChartBarIcon },
              { id: 'profile', label: 'Profile', icon: CogIcon },
              { id: 'packages', label: 'Sponsorship Packages', icon: GiftIcon },
              { id: 'collaborations', label: `Collaborations ${pendingRequestsCount > 0 ? `(${pendingRequestsCount})` : ''}`, icon: HandRaisedIcon },
              { id: 'team', label: 'Team', icon: UserGroupIcon },
              { id: 'requests', label: 'Sponsorship Requests', icon: StarIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.id === 'collaborations' && pendingRequestsCount > 0 && (
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-red-800 dark:text-red-100">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard Overview</h2>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalEventsSponsored}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Events Sponsored</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalClubsPartnered}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Clubs Partnered</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.activeCollaborations}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Collaborations</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {collaborationRequests.slice(0, 5).map((request) => (
                  <div key={request._id} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <HandRaisedIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          New collaboration request from {request.clubId.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      request.status === CollaborationStatus.PENDING 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                        : request.status === CollaborationStatus.APPROVED
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                ))}
                {collaborationRequests.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No recent activity
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <SponsorProfileEditor
            sponsor={sponsor}
            onUpdate={handleSponsorUpdate}
          />
        )}

        {activeTab === 'packages' && (
          <SponsorshipPackagesManager
            sponsorUsername={sponsor.username}
            isOwner={true}
          />
        )}

        {activeTab === 'collaborations' && (
          <CollaborationRequestsList
            requests={collaborationRequests}
            onRequestUpdate={handleCollaborationUpdate}
          />
        )}

        {activeTab === 'team' && (
          <SponsorTeamManager
            sponsor={sponsor}
            onTeamUpdate={fetchSponsorData}
          />
        )}

        {activeTab === 'requests' && (
          <SponsorshipRequestsManager
            sponsor={sponsor}
          />
        )}
      </div>
    </div>
  );
};

export default SponsorDashboard; 