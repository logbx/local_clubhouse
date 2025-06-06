import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicEvent, EventVisibility, EventStatus, RecurrenceType } from '../types/event';
import { useAuth } from '../context/AuthContext';
import { publicApi } from '../services/api';
import { format, isValid } from 'date-fns';
import { CalendarIcon, MapPinIcon, TagIcon, UserGroupIcon, ExclamationTriangleIcon, UserIcon } from '@heroicons/react/24/outline';
import EventChat from '../components/EventChat';
import SubGroupList from '../components/SubGroupList';

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

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await publicApi.getPublicEvent(eventId!);
        const eventData = response.data;

        // Safely handle creator information - check if eventData exists first
        if (eventData) {
          // Ensure we have creator information
          if (!eventData.creator && eventData.creatorId) {
            try {
              const creatorResponse = await publicApi.getUserProfile(eventData.creatorId);
              if (creatorResponse && creatorResponse.data && creatorResponse.data.username) {
                eventData.creator = {
                  id: eventData.creatorId,
                  username: creatorResponse.data.username
                };
              } else {
                eventData.creator = {
                  id: eventData.creatorId,
                  username: 'Unknown User'
                };
              }
            } catch (err) {
              console.error('Failed to fetch creator details:', err);
              eventData.creator = {
                id: eventData.creatorId,
                username: 'Unknown User'
              };
            }
          }

          setEvent(eventData);
          
          // Fetch all users (organizer + rsvps) - safely access properties
          const creatorId = eventData.creator?.id || eventData.creator?._id || eventData.creatorId;
          const rsvps = eventData.rsvps || [];
          const ids = [creatorId, ...rsvps].filter(id => id); // Filter out any undefined/null IDs
          
          const users = await Promise.all(ids.map(async (id: string) => {
            try {
              const res = await publicApi.getUserProfile(id);
              if (res && res.data && res.data.username) {
                return { id, username: res.data.username };
              } else {
                return { id, username: 'Unknown User' };
              }
            } catch (err) {
              console.error(`Failed to fetch user profile for ID ${id}:`, err);
              return { id, username: 'Unknown User' }; // Fallback for failed user fetches
            }
          }));
          setAllUsers(users);
        } else {
          setError('No event data received');
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

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
          <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-t-lg">
            <span className="text-4xl text-gray-500">No Image</span>
          </div>
        )}
      </div>

      <div className="px-4 pb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {isPastEvent && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    This event has already taken place.
                  </p>
                </div>
              </div>
            </div>
          )}

          <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <h2 className="text-lg font-semibold text-gray-700">Date & Time</h2>
                <p className="text-gray-600">
                  {formatDate(startDate, 'EEEE, MMMM d, yyyy')}
                  <br />
                  {formatDate(startDate, 'h:mm a')} - {formatDate(endDate, 'h:mm a')}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <h2 className="text-lg font-semibold text-gray-700">Location</h2>
                <p className="text-gray-600">{event.location}</p>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Cost</h2>
              <p className="text-gray-600">{event.isFree ? 'Free' : `$${event.cost}`}</p>
            </div>
            <div className="flex items-center">
              <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <h2 className="text-lg font-semibold text-gray-700">Attendees</h2>
                <p className="text-gray-600">{event.rsvps.length} people attending</p>
              </div>
            </div>
            <div className="flex items-center">
              <UserIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <h2 className="text-lg font-semibold text-blue-800">Event Creator</h2>
                <p className="text-blue-700 font-medium">
                  {event.creator?.username || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">About</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* Action buttons section */}
          <div className="space-y-4">
            {/* Show different actions based on creator status */}
            {isOwnEvent && !isPastEvent ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <UserIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-blue-800 font-medium">You are the creator of this event</span>
                  </div>
                  <button
                    onClick={() => navigate(`/dashboard`)}
                    className="btn btn-primary"
                  >
                    Manage Event
                  </button>
                </div>
              </div>
            ) : !isPastEvent ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-center">
                  <span className="text-gray-600">You can view event details and participate in messages below</span>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-center">
                  <span className="text-yellow-700">This event has ended. You can still view details and previous messages.</span>
                </div>
              </div>
            )}
          </div>
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
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Attendees</h3>
        <div className="flex flex-wrap gap-2">
          {Array.isArray(event.rsvps) && event.rsvps.map((attendeeId) => {
            const attendeeUser = allUsers.find(user => user.id === attendeeId);
            return (
              <span
                key={attendeeId}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {attendeeUser?.username || 'Unknown User'}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PublicEventPage; 