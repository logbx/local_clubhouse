// Query Key Factory - Type-safe query key management
// Following TDD principles with comprehensive query key patterns

export const queryKeys = {
  // Auth queries
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    profile: () => [...queryKeys.auth.all, 'profile'] as const,
    permissions: () => [...queryKeys.auth.all, 'permissions'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
  },

  // Club queries
  clubs: {
    all: ['clubs'] as const,
    lists: () => [...queryKeys.clubs.all, 'list'] as const,
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
    }) => [...queryKeys.clubs.lists(), params] as const,
    details: () => [...queryKeys.clubs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.clubs.details(), id] as const,
    members: (id: string) => [...queryKeys.clubs.detail(id), 'members'] as const,
    events: (id: string) => [...queryKeys.clubs.detail(id), 'events'] as const,
    myClubs: () => [...queryKeys.clubs.all, 'my-clubs'] as const,
    popular: () => [...queryKeys.clubs.all, 'popular'] as const,
    categories: () => [...queryKeys.clubs.all, 'categories'] as const,
    nearby: (location?: { latitude: number; longitude: number }) => 
      [...queryKeys.clubs.all, 'nearby', location] as const,
    search: (term: string) => [...queryKeys.clubs.all, 'search', term] as const,
  },

  // Event queries
  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (params?: {
      page?: number;
      limit?: number;
      clubId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }) => [...queryKeys.events.lists(), params] as const,
    details: () => [...queryKeys.events.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.events.details(), id] as const,
    attendees: (id: string) => [...queryKeys.events.detail(id), 'attendees'] as const,
    stats: (id: string) => [...queryKeys.events.detail(id), 'stats'] as const,
    myEvents: () => [...queryKeys.events.all, 'my-events'] as const,
    upcoming: () => [...queryKeys.events.all, 'upcoming'] as const,
    search: (term: string) => [...queryKeys.events.all, 'search', term] as const,
    dateRange: (startDate: string, endDate: string) => 
      [...queryKeys.events.all, 'date-range', startDate, endDate] as const,
    byClub: (clubId: string) => [...queryKeys.events.all, 'by-club', clubId] as const,
  },

  // Tournament queries
  tournaments: {
    all: ['tournaments'] as const,
    lists: () => [...queryKeys.tournaments.all, 'list'] as const,
    list: (params?: {
      page?: number;
      limit?: number;
      status?: string;
      clubId?: string;
    }) => [...queryKeys.tournaments.lists(), params] as const,
    details: () => [...queryKeys.tournaments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tournaments.details(), id] as const,
    brackets: (id: string) => [...queryKeys.tournaments.detail(id), 'brackets'] as const,
    participants: (id: string) => [...queryKeys.tournaments.detail(id), 'participants'] as const,
    matches: (id: string) => [...queryKeys.tournaments.detail(id), 'matches'] as const,
    leaderboard: (id: string) => [...queryKeys.tournaments.detail(id), 'leaderboard'] as const,
    myTournaments: () => [...queryKeys.tournaments.all, 'my-tournaments'] as const,
  },

  // Notification queries
  notifications: {
    all: ['notifications'] as const,
    list: (params?: { page?: number; limit?: number; unread?: boolean }) => 
      [...queryKeys.notifications.all, 'list', params] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
    settings: () => [...queryKeys.notifications.all, 'settings'] as const,
  },

  // User queries
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (params?: { page?: number; limit?: number; search?: string }) => 
      [...queryKeys.users.lists(), params] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    profile: (id: string) => [...queryKeys.users.detail(id), 'profile'] as const,
    achievements: (id: string) => [...queryKeys.users.detail(id), 'achievements'] as const,
    search: (term: string) => [...queryKeys.users.all, 'search', term] as const,
  },

  // Analytics queries
  analytics: {
    all: ['analytics'] as const,
    dashboard: () => [...queryKeys.analytics.all, 'dashboard'] as const,
    clubStats: (clubId: string) => [...queryKeys.analytics.all, 'club-stats', clubId] as const,
    eventStats: (eventId: string) => [...queryKeys.analytics.all, 'event-stats', eventId] as const,
    userActivity: () => [...queryKeys.analytics.all, 'user-activity'] as const,
  },

  // Cache management utilities
  invalidation: {
    // Invalidate all queries for a specific entity
    invalidateEntity: (entity: keyof typeof queryKeys) => {
      return queryKeys[entity].all;
    },
    
    // Invalidate all list queries for an entity
    invalidateEntityLists: (entity: keyof typeof queryKeys) => {
      const entityKeys = queryKeys[entity] as any;
      return entityKeys.lists ? entityKeys.lists() : entityKeys.all;
    },
    
    // Invalidate specific detail query
    invalidateDetail: (entity: keyof typeof queryKeys, id: string) => {
      const entityKeys = queryKeys[entity] as any;
      return entityKeys.detail ? entityKeys.detail(id) : entityKeys.all;
    },
  },
} as const;

// Type helpers for query keys
export type QueryKey = typeof queryKeys;
export type AuthQueryKey = ReturnType<typeof queryKeys.auth[keyof typeof queryKeys.auth]>;
export type ClubQueryKey = ReturnType<typeof queryKeys.clubs[keyof typeof queryKeys.clubs]>;
export type EventQueryKey = ReturnType<typeof queryKeys.events[keyof typeof queryKeys.events]>;
export type TournamentQueryKey = ReturnType<typeof queryKeys.tournaments[keyof typeof queryKeys.tournaments]>;

// Query key validation utility
export const isValidQueryKey = (key: unknown): key is readonly string[] => {
  return Array.isArray(key) && key.every(item => typeof item === 'string');
};

// Query key matcher utility
export const matchesQueryKey = (key: readonly string[], pattern: readonly string[]): boolean => {
  if (pattern.length > key.length) return false;
  
  for (let i = 0; i < pattern.length; i++) {
    if (key[i] !== pattern[i]) return false;
  }
  
  return true;
};