import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type * as schema from './schema';

// User types
export type User = InferSelectModel<typeof schema.users>;
export type NewUser = InferInsertModel<typeof schema.users>;
export type UserUpdate = Partial<Omit<User, 'id' | 'createdAt'>>;

// Club types
export type Club = InferSelectModel<typeof schema.clubs>;
export type NewClub = InferInsertModel<typeof schema.clubs>;
export type ClubUpdate = Partial<Omit<Club, 'id' | 'createdAt'>>;

export type ClubMember = InferSelectModel<typeof schema.clubMembers>;
export type NewClubMember = InferInsertModel<typeof schema.clubMembers>;
export type ClubMemberUpdate = Partial<Omit<ClubMember, 'id' | 'createdAt'>>;

// Event types
export type Event = InferSelectModel<typeof schema.events>;
export type NewEvent = InferInsertModel<typeof schema.events>;
export type EventUpdate = Partial<Omit<Event, 'id' | 'createdAt'>>;

export type EventAttendee = InferSelectModel<typeof schema.eventAttendees>;
export type NewEventAttendee = InferInsertModel<typeof schema.eventAttendees>;
export type EventAttendeeUpdate = Partial<Omit<EventAttendee, 'id' | 'createdAt'>>;

// Tournament types
export type Tournament = InferSelectModel<typeof schema.tournaments>;
export type NewTournament = InferInsertModel<typeof schema.tournaments>;
export type TournamentUpdate = Partial<Omit<Tournament, 'id' | 'createdAt'>>;

// Message types
export type Message = InferSelectModel<typeof schema.messages>;
export type NewMessage = InferInsertModel<typeof schema.messages>;
export type MessageUpdate = Partial<Omit<Message, 'id' | 'createdAt'>>;

// Notification types
export type Notification = InferSelectModel<typeof schema.notifications>;
export type NewNotification = InferInsertModel<typeof schema.notifications>;
export type NotificationUpdate = Partial<Omit<Notification, 'id' | 'createdAt'>>;

// Offline queue types
export type OfflineQueueItem = InferSelectModel<typeof schema.offlineQueue>;
export type NewOfflineQueueItem = InferInsertModel<typeof schema.offlineQueue>;

// API cache types
export type ApiCacheItem = InferSelectModel<typeof schema.apiCache>;
export type NewApiCacheItem = InferInsertModel<typeof schema.apiCache>;

// File upload types
export type FileUpload = InferSelectModel<typeof schema.fileUploads>;
export type NewFileUpload = InferInsertModel<typeof schema.fileUploads>;
export type FileUploadUpdate = Partial<Omit<FileUpload, 'id' | 'createdAt'>>;

// Extended types with relations
export type UserWithRelations = User & {
  clubMemberships?: ClubMember[];
  createdClubs?: Club[];
  organizedEvents?: Event[];
  eventAttendances?: EventAttendee[];
  sentMessages?: Message[];
  notifications?: Notification[];
  fileUploads?: FileUpload[];
};

export type ClubWithRelations = Club & {
  creator?: User;
  members?: (ClubMember & { user?: User })[];
  events?: Event[];
  tournaments?: Tournament[];
};

export type EventWithRelations = Event & {
  club?: Club;
  organizer?: User;
  attendees?: (EventAttendee & { user?: User })[];
  tournaments?: Tournament[];
};

export type MessageWithRelations = Message & {
  sender?: User;
  replyTo?: Message;
  replies?: Message[];
};

// Sync status enum
export type SyncStatus = 'synced' | 'pending' | 'conflict';

// API related types
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  queueIfOffline?: boolean;
  cache?: boolean;
  cacheTimeout?: number;
  retries?: number;
  priority?: number;
}

export interface QueuedRequest {
  id: string;
  endpoint: string;
  options: RequestOptions;
  timestamp: number;
  retryCount: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  id?: string;
}

export interface RealtimeUpdate {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  record: any;
  oldRecord?: any;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

// Search and filter types
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

// Location types
export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  formattedAddress?: string;
}

// Settings types
export interface TournamentSettings {
  allowLateRegistration: boolean;
  requireApproval: boolean;
  showLiveBracket: boolean;
  allowSpectators: boolean;
  randomizeSeeds: boolean;
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
  tiebreakers: ('head_to_head' | 'buchholz' | 'points_diff' | 'games_won')[];
}

export interface EventSettings {
  allowGuestRegistration: boolean;
  sendReminderEmails: boolean;
  enableWaitlist: boolean;
  autoApproveRegistrations: boolean;
  requireAttendeeInfo: boolean;
  customFields: Array<{
    name: string;
    type: 'text' | 'select' | 'checkbox' | 'number';
    required: boolean;
    options?: string[];
  }>;
}

// Statistics types
export interface TournamentStats {
  totalMatches: number;
  completedMatches: number;
  averageMatchDuration: number;
  spectatorCount: number;
  topPlayer?: string;
  mostActiveRound?: number;
}

export interface ClubStats {
  totalMembers: number;
  activeMembers: number;
  totalEvents: number;
  upcomingEvents: number;
  totalTournaments: number;
  activeTournaments: number;
  joinRate: number;
  engagementRate: number;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Auth types
export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  fullName: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Store types
export interface StoreState {
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  isOnline: boolean;
}

// Theme types
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export interface Theme {
  name: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  typography: Record<string, any>;
}