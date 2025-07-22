// Deep Linking Configuration and Utilities
import { Linking } from 'react-native';
import { navigationService } from './navigation-service';
import { ROUTES } from './types';
import { logger } from '../monitoring/logger';

/**
 * Deep linking configuration for Expo Router
 */
export const deepLinkingConfig = {
  prefixes: [
    'localclubhouse://',
    'https://localclubhouse.com',
    'https://app.localclubhouse.com',
  ],
  config: {
    screens: {
      // Auth screens
      '(auth)': {
        screens: {
          login: 'auth/login',
          register: 'auth/register',
          'forgot-password': 'auth/forgot-password',
          'reset-password': 'auth/reset-password/:token',
          'verify-email': 'auth/verify-email/:token',
          onboarding: 'auth/onboarding',
        },
      },
      
      // Main app screens
      '(tabs)': {
        screens: {
          index: '',
          clubs: {
            path: 'clubs',
            screens: {
              index: '',
              '[id]': 'club/:id',
              create: 'clubs/create',
              edit: 'clubs/edit/:id',
              members: 'clubs/:id/members',
              settings: 'clubs/:id/settings',
            },
          },
          events: {
            path: 'events',
            screens: {
              index: '',
              '[id]': 'event/:id',
              create: 'events/create',
              edit: 'events/edit/:id',
              attendees: 'events/:id/attendees',
              'check-in': 'events/:id/check-in',
            },
          },
          tournaments: {
            path: 'tournaments',
            screens: {
              index: '',
              '[id]': 'tournament/:id',
              create: 'tournaments/create',
              bracket: 'tournaments/:id/bracket',
              leaderboard: 'tournaments/:id/leaderboard',
              matches: 'tournaments/:id/matches',
            },
          },
          profile: {
            path: 'profile',
            screens: {
              index: '',
              settings: 'profile/settings',
              'edit-profile': 'profile/edit',
              'change-password': 'profile/change-password',
              notifications: 'profile/notifications',
              privacy: 'profile/privacy',
              about: 'profile/about',
            },
          },
        },
      },
      
      // Modal screens
      modal: {
        screens: {
          'club-modal': 'modal/club/:clubId',
          'event-modal': 'modal/event/:eventId',
          'settings-modal': 'modal/settings',
          'share-modal': 'modal/share/:type/:id',
        },
      },
      
      // Not found
      '*': 'not-found',
    },
  },
};

/**
 * Deep link URL patterns and handlers
 */
export const deepLinkPatterns = {
  // Authentication patterns
  auth: {
    login: /^\/auth\/login$/,
    register: /^\/auth\/register$/,
    forgotPassword: /^\/auth\/forgot-password$/,
    resetPassword: /^\/auth\/reset-password\/([^\/]+)$/,
    verifyEmail: /^\/auth\/verify-email\/([^\/]+)$/,
    onboarding: /^\/auth\/onboarding$/,
  },
  
  // Club patterns
  club: {
    list: /^\/clubs$/,
    detail: /^\/club\/([^\/]+)$/,
    create: /^\/clubs\/create$/,
    edit: /^\/clubs\/edit\/([^\/]+)$/,
    members: /^\/clubs\/([^\/]+)\/members$/,
    settings: /^\/clubs\/([^\/]+)\/settings$/,
  },
  
  // Event patterns
  event: {
    list: /^\/events$/,
    detail: /^\/event\/([^\/]+)$/,
    create: /^\/events\/create$/,
    edit: /^\/events\/edit\/([^\/]+)$/,
    attendees: /^\/events\/([^\/]+)\/attendees$/,
    checkIn: /^\/events\/([^\/]+)\/check-in$/,
  },
  
  // Tournament patterns
  tournament: {
    list: /^\/tournaments$/,
    detail: /^\/tournament\/([^\/]+)$/,
    create: /^\/tournaments\/create$/,
    bracket: /^\/tournaments\/([^\/]+)\/bracket$/,
    leaderboard: /^\/tournaments\/([^\/]+)\/leaderboard$/,
    matches: /^\/tournaments\/([^\/]+)\/matches$/,
  },
  
  // Profile patterns
  profile: {
    main: /^\/profile$/,
    settings: /^\/profile\/settings$/,
    edit: /^\/profile\/edit$/,
    changePassword: /^\/profile\/change-password$/,
    notifications: /^\/profile\/notifications$/,
    privacy: /^\/profile\/privacy$/,
    about: /^\/profile\/about$/,
  },
  
  // Modal patterns
  modal: {
    club: /^\/modal\/club\/([^\/]+)$/,
    event: /^\/modal\/event\/([^\/]+)$/,
    settings: /^\/modal\/settings$/,
    share: /^\/modal\/share\/([^\/]+)\/([^\/]+)$/,
  },
};

