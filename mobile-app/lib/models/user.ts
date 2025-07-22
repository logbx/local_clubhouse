// User model for mobile app
export interface User {
  _id: string;
  id: string;
  email: string;
  username: string;
  fullName: string;
  bio?: string;
  profilePicture?: string;
  location?: {
    city: string;
    state: string;
    country: string;
  };
  preferences?: {
    notifications: boolean;
    darkMode: boolean;
    language: string;
  };
  stats?: {
    clubsJoined: number;
    eventsAttended: number;
    tournamentsWon: number;
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: Date;
  roles: string[];
  friends: string[];
  blockedUsers: string[];
}

export interface UserProfile {
  user: User;
  isOwnProfile: boolean;
  isFriend: boolean;
  isBlocked: boolean;
  mutualFriends: number;
  recentActivity: Activity[];
}

export interface Activity {
  id: string;
  type: 'club_joined' | 'event_created' | 'tournament_won' | 'friend_added';
  title: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UserSettings {
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    clubUpdates: boolean;
    eventReminders: boolean;
    friendRequests: boolean;
    tournamentResults: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showLocation: boolean;
    showStats: boolean;
    allowMessagesFromStrangers: boolean;
  };
  preferences: {
    darkMode: boolean;
    language: string;
    timeZone: string;
    dateFormat: string;
    autoJoinTournaments: boolean;
  };
}

export interface CreateUserRequest {
  email: string;
  username: string;
  fullName: string;
  password: string;
  bio?: string;
  location?: {
    city: string;
    state: string;
    country: string;
  };
}

export interface UpdateUserRequest {
  fullName?: string;
  bio?: string;
  location?: {
    city: string;
    state: string;
    country: string;
  };
  preferences?: Partial<UserSettings['preferences']>;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest extends CreateUserRequest {
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  isNewUser: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

// Type guards
export const isUser = (obj: any): obj is User => {
  return obj && typeof obj._id === 'string' && typeof obj.email === 'string';
};

export const isAuthResponse = (obj: any): obj is AuthResponse => {
  return obj && isUser(obj.user) && obj.tokens && typeof obj.tokens.accessToken === 'string';
};

// Default values
export const createEmptyUser = (): Partial<User> => ({
  email: '',
  username: '',
  fullName: '',
  bio: '',
  profilePicture: '',
  location: {
    city: '',
    state: '',
    country: '',
  },
  preferences: {
    notifications: true,
    darkMode: false,
    language: 'en',
  },
  stats: {
    clubsJoined: 0,
    eventsAttended: 0,
    tournamentsWon: 0,
  },
  isActive: true,
  isVerified: false,
  roles: ['user'],
  friends: [],
  blockedUsers: [],
});

export const createDefaultSettings = (): UserSettings => ({
  notifications: {
    push: true,
    email: true,
    sms: false,
    clubUpdates: true,
    eventReminders: true,
    friendRequests: true,
    tournamentResults: true,
  },
  privacy: {
    profileVisibility: 'public',
    showLocation: true,
    showStats: true,
    allowMessagesFromStrangers: false,
  },
  preferences: {
    darkMode: false,
    language: 'en',
    timeZone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    autoJoinTournaments: false,
  },
});