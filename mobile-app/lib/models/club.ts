// Club model for mobile app
export interface Club {
  _id: string;
  id: string;
  name: string;
  username: string;
  description: string;
  category: string;
  location: {
    city: string;
    state: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  profilePicture?: string;
  coverImage?: string;
  createdBy: string;
  admins: string[];
  members: string[];
  memberCount: number;
  isPrivate: boolean;
  rules?: string;
  tags: string[];
  socialLinks?: {
    website?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  settings: {
    allowGuestEvents: boolean;
    requireApprovalToJoin: boolean;
    allowMemberInvites: boolean;
    maxMembers?: number;
  };
  stats: {
    eventsHosted: number;
    tournamentsHeld: number;
    totalMembers: number;
    activeMembers: number;
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isVerified: boolean;
  subscriptionPlan?: 'free' | 'premium' | 'enterprise';
}

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
  permissions: string[];
  stats: {
    eventsAttended: number;
    tournamentsWon: number;
    messagesPosted: number;
  };
  isActive: boolean;
  isMuted: boolean;
  mutedUntil?: Date;
}

export interface ClubProfile {
  club: Club;
  membershipStatus: 'member' | 'admin' | 'owner' | 'pending' | 'not_member';
  permissions: string[];
  recentEvents: Event[];
  upcomingEvents: Event[];
  recentActivity: Activity[];
  canJoin: boolean;
  canInvite: boolean;
  canManage: boolean;
}

export interface Event {
  _id: string;
  id: string;
  title: string;
  description: string;
  clubId: string;
  createdBy: string;
  startDate: Date;
  endDate: Date;
  location: {
    venue: string;
    address: string;
    city: string;
    state: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  category: string;
  maxAttendees?: number;
  attendees: string[];
  waitlist: string[];
  isPrivate: boolean;
  requiresApproval: boolean;
  tags: string[];
  images: string[];
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  type: 'member_joined' | 'event_created' | 'tournament_completed' | 'announcement';
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface CreateClubRequest {
  name: string;
  username: string;
  description: string;
  category: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  profilePicture?: string;
  coverImage?: string;
  isPrivate?: boolean;
  rules?: string;
  tags?: string[];
  socialLinks?: {
    website?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  settings?: {
    allowGuestEvents?: boolean;
    requireApprovalToJoin?: boolean;
    allowMemberInvites?: boolean;
    maxMembers?: number;
  };
}

export interface UpdateClubRequest {
  name?: string;
  description?: string;
  category?: string;
  location?: {
    city: string;
    state: string;
    country: string;
  };
  profilePicture?: string;
  coverImage?: string;
  isPrivate?: boolean;
  rules?: string;
  tags?: string[];
  socialLinks?: {
    website?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  settings?: {
    allowGuestEvents?: boolean;
    requireApprovalToJoin?: boolean;
    allowMemberInvites?: boolean;
    maxMembers?: number;
  };
}

export interface JoinClubRequest {
  clubId: string;
  message?: string;
}

export interface InviteMemberRequest {
  clubId: string;
  userId: string;
  role?: 'member' | 'moderator';
  message?: string;
}

export interface UpdateMemberRequest {
  memberId: string;
  role?: 'member' | 'moderator' | 'admin';
  permissions?: string[];
}

export interface ClubSearchFilters {
  category?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    radius?: number;
  };
  memberCount?: {
    min?: number;
    max?: number;
  };
  tags?: string[];
  isPrivate?: boolean;
  isVerified?: boolean;
  sortBy?: 'name' | 'members' | 'activity' | 'created' | 'distance';
  sortOrder?: 'asc' | 'desc';
}

// Type guards
export const isClub = (obj: any): obj is Club => {
  return obj && typeof obj._id === 'string' && typeof obj.name === 'string';
};

export const isClubMember = (obj: any): obj is ClubMember => {
  return obj && typeof obj._id === 'string' && typeof obj.clubId === 'string';
};

// Default values
export const createEmptyClub = (): Partial<Club> => ({
  name: '',
  username: '',
  description: '',
  category: '',
  location: {
    city: '',
    state: '',
    country: '',
  },
  profilePicture: '',
  coverImage: '',
  admins: [],
  members: [],
  memberCount: 0,
  isPrivate: false,
  rules: '',
  tags: [],
  socialLinks: {
    website: '',
    instagram: '',
    twitter: '',
    facebook: '',
  },
  settings: {
    allowGuestEvents: true,
    requireApprovalToJoin: false,
    allowMemberInvites: true,
  },
  stats: {
    eventsHosted: 0,
    tournamentsHeld: 0,
    totalMembers: 0,
    activeMembers: 0,
  },
  isActive: true,
  isVerified: false,
  subscriptionPlan: 'free',
});