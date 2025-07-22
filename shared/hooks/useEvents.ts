import { useState, useEffect, useCallback } from 'react';
import { Event, EventStatus } from '../components/EventCard/types';

export interface UseEventsOptions {
  apiClient: any;
  userId?: string;
  initialStatus?: EventStatus;
  enableRealtime?: boolean;
  websocketService?: any;
}

export interface UseEventsReturn {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  activeTab: EventStatus;
  setActiveTab: (status: EventStatus) => void;
  refreshEvents: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredEvents: Event[];
  handleRSVP: (eventId: string) => Promise<void>;
}

export const useEvents = ({
  apiClient,
  userId,
  initialStatus = 'LIVE',
  enableRealtime = false,
  websocketService,
}: UseEventsOptions): UseEventsReturn => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EventStatus>(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/events');
      setEvents(response.data || []);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.message || 'Failed to fetch events');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  const refreshEvents = useCallback(async () => {
    await fetchEvents();
  }, [fetchEvents]);

  const handleRSVP = useCallback(async (eventId: string) => {
    if (!userId || !apiClient) return;
    
    try {
      await apiClient.post(`/events/${eventId}/rsvp`);
      await refreshEvents();
    } catch (error) {
      console.error('Error updating RSVP:', error);
      throw error;
    }
  }, [apiClient, userId, refreshEvents]);

  // Filter events based on status and search
  const filteredEvents = events.filter((event: Event) => {
    const matchesStatus = event.status === activeTab && event.visibility !== 'CLUB';
    const matchesSearch = !searchQuery || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Real-time updates
  useEffect(() => {
    if (!enableRealtime || !websocketService || !userId) return;

    const connectWebSocket = async () => {
      try {
        await websocketService.connect();
        websocketService.joinEventsRoom();
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    };

    connectWebSocket();

    // Set up event listeners for real-time updates
    const unsubscribeEventCreated = websocketService.on('event_created', (newEvent: Event) => {
      setEvents(prev => [newEvent, ...prev]);
    });

    const unsubscribeEventUpdated = websocketService.on('event_updated', (updatedEvent: Event) => {
      setEvents(prev => prev.map(event => 
        event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event
      ));
    });

    const unsubscribeEventDeleted = websocketService.on('event_deleted', (data: { eventId: string }) => {
      setEvents(prev => prev.filter(event => event.id !== data.eventId));
    });

    const unsubscribeEventRsvpChanged = websocketService.on('event_rsvp_changed', (data: { eventId: string; rsvps: any[] }) => {
      setEvents(prev => prev.map(event => 
        event.id === data.eventId ? { ...event, rsvps: data.rsvps } : event
      ));
    });

    return () => {
      unsubscribeEventCreated();
      unsubscribeEventUpdated();
      unsubscribeEventDeleted();
      unsubscribeEventRsvpChanged();
      websocketService.leaveEventsRoom();
    };
  }, [enableRealtime, websocketService, userId]);

  // Initial load
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    refreshEvents,
    searchQuery,
    setSearchQuery,
    filteredEvents,
    handleRSVP,
  };
};