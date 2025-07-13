import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sponsorApi } from '../services/sponsor.service';
import { eventApi } from '../services/api';
import { Sponsor, CollaborationRequest } from '../types/sponsor';
import { Event, EventStatus } from '../types/event';
import { formatMessageTimestamp } from '../utils/formatTimestamp';
import { LoadingSpinner } from '../components/LoadingSpinner';
import SponsorFollowButton from '../components/SponsorFollowButton';
import SponsorPhotoGallery from '../components/SponsorPhotoGallery';
import CollaborationRequestModal from '../components/CollaborationRequestModal';
import SponsorTestimonials from '../components/SponsorTestimonials';
import SponsorChat from '../components/SponsorChat';
import SponsorshipPackagesManager from '../components/SponsorshipPackagesManager';
import ClubEventsSection from '../components/ClubEventsSection';
import { 
  LinkIcon, 
  MapPinIcon,
  BuildingOfficeIcon,
  UsersIcon,
  StarIcon,
  CheckBadgeIcon,
  CogIcon,
  SparklesIcon,
  PhotoIcon,
  ChatBubbleLeftIcon,
  GiftIcon,
  CalendarIcon,
  PlusIcon,
  InformationCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import CreateEventModal from '../components/CreateEventModal';

const SponsorProfilePage: React.FC = () => {
  const { sponsorUsername } = useParams<{ sponsorUsername: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownershipStatus, setOwnershipStatus] = useState<{ isOwner: boolean }>({ isOwner: false });
  const [activeTab, setActiveTab] = useState<'about' | 'packages' | 'chat' | 'testimonials' | 'events'>('about');
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [eventsTabInitialTab, setEventsTabInitialTab] = useState<EventStatus>(EventStatus.LIVE);
  const [sponsorEventsCount, setSponsorEventsCount] = useState(0);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);

  const fetchOwnershipStatus = useCallback(async () => {
    if (!sponsorUsername || !user) return;

    try {
      const status = await sponsorApi.getOwnershipStatus(sponsorUsername);
      setOwnershipStatus(status);
    } catch (err: any) {
      console.error('Failed to fetch ownership status:', err);
      setOwnershipStatus({ isOwner: false });
    }
  }, [sponsorUsername, user]);

  const fetchSponsorEventsCount = useCallback(async () => {
    if (!sponsorUsername || !user || !sponsor) return;

    try {
      const events = await eventApi.getEvents();
      const sponsorEvents = events.filter((event: Event) => {
        // Only show events where the sponsor has an actual sponsorship relationship
        // (either approved sponsorship or pending/rejected sponsorship requests)
        const isDirectSponsor = event.sponsors?.some((eventSponsor: any) => {
          if (typeof eventSponsor === 'object') {
            // New structure with approval status
            const sponsorData = eventSponsor.sponsorId;
            return (typeof sponsorData === 'string' ? sponsorData : sponsorData._id) === sponsor._id ||
                   (typeof sponsorData === 'object' && sponsorData.username === sponsor.username);
          } else {
            // Legacy structure (simple ID)
            return eventSponsor === sponsor._id;
          }
        });

        // Only return events with direct sponsorship relationship
        return isDirectSponsor;
      });
      setSponsorEventsCount(sponsorEvents.length);
    } catch (err: any) {
      console.error('Failed to fetch sponsor events count:', err);
      setSponsorEventsCount(0);
    }
  }, [sponsorUsername, user?.id, sponsor?._id]);

  const fetchSponsor = useCallback(async () => {
    if (!sponsorUsername) return;

    try {
      setLoading(true);
      const sponsorData = await sponsorApi.getSponsorByUsername(sponsorUsername);
      setSponsor(sponsorData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch sponsor:', err);
      setError(err.response?.data?.message || 'Failed to load sponsor');
      setSponsor(null);
    } finally {
      setLoading(false);
    }
  }, [sponsorUsername]);

  useEffect(() => {
    const fetchData = async () => {
      if (!sponsorUsername) return;
      
      try {
        setLoading(true);
        const sponsorData = await sponsorApi.getSponsorByUsername(sponsorUsername);
        setSponsor(sponsorData);
        setError(null);
        
        // Fetch events count after sponsor data is loaded
        if (user) {
          fetchSponsorEventsCount();
        }
      } catch (err: any) {
        console.error('Failed to fetch sponsor:', err);
        setError(err.response?.data?.message || 'Failed to load sponsor');
        setSponsor(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sponsorUsername]);

  // Separate useEffect for fetching events count
  useEffect(() => {
    if (sponsor && user) {
      fetchSponsorEventsCount();
    }
  }, [sponsor?._id, user?.id, fetchSponsorEventsCount]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !sponsor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Sponsor Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'The sponsor you are looking for does not exist.'}</p>
          <Link to="/sponsors" className="btn btn-primary">
            Browse Sponsors
          </Link>
        </div>
      </div>
    );
  }

  const isSponsorOwner = ownershipStatus.isOwner;

  // Alternative ownership check - if user created the sponsor
  const isCreator = user && sponsor?.createdBy && (
    (typeof sponsor.createdBy === 'object' && sponsor.createdBy._id === user.id) ||
    (typeof sponsor.createdBy === 'string' && sponsor.createdBy === user.id)
  );

  const canManageSponsor = isSponsorOwner || isCreator;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Settings Button - Top Right */}
      {user && canManageSponsor && (
        <div className="fixed top-20 right-4 z-40">
          <Link
            to={`/sponsors/${sponsor.username}/dashboard`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg flex items-center gap-2 font-medium"
            title="Manage Sponsor Dashboard"
          >
            <CogIcon className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </Link>
        </div>
      )}

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28">
        
        {/* Instagram-Style Hero Section */}
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 mb-12">
          {/* Sponsor Logo - Left Side */}
          <div className="flex justify-center sm:justify-start flex-shrink-0">
            {sponsor.logoUrl ? (
              <img 
                src={sponsor.logoUrl} 
                alt={sponsor.name}
                className="w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover ring-4 ring-gray-100 dark:ring-gray-700 shadow-xl"
              />
            ) : (
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center ring-4 ring-gray-100 dark:ring-gray-700 shadow-xl">
                <span className="text-5xl sm:text-6xl font-bold text-white">
                  {sponsor.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Sponsor Info - Right Side */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            {/* Sponsor Name */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white tracking-tight mb-4 sm:mb-0">
                {sponsor.name}
              </h1>
              
              {/* Dynamic Follow Button */}
              {user && !canManageSponsor && (
                <SponsorFollowButton 
                  sponsorId={sponsor._id}
                  onFollowChange={fetchSponsor}
                />
              )}
            </div>

            {/* Username with verification badges */}
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-6">
              <span className="text-gray-600 dark:text-gray-400">@{sponsor.username}</span>
              {sponsor.isVerified && (
                <SparklesIcon className="h-5 w-5 text-blue-500" title="Verified Sponsor" />
              )}
              {sponsor.isFeatured && (
                <StarIcon className="h-5 w-5 text-yellow-500" title="Featured Sponsor" />
              )}
            </div>

            {/* Instagram-Style Metrics Row */}
            <div className="grid grid-cols-3 gap-6 mb-6 max-w-sm mx-auto sm:mx-0">
              <div className="text-center">
                <button 
                  onClick={() => {
                    setEventsTabInitialTab(EventStatus.LIVE);
                    setActiveTab('events');
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity w-full"
                >
                  <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-none">
                    {sponsorEventsCount}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-normal h-8 flex items-center justify-center mt-1">
                    events
                  </div>
                </button>
              </div>
              
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-none">
                  {sponsor.stats.totalClubsPartnered}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-normal h-8 flex items-center justify-center mt-1">
                  <span className="leading-none">clubs<br/>partnered</span>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-none">
                  {sponsor.followers.length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-normal h-8 flex items-center justify-center mt-1">
                  followers
                </div>
              </div>
            </div>

            {/* Sponsor Bio */}
            <div className="mb-6 max-w-lg">
              {sponsor.bio && (
                <p className="text-gray-900 dark:text-white text-base leading-relaxed mb-3">
                  {sponsor.bio}
                </p>
              )}
              
              {/* Category Tag Only */}
              <div className="flex justify-center sm:justify-start gap-2 flex-wrap mb-3">
                {sponsor.category && (
                  <span className="inline-flex items-center px-3 py-1 bg-primary-100 dark:bg-primary-800 text-primary-800 dark:text-primary-100 rounded-full text-sm font-medium">
                    {sponsor.category}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              {user && !canManageSponsor && (
                <div className="flex justify-center sm:justify-start gap-3">
                  <button
                    onClick={() => setShowCollaborationModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <CheckBadgeIcon className="h-4 w-4" />
                    Request Collaboration
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Announcement */}
        {sponsor.pinnedAnnouncement && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-6 h-6 bg-amber-400 dark:bg-amber-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">📌</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                  Pinned Announcement
                </h3>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  {sponsor.pinnedAnnouncement}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === 'about' && (
            <div className="space-y-8">
              {/* Service Areas/Locations */}
              {sponsor.locations.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MapPinIcon className="h-5 w-5 text-blue-500" />
                    Service Areas
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {sponsor.locations.map((location, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center hover:shadow-md transition-shadow"
                      >
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-2">
                          <MapPinIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{location}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Service Area</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                    We serve clients and sponsor events in these areas!
                  </p>
                </div>
              )}

              {/* Exact Location */}
              {sponsor.exactLocation && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MapPinIcon className="h-5 w-5 text-blue-500" />
                    Location
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4 text-blue-500" />
                      {sponsor.exactLocation}
                    </p>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {(sponsor.phoneNumber || sponsor.publicEmail) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <UsersIcon className="h-5 w-5 text-green-500" />
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    {sponsor.phoneNumber && (
                      <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                          <span className="text-lg">📞</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">Phone</div>
                          <a 
                            href={`tel:${sponsor.phoneNumber}`}
                            className="text-green-600 dark:text-green-400 hover:underline"
                          >
                            {sponsor.phoneNumber}
                          </a>
                        </div>
                      </div>
                    )}
                    {sponsor.publicEmail && (
                      <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <span className="text-lg">📧</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">Email</div>
                          <a 
                            href={`mailto:${sponsor.publicEmail}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {sponsor.publicEmail}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Our Links */}
              {sponsor.socialLinks.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-purple-500" />
                    Our Links
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sponsor.socialLinks.map((link, index) => {
                      // Get platform-specific styling and icons
                      const getPlatformStyle = (platform: string) => {
                        const lowerPlatform = platform.toLowerCase();
                        if (lowerPlatform.includes('instagram')) {
                          return {
                            bgColor: 'bg-gradient-to-br from-purple-500 to-pink-500',
                            textColor: 'text-white',
                            hoverBg: 'hover:from-purple-600 hover:to-pink-600',
                            icon: '📸'
                          };
                        } else if (lowerPlatform.includes('twitter') || lowerPlatform.includes('x.com') || lowerPlatform.includes('x')) {
                          return {
                            bgColor: 'bg-black dark:bg-gray-800',
                            textColor: 'text-white',
                            hoverBg: 'hover:bg-gray-800 dark:hover:bg-gray-700',
                            icon: '𝕏'
                          };
                        } else if (lowerPlatform.includes('youtube')) {
                          return {
                            bgColor: 'bg-red-600',
                            textColor: 'text-white',
                            hoverBg: 'hover:bg-red-700',
                            icon: '▶️'
                          };
                        } else if (lowerPlatform.includes('discord')) {
                          return {
                            bgColor: 'bg-indigo-600',
                            textColor: 'text-white',
                            hoverBg: 'hover:bg-indigo-700',
                            icon: '💬'
                          };
                        } else if (lowerPlatform.includes('facebook')) {
                          return {
                            bgColor: 'bg-blue-600',
                            textColor: 'text-white',
                            hoverBg: 'hover:bg-blue-700',
                            icon: '📘'
                          };
                        } else if (lowerPlatform.includes('linkedin')) {
                          return {
                            bgColor: 'bg-blue-700',
                            textColor: 'text-white',
                            hoverBg: 'hover:bg-blue-800',
                            icon: '💼'
                          };
                        } else if (lowerPlatform.includes('tiktok')) {
                          return {
                            bgColor: 'bg-black dark:bg-gray-800',
                            textColor: 'text-white',
                            hoverBg: 'hover:bg-gray-800 dark:hover:bg-gray-700',
                            icon: '🎵'
                          };
                        } else if (platform.toLowerCase().includes('website') || platform.toLowerCase().includes('web') || link.url.includes('http')) {
                          return {
                            bgColor: 'bg-gray-100 dark:bg-gray-700',
                            textColor: 'text-gray-900 dark:text-white',
                            hoverBg: 'hover:bg-gray-200 dark:hover:bg-gray-600',
                            icon: '🌐'
                          };
                        } else {
                          return {
                            bgColor: 'bg-purple-100 dark:bg-purple-900',
                            textColor: 'text-purple-900 dark:text-purple-100',
                            hoverBg: 'hover:bg-purple-200 dark:hover:bg-purple-800',
                            icon: '🔗'
                          };
                        }
                      };

                      const style = getPlatformStyle(link.platform);
                      
                      // Extract username/handle from URL if it's a social media link
                      const getDisplayHandle = (url: string, platform: string) => {
                        try {
                          const urlObj = new URL(url);
                          const pathname = urlObj.pathname;
                          
                          if (platform.toLowerCase().includes('instagram')) {
                            const handle = pathname.split('/').filter(Boolean)[0];
                            return handle ? `@${handle}` : platform;
                          } else if (platform.toLowerCase().includes('twitter') || platform.toLowerCase().includes('x.com') || platform.toLowerCase().includes('x')) {
                            const handle = pathname.split('/').filter(Boolean)[0];
                            return handle ? `@${handle}` : platform;
                          } else if (platform.toLowerCase().includes('youtube')) {
                            const handle = pathname.split('/').filter(Boolean).pop();
                            return handle?.startsWith('@') ? handle : platform;
                          } else if (platform.toLowerCase().includes('tiktok')) {
                            const handle = pathname.split('/').filter(Boolean)[0];
                            return handle?.startsWith('@') ? handle : (handle ? `@${handle}` : platform);
                          } else if (platform.toLowerCase().includes('linkedin')) {
                            return platform;
                          } else {
                            return platform;
                          }
                        } catch {
                          return platform;
                        }
                      };

                      return (
                        <a
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-3 p-4 ${style.bgColor} ${style.hoverBg} rounded-xl transition-all duration-200 group shadow-sm hover:shadow-md`}
                        >
                          <div className="text-2xl">
                            {style.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold ${style.textColor} group-hover:scale-105 transition-transform`}>
                              {getDisplayHandle(link.url, link.platform)}
                            </div>
                            <div className={`text-sm ${style.textColor} opacity-80`}>
                              {link.platform}
                            </div>
                          </div>
                          <div className={`${style.textColor} opacity-60 group-hover:opacity-100 transition-opacity`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Photo Gallery */}
              {sponsor.galleryImages.length > 0 && (
                <SponsorPhotoGallery
                  sponsor={sponsor}
                  isOwner={isSponsorOwner}
                  onGalleryChange={fetchSponsor}
                />
              )}

              {/* Our Mission */}
              {sponsor.mission && sponsor.mission.trim() && (
                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    Our Mission
                  </h3>
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {sponsor.mission}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'packages' && (
            <SponsorshipPackagesManager 
              sponsorUsername={sponsor.username}
              isOwner={isSponsorOwner}
            />
          )}

          {activeTab === 'chat' && (
            <SponsorChat 
              sponsor={sponsor}
              isOwner={isSponsorOwner}
            />
          )}

          {activeTab === 'testimonials' && (
            <SponsorTestimonials 
              sponsor={sponsor}
              onTestimonialsChange={fetchSponsor}
            />
          )}

          {activeTab === 'events' && (
            <div className="space-y-6">
              {/* Create Event Button */}
              {ownershipStatus.isOwner && (
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Events</h2>
                    <button
                      onClick={() => setEventsTabInitialTab(EventStatus.DRAFT)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        eventsTabInitialTab === EventStatus.DRAFT
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      View Drafts
                    </button>
                  </div>
                  <button
                    onClick={() => setIsCreateEventModalOpen(true)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Create Event
                  </button>
                </div>
              )}

              {/* Events Section */}
              <ClubEventsSection
                clubId={sponsor._id}
                clubUsername={sponsor.username}
                isAdmin={ownershipStatus.isOwner}
                isMember={false}
                initialTab={eventsTabInitialTab}
                showDrafts={ownershipStatus.isOwner}
                isSponsorship={true}
              />

              {/* Sponsorship Info Alert */}
              {ownershipStatus.isOwner && (
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <InformationCircleIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Event Creation Tips
                      </h3>
                      <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Create draft events to plan your sponsorships</li>
                          <li>To publish a live event, you'll need to collaborate with a club</li>
                          <li>Your drafts are only visible to you and your team</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs - Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-30">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex justify-around py-2" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('about')}
              className={`${
                activeTab === 'about'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              } py-3 px-4 flex flex-col items-center text-xs font-medium transition-colors min-w-0`}
            >
              <BuildingOfficeIcon className="h-5 w-5 mb-1" />
              <span className="truncate">About</span>
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`${
                activeTab === 'packages'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              } py-3 px-4 flex flex-col items-center text-xs font-medium transition-colors min-w-0`}
            >
              <GiftIcon className="h-5 w-5 mb-1" />
              <span className="truncate">Packages</span>
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`${
                activeTab === 'events'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              } py-3 px-4 flex flex-col items-center text-xs font-medium transition-colors min-w-0`}
            >
              <CalendarIcon className="h-5 w-5 mb-1" />
              <span className="truncate">Events</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`${
                activeTab === 'chat'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              } py-3 px-4 flex flex-col items-center text-xs font-medium transition-colors min-w-0`}
            >
              <ChatBubbleLeftIcon className="h-5 w-5 mb-1" />
              <span className="truncate">Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('testimonials')}
              className={`${
                activeTab === 'testimonials'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              } py-3 px-4 flex flex-col items-center text-xs font-medium transition-colors min-w-0`}
            >
              <StarIcon className="h-5 w-5 mb-1" />
              <span className="truncate">Reviews</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Collaboration Request Modal */}
      {showCollaborationModal && (
        <CollaborationRequestModal
          sponsor={sponsor}
          onClose={() => setShowCollaborationModal(false)}
          onSubmit={async (requestData) => {
            try {
              await sponsorApi.createCollaborationRequest(sponsor.username, requestData);
              toast.success('Collaboration request sent successfully!');
              setShowCollaborationModal(false);
            } catch (error: any) {
              toast.error(error.response?.data?.message || 'Failed to send collaboration request');
            }
          }}
        />
      )}

      {/* Create Event Modal */}
      {isCreateEventModalOpen && (
        <CreateEventModal
          isOpen={isCreateEventModalOpen}
          onClose={() => setIsCreateEventModalOpen(false)}
          clubId={sponsor._id}
          clubUsername={sponsor.username}
          isSponsorship={true}
        />
      )}
    </div>
  );
};

export default SponsorProfilePage; 