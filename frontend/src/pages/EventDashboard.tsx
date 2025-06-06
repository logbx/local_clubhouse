import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Event, EventStatus } from '../types/event';
import { eventApi } from '../services/api';
import { format } from 'date-fns';
import { PlusIcon, CalendarIcon, MapPinIcon, TagIcon, UserGroupIcon, UserIcon } from '@heroicons/react/24/outline';
import CreateEventModal from '../components/CreateEventModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EventDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<EventStatus>(EventStatus.DRAFT);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: eventApi.getEvents,
  });

  const filteredEvents = events?.filter(event => event.status === activeTab) || [];

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
    return user?.id === event.creatorId || user?.id === event.creator?.id;
  };

  const handleEditClick = (event: Event) => {
    setSelectedEvent({ 
      ...event, 
      id: event.id,
      status: event.status,
      creatorId: event.creatorId,
      rsvps: event.rsvps,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt 
    });
    setIsCreateModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Event Dashboard</h1>
          <button
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
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {Object.values(EventStatus).map((status) => (
              <button
                key={status}
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

        {/* Event Grid */}
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
                                              {format(new Date(event.startDate), 'MMM d, yyyy')}
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
                          {format(new Date(event.startDate), 'h:mm a')} -{' '}
                          {format(new Date(event.endDate), 'h:mm a')}
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
                    {canEditEvent(event) && (
                      <button
                        className="btn btn-secondary flex-1"
                        onClick={() => handleEditClick(event)}
                      >
                        Edit
                      </button>
                    )}
                    <button 
                      className="btn btn-primary flex-1"
                      onClick={() => navigate(`/event/${event.id}`)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

export default EventDashboard; 