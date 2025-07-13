import { Platform, Alert, Linking } from 'react-native';
import * as Calendar from 'expo-calendar';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface CalendarEvent {
  id?: string;
  title: string;
  notes?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  url?: string;
  alarms?: CalendarAlarm[];
  recurrenceRule?: CalendarRecurrenceRule;
  timeZone?: string;
}

export interface CalendarAlarm {
  relativeOffset: number; // Minutes before event (negative value)
  method?: 'alert' | 'email';
}

export interface CalendarRecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  endDate?: Date;
  occurrence?: number;
}

export interface CalendarPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Calendar.PermissionStatus;
}

export class CalendarService {
  private static instance: CalendarService;
  private defaultCalendarId: string | null = null;
  private appCalendarId: string | null = null;

  static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService();
    }
    return CalendarService.instance;
  }

  /**
   * Request calendar permissions
   */
  async requestPermissions(): Promise<CalendarPermissionStatus> {
    try {
      const { status, canAskAgain } = await Calendar.requestCalendarPermissionsAsync();
      
      return {
        granted: status === Calendar.PermissionStatus.GRANTED,
        canAskAgain,
        status,
      };
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: Calendar.PermissionStatus.DENIED,
      };
    }
  }

  /**
   * Check calendar permissions
   */
  async checkPermissions(): Promise<CalendarPermissionStatus> {
    try {
      const { status, canAskAgain } = await Calendar.getCalendarPermissionsAsync();
      
      return {
        granted: status === Calendar.PermissionStatus.GRANTED,
        canAskAgain,
        status,
      };
    } catch (error) {
      console.error('Error checking calendar permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: Calendar.PermissionStatus.DENIED,
      };
    }
  }

  /**
   * Get or create the app's calendar
   */
  async getAppCalendar(): Promise<string | null> {
    try {
      if (this.appCalendarId) {
        return this.appCalendarId;
      }

      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        return null;
      }

      // Try to find existing app calendar
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const appCalendar = calendars.find(cal => cal.title === 'Events App');

      if (appCalendar) {
        this.appCalendarId = appCalendar.id;
        return appCalendar.id;
      }

      // Create new calendar if it doesn't exist
      const defaultSource = await this.getDefaultCalendarSource();
      if (!defaultSource) {
        return null;
      }

      const calendarId = await Calendar.createCalendarAsync({
        title: 'Events App',
        color: '#3B82F6',
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultSource.id,
        source: defaultSource,
        name: 'Events App Calendar',
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });

      this.appCalendarId = calendarId;
      return calendarId;
    } catch (error) {
      console.error('Error getting app calendar:', error);
      return null;
    }
  }

  /**
   * Get default calendar source
   */
  private async getDefaultCalendarSource(): Promise<Calendar.Source | null> {
    try {
      const sources = await Calendar.getSourcesAsync();
      
      if (Platform.OS === 'ios') {
        return sources.find(source => source.name === 'Default') || sources[0] || null;
      } else {
        return sources.find(source => 
          source.name === 'com.google' || 
          source.name === 'com.android.calendar'
        ) || sources[0] || null;
      }
    } catch (error) {
      console.error('Error getting default calendar source:', error);
      return null;
    }
  }

  /**
   * Add event to calendar
   */
  async addEventToCalendar(event: CalendarEvent): Promise<string | null> {
    try {
      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        const requested = await this.requestPermissions();
        if (!requested.granted) {
          return null;
        }
      }

      const calendarId = await this.getAppCalendar();
      if (!calendarId) {
        throw new Error('Could not access calendar');
      }

      // Convert alarms to Expo format
      const alarms = event.alarms?.map(alarm => ({
        relativeOffset: alarm.relativeOffset,
        method: alarm.method === 'email' 
          ? Calendar.AlarmMethod.EMAIL 
          : Calendar.AlarmMethod.ALERT,
      })) || [];

      // Convert recurrence rule
      let recurrenceRule: Calendar.RecurrenceRule | undefined;
      if (event.recurrenceRule) {
        recurrenceRule = {
          frequency: this.mapRecurrenceFrequency(event.recurrenceRule.frequency),
          interval: event.recurrenceRule.interval,
          endDate: event.recurrenceRule.endDate,
          occurrence: event.recurrenceRule.occurrence,
        };
      }

      const eventId = await Calendar.createEventAsync(calendarId, {
        title: event.title,
        notes: event.notes,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        allDay: event.allDay || false,
        url: event.url,
        alarms,
        recurrenceRule,
        timeZone: event.timeZone || 'GMT',
      });

      return eventId;
    } catch (error) {
      console.error('Error adding event to calendar:', error);
      throw error;
    }
  }

  /**
   * Update calendar event
   */
  async updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    try {
      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        throw new Error('Calendar permission denied');
      }

      // Convert alarms if provided
      const alarms = updates.alarms?.map(alarm => ({
        relativeOffset: alarm.relativeOffset,
        method: alarm.method === 'email' 
          ? Calendar.AlarmMethod.EMAIL 
          : Calendar.AlarmMethod.ALERT,
      }));

      // Convert recurrence rule if provided
      let recurrenceRule: Calendar.RecurrenceRule | undefined;
      if (updates.recurrenceRule) {
        recurrenceRule = {
          frequency: this.mapRecurrenceFrequency(updates.recurrenceRule.frequency),
          interval: updates.recurrenceRule.interval,
          endDate: updates.recurrenceRule.endDate,
          occurrence: updates.recurrenceRule.occurrence,
        };
      }

      await Calendar.updateEventAsync(eventId, {
        title: updates.title,
        notes: updates.notes,
        location: updates.location,
        startDate: updates.startDate,
        endDate: updates.endDate,
        allDay: updates.allDay,
        url: updates.url,
        alarms,
        recurrenceRule,
        timeZone: updates.timeZone,
      });
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete calendar event
   */
  async deleteCalendarEvent(eventId: string): Promise<void> {
    try {
      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        throw new Error('Calendar permission denied');
      }

      await Calendar.deleteEventAsync(eventId);
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  /**
   * Get calendar events in date range
   */
  async getCalendarEvents(startDate: Date, endDate: Date): Promise<Calendar.Event[]> {
    try {
      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        return [];
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const calendarIds = calendars.map(cal => cal.id);

      const events = await Calendar.getEventsAsync(calendarIds, startDate, endDate);
      return events;
    } catch (error) {
      console.error('Error getting calendar events:', error);
      return [];
    }
  }

  /**
   * Export event as ICS file
   */
  async exportEventAsICS(event: CalendarEvent): Promise<string | null> {
    try {
      const icsContent = this.generateICSContent(event);
      const fileName = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, icsContent);
      return fileUri;
    } catch (error) {
      console.error('Error exporting ICS file:', error);
      return null;
    }
  }

  /**
   * Share event as ICS file
   */
  async shareEventAsICS(event: CalendarEvent): Promise<void> {
    try {
      const fileUri = await this.exportEventAsICS(event);
      if (!fileUri) {
        throw new Error('Failed to export event');
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/calendar',
          dialogTitle: 'Share Event',
        });
      } else {
        throw new Error('Sharing not available');
      }
    } catch (error) {
      console.error('Error sharing ICS file:', error);
      throw error;
    }
  }

  /**
   * Open event in native calendar app
   */
  async openInNativeCalendar(eventId: string): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        const url = `calshow:${eventId}`;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          // Fallback to opening calendar app
          await Linking.openURL('calshow:');
        }
      } else {
        // Android - open calendar app
        const calendarIntent = 'content://com.android.calendar/events';
        const canOpen = await Linking.canOpenURL(calendarIntent);
        if (canOpen) {
          await Linking.openURL(calendarIntent);
        } else {
          // Fallback
          await Linking.openURL('calendar:');
        }
      }
    } catch (error) {
      console.error('Error opening native calendar:', error);
      // Fallback to generic calendar opening
      try {
        await Linking.openURL(Platform.OS === 'ios' ? 'calshow:' : 'calendar:');
      } catch (fallbackError) {
        console.error('Fallback calendar opening failed:', fallbackError);
      }
    }
  }

  /**
   * Check if event exists in calendar
   */
  async eventExistsInCalendar(eventId: string): Promise<boolean> {
    try {
      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        return false;
      }

      const event = await Calendar.getEventAsync(eventId);
      return !!event;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available calendars
   */
  async getAvailableCalendars(): Promise<Calendar.Calendar[]> {
    try {
      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        return [];
      }

      return await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    } catch (error) {
      console.error('Error getting available calendars:', error);
      return [];
    }
  }

  // Private helper methods

  private mapRecurrenceFrequency(frequency: string): Calendar.Frequency {
    switch (frequency) {
      case 'daily': return Calendar.Frequency.DAILY;
      case 'weekly': return Calendar.Frequency.WEEKLY;
      case 'monthly': return Calendar.Frequency.MONTHLY;
      case 'yearly': return Calendar.Frequency.YEARLY;
      default: return Calendar.Frequency.DAILY;
    }
  }

  private generateICSContent(event: CalendarEvent): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text: string): string => {
      return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
    };

    const now = new Date();
    const startDateTime = formatDate(event.startDate);
    const endDateTime = formatDate(event.endDate);
    const createdDateTime = formatDate(now);
    const uid = `${Date.now()}@eventsapp.com`;

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Events App//Events App 1.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${createdDateTime}`,
      `DTSTART:${startDateTime}`,
      `DTEND:${endDateTime}`,
      `SUMMARY:${escapeText(event.title)}`,
    ];

    if (event.notes) {
      icsContent.push(`DESCRIPTION:${escapeText(event.notes)}`);
    }

    if (event.location) {
      icsContent.push(`LOCATION:${escapeText(event.location)}`);
    }

    if (event.url) {
      icsContent.push(`URL:${event.url}`);
    }

    // Add alarms
    if (event.alarms) {
      event.alarms.forEach(alarm => {
        icsContent.push(
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `TRIGGER:-PT${Math.abs(alarm.relativeOffset)}M`,
          `DESCRIPTION:${escapeText(event.title)}`,
          'END:VALARM'
        );
      });
    }

    icsContent.push('END:VEVENT', 'END:VCALENDAR');

    return icsContent.join('\r\n');
  }
}

