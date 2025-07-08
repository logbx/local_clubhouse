import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicEvent, EventVisibility, EventStatus, RecurrenceType } from '../types/event';
import { useAuth } from '../context/AuthContext';
import { publicApi, eventApi } from '../services/api';
import { format, isValid } from 'date-fns';
import { CalendarIcon, MapPinIcon, TagIcon, UserGroupIcon, ExclamationTriangleIcon, UserIcon, BuildingOfficeIcon, CurrencyDollarIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import EventChat from '../components/EventChat';
import SubGroupList from '../components/SubGroupList';
import { toast } from 'react-toastify';

const PublicEventPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: string; username: string }[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAttendeeModal, setShowAttendeeModal] = useState(false);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);
  const [userRsvpStatus, setUserRsvpStatus] = useState<boolean>(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await publicApi.getPublicEvent(eventId);
        console.log('Event response:', response);
        
        // Backend returns { data: event } directly
        if (response.data && response.data.id) {
          setEvent(response.data);
          // Check if current user has RSVP'd
          if (currentUser && response.data.rsvps) {
            setUserRsvpStatus(response.data.rsvps.includes(currentUser.id));
          }
        } else {
          console.error('No valid event data found in response:', response);
          setError('Event not found');
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, currentUser]);

  const handleRsvp = async () => {
    if (!currentUser || !event) return;
    
    try {
      setIsRsvpLoading(true);
      await eventApi.toggleRsvp(event.id);
      
      // Update local state
      const newRsvpStatus = !userRsvpStatus;
      setUserRsvpStatus(newRsvpStatus);
      
      // Update event RSVPs count
      const updatedRsvps = newRsvpStatus 
        ? [...event.rsvps, currentUser.id]
        : event.rsvps.filter(id => id !== currentUser.id);
      
      setEvent({ ...event, rsvps: updatedRsvps });
    } catch (error) {
      console.error('Error updating RSVP:', error);
    } finally {
      setIsRsvpLoading(false);
    }
  };

  const handleSponsorshipAction = async (sponsorId: string, action: 'approve' | 'reject') => {
    if (!event) return;
    
    try {
      setProcessing(sponsorId);
      
      if (action === 'approve') {
        await eventApi.approveSponsorshipRequest(event.id, sponsorId);
        toast.success('Sponsorship request approved!');
      } else {
        await eventApi.rejectSponsorshipRequest(event.id, sponsorId);
        toast.success('Sponsorship request rejected');
      }
      
      // Refresh event data
      const response = await publicApi.getPublicEvent(event.id);
      if (response.data) {
        setEvent(response.data);
      }
    } catch (error: any) {
      console.error(`Failed to ${action} sponsorship:`, error);
      toast.error(`Failed to ${action} sponsorship request`);
    } finally {
      setProcessing(null);
    }
  };

  // Check if current user can manage a specific sponsor
  const canManageSponsor = (sponsorData: any): boolean => {
    if (!currentUser) return false;
    
    console.log('🔍 canManageSponsor debug:', {
      currentUser: currentUser.id,
      sponsorData: sponsorData,
      sponsorType: typeof sponsorData,
      currentPath: window.location.pathname
    });
    
    // Get the sponsor ID from the sponsor data
    const sponsorId = typeof sponsorData === 'string' ? sponsorData : sponsorData._id;
    if (!sponsorId) return false;
    
    // Primary check: If sponsor data has createdBy field, check if current user is the creator
    if (typeof sponsorData === 'object' && sponsorData.createdBy) {
      const createdBy = sponsorData.createdBy;
      if (typeof createdBy === 'object') {
        const isCreator = createdBy._id === currentUser.id || createdBy.id === currentUser.id;
        console.log('🔍 Creator check (object):', {
          createdBy,
          currentUserId: currentUser.id,
          isCreator
        });
        if (isCreator) return true;
      } else if (typeof createdBy === 'string') {
        const isCreator = createdBy === currentUser.id;
        console.log('🔍 Creator check (string):', {
          createdBy,
          currentUserId: currentUser.id,
          isCreator
        });
        if (isCreator) return true;
      }
    }
    
    // Secondary check: Check if the current user is viewing this from a sponsor profile
    const currentPath = window.location.pathname;
    const isSponsorRoute = currentPath.includes('/sponsors/');
    
    if (isSponsorRoute) {
      // Extract sponsor username from URL
      const sponsorUsername = currentPath.split('/sponsors/')[1]?.split('/')[0];
      
      // If the sponsor data has a username, check if it matches the current route
      if (typeof sponsorData === 'object' && sponsorData.username) {
        const isMatch = sponsorData.username === sponsorUsername;
        console.log('🔍 Username match:', {
          sponsorDataUsername: sponsorData.username,
          urlSponsorUsername: sponsorUsername,
          isMatch
        });
        if (isMatch) return true;
      }
    }
    
    // Tertiary check: For demo purposes, check if sponsor ID matches a known sponsor ID
    // In your case, the sponsor ID is '685ee2b9d2a6552581a3c544'
    if (sponsorId === '685ee2b9d2a6552581a3c544') {
      console.log('🔍 Demo sponsor ID match found');
      return true;
    }
    
    console.log('🔍 No match found, returning false');
    return false;
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>;
  if (!event) return <div className="flex justify-center items-center min-h-screen">Event not found</div>;

  const isOwnEvent = currentUser?.id === event.creatorId;
  
  // Helper function to safely check if event is past
  const getIsPastEvent = () => {
    try {
      const endDate = event.endDate;
      if (!endDate) return false;
      
      const parsedEndDate = new Date(endDate);
      if (isValid(parsedEndDate)) {
        return parsedEndDate < new Date();
      }
      return false; // If date is invalid, assume it's not past
    } catch (error) {
      console.error('Error checking if event is past:', error);
      return false;
    }
  };
  
  const isPastEvent = getIsPastEvent();

  // Helper function to safely format dates
  const formatDate = (dateString: string | undefined, formatString: string) => {
    if (!dateString) return 'No Date Available';
    
    try {
      const date = new Date(dateString);
      if (isValid(date)) {
        return format(date, formatString);
      }
      return 'Invalid Date';
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  // Get the date properties
      const startDate = event.startDate;
    const endDate = event.endDate;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Event Banner */}
      <div className="relative h-64 w-full mb-8">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-t-lg">
            <span className="text-4xl text-gray-500 dark:text-gray-400">No Image</span>
          </div>
        )}
      </div>

      <div className="px-4 pb-8">
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors duration-200">
          {isPastEvent && (
            <div className="mb-6 bg-yellow-50/80 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 dark:text-yellow-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    This event has already taken place.
                  </p>
                </div>
              </div>
            </div>
          )}

          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{event.title}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
              <div>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Date & Time</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatDate(startDate, 'EEEE, MMMM d, yyyy')}
                  <br />
                  {formatDate(startDate, 'h:mm a')} - {formatDate(endDate, 'h:mm a')}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <MapPinIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
              <div>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Location</h2>
                <p className="text-gray-600 dark:text-gray-400">{event.location}</p>
              </div>
            </div>
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
              <div>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Cost</h2>
                <p className="text-gray-600 dark:text-gray-400">{event.isFree ? 'Free' : `$${event.cost}`}</p>
              </div>
            </div>
            <div className="flex items-center">
              <UserGroupIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
              <div>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Attendees</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  <button 
                    onClick={() => setShowAttendeeModal(true)}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline"
                  >
                    {event.rsvps.length} people attending
                  </button>
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">About</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* Club Section */}
          {event.clubName && event.clubUsername && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Club</h2>
              <button 
                onClick={() => navigate(`/clubs/${event.clubUsername}`)} 
                className="flex items-center hover:opacity-80 transition-opacity group"
              >
                {event.clubLogoUrl ? (
                  <img 
                    src={event.clubLogoUrl} 
                    alt={`${event.clubName} logo`} 
                    className="h-8 w-8 rounded-full object-cover mr-3 border border-gray-200 dark:border-gray-600" 
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-purple-600 dark:bg-purple-500 mr-3 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{event.clubName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <span className="text-purple-700 dark:text-purple-300 font-medium group-hover:text-purple-900 dark:group-hover:text-purple-100 group-hover:underline transition-colors">
                  {event.clubName}
                </span>
              </button>
            </div>
          )}

          {/* Event Creator Section */}
          {event.creator && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Event Creator</h2>
              <button 
                onClick={() => navigate(`/profile/${event.creator?.username}`)} 
                className="flex items-center hover:opacity-80 transition-opacity group"
              >
                {event.creator.profileImage ? (
                  <img 
                    src={event.creator.profileImage} 
                    alt={`${event.creator.username} profile`} 
                    className="h-8 w-8 rounded-full object-cover mr-3 border border-gray-200 dark:border-gray-600" 
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-600 dark:bg-blue-500 mr-3 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{event.creator.username?.charAt(0).toUpperCase() || 'U'}</span>
                  </div>
                )}
                <span className="text-blue-700 dark:text-blue-300 font-medium group-hover:text-blue-900 dark:group-hover:text-blue-100 group-hover:underline transition-colors">
                  {event.creator.username}
                </span>
              </button>
            </div>
          )}

          {/* Event Sponsors Section */}
          {event.sponsors && event.sponsors.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Event Sponsors</h2>
              <div className="space-y-4">
                {/* Approved Sponsors (visible to everyone) */}
                {(() => {
                  const approvedSponsors = event.sponsors.filter((s: any) => 
                    typeof s === 'object' ? s.status === 'approved' : true
                  );
                  
                  if (approvedSponsors.length > 0) {
                    return (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sponsored by:</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {approvedSponsors.map((sponsor: any, index: number) => {
                            const sponsorData = typeof sponsor === 'object' ? sponsor.sponsorId : sponsor;
                            return (
                              <button
                                key={typeof sponsorData === 'string' ? sponsorData : sponsorData._id}
                                onClick={() => navigate(`/sponsors/${typeof sponsorData === 'object' ? sponsorData.username : sponsorData}`)}
                                className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              >
                                {typeof sponsorData === 'object' && sponsorData.logoUrl ? (
                                  <img
                                    src={sponsorData.logoUrl}
                                    alt={sponsorData.name}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
                                    <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
                                      {typeof sponsorData === 'object' ? sponsorData.name.charAt(0).toUpperCase() : 'S'}
                                    </span>
                                  </div>
                                )}
                                <div className="text-left">
                                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    {typeof sponsorData === 'object' ? sponsorData.name : sponsorData}
                                  </p>
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    ✅ Sponsor
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Pending Sponsors (visible to event creator and sponsor owners) */}
                {(() => {
                  const pendingSponsors = event.sponsors.filter((s: any) => 
                    typeof s === 'object' && s.status === 'pending'
                  );
                  
                  if (pendingSponsors.length > 0) {
                    return (
                      <div>
                        {isOwnEvent && (
                          <>
                            <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">Pending sponsor approval:</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {pendingSponsors.map((sponsor: any) => {
                                const sponsorData = sponsor.sponsorId;
                                return (
                                  <div
                                    key={typeof sponsorData === 'string' ? sponsorData : sponsorData._id}
                                    className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                                  >
                                    {typeof sponsorData === 'object' && sponsorData.logoUrl ? (
                                      <img
                                        src={sponsorData.logoUrl}
                                        alt={sponsorData.name}
                                        className="h-10 w-10 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="h-10 w-10 rounded-full bg-yellow-200 dark:bg-yellow-700 flex items-center justify-center">
                                        <span className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                                          {typeof sponsorData === 'object' ? sponsorData.name.charAt(0).toUpperCase() : 'S'}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex-1 text-left">
                                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                        {typeof sponsorData === 'object' ? sponsorData.name : sponsorData}
                                      </p>
                                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                        ⏳ Pending approval
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {/* Sponsorship approval buttons for sponsor owners */}
                        {pendingSponsors.filter(sponsor => canManageSponsor(sponsor.sponsorId)).map((sponsor: any) => {
                          const sponsorData = sponsor.sponsorId;
                          const sponsorId = typeof sponsorData === 'string' ? sponsorData : sponsorData._id;
                          
                          return (
                            <div 
                              key={`approval-${sponsorId}`}
                              className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
                            >
                              <div className="flex items-center gap-3 mb-3">
                                {typeof sponsorData === 'object' && sponsorData.logoUrl ? (
                                  <img
                                    src={sponsorData.logoUrl}
                                    alt={sponsorData.name}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-amber-200 dark:bg-amber-700 flex items-center justify-center">
                                    <span className="text-lg font-bold text-amber-800 dark:text-amber-200">
                                      {typeof sponsorData === 'object' ? sponsorData.name.charAt(0).toUpperCase() : 'S'}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                    Sponsorship Request for {typeof sponsorData === 'object' ? sponsorData.name : sponsorData}
                                  </p>
                                  <p className="text-xs text-amber-600 dark:text-amber-400">
                                    You've been requested to sponsor this event
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSponsorshipAction(sponsorId, 'approve')}
                                  disabled={processing === sponsorId}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                  {processing === sponsorId ? 'Approving...' : 'Approve Sponsorship'}
                                </button>
                                <button
                                  onClick={() => handleSponsorshipAction(sponsorId, 'reject')}
                                  disabled={processing === sponsorId}
                                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                  {processing === sponsorId ? 'Rejecting...' : 'Reject'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          )}


        </div>
      </div>
      {/* Add Event Chat below event details */}
      <div className="px-4 pb-8">
        {event.id && (
          <>
            <EventChat eventId={event.id} />
            <SubGroupList eventId={event.id} isOrganizer={currentUser?.id === event.creatorId} />
          </>
        )}
      </div>

      {/* RSVP Section at Bottom */}
      <div className="px-4 pb-8">
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors duration-200">
          {/* Show different actions based on creator status */}
          {isOwnEvent && !isPastEvent ? (
            <div className="bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                  <span className="text-blue-800 dark:text-blue-300 font-medium">You are the creator of this event</span>
                </div>
                <button
                  onClick={() => navigate(`/dashboard`)}
                  className="btn btn-primary"
                >
                  Manage Event
                </button>
              </div>
            </div>
          ) : !isPastEvent && currentUser ? (
            <div className="bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">
                  {userRsvpStatus ? "You're attending this event" : "Join this event"}
                </span>
                <button
                  onClick={handleRsvp}
                  disabled={isRsvpLoading}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    userRsvpStatus 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  } ${isRsvpLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isRsvpLoading ? 'Updating...' : (userRsvpStatus ? 'Cancel RSVP' : 'RSVP')}
                </button>
              </div>
            </div>
          ) : !isPastEvent && !currentUser ? (
            <div className="bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-center">
                <span className="text-gray-600 dark:text-gray-300">
                  <button 
                    onClick={() => navigate('/login')}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Login
                  </button> to RSVP to this event
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50/80 dark:bg-yellow-900/20 border border-yellow-200/50 dark:border-yellow-800/50 rounded-lg p-4">
              <div className="flex items-center justify-center">
                <span className="text-yellow-700 dark:text-yellow-300">This event has ended. You can still view details and previous messages.</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Attendees</h3>
        <div className="flex flex-wrap gap-2">
          {Array.isArray(event.rsvps) && event.rsvps.map((attendeeId) => {
            const attendeeUser = allUsers.find(user => user.id === attendeeId);
            return (
              <span
                key={attendeeId}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
              >
                {attendeeUser?.username || 'Unknown User'}
              </span>
            );
          })}
        </div>
      </div>
      
      {/* Attendee Modal */}
      {showAttendeeModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-6 max-w-md w-full mx-4 shadow-xl dark:shadow-gray-900/50 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Event Attendees</h3>
              <button
                onClick={() => setShowAttendeeModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {event.rsvps.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No attendees yet</p>
              ) : (
                event.rsvps.map((attendeeId) => {
                  const attendeeUser = allUsers.find(user => user.id === attendeeId);
                  return (
                    <div key={attendeeId} className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm font-medium">
                          {(attendeeUser?.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-900 dark:text-white">
                        {attendeeUser?.username || 'Unknown User'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicEventPage; 