// Club member model for mobile app
export interface ClubMember {
  _id: string;
  id: string;
  clubId: string;
  userId: string;
  username: string;
  fullName: string;
  profilePicture?: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joinedAt: Date;
  lastActive: Date;
  permissions: ClubPermission[];
  stats: {
    eventsAttended: number;
    tournamentsWon: number;
    messagesPosted: number;
    contributionScore: number;
  };
  isActive: boolean;
  isMuted: boolean;
  mutedUntil?: Date;
  mutedBy?: string;
  muteReason?: string;
  invitedBy?: string;
  invitedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
}

export type ClubPermission = 
  | 'manage_club'
  | 'manage_members'
  | 'create_events'
  | 'manage_events'
  | 'create_tournaments'
  | 'manage_tournaments'
  | 'moderate_chat'
  | 'send_announcements'
  | 'view_analytics'
  | 'invite_members'
  | 'approve_members'
  | 'ban_members'
  | 'delete_messages'
  | 'pin_messages';

export interface ClubMemberProfile {
  member: ClubMember;
  user: {
    _id: string;
    username: string;
    fullName: string;
    bio?: string;
    profilePicture?: string;
    location?: {
      city: string;
      state: string;
      country: string;
    };
    stats: {
      clubsJoined: number;
      eventsAttended: number;
      tournamentsWon: number;
    };
  };
  club: {
    _id: string;
    name: string;
    username: string;
    profilePicture?: string;
  };
  recentActivity: MemberActivity[];
  canViewProfile: boolean;
  canMessage: boolean;
  canManage: boolean;
}

export interface MemberActivity {
  id: string;
  type: 'event_attended' | 'tournament_won' | 'message_posted' | 'achievement_earned';
  title: string;
  description: string;
  timestamp: Date;
  points?: number;
  metadata?: Record<string, any>;
}

export interface MembershipRequest {
  _id: string;
  id: string;
  clubId: string;
  userId: string;
  username: string;
  fullName: string;
  profilePicture?: string;
  message?: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

export interface MemberInvitation {
  _id: string;
  id: string;
  clubId: string;
  invitedUserId: string;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
  role: 'member' | 'moderator';
  permissions?: ClubPermission[];
  respondedAt?: Date;
}

export interface UpdateMemberRequest {
  memberId: string;
  role?: 'member' | 'moderator' | 'admin';
  permissions?: ClubPermission[];
  notes?: string;
}

export interface MuteMemberRequest {
  memberId: string;
  duration: number; // in minutes
  reason: string;
}

export interface BanMemberRequest {
  memberId: string;
  reason: string;
  permanent?: boolean;
  duration?: number; // in days if not permanent
}

export interface InviteMemberRequest {
  clubId: string;
  userId: string;
  role?: 'member' | 'moderator';
  permissions?: ClubPermission[];
  message?: string;
  expiresIn?: number; // in days, default 7
}

export interface ApproveMembershipRequest {
  requestId: string;
  approved: boolean;
  role?: 'member' | 'moderator';
  permissions?: ClubPermission[];
  notes?: string;
}

export interface MemberSearchFilters {
  role?: 'owner' | 'admin' | 'moderator' | 'member';
  isActive?: boolean;
  joinedAfter?: Date;
  joinedBefore?: Date;
  hasPermission?: ClubPermission;
  searchTerm?: string; // search in username, fullName
  sortBy?: 'username' | 'fullName' | 'joinedAt' | 'lastActive' | 'contributionScore';
  sortOrder?: 'asc' | 'desc';
}

// Role hierarchy and permissions
export const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  moderator: 2,
  member: 1,
} as const;

export const ROLE_PERMISSIONS: Record<ClubMember['role'], ClubPermission[]> = {
  owner: [
    'manage_club',
    'manage_members',
    'create_events',
    'manage_events',
    'create_tournaments',
    'manage_tournaments',
    'moderate_chat',
    'send_announcements',
    'view_analytics',
    'invite_members',
    'approve_members',
    'ban_members',
    'delete_messages',
    'pin_messages',
  ],
  admin: [
    'manage_members',
    'create_events',
    'manage_events',
    'create_tournaments',
    'manage_tournaments',
    'moderate_chat',
    'send_announcements',
    'view_analytics',
    'invite_members',
    'approve_members',
    'ban_members',
    'delete_messages',
    'pin_messages',
  ],
  moderator: [
    'create_events',
    'moderate_chat',
    'invite_members',
    'delete_messages',
    'pin_messages',
  ],
  member: [],
};

// Utility functions
export const hasPermission = (member: ClubMember, permission: ClubPermission): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[member.role];
  return rolePermissions.includes(permission) || member.permissions.includes(permission);
};

export const canManageMember = (manager: ClubMember, target: ClubMember): boolean => {
  const managerLevel = ROLE_HIERARCHY[manager.role];
  const targetLevel = ROLE_HIERARCHY[target.role];
  return managerLevel > targetLevel;
};

export const isHigherRole = (role1: ClubMember['role'], role2: ClubMember['role']): boolean => {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
};

// Type guards
export const isClubMember = (obj: any): obj is ClubMember => {
  return obj && typeof obj._id === 'string' && typeof obj.clubId === 'string' && typeof obj.userId === 'string';
};

export const isMembershipRequest = (obj: any): obj is MembershipRequest => {
  return obj && typeof obj._id === 'string' && typeof obj.clubId === 'string' && obj.status;
};

export const isMemberInvitation = (obj: any): obj is MemberInvitation => {
  return obj && typeof obj._id === 'string' && typeof obj.clubId === 'string' && obj.invitedBy;
};

// Default values
export const createEmptyMember = (): Partial<ClubMember> => ({
  role: 'member',
  permissions: [],
  stats: {
    eventsAttended: 0,
    tournamentsWon: 0,
    messagesPosted: 0,
    contributionScore: 0,
  },
  isActive: true,
  isMuted: false,
});