// Export singleton instance
export const calendarService = CalendarService.getInstance();

// Utility functions
export const CalendarUtils = {
  /**
   * Create default event alarms
   */
  createDefaultAlarms(): CalendarAlarm[] {
    return [
      { relativeOffset: -60, method: 'alert' }, // 1 hour before
      { relativeOffset: -15, method: 'alert' }, // 15 minutes before
    ];
  },

  /**
   * Create reminder alarms based on user preferences
   */
  createReminderAlarms(preferences: {
    reminder24h?: boolean;
    reminder1h?: boolean;
    reminder15m?: boolean;
  }): CalendarAlarm[] {
    const alarms: CalendarAlarm[] = [];

    if (preferences.reminder24h) {
      alarms.push({ relativeOffset: -24 * 60, method: 'alert' });
    }
    if (preferences.reminder1h) {
      alarms.push({ relativeOffset: -60, method: 'alert' });
    }
    if (preferences.reminder15m) {
      alarms.push({ relativeOffset: -15, method: 'alert' });
    }

    return alarms;
  },

  /**
   * Format calendar permission status for display
   */
  formatPermissionStatus(status: Calendar.PermissionStatus): string {
    switch (status) {
      case Calendar.PermissionStatus.GRANTED:
        return 'Granted';
      case Calendar.PermissionStatus.DENIED:
        return 'Denied';
      case Calendar.PermissionStatus.UNDETERMINED:
        return 'Not requested';
      default:
        return 'Unknown';
    }
  },

  /**
   * Check if time conflicts with existing events
   */
  hasTimeConflict(
    newEvent: { startDate: Date; endDate: Date },
    existingEvents: { startDate: Date; endDate: Date }[]
  ): boolean {
    return existingEvents.some(existing => {
      const newStart = newEvent.startDate.getTime();
      const newEnd = newEvent.endDate.getTime();
      const existingStart = existing.startDate.getTime();
      const existingEnd = existing.endDate.getTime();

      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });
  },

  /**
   * Get next available time slot
   */
  getNextAvailableSlot(
    preferredStart: Date,
    duration: number, // in minutes
    existingEvents: { startDate: Date; endDate: Date }[],
    maxSearchDays: number = 7
  ): Date | null {
    const durationMs = duration * 60 * 1000;
    let currentDate = new Date(preferredStart);
    const maxDate = new Date(preferredStart.getTime() + maxSearchDays * 24 * 60 * 60 * 1000);

    while (currentDate < maxDate) {
      const proposedEnd = new Date(currentDate.getTime() + durationMs);
      
      const hasConflict = this.hasTimeConflict(
        { startDate: currentDate, endDate: proposedEnd },
        existingEvents
      );

      if (!hasConflict) {
        return currentDate;
      }

      // Try next hour
      currentDate = new Date(currentDate.getTime() + 60 * 60 * 1000);
    }

    return null;
  },
};