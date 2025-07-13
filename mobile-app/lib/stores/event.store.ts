import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api-client-new';
import type { Event, EventWithRelations, EventAttendee, StoreState, PaginatedResponse } from '../db/types';

interface EventState extends StoreState {
  // Data
  events: Event[];
  upcomingEvents: Event[];
  userEvents: Event[];
  currentEvent: EventWithRelations | null;
  eventAttendees: EventAttendee[];
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  
  // Filters
  filters: {
    search?: string;
    type?: string;
    status?: string;
    dateRange?: {
      start: string;
      end: string;
    };
    location?: string;
    clubId?: string;
  };
}

interface EventActions {
  // Event operations
  fetchEvents: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    status?: string;
    clubId?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  fetchUpcomingEvents: () => Promise<void>;
  fetchUserEvents: () => Promise<void>;
  fetchEvent: (eventId: string) => Promise<void>;
  createEvent: (eventData: Partial<Event>) => Promise<Event>;
  updateEvent: (eventId: string, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  
  // RSVP operations
  rsvpEvent: (eventId: string, status: 'going' | 'maybe' | 'not_going') => Promise<void>;
  checkInEvent: (eventId: string, userId?: string) => Promise<void>;
  
  // Attendee operations
  fetchEventAttendees: (eventId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => Promise<void>;
  
  // Local state management
  setCurrentEvent: (event: EventWithRelations | null) => void;
  updateEventLocally: (eventId: string, updates: Partial<Event>) => void;
  addEventLocally: (event: Event) => void;
  removeEventLocally: (eventId: string) => void;
  setFilters: (filters: Partial<EventState['filters']>) => void;
  clearFilters: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useEventStore = create<EventState & EventActions>()(
  persist(
    (set, get) => ({
      // Initial state
      events: [],
      upcomingEvents: [],
      userEvents: [],
      currentEvent: null,
      eventAttendees: [],
      pagination: null,
      filters: {},
      loading: false,
      error: null,
      lastFetch: null,
      isOnline: true,

      // Event operations
      fetchEvents: async (params = {}) => {
        set({ loading: true, error: null });
        
        try {
          const response: PaginatedResponse<Event> = await apiClient.get('/events', {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 3 * 60 * 1000, // 3 minutes
            body: { ...get().filters, ...params },
          });

          set({
            events: params.page === 1 ? response.data : [...get().events, ...response.data],
            pagination: response.pagination,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch events',
          });
          throw error;
        }
      },

      fetchUpcomingEvents: async () => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.get('/events/upcoming', {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 2 * 60 * 1000, // 2 minutes
          });

          set({
            upcomingEvents: response.events || response,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch upcoming events',
          });
          throw error;
        }
      },

      fetchUserEvents: async () => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.get('/events/user', {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 2 * 60 * 1000, // 2 minutes
          });

          set({
            userEvents: response.events || response,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch user events',
          });
          throw error;
        }
      },

      fetchEvent: async (eventId: string) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.get(`/events/${eventId}`, {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 2 * 60 * 1000, // 2 minutes
          });

          set({
            currentEvent: response.event || response,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch event',
          });
          throw error;
        }
      },

      createEvent: async (eventData: Partial<Event>) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.post('/events', eventData, {
            queueIfOffline: true,
          });

          const newEvent = response.event || response;
          
          set({
            events: [newEvent, ...get().events],
            userEvents: [newEvent, ...get().userEvents],
            loading: false,
          });

