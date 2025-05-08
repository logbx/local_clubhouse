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
  _id: string;
  id?: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  cost: number;
  isFree: boolean;
  status: EventStatus;
  visibility: EventVisibility;
  recurrence: RecurrenceType;
  tags: string[];
  imageUrl?: string;
  organizerId: string;
  rsvps: string[];
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
  status?: EventStatus;
}

export interface PublicEvent {
  _id: string;
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
  creatorId: string;
  rsvps: string[];
} 