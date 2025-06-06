export enum UserRole {
  Member = 'Member',
  Sponsor = 'Sponsor',
  Creator = 'Creator',
  Club_Founder = 'Club_Founder'
}

export interface User {
  id: string;
  username?: string;
  fullName: string;
  email: string;
  roles: UserRole[];
  phoneNumber?: string;
  bio?: string;
  interests?: string[];
  profileImage?: string;
  createdAt?: string;
  updatedAt?: string;
  profileCompleted?: boolean;
}

export interface ActivityLogType {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  bio: string;
  tags: string[];
  interests?: string[];
  avatarUrl?: string;
  roles: UserRole[];
  phoneNumber?: string;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  profileImage?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username?: string;
  fullName: string;
  phoneNumber?: string;
} 