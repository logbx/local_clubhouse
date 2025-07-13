import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { calendarService, CalendarEvent, CalendarPermissionStatus, CalendarUtils } from '@/lib/services/calendar.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CalendarState {
  permissionStatus: CalendarPermissionStatus | null;
  isLoading: boolean;
  error: string | null;
  savedEvents: Record<string, string>; // eventId -> calendarEventId mapping
}

interface UseCalendarOptions {
  autoRequestPermissions?: boolean;
  loadSavedEvents?: boolean;
}

const STORAGE_KEY = '@calendar_saved_events';

export function useCalendar(options: UseCalendarOptions = {}) {
  const { autoRequestPermissions = false, loadSavedEvents = true } = options;

  const [state, setState] = useState<CalendarState>({
    permissionStatus: null,
    isLoading: false,
    error: null,
    savedEvents: {},
  });

  useEffect(() => {
    initialize();
  }, []);

  const initialize = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check current permissions
      const permissionStatus = await calendarService.checkPermissions();
      setState(prev => ({ ...prev, permissionStatus }));

      // Auto-request permissions if needed
      if (autoRequestPermissions && !permissionStatus.granted && permissionStatus.canAskAgain) {
        const requested = await calendarService.requestPermissions();
        setState(prev => ({ ...prev, permissionStatus: requested }));
      }

      // Load saved events mapping
      if (loadSavedEvents) {
        await loadSavedEventsFromStorage();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calendar initialization failed';
      setState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [autoRequestPermissions, loadSavedEvents]);

  const loadSavedEventsFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const savedEvents = JSON.parse(stored);
        setState(prev => ({ ...prev, savedEvents }));
      }
    } catch (error) {
      console.error('Error loading saved events:', error);
    }
  }, []);

  const saveMappingToStorage = useCallback(async (mapping: Record<string, string>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
    } catch (error) {
      console.error('Error saving event mapping:', error);
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const permissionStatus = await calendarService.requestPermissions();
      setState(prev => ({ ...prev, permissionStatus }));
      return permissionStatus.granted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Permission request failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const addEventToCalendar = useCallback(async (
    eventId: string, 
    event: CalendarEvent,
    showConfirmation: boolean = true
  ): Promise<string | null> => {
    if (!state.permissionStatus?.granted) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Calendar access is needed to add events to your calendar.'
        );
        return null;
      }
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const calendarEventId = await calendarService.addEventToCalendar(event);
      
      if (calendarEventId) {
        // Save the mapping
        const newMapping = { ...state.savedEvents, [eventId]: calendarEventId };
        setState(prev => ({ ...prev, savedEvents: newMapping }));
        await saveMappingToStorage(newMapping);

        if (showConfirmation) {
          Alert.alert(
            'Event Added',
            'The event has been added to your calendar successfully.'
          );
        }
      }

      return calendarEventId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add event to calendar';
      setState(prev => ({ ...prev, error: errorMessage }));
      Alert.alert('Error', errorMessage);
      return null;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.permissionStatus, state.savedEvents, requestPermissions, saveMappingToStorage]);

  const updateEventInCalendar = useCallback(async (
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<boolean> => {
    const calendarEventId = state.savedEvents[eventId];
    if (!calendarEventId) {
      setState(prev => ({ ...prev, error: 'Event not found in calendar' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await calendarService.updateCalendarEvent(calendarEventId, updates);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update calendar event';
      setState(prev => ({ ...prev, error: errorMessage }));
      Alert.alert('Error', errorMessage);
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.savedEvents]);

  const removeEventFromCalendar = useCallback(async (
    eventId: string,
    showConfirmation: boolean = true
  ): Promise<boolean> => {
    const calendarEventId = state.savedEvents[eventId];
    if (!calendarEventId) {
      return true; // Already not in calendar
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await calendarService.deleteCalendarEvent(calendarEventId);
      
      // Remove from mapping
      const newMapping = { ...state.savedEvents };
      delete newMapping[eventId];
      setState(prev => ({ ...prev, savedEvents: newMapping }));
      await saveMappingToStorage(newMapping);

      if (showConfirmation) {
        Alert.alert(
          'Event Removed',
          'The event has been removed from your calendar.'
        );
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove event from calendar';
      setState(prev => ({ ...prev, error: errorMessage }));
      Alert.alert('Error', errorMessage);
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.savedEvents, saveMappingToStorage]);

  const isEventInCalendar = useCallback((eventId: string): boolean => {
    return eventId in state.savedEvents;
  }, [state.savedEvents]);

  const shareEventAsICS = useCallback(async (event: CalendarEvent): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await calendarService.shareEventAsICS(event);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to share event';
      setState(prev => ({ ...prev, error: errorMessage }));
      Alert.alert('Error', errorMessage);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const openInNativeCalendar = useCallback(async (eventId: string): Promise<void> => {
    const calendarEventId = state.savedEvents[eventId];
    if (!calendarEventId) {
      Alert.alert('Error', 'Event not found in calendar');
      return;
    }

    try {
      await calendarService.openInNativeCalendar(calendarEventId);
    } catch (error) {
      console.error('Error opening native calendar:', error);
      Alert.alert('Error', 'Failed to open calendar app');
    }
  }, [state.savedEvents]);

  const toggleEventInCalendar = useCallback(async (
    eventId: string,
    event: CalendarEvent
  ): Promise<void> => {
    if (isEventInCalendar(eventId)) {
      await removeEventFromCalendar(eventId);
    } else {
      await addEventToCalendar(eventId, event);
    }
  }, [isEventInCalendar, removeEventFromCalendar, addEventToCalendar]);

  const getAvailableCalendars = useCallback(async () => {
    try {
      return await calendarService.getAvailableCalendars();
    } catch (error) {
      console.error('Error getting available calendars:', error);
      return [];
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    permissionStatus: state.permissionStatus,
    isLoading: state.isLoading,
    error: state.error,
    hasPermission: state.permissionStatus?.granted || false,
    canRequestPermission: state.permissionStatus?.canAskAgain !== false,

    // Actions
    requestPermissions,
    addEventToCalendar,
    updateEventInCalendar,
    removeEventFromCalendar,
    toggleEventInCalendar,
    shareEventAsICS,
    openInNativeCalendar,
    getAvailableCalendars,
    clearError,

    // Utilities
    isEventInCalendar,
    savedEventsCount: Object.keys(state.savedEvents).length,
  };
}

// Utility hook for common calendar operations
export function useEventCalendar() {
  const calendar = useCalendar({ autoRequestPermissions: false, loadSavedEvents: true });

  const addEvent = useCallback(async (eventData: {
    id: string;
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    location?: string;
    url?: string;
    isAllDay?: boolean;
    reminders?: {
      reminder24h?: boolean;
      reminder1h?: boolean;
      reminder15m?: boolean;
    };
  }) => {
    const { reminders, ...eventInfo } = eventData;
    
    const calendarEvent: CalendarEvent = {
      title: eventInfo.title,
      notes: eventInfo.description,
      startDate: eventInfo.startDate,
      endDate: eventInfo.endDate,
      location: eventInfo.location,
      url: eventInfo.url,
      allDay: eventInfo.isAllDay || false,
      alarms: reminders ? CalendarUtils.createReminderAlarms(reminders) : CalendarUtils.createDefaultAlarms(),
    };

    return await calendar.addEventToCalendar(eventInfo.id, calendarEvent);
  }, [calendar]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<CalendarEvent>) => {
    return await calendar.updateEventInCalendar(eventId, updates);
  }, [calendar]);

  const removeEvent = useCallback(async (eventId: string) => {
    return await calendar.removeEventFromCalendar(eventId);
  }, [calendar]);

  const shareEvent = useCallback(async (eventData: CalendarEvent) => {
    await calendar.shareEventAsICS(eventData);
  }, [calendar]);

  return {
    ...calendar,
    addEvent,
    updateEvent,
    removeEvent,
    shareEvent,
  };
}