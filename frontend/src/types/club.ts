export interface SocialLink {
  platform: string;
  url: string;
}

export interface ClubSponsor {
  name: string;
  isFeatured: boolean;
}

export interface ClubComment {
  _id?: string;
  authorName: string;
  authorEmail?: string;
  content: string;
  createdAt: string;
}

export interface ClubUser {
  _id: string;
  username?: string;
  fullName: string;
  profileImage?: string;
}

export interface ClubMember {
  userId: ClubUser;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface ClubChatMessage {
  _id?: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface Club {
  _id: string;
  name: string;
  username: string;
  description?: string;
  logoUrl?: string;
  socialLinks: SocialLink[];
  photoGallery: string[];
  sponsors: ClubSponsor[];
  createdBy: ClubUser;
  club_founder?: ClubUser;
  members: ClubMember[];
  comments: ClubComment[];
  chatMessages: ClubChatMessage[];
  pinnedMessage?: string;
  instagramHandle?: string;
  activeCities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClubDto {
  name: string;
  username: string;
  description?: string;
  logoUrl?: string;
  socialLinks?: SocialLink[];
  photoGallery?: string[];
  sponsors?: ClubSponsor[];
  instagramHandle?: string;
  activeCities?: string[];
}

export interface UpdateClubDto {
  name?: string;
  description?: string;
  logoUrl?: string;
  socialLinks?: SocialLink[];
  photoGallery?: string[];
  sponsors?: ClubSponsor[];
  instagramHandle?: string;
  activeCities?: string[];
}

export interface AddClubCommentDto {
  authorName: string;
  authorEmail?: string;
  content: string;
}

export interface ChatMessageDto {
  content: string;
}

export interface UpdateMemberRoleDto {
  userId: string;
  role: 'admin' | 'member';
}

export interface MembershipStatus {
  isMember: boolean;
  isAdmin: boolean;
}

export interface UpdateClubProfileDto {
  name?: string;
  description?: string;
  logoUrl?: string;
  socialLinks?: SocialLink[];
  photoGallery?: string[];
  sponsors?: ClubSponsor[];
  pinnedMessage?: string;
  instagramHandle?: string;
  activeCities?: string[];
}

export interface ClubStats {
  totalMembers: number;
  totalAdmins: number;
  totalComments: number;
  totalChatMessages: number;
  createdAt: string;
} 