/**
 * Deep link route handlers
 */
export const deepLinkHandlers = {
  // Authentication handlers
  handleAuthLogin: () => ({
    route: ROUTES.AUTH.LOGIN,
    params: {},
  }),
  
  handleAuthRegister: () => ({
    route: ROUTES.AUTH.REGISTER,
    params: {},
  }),
  
  handleResetPassword: (token: string) => ({
    route: ROUTES.AUTH.RESET_PASSWORD,
    params: { token },
  }),
  
  handleVerifyEmail: (token: string) => ({
    route: ROUTES.AUTH.VERIFY_EMAIL,
    params: { token },
  }),
  
  // Club handlers
  handleClubDetail: (id: string) => ({
    route: ROUTES.CLUB.DETAIL,
    params: { id },
  }),
  
  handleClubCreate: () => ({
    route: ROUTES.CLUB.CREATE,
    params: {},
  }),
  
  handleClubEdit: (id: string) => ({
    route: ROUTES.CLUB.EDIT,
    params: { id },
  }),
  
  handleClubMembers: (id: string) => ({
    route: ROUTES.CLUB.MEMBERS,
    params: { id },
  }),
  
  handleClubSettings: (id: string) => ({
    route: ROUTES.CLUB.SETTINGS,
    params: { id },
  }),
  
  // Event handlers
  handleEventDetail: (id: string) => ({
    route: ROUTES.EVENT.DETAIL,
    params: { id },
  }),
  
  handleEventCreate: (clubId?: string) => ({
    route: ROUTES.EVENT.CREATE,
    params: clubId ? { clubId } : {},
  }),
  
  handleEventEdit: (id: string) => ({
    route: ROUTES.EVENT.EDIT,
    params: { id },
  }),
  
  handleEventAttendees: (id: string) => ({
    route: ROUTES.EVENT.ATTENDEES,
    params: { id },
  }),
  
  handleEventCheckIn: (id: string) => ({
    route: ROUTES.EVENT.CHECK_IN,
    params: { id },
  }),
  
  // Tournament handlers
  handleTournamentDetail: (id: string) => ({
    route: ROUTES.TOURNAMENT.DETAIL,
    params: { id },
  }),
  
  handleTournamentCreate: (clubId?: string) => ({
    route: ROUTES.TOURNAMENT.CREATE,
    params: clubId ? { clubId } : {},
  }),
  
  handleTournamentBracket: (id: string) => ({
    route: ROUTES.TOURNAMENT.BRACKET,
    params: { id },
  }),
  
  handleTournamentLeaderboard: (id: string) => ({
    route: ROUTES.TOURNAMENT.LEADERBOARD,
    params: { id },
  }),
  
  handleTournamentMatches: (id: string) => ({
    route: ROUTES.TOURNAMENT.MATCHES,
    params: { id },
  }),
  
  // Profile handlers
  handleProfileSettings: () => ({
    route: ROUTES.PROFILE.SETTINGS,
    params: {},
  }),
  
  handleProfileEdit: () => ({
    route: ROUTES.PROFILE.EDIT,
    params: {},
  }),
  
  handleProfileChangePassword: () => ({
    route: ROUTES.PROFILE.CHANGE_PASSWORD,
    params: {},
  }),
  
  handleProfileNotifications: () => ({
    route: ROUTES.PROFILE.NOTIFICATIONS,
    params: {},
  }),
  
  handleProfilePrivacy: () => ({
    route: ROUTES.PROFILE.PRIVACY,
    params: {},
  }),
  
  handleProfileAbout: () => ({
    route: ROUTES.PROFILE.ABOUT,
    params: {},
  }),
  
  // Modal handlers
  handleClubModal: (clubId: string) => ({
    route: ROUTES.MODAL.CLUB,
    params: { clubId },
  }),
  
  handleEventModal: (eventId: string) => ({
    route: ROUTES.MODAL.EVENT,
    params: { eventId },
  }),
  
  handleSettingsModal: () => ({
    route: ROUTES.MODAL.SETTINGS,
    params: {},
  }),
  
  handleShareModal: (type: string, id: string) => ({
    route: ROUTES.MODAL.SHARE,
    params: { type, id },
  }),
};

