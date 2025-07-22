// Event model for mobile app
export interface Event {
  _id: string;
  id: string;
  title: string;
  description: string;
  clubId: string;
  clubName: string;
  clubUsername: string;
  createdBy: string;
  createdByUsername: string;
  createdByFullName: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  location: EventLocation;
  category: string;
  tags: string[];
  maxAttendees?: number;
  attendees: string[];
  attendeeCount: number;
  waitlist: string[];
  waitlistCount: number;
  isPrivate: boolean;
  requiresApproval: boolean;
  allowGuests: boolean;
  images: string[];
  coverImage?: string;
  status: EventStatus;
  settings: EventSettings;
  stats: EventStats;
  socialLinks?: {
    website?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  pricing?: EventPricing;
  customFields?: CustomField[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isCancelled: boolean;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
}

export interface EventLocation {
  type: 'venue' | 'online' | 'hybrid';
  venue?: string;
  address?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  onlineUrl?: string;
  onlinePlatform?: string;
  instructions?: string;
}

export type EventStatus = 
  | 'draft'
  | 'published'
  | 'live'
  | 'completed'
  | 'cancelled';

export interface EventSettings {
  allowComments: boolean;
  allowPhotoSharing: boolean;
  allowCheckins: boolean;
  sendReminders: boolean;
  reminderTimes: number[]; // hours before event
  requireRsvp: boolean;
  maxGuestsPerRsvp: number;
  allowWaitlist: boolean;
  autoApproveRsvps: boolean;
  visibility: 'public' | 'club_members' | 'private';
}

export interface EventStats {
  totalRsvps: number;
  confirmedAttendees: number;
  actualAttendees: number;
  noShows: number;
  commentsCount: number;
  photosShared: number;
  checkins: number;
  rating: number;
  ratingCount: number;
}

export interface EventPricing {
  isFree: boolean;
  currency: string;
  basePrice: number;
  memberPrice?: number;
  earlyBirdPrice?: number;
  earlyBirdDeadline?: Date;
  refundPolicy: string;
  paymentMethods: string[];
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'boolean';
  required: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: any;
}

export interface EventRsvp {
  _id: string;
  id: string;
  eventId: string;
  userId: string;
  username: string;
  fullName: string;
  email: string;
  profilePicture?: string;
  status: RsvpStatus;
  response: RsvpResponse;
  guestCount: number;
  guestNames: string[];
  customFieldResponses?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  checkedInAt?: Date;
  checkedInBy?: string;
  notes?: string;
  isActive: boolean;
}

export type RsvpStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type RsvpResponse = 
  | 'going'
  | 'maybe'
  | 'not_going'
  | 'interested';

export interface EventComment {
  _id: string;
  id: string;
  eventId: string;
  userId: string;
  username: string;
  fullName: string;
  profilePicture?: string;
  content: string;
  parentId?: string; // for replies
  replies?: EventComment[];
  likes: string[];
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface EventPhoto {
  _id: string;
  id: string;
  eventId: string;
  uploadedBy: string;
  uploaderUsername: string;
  uploaderFullName: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  tags: string[];
  likes: string[];
  likeCount: number;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  metadata?: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
}

export interface EventCheckin {
  _id: string;
  id: string;
  eventId: string;
  userId: string;
  username: string;
  fullName: string;
  checkedInAt: Date;
  checkedInBy: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  isActive: boolean;
}

export interface EventReminder {
  _id: string;
  id: string;
  eventId: string;
  userId: string;
  type: 'push' | 'email' | 'sms';
  scheduledFor: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
  content: string;
  isActive: boolean;
}

// Request/Response types
export interface CreateEventRequest {
  title: string;
  description: string;
  clubId: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  location: EventLocation;
  category: string;
  tags?: string[];
  maxAttendees?: number;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  allowGuests?: boolean;
  images?: string[];
  coverImage?: string;
  settings?: Partial<EventSettings>;
  pricing?: EventPricing;
  customFields?: CustomField[];
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
  location?: EventLocation;
  category?: string;
  tags?: string[];
  maxAttendees?: number;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  allowGuests?: boolean;
  images?: string[];
  coverImage?: string;
  settings?: Partial<EventSettings>;
  pricing?: EventPricing;
  customFields?: CustomField[];
}

export interface RsvpEventRequest {
  eventId: string;
  response: RsvpResponse;
  guestCount?: number;
  guestNames?: string[];
  customFieldResponses?: Record<string, any>;
  notes?: string;
}

export interface UpdateRsvpRequest {
  rsvpId: string;
  response?: RsvpResponse;
  guestCount?: number;
  guestNames?: string[];
  customFieldResponses?: Record<string, any>;
  notes?: string;
}

export interface CheckinUserRequest {
  eventId: string;
  userId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

export interface AddCommentRequest {
  eventId: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentRequest {
  commentId: string;
  content: string;
}

export interface UploadPhotoRequest {
  eventId: string;
  photo: File | Blob;
  caption?: string;
  tags?: string[];
}

export interface EventSearchFilters {
  clubId?: string;
  category?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    radius?: number;
  };
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  tags?: string[];
  status?: EventStatus;
  isPrivate?: boolean;
  hasAvailableSpots?: boolean;
  priceRange?: {
    min?: number;
    max?: number;
  };
  sortBy?: 'startDate' | 'title' | 'attendeeCount' | 'created' | 'distance';
  sortOrder?: 'asc' | 'desc';
}

// Type guards
export const isEvent = (obj: any): obj is Event => {
  return obj && typeof obj._id === 'string' && typeof obj.title === 'string';
};

export const isEventRsvp = (obj: any): obj is EventRsvp => {
  return obj && typeof obj._id === 'string' && typeof obj.eventId === 'string' && typeof obj.userId === 'string';
};

export const isEventComment = (obj: any): obj is EventComment => {
  return obj && typeof obj._id === 'string' && typeof obj.eventId === 'string' && typeof obj.content === 'string';
};

// Utility functions
export const canUserRsvp = (event: Event, userId: string): boolean => {
  if (!event.isActive || event.isCancelled) return false;
  if (event.status !== 'published') return false;
  if (event.maxAttendees && event.attendeeCount >= event.maxAttendees) return false;
  if (event.attendees.includes(userId)) return false;
  return true;
};

export const canUserCheckIn = (event: Event, userId: string): boolean => {
  if (!event.isActive || event.isCancelled) return false;
  if (event.status !== 'live') return false;
  if (!event.attendees.includes(userId)) return false;
  return true;
};

export const isEventUpcoming = (event: Event): boolean => {
  return new Date(event.startDate) > new Date();
};

export const isEventLive = (event: Event): boolean => {
  const now = new Date();
  return new Date(event.startDate) <= now && new Date(event.endDate) > now;
};

export const isEventCompleted = (event: Event): boolean => {
  return new Date(event.endDate) < new Date();
};

export const getEventStatusColor = (status: EventStatus): string => {
  switch (status) {
    case 'draft': return '#6B7280';
    case 'published': return '#10B981';
    case 'live': return '#F59E0B';
    case 'completed': return '#6366F1';
    case 'cancelled': return '#EF4444';
    default: return '#6B7280';
  }
};

export const getRsvpStatusColor = (status: RsvpStatus): string => {
  switch (status) {
    case 'pending': return '#F59E0B';
    case 'approved': return '#10B981';
    case 'rejected': return '#EF4444';
    case 'cancelled': return '#6B7280';
    default: return '#6B7280';
  }
};

// Default values
export const createEmptyEvent = (): Partial<Event> => ({
  title: '',
  description: '',
  clubId: '',
  category: '',
  tags: [],
  attendees: [],
  attendeeCount: 0,
  waitlist: [],
  waitlistCount: 0,
  isPrivate: false,
  requiresApproval: false,
  allowGuests: true,
  images: [],
  status: 'draft',
  settings: {
    allowComments: true,
    allowPhotoSharing: true,
    allowCheckins: true,
    sendReminders: true,
    reminderTimes: [24, 2], // 24 hours and 2 hours before
    requireRsvp: true,
    maxGuestsPerRsvp: 0,
    allowWaitlist: true,
    autoApproveRsvps: true,
    visibility: 'public',
  },
  stats: {
    totalRsvps: 0,
    confirmedAttendees: 0,
    actualAttendees: 0,
    noShows: 0,
    commentsCount: 0,
    photosShared: 0,
    checkins: 0,
    rating: 0,
    ratingCount: 0,
  },
  isActive: true,
  isCancelled: false,
});