export type UserRole = 'Member' | 'Sponsor' | 'Creator' | 'Club_Founder';

export interface User {
  id: string;
  fullName: string;
  email: string;
  roles: UserRole[];
  phoneNumber?: string;
  bio?: string;
  profileImage?: string;
  interests: string[];
  profileCompleted?: boolean;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  location?: string;
}

export interface ActivityLogType {
  _id: string;
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
  fullName?: string;
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