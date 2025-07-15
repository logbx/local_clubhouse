// Navigation Types and Constants
// Comprehensive type definitions for navigation architecture

export type AuthStackParamList = {
  login: undefined;
  register: undefined;
  'forgot-password': undefined;
  'reset-password': { token: string };
  'verify-email': { token: string };
  onboarding: undefined;
};

export type TabsParamList = {
  index: undefined;
  clubs: undefined;
  events: undefined;
  tournaments: undefined;
  profile: undefined;
};

export type ClubStackParamList = {
  index: undefined;
  '[id]': { id: string };
  create: undefined;
  edit: { id: string };
  members: { id: string };
  settings: { id: string };
};

export type EventStackParamList = {
  index: undefined;
  '[id]': { id: string };
  create: { clubId?: string };
  edit: { id: string };
  attendees: { id: string };
  'check-in': { id: string };
};

export type TournamentStackParamList = {
  index: undefined;
  '[id]': { id: string };
  create: { clubId?: string };
  bracket: { id: string };
  leaderboard: { id: string };
  matches: { id: string };
};

export type ProfileStackParamList = {
  index: undefined;
  settings: undefined;
  'edit-profile': undefined;
  'change-password': undefined;
  notifications: undefined;
  privacy: undefined;
  about: undefined;
};

export type ModalStackParamList = {
  modal: undefined;
  'club-modal': { clubId: string };
  'event-modal': { eventId: string };
  'settings-modal': undefined;
  'share-modal': { type: string; id: string };
};

export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
  modal: undefined;
  index: undefined;
};

// Navigation State Types
export interface NavigationState {
  routeName: string;
  params?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
}

export interface NavigationEvent {
  type: 'navigate' | 'back' | 'focus' | 'blur' | 'state_change';
  routeName: string;
  params?: Record<string, any>;
  timestamp: number;
  duration?: number;
  previousRoute?: string;
}

export interface NavigationPermission {
  route: string;
  requiredPermissions: string[];
  requiredRoles: string[];
  requiresAuth: boolean;
  requiresVerification: boolean;
}

// Deep Linking Types
export interface DeepLinkConfig {
  scheme: string;
  prefixes: string[];
  config: {
    screens: Record<string, string | { path: string; parse?: Record<string, (value: string) => any> }>;
  };
}

// Navigation Analytics Types
export interface NavigationAnalytics {
  screenViews: Record<string, number>;
  timeSpent: Record<string, number>;
  navigationPaths: Array<{
    from: string;
    to: string;
    count: number;
    avgDuration: number;
  }>;
  dropOffPoints: Array<{
    route: string;
    exitRate: number;
  }>;
}

// Navigation Performance Types
export interface NavigationPerformance {
  routeName: string;
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage: number;
  bundleSize?: number;
}

// Navigation Constants
export const NAVIGATION_CONSTANTS = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_TIME: 100,
  MAX_HISTORY_LENGTH: 50,
  PRELOAD_SCREENS: ['clubs', 'events'] as const,
  PERMISSION_CHECK_INTERVAL: 30000,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
} as const;

