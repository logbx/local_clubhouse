export enum EventStatus {
  DRAFT = 'DRAFT',
  LIVE = 'LIVE',
  PAST = 'PAST',
}

export enum EventVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum RecurrenceType {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string | Date;
  endDate: string | Date;
  location: string;
  cost: number;
  isFree: boolean;
  status: EventStatus;
  visibility: EventVisibility;
  recurrence: RecurrenceType;
  tags: string[];
  imageUrl?: string;
  creator: {
    id: string;
    username: string;
    profileImage?: string;
  };
  creatorId?: string;
  rsvps: Array<{
    id: string;
    username: string;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
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
  status: EventStatus;
  imageUrl?: string;
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
  rsvps: string[];
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