import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Event, EventStatus } from '../types/event';
import { eventApi } from '../services/api';
import { format } from 'date-fns';
import { PlusIcon, CalendarIcon, MapPinIcon, TagIcon, UserGroupIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline';
import CreateEventModal from '../components/CreateEventModal';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<EventStatus>(EventStatus.DRAFT);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: events, isLoading, error } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const result = await eventApi.getEvents();
      console.log('Events loaded:', result?.length, 'events');
      if (result?.[0]) {
        console.log('First event structure:', {
          id: result[0].id,
          title: result[0].title,
          creator: result[0].creator,
          creatorId: result[0].creatorId,
          startDate: result[0].startDate,
          endDate: result[0].endDate
        });
      }
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-update past events
  useEffect(() => {
    if (events) {
      const now = new Date();
      console.log('Checking events for auto-update to PAST status:', { now, eventCount: events.length });
      
      const eventsToUpdate = events.filter((event: Event) => {
        if (event.status === EventStatus.PAST) return false;
        
        // Use endDate for checking if event is past
        if (!event.endDate) return false;
        
        const endDate = new Date(event.endDate);
        const isPast = endDate < now;
        
        console.log('Event check:', {
          eventId: event.id,
          title: event.title,
          status: event.status,
          endDate: event.endDate,
          isPast
        });
        
        return isPast;
      });
      
      console.log('Events to update to PAST:', eventsToUpdate.length);
      
      eventsToUpdate.forEach((event: Event) => {
        console.log(`Updating event ${event.id} (${event.title}) to PAST status`);
        eventApi.updateEvent(event.id, { status: EventStatus.PAST })
          .then(() => {
            console.log(`Successfully updated event ${event.id} to PAST`);
            // Invalidate queries to refresh the data
            queryClient.invalidateQueries({ queryKey: ['events'] });
          })
          .catch((error: any) => {
            console.error(`Failed to update event ${event.id} status to PAST:`, error);
          });
      });
    }
  }, [events, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      try {
        const response = await eventApi.deleteEvent(eventId);
        return eventId;
      } catch (error) {
        console.error('Failed to delete event:', error);
        throw error;
      }
    },
    onMutate: async (eventId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['events'] });

      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData<Event[]>(['events']);

      // Optimistically update to the new value
      queryClient.setQueryData<Event[]>(['events'], old => 
        old ? old.filter(event => event.id !== eventId) : []
      );

      // Return a context object with the snapshotted value
      return { previousEvents };
    },
    onError: (err, _, context) => {
      console.error('Failed to delete event:', err);
      // Rollback to the previous value
      if (context?.previousEvents) {
        queryClient.setQueryData(['events'], context.previousEvents);
      }
      alert('Failed to delete event. Please try again.');
    },
    onSuccess: (eventId) => {
      // Update the cache to remove the deleted event
      queryClient.setQueryData<Event[]>(['events'], old => 
        old ? old.filter(event => event.id !== eventId) : []
      );
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['events'] });
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

  const filteredEvents = events?.filter((event: Event) => event.status === activeTab) || [];

  const getEventStatusColor = (status: EventStatus) => {
    switch (status) {
      case EventStatus.DRAFT:
        return 'bg-yellow-100 text-yellow-800';
      case EventStatus.LIVE:
        return 'bg-green-100 text-green-800';
      case EventStatus.PAST:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canEditEvent = (event: Event) => {
    // Check if the current user is the creator of the event
    if (!user || !event) return false;
    
    // Debug logging (keep for now to monitor the fix)
    console.log('canEditEvent check:', {
      userId: user.id,
      eventId: event.id,
      creatorId: event.creator?.id,
      creatorIdField: event.creatorId,
      hasCreator: !!event.creator
    });
    
    // Check multiple possible creator field combinations
    const userIsCreator = 
      (event.creator && user.id === event.creator.id) ||
      (event.creatorId && user.id === event.creatorId) ||
      (typeof event.creator === 'string' && user.id === event.creator);
    
    console.log('User is creator:', userIsCreator);
    return userIsCreator;
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.username}!</h1>
        <p className="mt-2 text-gray-600">Manage your events and stay connected with your community.</p>
      </div>

      {/* Friend Requests Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Friend Requests</h2>
        <p className="text-gray-600">
          You have pending friend requests. Please manage them on your{' '}
          <a href="/friends" className="text-primary-600 underline hover:text-primary-800">Friends page</a>.
        </p>
      </div>

      {/* Search Bar Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <SearchBar />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            id: 'draft',
            title: 'Draft Events',
            count: events?.filter((e: Event) => e.status === EventStatus.DRAFT).length || 0,
            color: 'text-primary-600'
          },
          {
            id: 'live',
            title: 'Live Events',
            count: events?.filter((e: Event) => e.status === EventStatus.LIVE).length || 0,
            color: 'text-green-600'
          },
          {
            id: 'past',
            title: 'Past Events',
            count: events?.filter((e: Event) => e.status === EventStatus.PAST).length || 0,
            color: 'text-gray-600'
          }
        ].map(stat => (
          <div key={stat.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">{stat.title}</h3>
            <p className={`text-3xl font-bold ${stat.color} mt-2`}>
              {stat.count}
            </p>
          </div>
        ))}
      </div>

      {/* Event Management Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Event Management</h2>
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
          </div>

          {/* Tabs */}
          <div className="mt-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {Object.values(EventStatus).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setActiveTab(status)}
                  className={`${
                    activeTab === status
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                >
                  {status}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Event Grid */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900">No events found</h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by creating a new event.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200"
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
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventStatusColor(
                          event.status
                        )}`}
                      >
                        {event.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {event.startDate && !isNaN(new Date(event.startDate).getTime()) 
                          ? format(new Date(event.startDate), 'MMM d, yyyy')
                          : 'Invalid date'
                        }
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {event.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-500">
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
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        {event.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <TagIcon className="h-4 w-4 mr-2" />
                        {event.tags.join(', ')}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <UserGroupIcon className="h-4 w-4 mr-2" />
                        {event.rsvps.length} RSVPs
                      </div>
                      <div className="flex items-center text-sm text-gray-600 bg-blue-50 p-2 rounded-md">
                        <UserIcon className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="font-medium text-blue-800">Event Creator:</span>
                        <span className="ml-1 text-blue-700">
                          {event.creator?.username || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 flex space-x-3">
                      {canEditEvent(event) ? (
                        <>
                          <button
                            key={`edit-${event.id}`}
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
                            key={`view-${event.id}`}
                            type="button"
                            className="btn btn-primary flex-1"
                            onClick={() => navigate(`/event/${event.id}`)}
                          >
                            View Details
                          </button>
                          <button
                            key={`delete-${event.id}`}
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
                          key={`view-${event.id}`}
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
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Event</h3>
            <p className="text-gray-600 mb-6">
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
      />
    </div>
  );
};

export default Dashboard; 