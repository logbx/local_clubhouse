// Shared types for Local Clubhouse app - reusable across mobile and web
// Based on existing backend NestJS structure

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  phoneNumber?: string;
  bio?: string;
  interests: string[];
  profileImage?: string;
  profileCompleted: boolean;
  fullName?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    coordinates?: [number, number]; // [longitude, latitude]
  };
  preferences?: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'friends' | 'private';
      locationSharing: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface Club {
  id: string;
  username: string; // unique club identifier
  name: string;
  description: string;
  category: ClubCategory;
  location: ClubLocation;
  profileImage?: string;
  bannerImage?: string;
  memberCount: number;
  isPrivate: boolean;
  tags: string[];
  socialLinks: SocialLink[];
  contactInfo: {
    email?: string;
    phone?: string;
    website?: string;
  };
  schedule?: {
    meetingTimes: string[];
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'irregular';
  };
  admins: string[]; // User IDs
  members: ClubMember[];
  createdAt: string;
  updatedAt: string;
  verified?: boolean;
  rating?: number;
  reviewCount?: number;
}

export interface ClubMember {
  userId: string;
  username: string;
  profileImage?: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
  isActive: boolean;
}

export interface ClubLocation {
  city: string;
  state: string;
  country: string;
  address?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  venueType?: 'indoor' | 'outdoor' | 'virtual' | 'hybrid';
}

export interface SocialLink {
  platform: 'instagram' | 'facebook' | 'twitter' | 'youtube' | 'discord' | 'website';
  url: string;
  displayText?: string;
}

export type ClubCategory = 
  | 'sports'
  | 'gaming'
  | 'fitness'
  | 'arts'
  | 'music'
  | 'technology'
  | 'education'
  | 'business'
  | 'social'
  | 'volunteer'
  | 'hobby'
  | 'outdoor'
  | 'food'
  | 'health'
  | 'book'
  | 'photography'
  | 'language'
  | 'dance'
  | 'crafts'
  | 'other';

export interface Event {
  id: string;
  clubId: string;
  clubUsername: string;
  title: string;
  description: string;
  category: EventCategory;
  type: EventType;
  startDate: string;
  endDate: string;
  location: EventLocation;
  maxAttendees?: number;
  currentAttendees: number;
  isPrivate: boolean;
  requiresApproval: boolean;
  cost?: {
    amount: number;
    currency: string;
    description?: string;
  };
  images: string[];
  tags: string[];
  attendees: EventAttendee[];
  waitlist: EventAttendee[];
  organizers: string[]; // User IDs
  equipment?: string[];
  requirements?: string[];
  ageRestriction?: {
    minAge?: number;
    maxAge?: number;
  };
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    endDate?: string;
    exceptions?: string[]; // dates to skip
  };
}

export interface EventAttendee {
  userId: string;
  username: string;
  profileImage?: string;
  status: 'going' | 'maybe' | 'not_going' | 'pending';
  rsvpDate: string;
  checkedIn?: boolean;
  checkedInAt?: string;
}

export interface EventLocation {
  type: 'physical' | 'virtual' | 'hybrid';
  name?: string;
  address?: string;
  city: string;
  state: string;
  country: string;
  coordinates?: [number, number];
  virtualLink?: string;
  instructions?: string;
}

export type EventCategory = 
  | 'meeting'
  | 'tournament'
  | 'social'
  | 'workshop'
  | 'training'
  | 'competition'
  | 'fundraiser'
  | 'volunteer'
  | 'networking'
  | 'celebration'
  | 'other';

export type EventType = 
  | 'recurring'
  | 'one_time'
  | 'series';

