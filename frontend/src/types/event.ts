export enum EventStatus {
  DRAFT = 'DRAFT',
  LIVE = 'LIVE',
  PAST = 'PAST'
}

export enum EventVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  CLUB = 'CLUB'
}

export enum RecurrenceType {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export enum EventFeatures {
  SINGLE_ELIMINATION_TOURNAMENT = 'SINGLE_ELIMINATION_TOURNAMENT',
  SWISS_TOURNAMENT = 'SWISS_TOURNAMENT'
}

export interface EventFormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  cost: number;
  isFree: boolean;
  visibility: EventVisibility;
  recurrence: RecurrenceType;
  tags: string[];
  features: EventFeatures[];
  status: EventStatus;
  clubId?: string;
  clubUsername?: string;
  clubName?: string;
  clubLogoUrl?: string;
  invitedUsers: string[];
  sponsors: {
    sponsorId: string;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    respondedAt?: string;
  }[];
}

export interface Event extends EventFormData {
  id: string;
  creator: {
    id: string;
    username: string;
  };
  creatorId?: string;
  rsvps: any[];
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  cost: number;
  isFree: boolean;
  visibility: EventVisibility;
  tags: string[];
  imageUrl?: string;
  creator?: {
    id: string;
    username: string;
    profileImage?: string;
  };
  creatorId: string;
  clubId?: string;
  clubUsername?: string;
  clubName?: string;
  clubLogoUrl?: string;
  rsvps: string[];
  sponsors?: {
    sponsorId: any;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    respondedAt?: string;
  }[];
}

export interface SubGroup {
  id: string;
  name: string;
  eventId: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventDto {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
}

export interface UpdateEventDto extends Partial<CreateEventDto> {
  attendees?: string[];
  subGroups?: string[];
} 