import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clubApi } from '../services/club.service';
import { Club, AddClubCommentDto, MembershipStatus } from '../types/club';
import { formatMessageTimestamp } from '../utils/formatTimestamp';
import { LoadingSpinner } from '../components/LoadingSpinner';
import ClubJoinButton from '../components/ClubJoinButton';
import ClubChat from '../components/ClubChat';
import ClubMemberList from '../components/ClubMemberList';
import InstagramFeed from '../components/InstagramFeed';
import ClubBottomNavbar from '../components/ClubBottomNavbar';
import ClubPhotoGallery from '../components/ClubPhotoGallery';
import ClubEventsSection from '../components/ClubEventsSection';
import SponsorsModal from '../components/SponsorsModal';
import { 
  LinkIcon, 
  CalendarIcon,
  ChatBubbleLeftIcon,
  PhotoIcon,
  UsersIcon,
  ChatBubbleOvalLeftIcon,
  CogIcon,
  MapPinIcon,
  PaperAirplaneIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { EventStatus } from '../types/event';

const ClubProfilePage: React.FC = () => {
  const { clubUsername } = useParams<{ clubUsername: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>({
    isMember: false,
    isAdmin: false,
  });
  const [activeTab, setActiveTab] = useState<'about' | 'events' | 'comments' | 'chat' | 'members'>('about');
  const [commentForm, setCommentForm] = useState<AddClubCommentDto>({
    authorName: '',
    authorEmail: '',
    content: '',
  });
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showSponsorsModal, setShowSponsorsModal] = useState(false);
  const [clubEventsCount, setClubEventsCount] = useState(0);
  const [eventsTabInitialTab, setEventsTabInitialTab] = useState<EventStatus>(EventStatus.LIVE);

  const fetchMembershipStatus = useCallback(async () => {
    if (!clubUsername || !user) return;

    try {
      const status = await clubApi.getMembershipStatus(clubUsername);
      setMembershipStatus(status);
    } catch (err: any) {
      console.error('Failed to fetch membership status:', err);
      setMembershipStatus({ isMember: false, isAdmin: false });
    }
  }, [clubUsername, user]);

  useEffect(() => {
    const fetchClub = async () => {
      if (!clubUsername) return;
      
      try {
        setLoading(true);
        const clubData = await clubApi.getClubByUsername(clubUsername);
        setClub(clubData);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load club');
      } finally {
        setLoading(false);
      }
    };

    const fetchClubEvents = async () => {
    if (!clubUsername || !user) return;

    try {
        const eventsCount = await clubApi.getClubEventsCount(clubUsername);
        setClubEventsCount(eventsCount);
    } catch (err: any) {
        console.error('Failed to fetch club events count:', err);
        setClubEventsCount(0);
    }
  };

    if (clubUsername) {
      fetchClub();
      if (user) {
      fetchMembershipStatus();
        fetchClubEvents();
      }
    }
  }, [clubUsername, user?.id, fetchMembershipStatus]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club || !commentForm.content.trim() || !commentForm.authorName.trim()) return;

    try {
      setSubmittingComment(true);
      
      // Create comment data and only include email if it's not empty
      const commentData: any = {
        authorName: commentForm.authorName.trim(),
        content: commentForm.content.trim(),
      };
      
      // Only include email if it's provided and not empty
      if (commentForm.authorEmail && commentForm.authorEmail.trim()) {
        commentData.authorEmail = commentForm.authorEmail.trim();
      }
      
      const updatedClub = await clubApi.addComment(club.username, commentData);
      setClub(updatedClub);
      setCommentForm({ authorName: '', authorEmail: '', content: '' });
      toast.success('Comment added successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const isClubCreator = user && (club?.createdBy?._id === user.id || club?.club_founder?._id === user.id);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-600 py-8">{error}</div>;
  if (!club) return <div className="text-center py-8">Club not found</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-24">
      {/* Fixed Action Buttons - Top Right Corner */}
      <div className="fixed top-20 right-4 z-40">
        {/* Admin Dashboard Link */}
        {(membershipStatus.isAdmin || isClubCreator) && (
          <Link
            to={`/clubs/${club.username}/admin`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg flex items-center gap-2 font-medium"
            title="Manage Club Dashboard"
          >
            <CogIcon className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </Link>
        )}
      </div>

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28">
        
        {/* Instagram-Style Hero Section */}
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 mb-12">
          {/* Club Logo - Left Side */}
          <div className="flex justify-center sm:justify-start flex-shrink-0">
            {club.logoUrl ? (
              <img 
                src={club.logoUrl} 
                alt={club.name}
                className="w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover ring-4 ring-gray-100 dark:ring-gray-700 shadow-xl"
              />
            ) : (
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center ring-4 ring-gray-100 dark:ring-gray-700 shadow-xl">
                <span className="text-5xl sm:text-6xl font-bold text-white">
                  {club.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Club Info - Right Side */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            {/* Club Name with Join Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white tracking-tight mb-4 sm:mb-0">
              {club.name}
            </h1>
              
              {/* Dynamic Join/Joined Button */}
              {user && !isClubCreator && (
                <ClubJoinButton 
                  clubUsername={club.username}
                  clubId={club._id}
                  onMembershipChange={fetchMembershipStatus}
                />
              )}
            </div>

            {/* Instagram-Style Metrics Row */}
            <div className="flex justify-center sm:justify-start gap-8 mb-6">
              <div className="text-center">
                <button 
                  onClick={() => {
                    setEventsTabInitialTab(EventStatus.LIVE);
                    setActiveTab('events');
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                <span className="block text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                    {clubEventsCount}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">events</span>
                </button>
              </div>
              
              <div className="text-center">
                <button 
                  onClick={() => setActiveTab('members')}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                <span className="block text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {club.members.length}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">members</span>
                </button>
              </div>
              
              <div className="text-center">
                <button 
                  onClick={() => setShowSponsorsModal(true)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                <span className="block text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                    {club.sponsors?.length || 0}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">sponsors</span>
                </button>
              </div>
            </div>

            {/* Club Bio */}
            <div className="mb-6 max-w-lg">
              {club.description && (
                <p className="text-gray-900 dark:text-white text-base leading-relaxed mb-3">
                  {club.description}
                </p>
              )}
              
              {/* Location Tags */}
              {club.activeCities && club.activeCities.length > 0 && (
                <div className="flex justify-center sm:justify-start gap-2 flex-wrap mb-3">
                  {club.activeCities.map((city, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium"
                    >
                      <MapPinIcon className="h-3 w-3" />
                      {city}
                    </span>
                  ))}
                </div>
              )}

              {/* Sponsor Tags */}
              {club.sponsors && club.sponsors.length > 0 && (
                <div className="flex justify-center sm:justify-start gap-2 flex-wrap items-center">
                  {/* Show featured sponsors first */}
                  {club.sponsors.filter(s => s.isFeatured).length > 0 ? (
                    <>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Featured Sponsors:</span>
                      {club.sponsors
                        .filter(sponsor => sponsor.isFeatured)
                        .map((sponsor, index) => (
                          <button
                            key={index}
                            onClick={() => setShowSponsorsModal(true)}
                            className="inline-flex items-center px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 text-sm font-medium rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-900/30 transition-colors cursor-pointer"
                          >
                            {sponsor.name}
                          </button>
                        ))}
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Sponsored by:</span>
                      {club.sponsors.slice(0, 2).map((sponsor, index) => (
                        <button
                    key={index}
                          onClick={() => setShowSponsorsModal(true)}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                  >
                          {sponsor.name}
                        </button>
                      ))}
                      {club.sponsors.length > 2 && (
                        <button
                          onClick={() => setShowSponsorsModal(true)}
                          className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                          +{club.sponsors.length - 2} more
                        </button>
                      )}
                    </>
                  )}
              </div>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Message/Announcement */}
        {club.pinnedMessage && (
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
                  {club.pinnedMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === 'about' && (
            <div className="space-y-8">
                {/* Active Cities Section */}
                {club.activeCities && club.activeCities.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <MapPinIcon className="h-5 w-5 text-blue-500" />
                      Where We're Active
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {club.activeCities.map((city, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center hover:shadow-md transition-shadow"
                        >
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-2">
                            <MapPinIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">{city}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active Location</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                      Join us for events and meetups in these cities!
                    </p>
                  </div>
                )}

              {/* Our Links */}
              {club.socialLinks.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-purple-500" />
                    Our Links
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {club.socialLinks.map((link, index) => {
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
                        } else if (lowerPlatform.includes('twitter') || lowerPlatform.includes('x.com')) {
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
                        } else if (lowerPlatform.includes('chess.com') || lowerPlatform.includes('chess')) {
                          return {
                            bgColor: 'bg-green-600',
                            textColor: 'text-white',
                            hoverBg: 'hover:bg-green-700',
                            icon: '♟️'
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
                        } else if (lowerPlatform.includes('website') || lowerPlatform.includes('web') || link.url.includes('http')) {
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
                          } else if (platform.toLowerCase().includes('twitter') || platform.toLowerCase().includes('x.com')) {
                            const handle = pathname.split('/').filter(Boolean)[0];
                            return handle ? `@${handle}` : platform;
                          } else if (platform.toLowerCase().includes('chess.com')) {
                            const handle = pathname.split('/').filter(Boolean).pop();
                            return handle || platform;
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
              {club.photoGallery.length > 0 && (
                <ClubPhotoGallery
                  photos={club.photoGallery}
                  onPhotosChange={() => {}} // Read-only for viewing
                  isEditable={false}
                />
              )}

              {/* Our Mission */}
              {club.mission && club.mission.trim() && (
                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    Our Mission
                  </h3>
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {club.mission}
                    </p>
                  </div>
                      </div>
              )}

              {/* Our Story */}
              {club.story && club.story.trim() && (
                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    Our Story
                  </h3>
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {club.story}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <ClubEventsSection
              clubId={club._id}
              clubUsername={club.username}
              isAdmin={membershipStatus.isAdmin || isClubCreator || false}
              isMember={membershipStatus.isMember || false}
              initialTab={eventsTabInitialTab}
            />
          )}

          {activeTab === 'comments' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                  <ChatBubbleLeftIcon className="h-6 w-6 text-blue-500" />
                  Community Comments
                </h2>

                {/* Comment Form */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Share Your Thoughts</h3>
                  <form onSubmit={handleSubmitComment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="authorName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          id="authorName"
                          value={commentForm.authorName}
                          onChange={(e) => setCommentForm({ ...commentForm, authorName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="authorEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email (optional)
                        </label>
                        <input
                          type="email"
                          id="authorEmail"
                          value={commentForm.authorEmail}
                          onChange={(e) => setCommentForm({ ...commentForm, authorEmail: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Comment *
                      </label>
                      <textarea
                        id="content"
                        rows={4}
                        value={commentForm.content}
                        onChange={(e) => setCommentForm({ ...commentForm, content: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Share your thoughts about this club..."
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingComment || !commentForm.content.trim() || !commentForm.authorName.trim()}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                    >
                      {submittingComment ? 'Posting...' : 'Post Comment'}
                    </button>
                  </form>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {club.comments.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ChatBubbleLeftIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No comments yet</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Be the first to leave a comment!
                      </p>
                    </div>
                  ) : (
                    club.comments
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((comment) => (
                        <div key={comment._id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-sm">
                                {comment.authorName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  {comment.authorName}
                                </h4>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {formatMessageTimestamp(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <ClubChat 
              clubUsername={club.username} 
              isMember={membershipStatus.isMember} 
              isAdmin={membershipStatus.isAdmin || isClubCreator || false}
            />
          )}

          {activeTab === 'members' && (
            <ClubMemberList 
              clubUsername={club.username} 
              isAdmin={membershipStatus.isAdmin}
              club={club}
            />
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <ClubBottomNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showChat={membershipStatus.isMember || false}
        showMembers={true}
        footerElementId="global-footer"
      />

      {/* Sponsors Modal */}
      <SponsorsModal
        sponsors={club.sponsors || []}
        isOpen={showSponsorsModal}
        onClose={() => setShowSponsorsModal(false)}
      />
    </div>
  );
};

export default ClubProfilePage; 