export interface Tournament {
  id: string;
  clubId: string;
  clubUsername: string;
  name: string;
  description: string;
  game: string;
  format: TournamentFormat;
  type: TournamentType;
  maxPlayers: number;
  currentPlayers: number;
  entryFee?: {
    amount: number;
    currency: string;
  };
  prizePool?: {
    total: number;
    currency: string;
    distribution: PrizeDistribution[];
  };
  startDate: string;
  endDate?: string;
  registrationDeadline: string;
  rules: string[];
  requirements: string[];
  players: TournamentPlayer[];
  brackets: TournamentBracket[];
  rounds: TournamentRound[];
  matches: TournamentMatch[];
  status: 'registration' | 'active' | 'completed' | 'cancelled';
  organizers: string[];
  settings: TournamentSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentPlayer {
  userId: string;
  username: string;
  profileImage?: string;
  seed?: number;
  registeredAt: string;
  status: 'registered' | 'active' | 'eliminated' | 'withdrawn';
  stats?: {
    wins: number;
    losses: number;
    points: number;
  };
}

export interface TournamentBracket {
  id: string;
  round: number;
  position: number;
  player1?: TournamentPlayer;
  player2?: TournamentPlayer;
  winner?: TournamentPlayer;
  match?: TournamentMatch;
}

export interface TournamentRound {
  id: string;
  number: number;
  name: string;
  matches: string[]; // Match IDs
  startDate?: string;
  endDate?: string;
  status: 'upcoming' | 'active' | 'completed';
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  roundId: string;
  player1: TournamentPlayer;
  player2: TournamentPlayer;
  scheduledDate?: string;
  result?: MatchResult;
  status: 'scheduled' | 'active' | 'completed' | 'disputed';
  streamUrl?: string;
  notes?: string;
  confirmedBy: string[]; // User IDs who confirmed result
  requiresConfirmation: boolean;
}

export interface MatchResult {
  winner: string; // User ID
  scores: {
    [playerId: string]: number | string;
  };
  duration?: number; // in minutes
  details?: string;
  submittedBy: string;
  submittedAt: string;
}

export interface PrizeDistribution {
  place: number;
  amount: number;
  percentage: number;
}

export interface TournamentSettings {
  autoAdvancement: boolean;
  allowWithdrawals: boolean;
  showBrackets: boolean;
  allowSpectators: boolean;
  resultConfirmationRequired: boolean;
  streamingEnabled: boolean;
  chatEnabled: boolean;
}

export type TournamentFormat = 
  | 'single_elimination'
  | 'double_elimination'
  | 'swiss'
  | 'round_robin'
  | 'ladder';

export type TournamentType = 
  | 'competitive'
  | 'casual'
  | 'ranked'
  | 'practice';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  senderProfileImage?: string;
  message: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'system';
  edited?: boolean;
  editedAt?: string;
  replyTo?: string; // Message ID
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  users: string[]; // User IDs
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  expiresAt?: string;
}

export type NotificationType = 
  | 'club_invitation'
  | 'event_invitation'
  | 'tournament_invitation'
  | 'event_reminder'
  | 'tournament_match'
  | 'tournament_result'
  | 'club_announcement'
  | 'friend_request'
  | 'message'
  | 'system';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Search and Filter types
export interface ClubSearchFilters {
  category?: ClubCategory;
  location?: {
    city?: string;
    state?: string;
    radius?: number; // in miles/km
  };
  memberCount?: {
    min?: number;
    max?: number;
  };
  isPrivate?: boolean;
  verified?: boolean;
  tags?: string[];
}

export interface EventSearchFilters {
  category?: EventCategory;
  type?: EventType;
  dateRange?: {
    start: string;
    end: string;
  };
  location?: {
    city?: string;
    state?: string;
    radius?: number;
  };
  cost?: {
    free?: boolean;
    max?: number;
  };
  clubId?: string;
}

export interface TournamentSearchFilters {
  game?: string;
  format?: TournamentFormat;
  type?: TournamentType;
  status?: Tournament['status'];
  entryFee?: {
    free?: boolean;
    max?: number;
  };
  dateRange?: {
    start: string;
    end: string;
  };
  clubId?: string;
}

// Form types (for validation)
export interface CreateClubForm {
  name: string;
  username: string;
  description: string;
  category: ClubCategory;
  location: {
    city: string;
    state: string;
    country: string;
    address?: string;
  };
  isPrivate: boolean;
  tags: string[];
  contactInfo: {
    email?: string;
    phone?: string;
    website?: string;
  };
}

export interface CreateEventForm {
  title: string;
  description: string;
  category: EventCategory;
  type: EventType;
  startDate: string;
  endDate: string;
  location: EventLocation;
  maxAttendees?: number;
  isPrivate: boolean;
  requiresApproval: boolean;
  cost?: {
    amount: number;
    currency: string;
    description?: string;
  };
  tags: string[];
  requirements?: string[];
  ageRestriction?: {
    minAge?: number;
    maxAge?: number;
  };
}

export interface CreateTournamentForm {
  name: string;
  description: string;
  game: string;
  format: TournamentFormat;
  type: TournamentType;
  maxPlayers: number;
  entryFee?: {
    amount: number;
    currency: string;
  };
  prizePool?: {
    total: number;
    currency: string;
  };
  startDate: string;
  registrationDeadline: string;
  rules: string[];
  requirements: string[];
  settings: Partial<TournamentSettings>;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullName?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

// Real-time events
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: string;
  userId?: string;
  roomId?: string;
}

// Upload types
export interface UploadResponse {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
}