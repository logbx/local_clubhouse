// Local Clubhouse Brand Design System
import { Platform } from 'react-native';

// Brand Colors
export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Main brand color
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#1a365d', // Dark brand color
  },
  
  // Secondary Colors (Warm accent)
  secondary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316', // Main secondary
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },

  // Neutral Grays
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Success (for events, achievements)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning (for tournaments, alerts)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error (for conflicts, issues)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Local Community Colors
  community: {
    sports: '#10b981', // Green
    gaming: '#8b5cf6', // Purple
    arts: '#f59e0b',   // Amber
    social: '#06b6d4', // Cyan
    business: '#475569', // Slate
    outdoor: '#059669', // Emerald
  },

  // Semantic Colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
  },
  
  surface: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    elevated: '#ffffff',
  },

  text: {
    primary: '#0f172a',
    secondary: '#475569',
    tertiary: '#64748b',
    inverse: '#ffffff',
    link: '#0ea5e9',
  },

  border: {
    primary: '#e2e8f0',
    secondary: '#cbd5e1',
    focus: '#0ea5e9',
  },
};

// Dark Mode Colors
export const darkColors = {
  ...colors,
  
  background: {
    primary: '#0f172a',
    secondary: '#1e293b',
    tertiary: '#334155',
  },
  
  surface: {
    primary: '#1e293b',
    secondary: '#334155',
    elevated: '#475569',
  },

  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    tertiary: '#94a3b8',
    inverse: '#0f172a',
    link: '#38bdf8',
  },

  border: {
    primary: '#475569',
    secondary: '#334155',
    focus: '#38bdf8',
  },
};

// Typography System
export const typography = {
  fonts: {
    primary: Platform.select({
      ios: 'System',
      android: 'Roboto',
      web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }),
    secondary: Platform.select({
      ios: 'System',
      android: 'Roboto',
      web: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    }),
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      web: '"SF Mono", "Monaco", "Inconsolata", monospace',
    }),
  },

  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing System (based on 4px grid)
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
};

// Border Radius
export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Shadows
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: { elevation: 2 },
    web: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  }),
  
  base: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: { elevation: 4 },
    web: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  }),

  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    android: { elevation: 8 },
    web: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  }),
};

// Component Tokens
export const components = {
  card: {
    background: colors.surface.primary,
    borderColor: colors.border.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.4,
    shadow: shadows.base,
  },

  button: {
    primary: {
      background: colors.primary[500],
      color: colors.text.inverse,
      borderRadius: borderRadius.md,
      padding: { vertical: spacing.3, horizontal: spacing.4 },
    },
    secondary: {
      background: colors.gray[100],
      color: colors.text.primary,
      borderRadius: borderRadius.md,
      padding: { vertical: spacing.3, horizontal: spacing.4 },
    },
    outline: {
      background: 'transparent',
      color: colors.primary[500],
      borderColor: colors.primary[500],
      borderWidth: 1,
      borderRadius: borderRadius.md,
      padding: { vertical: spacing.3, horizontal: spacing.4 },
    },
  },

  input: {
    background: colors.surface.primary,
    borderColor: colors.border.primary,
    borderRadius: borderRadius.md,
    padding: spacing.3,
    fontSize: typography.sizes.base,
    focusBorderColor: colors.border.focus,
  },

  clubCard: {
    background: colors.surface.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.4,
    shadow: shadows.base,
    imageHeight: 120,
    avatarSize: 48,
  },

  eventCard: {
    background: colors.surface.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.4,
    shadow: shadows.sm,
    imageHeight: 160,
    statusColors: {
      upcoming: colors.primary[500],
      happening: colors.success[500],
      past: colors.gray[400],
    },
  },

  tournamentBracket: {
    background: colors.surface.secondary,
    borderRadius: borderRadius.base,
    matchBackground: colors.surface.primary,
    winnerColor: colors.success[500],
    pendingColor: colors.warning[500],
  },
};

// Animation Timings
export const animations = {
  fast: 150,
  normal: 250,
  slow: 400,
  
  easing: {
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// Breakpoints for responsive design
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// App-specific design tokens
export const localClubhouse = {
  // Category-specific colors
  categoryColors: {
    sports: colors.community.sports,
    gaming: colors.community.gaming,
    arts: colors.community.arts,
    social: colors.community.social,
    business: colors.community.business,
    outdoor: colors.community.outdoor,
    music: colors.secondary[500],
    technology: colors.primary[600],
    education: colors.warning[600],
    volunteer: colors.success[600],
    hobby: colors.primary[400],
    fitness: colors.success[500],
    food: colors.warning[500],
    health: colors.success[400],
    book: colors.gray[600],
    photography: colors.secondary[400],
    language: colors.primary[300],
    dance: colors.secondary[300],
    crafts: colors.warning[400],
    other: colors.gray[500],
  },

  // Status indicators
  statusColors: {
    online: colors.success[500],
    away: colors.warning[500],
    offline: colors.gray[400],
    active: colors.primary[500],
    inactive: colors.gray[300],
  },

  // Distance indicators
  distanceColors: {
    near: colors.success[500],   // < 5 miles
    medium: colors.warning[500], // 5-15 miles  
    far: colors.gray[500],       // > 15 miles
  },

  // Event urgency colors
  urgencyColors: {
    now: colors.error[500],      // Happening now
    soon: colors.warning[500],   // Within 2 hours
    today: colors.primary[500],  // Today
    week: colors.gray[500],      // This week
  },

  // Achievement colors
  achievementColors: {
    bronze: '#cd7f32',
    silver: '#c0c0c0',
    gold: '#ffd700',
    platinum: '#e5e4e2',
  },

  // Club size indicators
  clubSizeColors: {
    small: colors.gray[400],     // < 20 members
    medium: colors.primary[400], // 20-100 members
    large: colors.success[500],  // > 100 members
  },
};

// Utility functions
export const getColorForCategory = (category: string): string => {
  return localClubhouse.categoryColors[category as keyof typeof localClubhouse.categoryColors] || localClubhouse.categoryColors.other;
};

export const getDistanceColor = (distance: number): string => {
  if (distance < 5) return localClubhouse.distanceColors.near;
  if (distance < 15) return localClubhouse.distanceColors.medium;
  return localClubhouse.distanceColors.far;
};

export const getClubSizeColor = (memberCount: number): string => {
  if (memberCount < 20) return localClubhouse.clubSizeColors.small;
  if (memberCount < 100) return localClubhouse.clubSizeColors.medium;
  return localClubhouse.clubSizeColors.large;
};

export const getEventUrgencyColor = (startDate: string): string => {
  const now = new Date();
  const event = new Date(startDate);
  const diffHours = (event.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 0) return localClubhouse.urgencyColors.now;
  if (diffHours <= 2) return localClubhouse.urgencyColors.soon;
  if (diffHours <= 24) return localClubhouse.urgencyColors.today;
  return localClubhouse.urgencyColors.week;
};

// Export the complete design system
export const designSystem = {
  colors,
  darkColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  components,
  animations,
  breakpoints,
  localClubhouse,
  utils: {
    getColorForCategory,
    getDistanceColor,
    getClubSizeColor,
    getEventUrgencyColor,
  },
};