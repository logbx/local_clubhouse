import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Event, EventStatus, EventVisibility, EventFeatures } from '../types/event';
import { eventApi } from '../services/api';
import { format } from 'date-fns';
import { PlusIcon, CalendarIcon, MapPinIcon, TagIcon, UserGroupIcon, TrashIcon, UserIcon, TrophyIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import CreateEventModal from './CreateEventModal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { log, LogCategory } from '../utils/logger';

interface ClubEventsSectionProps {
  clubId: string;
  clubUsername: string;
  isAdmin: boolean;
  isMember: boolean;
  initialTab?: EventStatus;
}

const ClubEventsSection: React.FC<ClubEventsSectionProps> = ({ 
  clubId, 
  clubUsername, 
  isAdmin, 
  isMember,
  initialTab = EventStatus.LIVE
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<EventStatus>(initialTab);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState<{ [key: string]: boolean }>({});

  // Ensure non-admin users can't access DRAFT tab
  useEffect(() => {
    if (!isAdmin && activeTab === EventStatus.DRAFT) {
      setActiveTab(EventStatus.LIVE);
    }
  }, [isAdmin, activeTab]);

  // Update activeTab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch events for this club
  const { 
    data: allEvents, 
    isLoading, 
    refetch: refetchEvents 
  } = useQuery({
    queryKey: ['club-events', clubId],
    queryFn: async () => {
      // Get all events and filter for club events
      const events = await eventApi.getEvents();
      return events.filter((event: Event) => 
        event.clubId === clubId || 
        event.clubUsername === clubUsername ||
        (event.visibility === EventVisibility.CLUB && event.creator.id === user?.id)
      );
    },
    enabled: !!clubId && !!user,
  });

  // Filter events by status and visibility
  const filteredEvents = allEvents?.filter((event: Event) => {
    // Status filter
    if (event.status !== activeTab) return false;
    
    // Only show DRAFT events to admins
    if (event.status === EventStatus.DRAFT && !isAdmin) return false;
    
    // Visibility filter - only show events user can see
    if (event.visibility === EventVisibility.CLUB) {
      return isMember; // Only show club events to members
    } else if (event.visibility === EventVisibility.PRIVATE) {
      return event.creator.id === user?.id || event.invitedUsers?.includes(user?.id || '');
    }
    
    return true; // Public events are visible to all
  }) || [];

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      try {
        await eventApi.deleteEvent(eventId);
        return eventId;
      } catch (error) {
        log.error(LogCategory.EVENT, 'Failed to delete event', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club-events', clubId] });
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    },
    onError: (err) => {
      log.error(LogCategory.EVENT, 'Failed to delete event', err);
      alert('Failed to delete event. Please try again.');
    },
  });

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (eventToDelete?.id) {
      deleteMutation.mutate(eventToDelete.id);
    }
  };

  const handleRsvp = async (eventId: string) => {
    if (!user) return;
    
    try {
      setRsvpLoading(prev => ({ ...prev, [eventId]: true }));
      await eventApi.toggleRsvp(eventId);
      
      // Refresh events to get updated RSVP status
      refetchEvents();
    } catch (error) {
      console.error('Error updating RSVP:', error);
    } finally {
      setRsvpLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const isUserRsvped = (event: Event) => {
    return event.rsvps.some(rsvp => rsvp.id === user?.id);
  };

  const canEditEvent = (event: Event) => {
    return user && (event.creator.id === user.id || event.creatorId === user.id) && isAdmin;
  };

  const getEventStatusColor = (status: EventStatus) => {
    switch (status) {
      case EventStatus.DRAFT:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case EventStatus.LIVE:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case EventStatus.PAST:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
    }
  };

  const getVisibilityBadge = (visibility: EventVisibility) => {
    switch (visibility) {
      case EventVisibility.CLUB:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">Club Only</span>;
      case EventVisibility.PRIVATE:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">Private</span>;
      case EventVisibility.PUBLIC:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">Public</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Club Events</h2>
        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary flex items-center"
            onClick={() => {
              setSelectedEvent(null);
              setIsCreateModalOpen(true);
            }}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Event
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        {[
          // Only show Draft Events to admins
          ...(isAdmin ? [{
            id: 'draft',
            title: 'Draft Events',
            count: allEvents?.filter((e: Event) => e.status === EventStatus.DRAFT).length || 0,
            color: 'text-yellow-600 dark:text-yellow-400'
          }] : []),
          {
            id: 'live',
            title: 'Live Events',
            count: allEvents?.filter((e: Event) => e.status === EventStatus.LIVE).length || 0,
            color: 'text-green-600 dark:text-green-400'
          },
          {
            id: 'past',
            title: 'Past Events',
            count: allEvents?.filter((e: Event) => e.status === EventStatus.PAST).length || 0,
            color: 'text-gray-600 dark:text-gray-400'
          }
        ].map(stat => (
          <div key={stat.id} className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow border border-gray-200/50 dark:border-gray-700/50 p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{stat.title}</h3>
            <p className={`text-2xl font-bold ${stat.color} mt-1`}>
              {stat.count}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200/50 dark:border-gray-700/50">
        <nav className="-mb-px flex space-x-8">
          {[
            // Only show Draft tab to admins
            ...(isAdmin ? [EventStatus.DRAFT] : []),
            EventStatus.LIVE,
            EventStatus.PAST
          ].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveTab(status)}
              className={`${
                activeTab === status
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors`}
            >
              {status}
            </button>
          ))}
        </nav>
      </div>

      {/* Events Grid */}
      <div>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No events found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isAdmin ? 'Get started by creating a new event for your club.' : 'No events are currently available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event: Event) => (
              <div
                key={event.id}
                className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 rounded-lg hover:shadow-xl dark:hover:shadow-gray-900/30 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-200"
              >
                {event.imageUrl && (
                  <div className="h-48 w-full overflow-hidden">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventStatusColor(event.status)}`}>
                        {event.status}
                      </span>
                      {getVisibilityBadge(event.visibility)}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {event.startDate && !isNaN(new Date(event.startDate).getTime()) 
                        ? format(new Date(event.startDate), 'MMM d, yyyy')
                        : 'Invalid date'
                      }
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {event.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="space-y-2">
                    {/* Time & Date */}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {event.startDate && event.endDate && 
                      !isNaN(new Date(event.startDate).getTime()) && 
                      !isNaN(new Date(event.endDate).getTime()) ? (
                        <>
                          {format(new Date(event.startDate), 'h:mm a')} -{' '}
                          {format(new Date(event.endDate), 'h:mm a')}
                        </>
                      ) : (
                        'Invalid time'
                      )}
                    </div>
                    
                    {/* Location */}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      {event.location}
                    </div>
                    
                    {/* Tags */}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <TagIcon className="h-4 w-4 mr-2" />
                      {event.tags.join(', ')}
                    </div>
                    
                    {/* Tournament */}
                    {(event.features && event.features.includes(EventFeatures.SINGLE_ELIMINATION_TOURNAMENT)) && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <TrophyIcon className="h-4 w-4 mr-2" />
                        Tournament: Single Elimination
                      </div>
                    )}
                    
                    {/* RSVPs */}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <UserGroupIcon className="h-4 w-4 mr-2" />
                      {event.rsvps.length} RSVPs
                    </div>
                    
                    {/* Cost */}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                      {event.isFree ? 'Free' : `$${event.cost}`}
                    </div>
                    
                    {/* Creator */}
                    {event.creator && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <UserIcon className="h-4 w-4 mr-2" />
                        {event.creator.username}
                      </div>
                    )}
                    
                    {/* Club Space (only show if different from current club) */}
                    {event.clubName && event.clubUsername && event.clubUsername !== clubUsername && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <button onClick={() => navigate(`/clubs/${event.clubUsername}`)} className="flex items-center hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                          {event.clubLogoUrl ? (
                            <img src={event.clubLogoUrl} alt={`${event.clubName} logo`} className="h-4 w-4 rounded-full object-cover mr-1 border border-gray-200 dark:border-gray-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full bg-purple-600 dark:bg-purple-500 mr-1 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">{event.clubName.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <span className="text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 hover:underline font-medium">
                            {event.clubName}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    {canEditEvent(event) ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary flex-1"
                          onClick={() => {
                            setSelectedEvent({ ...event, id: event.id });
                            setIsCreateModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          type="button"
                          className="btn btn-primary flex-1"
                          onClick={() => navigate(`/event/${event.id}`)}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger p-2"
                          onClick={() => handleDeleteClick(event)}
                          title="Delete Event"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </>
                    ) : (
                      <button 
                        type="button"
                        className="btn btn-primary flex-1"
                        onClick={() => navigate(`/event/${event.id}`)}
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-6 max-w-md w-full mx-4 shadow-xl dark:shadow-gray-900/50 border border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delete Event</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete "{eventToDelete?.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="btn btn-secondary px-4 py-2"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setEventToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger px-4 py-2"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        clubId={clubId}
        clubUsername={clubUsername}
      />
    </div>
  );
};

export default ClubEventsSection; 