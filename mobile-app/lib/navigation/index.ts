// Navigation Module - Exports all navigation functionality
export * from './types';
export * from './navigation-service';
export * from './hooks';
export * from './deep-linking';

// Re-export the main navigation service instance
export { navigationService } from './navigation-service';

// Re-export key hooks for easy access
export { 
  useNavigation, 
  useNavigationState, 
  useNavigationPermissions,
  useRouteLifecycle,
  useDeepLinking,
  useNavigationAnalytics,
  useScreenPreloader,
} from './hooks';

// Re-export deep linking utilities
export { 
  deepLinkingConfig,
  parseDeepLink,
  buildDeepLink,
  initializeDeepLinking,
  shareDeepLink,
  validateDeepLink,
  getDeepLinkAnalytics,
} from './deep-linking';

// Re-export types for easy access
export type {
  NavigationState,
  NavigationEvent,
  NavigationPermission,
  NavigationAnalytics,
  NavigationPerformance,
  NavigationError,
  NavigationMiddleware,
  NavigationGuard,
  ScreenOptions,
  NavigationTheme,
  DeepLinkConfig,
  AuthStackParamList,
  TabsParamList,
  ClubStackParamList,
  EventStackParamList,
  TournamentStackParamList,
  ProfileStackParamList,
  ModalStackParamList,
  RootStackParamList,
} from './types';

// Re-export constants
export { ROUTES, NAVIGATION_CONSTANTS, NAVIGATION_PERMISSIONS } from './types';