import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  maxAttendees?: number;
  attendeeCount: number;
  image?: string;
  isPrivate: boolean;
  clubId: string;
  clubName: string;
  createdAt: string;
  updatedAt: string;
  rsvpStatus?: 'attending' | 'not_attending' | 'maybe' | 'none';
  canEdit?: boolean;
}

export interface EventsResponse {
  events: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Get events with pagination and filters
export function useEvents(params?: {
  page?: number;
  limit?: number;
  clubId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => apiClient.getEvents(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: EventsResponse) => data,
  });
}

// Get single event details
export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId],
    queryFn: () => apiClient.getEvent(eventId),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data: { event: Event }) => data.event,
  });
}

// Get user's events
export function useMyEvents() {
  return useQuery({
    queryKey: ['events', 'my-events'],
    queryFn: () => apiClient.request('/events/my-events'),
    staleTime: 5 * 60 * 1000,
    select: (data: { events: Event[] }) => data.events,
  });
}

// Get upcoming events
export function useUpcomingEvents() {
  return useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => apiClient.request('/events/upcoming'),
    staleTime: 5 * 60 * 1000,
    select: (data: { events: Event[] }) => data.events,
  });
}

// RSVP to event
export function useRsvpEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: 'attending' | 'not_attending' | 'maybe' }) =>
      apiClient.rsvpEvent(eventId, status),
    onSuccess: (data, variables) => {
      // Update the event in cache
      queryClient.setQueryData(['events', variables.eventId], (oldData: any) => {
        if (oldData) {
          const attendeeCountChange = 
            variables.status === 'attending' ? 1 : 
            oldData.rsvpStatus === 'attending' ? -1 : 0;
          
          return {
            ...oldData,
            rsvpStatus: variables.status,
            attendeeCount: oldData.attendeeCount + attendeeCountChange,
          };
        }
        return oldData;
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'my-events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'upcoming'] });
    },
  });
}

// Create event
export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (eventData: Partial<Event>) =>
      apiClient.request('/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      }),
    onSuccess: () => {
      // Invalidate events queries to refetch
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Update event
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: Partial<Event> }) =>
      apiClient.request(`/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (data, variables) => {
      // Update the event in cache
      queryClient.setQueryData(['events', variables.eventId], data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Delete event
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (eventId: string) =>
      apiClient.request(`/events/${eventId}`, {
        method: 'DELETE',
      }),
    onSuccess: (data, eventId) => {
      // Remove the event from cache
      queryClient.removeQueries({ queryKey: ['events', eventId] });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Get event attendees
export function useEventAttendees(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'attendees'],
    queryFn: () => apiClient.request(`/events/${eventId}/attendees`),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });
}

// Search events
export function useSearchEvents(searchTerm: string) {
  return useQuery({
    queryKey: ['events', 'search', searchTerm],
    queryFn: () => apiClient.getEvents({ search: searchTerm }),
    enabled: !!searchTerm && searchTerm.length > 2,
    staleTime: 30 * 1000, // 30 seconds for search results
    select: (data: EventsResponse) => data.events,
  });
}

// Get events by date range
export function useEventsByDateRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['events', 'date-range', startDate, endDate],
    queryFn: () => apiClient.getEvents({ startDate, endDate }),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
    select: (data: EventsResponse) => data.events,
  });
}

// Get club events
export function useClubEvents(clubId: string) {
  return useQuery({
    queryKey: ['events', 'club', clubId],
    queryFn: () => apiClient.getEvents({ clubId }),
    enabled: !!clubId,
    staleTime: 5 * 60 * 1000,
    select: (data: EventsResponse) => data.events,
  });
}

// Get event statistics
export function useEventStats(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'stats'],
    queryFn: () => apiClient.request(`/events/${eventId}/stats`),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });
}