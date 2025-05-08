import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicEvent, EventVisibility } from '../types/event';
import { useAuth } from '../context/AuthContext';
import { publicApi } from '../services/api';
import { format } from 'date-fns';
import { CalendarIcon, MapPinIcon, TagIcon, UserGroupIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import EventChat from '../components/EventChat';
import SubGroupList from '../components/SubGroupList';

const PublicEventPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<{ _id: string; fullName: string }[]>([]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await publicApi.getPublicEvent(eventId!);
        setEvent(response.data);
        // Fetch all users (organizer + rsvps)
        const ids = [response.data.creatorId, ...response.data.rsvps].filter(id => id); // Filter out any undefined/null IDs
        const users = await Promise.all(ids.map(async (id: string) => {
          try {
            const res = await publicApi.getUserProfile(id);
            return { _id: id, fullName: res.user.fullName };
          } catch (err) {
            console.error(`Failed to fetch user profile for ID ${id}:`, err);
            return { _id: id, fullName: 'Unknown User' }; // Fallback for failed user fetches
          }
        }));
        setAllUsers(users);
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
  const isPastEvent = new Date(event.endDate) < new Date();

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
                  {format(new Date(event.startDate), 'EEEE, MMMM d, yyyy')}
                  <br />
                  {format(new Date(event.startDate), 'h:mm a')} - {format(new Date(event.endDate), 'h:mm a')}
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

          {event.visibility === EventVisibility.PUBLIC && !isOwnEvent && !isPastEvent && (
            <button
              onClick={() => navigate(`/events/${eventId}/join`)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Join Event
            </button>
          )}
        </div>
      </div>
      {/* Add Event Chat below event details */}
      <div className="px-4 pb-8">
        <EventChat eventId={event._id} />
        <SubGroupList eventId={event._id} isOrganizer={currentUser?.id === event.creatorId} allUsers={allUsers} />
      </div>
    </div>
  );
};

export default PublicEventPage; 