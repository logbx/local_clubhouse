import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Event, EventStatus } from '../types/event';
import { eventApi } from '../services/api';
import { format } from 'date-fns';
import { CalendarIcon, MapPinIcon, TagIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EventDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<EventStatus>(EventStatus.LIVE);


  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: eventApi.getEvents,
  });

  const filteredEvents = events?.filter(event => event.status === activeTab) || [];

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



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Event Dashboard</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[EventStatus.LIVE, EventStatus.PAST].map((status) => (
              <button
                key={status}
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

        {/* Event Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No events found</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No {activeTab.toLowerCase()} events are currently available.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
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
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventStatusColor(
                        event.status
                      )}`}
                    >
                      {event.status}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                              {format(new Date(event.startDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {event.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                          {format(new Date(event.startDate), 'h:mm a')} -{' '}
                          {format(new Date(event.endDate), 'h:mm a')}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      {event.location}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <TagIcon className="h-4 w-4 mr-2" />
                      {event.tags.join(', ')}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <UserGroupIcon className="h-4 w-4 mr-2" />
                      {event.rsvps.length} RSVPs
                    </div>
                    {event.clubName && event.clubUsername && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <button onClick={() => navigate(`/clubs/${event.clubUsername}`)} className="flex items-center mr-2 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
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
                  <div className="mt-6 flex space-x-3">
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


    </div>
  );
};

export default EventDashboard; 