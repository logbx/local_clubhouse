// Event RSVP model for mobile app
export interface EventRSVP {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  event: {
    id: string;
    title: string;
  };
  status: 'going' | 'maybe' | 'not_going';
  createdAt: string;
  updatedAt: string;
}

export interface EventAttendee {
  id: string;
  userId: string;
  eventId: string;
  status: 'going' | 'not_going' | 'interested' | 'waitlist';
  registeredAt: Date;
  checkedIn: boolean;
  checkedInAt?: Date;
  guestCount: number;
  dietary?: string;
  notes?: string;
  reminderSent: boolean;
  lastReminderSent?: Date;
  user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

export interface RSVPRequest {
  eventId: string;
  status: 'going' | 'not_going' | 'interested';
  guestCount?: number;
  dietary?: string;
  notes?: string;
}

export interface CheckInRequest {
  eventId: string;
  userId: string;
  actualGuestCount?: number;
}

export interface AttendeeFilters {
  status?: 'going' | 'not_going' | 'interested' | 'waitlist';
  checkedIn?: boolean;
  searchTerm?: string;
  sortBy?: 'name' | 'registeredAt' | 'checkedInAt';
  sortOrder?: 'asc' | 'desc';
}

// Type guards
export const isEventRSVP = (obj: any): obj is EventRSVP => {
  return obj && typeof obj.id === 'string' && typeof obj.status === 'string';
};

export const isEventAttendee = (obj: any): obj is EventAttendee => {
  return obj && typeof obj.id === 'string' && typeof obj.userId === 'string' && typeof obj.eventId === 'string';
};

// Default values
export const createEmptyRSVP = (): Partial<EventRSVP> => ({
  status: 'going',
});

export const createEmptyAttendee = (): Partial<EventAttendee> => ({
  status: 'going',
  guestCount: 0,
  checkedIn: false,
  reminderSent: false,
});