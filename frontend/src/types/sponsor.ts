import { User } from './user';

export interface SocialLink {
  platform: string;
  url: string;
}

export interface SponsorStats {
  totalEventsSponsored: number;
  totalClubsPartnered: number;
  activeCollaborations: number;
}

export interface SponsorTestimonial {
  clubId: {
    _id: string;
    name: string;
    username: string;
    logoUrl?: string;
  };
  content: string;
  rating: number;
  createdAt: string;
}

export interface SponsorUser {
  _id: string;
  username: string;
  fullName: string;
  profileImage?: string;
}

export interface TeamMember {
  _id: string;
  userId: SponsorUser;
  role: string;
  permissions: string[];
  joinedAt: string;
  isActive: boolean;
  invitedBy: SponsorUser;
}

export interface Sponsor {
  _id: string;
  name: string;
  username: string;
  logoUrl?: string;
  category?: string;
  locations: string[];
  exactLocation?: string;
  bio?: string;
  pinnedAnnouncement?: string;
  mission?: string;
  website?: string;
  phoneNumber?: string;
  publicEmail?: string;
  socialLinks: SocialLink[];
  galleryImages: string[];
  stats: SponsorStats;
  testimonials: SponsorTestimonial[];
  createdBy: SponsorUser;
  teamMembers: TeamMember[];
  followers: SponsorUser[];
  isVerified: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum CollaborationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed'
}

export interface CollaborationMessage {
  _id: string;
  sender: SponsorUser;
  senderType: 'club' | 'sponsor';
  content: string;
  timestamp: string;
}

export interface CollaborationRequest {
  _id: string;
  sponsorId: {
    _id: string;
    name: string;
    username: string;
    logoUrl?: string;
  };
  clubId: {
    _id: string;
    name: string;
    username: string;
    logoUrl?: string;
  };
  requestedBy: SponsorUser;
  status: CollaborationStatus;
  proposalText: string;
  customMessage?: string;
  eventId?: string;
  messages: CollaborationMessage[];
  reviewedBy?: SponsorUser;
  reviewedAt?: string;
  reviewNotes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// DTOs
export interface CreateSponsorDto {
  name: string;
  username: string;
  logoUrl?: string;
  category?: string;
  locations?: string[];
  exactLocation?: string;
  bio?: string;
  pinnedAnnouncement?: string;
  mission?: string;
  website?: string;
  phoneNumber?: string;
  publicEmail?: string;
  socialLinks?: SocialLink[];
  galleryImages?: string[];
}

export interface UpdateSponsorDto {
  name?: string;
  logoUrl?: string;
  category?: string;
  locations?: string[];
  exactLocation?: string;
  bio?: string;
  pinnedAnnouncement?: string;
  mission?: string;
  website?: string;
  phoneNumber?: string;
  publicEmail?: string;
  socialLinks?: SocialLink[];
  galleryImages?: string[];
}

export interface CreateCollaborationRequestDto {
  proposalText: string;
  customMessage?: string;
  eventId?: string;
  clubId?: string;
}

export interface UpdateCollaborationRequestDto {
  status?: CollaborationStatus;
  reviewNotes?: string;
}

export interface CollaborationMessageDto {
  content: string;
}

export interface AddSponsorTestimonialDto {
  content: string;
  rating: number;
}

export interface AddTeamMemberDto {
  email: string;
  role: string;
  permissions?: string[];
}

export interface UpdateTeamMemberDto {
  role?: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface SponsorSearchFilters {
  search?: string;
  category?: string;
  location?: string;
  sortBy?: 'newest' | 'oldest' | 'name' | 'followers';
}

// Simplified Sponsorship Packages
export enum PackageSponsorshipType {
  LOCATION_HOSTING = 'Location Hosting',
  PRODUCT_SAMPLES_SWAG = 'Product Samples & Swag',
  RAFFLE_GIVEAWAY_DONATION = 'Raffle & Giveaway Donation',
  BUSINESS_PRODUCT_SERVICE_DISCOUNT = 'Business Product & Service Discount',
  EVENT_PROMOTION = 'Event Promotion',
  ENTERTAINMENT = 'Entertainment',
  EVENT_STAFFING_SUPPORT = 'Event Staffing & Support',
  MONETARY_CLUB_DONATION = 'Monetary Club Donation',
  ORGANIZER_BUSINESS_CREDIT = 'Organizer Business Credit',
  CUSTOM_SPONSORSHIP = 'Custom Sponsorship'
}

export interface SponsorshipTypeItem {
  type: PackageSponsorshipType;
  isSelected: boolean;
  customDescription?: string;
}

export interface SponsorshipPackage {
  _id: string;
  sponsorId: string | Sponsor;
  packageName: string;
  packageDescription?: string;
  sponsorshipTypes: SponsorshipTypeItem[];
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSponsorshipPackageDto {
  packageName: string;
  packageDescription?: string;
  sponsorshipTypes: SponsorshipTypeItem[];
  isFeatured?: boolean;
  sortOrder?: number;
}

export interface UpdateSponsorshipPackageDto {
  packageName?: string;
  packageDescription?: string;
  sponsorshipTypes?: SponsorshipTypeItem[];
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
} 