/**
 * Parse deep link URL and extract route and parameters
 */
export function parseDeepLink(url: string): { route: string; params: Record<string, any> } {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;
    
    logger.debug('Parsing deep link', { url, pathname });
    
    // Convert search params to object
    const queryParams: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // Match against patterns and extract parameters
    for (const [category, patterns] of Object.entries(deepLinkPatterns)) {
      for (const [action, pattern] of Object.entries(patterns)) {
        const match = pathname.match(pattern);
        if (match) {
          const handlerKey = `handle${category.charAt(0).toUpperCase() + category.slice(1)}${action.charAt(0).toUpperCase() + action.slice(1)}`;
          const handler = deepLinkHandlers[handlerKey as keyof typeof deepLinkHandlers];
          
          if (handler) {
            const result = handler(...match.slice(1));
            return {
              route: result.route,
              params: { ...result.params, ...queryParams },
            };
          }
        }
      }
    }
    
    // Default fallback
    logger.warn('No deep link pattern matched', { pathname });
    return {
      route: ROUTES.TABS.HOME,
      params: queryParams,
    };
    
  } catch (error) {
    logger.error('Deep link parsing failed', { url, error });
    return {
      route: ROUTES.TABS.HOME,
      params: {},
    };
  }
}

/**
 * Build deep link URL for a route and parameters
 */
export function buildDeepLink(route: string, params: Record<string, any> = {}): string {
  const baseUrl = 'localclubhouse://app';
  
  // Convert route to deep link path
  let path = route;
  
  // Replace route parameters with actual values
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`[${key}]`, String(value));
    path = path.replace(`:${key}`, String(value));
  });
  
  // Build query string for remaining parameters
  const remainingParams = { ...params };
  Object.keys(params).forEach(key => {
    if (route.includes(`[${key}]`) || route.includes(`:${key}`)) {
      delete remainingParams[key];
    }
  });
  
  const queryString = new URLSearchParams(remainingParams).toString();
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${fullPath}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Initialize deep linking functionality
 */
export function initializeDeepLinking(): () => void {
  try {
    let subscription: any;
    
    const handleInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          logger.info('App opened with deep link', { initialUrl });
          const { route, params } = parseDeepLink(initialUrl);
          setTimeout(() => {
            navigationService.navigate(route, params);
          }, 100);
        }
      } catch (error) {
        logger.error('Error handling initial URL:', error);
      }
    };

    // Initialize asynchronously but return cleanup function immediately
    handleInitialUrl();
    
    subscription = Linking.addEventListener('url', ({ url }) => {
      logger.info('Deep link received', { url });
      const { route, params } = parseDeepLink(url);
      navigationService.navigate(route, params);
    });
    
    logger.info('Deep linking initialized');
    
    return () => {
      if (subscription?.remove && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
    
  } catch (error) {
    logger.error('Deep linking initialization failed', error);
    return () => {};
  }
}

/**
 * Share deep link functionality
 */
export async function shareDeepLink(route: string, params: Record<string, any> = {}) {
  try {
    const deepLink = buildDeepLink(route, params);
    
    // Use React Native Share API
    const { Share } = require('react-native');
    
    await Share.share({
      message: `Check this out on Local Clubhouse: ${deepLink}`,
      url: deepLink,
    });
    
    logger.info('Deep link shared', { route, params, deepLink });
    
  } catch (error) {
    logger.error('Deep link sharing failed', { route, params, error });
  }
}

/**
 * Validate deep link URL
 */
export function validateDeepLink(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const validSchemes = ['localclubhouse', 'https'];
    const validHosts = ['localclubhouse.com', 'app.localclubhouse.com'];
    
    if (parsedUrl.protocol === 'localclubhouse:') {
      return true;
    }
    
    if (parsedUrl.protocol === 'https:' && validHosts.includes(parsedUrl.hostname)) {
      return true;
    }
    
    return false;
    
  } catch (error) {
    return false;
  }
}

/**
 * Get deep link analytics
 */
export function getDeepLinkAnalytics() {
  // This would typically integrate with your analytics service
  return {
    totalClicks: 0,
    uniqueClicks: 0,
    topRoutes: [],
    conversionRate: 0,
  };
}