// Route Definitions with Metadata
export const ROUTES = {
  // Auth Routes
  AUTH: {
    LOGIN: '/(auth)/login',
    REGISTER: '/(auth)/register',
    FORGOT_PASSWORD: '/(auth)/forgot-password',
    RESET_PASSWORD: '/(auth)/reset-password',
    VERIFY_EMAIL: '/(auth)/verify-email',
    ONBOARDING: '/(auth)/onboarding',
  },
  
  // Main App Routes
  TABS: {
    HOME: '/(tabs)/',
    CLUBS: '/(tabs)/clubs',
    EVENTS: '/(tabs)/events',
    TOURNAMENTS: '/(tabs)/tournaments',
    PROFILE: '/(tabs)/profile',
  },
  
  // Club Routes
  CLUB: {
    DETAIL: '/(tabs)/clubs/[id]',
    CREATE: '/(tabs)/clubs/create',
    EDIT: '/(tabs)/clubs/edit',
    MEMBERS: '/(tabs)/clubs/[id]/members',
    SETTINGS: '/(tabs)/clubs/[id]/settings',
  },
  
  // Event Routes
  EVENT: {
    DETAIL: '/(tabs)/events/[id]',
    CREATE: '/(tabs)/events/create',
    EDIT: '/(tabs)/events/edit',
    ATTENDEES: '/(tabs)/events/[id]/attendees',
    CHECK_IN: '/(tabs)/events/[id]/check-in',
  },
  
  // Tournament Routes
  TOURNAMENT: {
    DETAIL: '/(tabs)/tournaments/[id]',
    CREATE: '/(tabs)/tournaments/create',
    BRACKET: '/(tabs)/tournaments/[id]/bracket',
    LEADERBOARD: '/(tabs)/tournaments/[id]/leaderboard',
    MATCHES: '/(tabs)/tournaments/[id]/matches',
  },
  
  // Profile Routes
  PROFILE: {
    SETTINGS: '/(tabs)/profile/settings',
    EDIT: '/(tabs)/profile/edit-profile',
    CHANGE_PASSWORD: '/(tabs)/profile/change-password',
    NOTIFICATIONS: '/(tabs)/profile/notifications',
    PRIVACY: '/(tabs)/profile/privacy',
    ABOUT: '/(tabs)/profile/about',
  },
  
  // Modal Routes
  MODAL: {
    CLUB: '/modal/club-modal',
    EVENT: '/modal/event-modal',
    SETTINGS: '/modal/settings-modal',
    SHARE: '/modal/share-modal',
  },
  
  // External Routes
  EXTERNAL: {
    PRIVACY_POLICY: 'https://localclubhouse.com/privacy',
    TERMS_OF_SERVICE: 'https://localclubhouse.com/terms',
    SUPPORT: 'https://localclubhouse.com/support',
    FEEDBACK: 'https://localclubhouse.com/feedback',
  },
} as const;

// Navigation Permissions Configuration
export const NAVIGATION_PERMISSIONS: NavigationPermission[] = [
  // Auth routes - no permissions required
  {
    route: ROUTES.AUTH.LOGIN,
    requiredPermissions: [],
    requiredRoles: [],
    requiresAuth: false,
    requiresVerification: false,
  },
  
  // Main app routes - require authentication
  {
    route: ROUTES.TABS.HOME,
    requiredPermissions: [],
    requiredRoles: ['user'],
    requiresAuth: true,
    requiresVerification: false,
  },
  
  // Club creation - requires permissions
  {
    route: ROUTES.CLUB.CREATE,
    requiredPermissions: ['create_club'],
    requiredRoles: ['user'],
    requiresAuth: true,
    requiresVerification: true,
  },
  
  // Club management - requires admin role
  {
    route: ROUTES.CLUB.SETTINGS,
    requiredPermissions: ['manage_club'],
    requiredRoles: ['club_admin', 'admin'],
    requiresAuth: true,
    requiresVerification: true,
  },
  
  // Tournament creation - requires permissions
  {
    route: ROUTES.TOURNAMENT.CREATE,
    requiredPermissions: ['create_tournament'],
    requiredRoles: ['tournament_organizer', 'admin'],
    requiresAuth: true,
    requiresVerification: true,
  },
];

// Navigation Error Types
export interface NavigationError extends Error {
  type: 'PERMISSION_DENIED' | 'ROUTE_NOT_FOUND' | 'AUTH_REQUIRED' | 'VERIFICATION_REQUIRED';
  route: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

// Navigation Middleware Types
export type NavigationMiddleware = (
  to: string,
  from: string,
  params?: Record<string, any>
) => Promise<boolean | string>;

export type NavigationGuard = (
  route: string,
  params?: Record<string, any>
) => Promise<boolean>;

// Screen Options Types
export interface ScreenOptions {
  title?: string;
  headerShown?: boolean;
  headerBackTitle?: string;
  gestureEnabled?: boolean;
  animationEnabled?: boolean;
  presentation?: 'card' | 'modal' | 'transparentModal';
  orientation?: 'portrait' | 'landscape' | 'all';
  statusBarStyle?: 'auto' | 'inverted';
  statusBarHidden?: boolean;
  autoHideHomeIndicator?: boolean;
  preload?: boolean;
  analytics?: boolean;
}

// Navigation Theme Types
export interface NavigationTheme {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
    surface: string;
    onSurface: string;
    accent: string;
  };
}

export type NavigationMode = 'stack' | 'tabs' | 'drawer' | 'modal';
export type NavigationTransition = 'slide' | 'fade' | 'none' | 'modal';
export type NavigationPosition = 'left' | 'right' | 'top' | 'bottom';