          return newEvent;
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to create event',
          });
          throw error;
        }
      },

      updateEvent: async (eventId: string, updates: Partial<Event>) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.put(`/events/${eventId}`, updates, {
            queueIfOffline: true,
          });

          const updatedEvent = response.event || response;

          // Update in all relevant arrays
          set({
            events: get().events.map(event => 
              event.id === eventId ? { ...event, ...updatedEvent } : event
            ),
            upcomingEvents: get().upcomingEvents.map(event => 
              event.id === eventId ? { ...event, ...updatedEvent } : event
            ),
            userEvents: get().userEvents.map(event => 
              event.id === eventId ? { ...event, ...updatedEvent } : event
            ),
            currentEvent: get().currentEvent?.id === eventId 
              ? { ...get().currentEvent!, ...updatedEvent }
              : get().currentEvent,
            loading: false,
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to update event',
          });
          throw error;
        }
      },

      deleteEvent: async (eventId: string) => {
        set({ loading: true, error: null });
        
        try {
          await apiClient.delete(`/events/${eventId}`, {
            queueIfOffline: true,
          });

          set({
            events: get().events.filter(event => event.id !== eventId),
            upcomingEvents: get().upcomingEvents.filter(event => event.id !== eventId),
            userEvents: get().userEvents.filter(event => event.id !== eventId),
            currentEvent: get().currentEvent?.id === eventId ? null : get().currentEvent,
            loading: false,
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to delete event',
          });
          throw error;
        }
      },

      // RSVP operations
      rsvpEvent: async (eventId: string, status: 'going' | 'maybe' | 'not_going') => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.post(`/events/${eventId}/rsvp`, { status }, {
            queueIfOffline: true,
          });

          // Update attendee count optimistically
          const increment = status === 'going' ? 1 : 0;
          
          const updateEventAttendees = (event: Event) => {
            if (event.id === eventId) {
              return {
                ...event,
                currentAttendees: Math.max(0, event.currentAttendees + increment),
              };
            }
            return event;
          };

          set({
            events: get().events.map(updateEventAttendees),
            upcomingEvents: get().upcomingEvents.map(updateEventAttendees),
            userEvents: get().userEvents.map(updateEventAttendees),
            currentEvent: get().currentEvent?.id === eventId 
              ? { 
                  ...get().currentEvent!, 
                  currentAttendees: Math.max(0, get().currentEvent!.currentAttendees + increment)
                }
              : get().currentEvent,
            loading: false,
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to RSVP to event',
          });
          throw error;
        }
      },

      checkInEvent: async (eventId: string, userId?: string) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.post(`/events/${eventId}/checkin`, 
            userId ? { userId } : {}, 
            { queueIfOffline: true }
          );

          // Update check-in status if current user
          if (!userId) {
            // This is for the current user
            const updateEventCheckedIn = (event: Event) => {
              if (event.id === eventId) {
                return { ...event, userCheckedIn: true };
              }
              return event;
            };

            set({
              events: get().events.map(updateEventCheckedIn),
              upcomingEvents: get().upcomingEvents.map(updateEventCheckedIn),
              userEvents: get().userEvents.map(updateEventCheckedIn),
            });
          }

          set({ loading: false });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to check into event',
          });
          throw error;
        }
      },

      // Attendee operations
      fetchEventAttendees: async (eventId: string, params = {}) => {
        set({ loading: true, error: null });
        
        try {
          const response = await apiClient.get(`/events/${eventId}/attendees`, {
            queueIfOffline: true,
            cache: true,
            cacheTimeout: 1 * 60 * 1000, // 1 minute
            body: params,
          });

          set({
            eventAttendees: response.attendees || response.data || response,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch event attendees',
          });
          throw error;
        }
      },

      // Local state management
      setCurrentEvent: (event: EventWithRelations | null) => {
        set({ currentEvent: event });
      },

      updateEventLocally: (eventId: string, updates: Partial<Event>) => {
        set({
          events: get().events.map(event => 
            event.id === eventId ? { ...event, ...updates } : event
          ),
          upcomingEvents: get().upcomingEvents.map(event => 
            event.id === eventId ? { ...event, ...updates } : event
          ),
          userEvents: get().userEvents.map(event => 
            event.id === eventId ? { ...event, ...updates } : event
          ),
          currentEvent: get().currentEvent?.id === eventId 
            ? { ...get().currentEvent!, ...updates }
            : get().currentEvent,
        });
      },

      addEventLocally: (event: Event) => {
        set({
          events: [event, ...get().events],
          upcomingEvents: [event, ...get().upcomingEvents],
        });
      },

      removeEventLocally: (eventId: string) => {
        set({
          events: get().events.filter(event => event.id !== eventId),
          upcomingEvents: get().upcomingEvents.filter(event => event.id !== eventId),
          userEvents: get().userEvents.filter(event => event.id !== eventId),
          currentEvent: get().currentEvent?.id === eventId ? null : get().currentEvent,
        });
      },

      setFilters: (filters: Partial<EventState['filters']>) => {
        set({ filters: { ...get().filters, ...filters } });
      },

      clearFilters: () => {
        set({ filters: {} });
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },
    }),
    {
      name: 'event-storage',
      storage: Platform.select({
        web: {
          getItem: (name: string) => {
            const item = localStorage.getItem(name);
            return item ? JSON.parse(item) : null;
          },
          setItem: (name: string, value: any) => {
            localStorage.setItem(name, JSON.stringify(value));
          },
          removeItem: (name: string) => {
            localStorage.removeItem(name);
          },
        },
        default: {
          getItem: async (name: string) => {
            const item = await AsyncStorage.getItem(name);
            return item ? JSON.parse(item) : null;
          },
          setItem: async (name: string, value: any) => {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          },
          removeItem: async (name: string) => {
            await AsyncStorage.removeItem(name);
          },
        },
      }),
      partialize: (state) => ({
        upcomingEvents: state.upcomingEvents,
        userEvents: state.userEvents,
        currentEvent: state.currentEvent,
        filters: state.filters,
        lastFetch: state.lastFetch,
      }),
    }
  )
);