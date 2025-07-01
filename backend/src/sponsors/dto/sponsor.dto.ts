import { IsString, IsOptional, IsArray, IsBoolean, IsNotEmpty, MinLength, MaxLength, Matches, ValidateNested, IsNumber, Min, Max, IsEnum, IsEmail, IsDate } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TierType } from '../schemas/sponsorship-tier.schema';
import { CollaborationStatus } from '../schemas/collaboration-request.schema';
import { SponsorshipType, SponsorshipTier, CollaborationPreference } from '../schemas/sponsorship-preferences.schema';
import { PackageSponsorshipType } from '../schemas/sponsorship-package.schema';

export enum SponsorEventStatus {
  DRAFT = 'DRAFT',
  LIVE = 'LIVE',
  PAST = 'PAST',
}

export enum SponsorEventVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  CLUB = 'CLUB',
}

export class SocialLinkDto {
  @IsString()
  @IsNotEmpty()
  platform: string;

  @IsString()
  @IsNotEmpty()
  url: string;
}

export class SponsorTestimonialDto {
  @IsString()
  @IsNotEmpty()
  clubId: string;

  @IsString()
  @IsNotEmpty()
  clubName: string;

  @IsOptional()
  @IsString()
  clubLogo?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;
}

export class CreateSponsorDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Sponsor name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Sponsor name cannot exceed 100 characters' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username cannot exceed 30 characters' })
  @Matches(/^[-a-z0-9_]+$/, { message: 'Username can only contain lowercase letters, numbers, hyphens, and underscores' })
  @Transform(({ value }) => value.toLowerCase().trim())
  username: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Category cannot exceed 50 characters' })
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true, message: 'Location name cannot exceed 100 characters' })
  locations?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Exact location cannot exceed 200 characters' })
  exactLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Bio cannot exceed 2000 characters' })
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Pinned announcement cannot exceed 500 characters' })
  pinnedAnnouncement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Mission cannot exceed 1000 characters' })
  mission?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Phone number cannot exceed 20 characters' })
  phoneNumber?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  publicEmail?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryImages?: string[];
}

export class UpdateSponsorDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Sponsor name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Sponsor name cannot exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Category cannot exceed 50 characters' })
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true, message: 'Location name cannot exceed 100 characters' })
  locations?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Exact location cannot exceed 200 characters' })
  exactLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Bio cannot exceed 2000 characters' })
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Pinned announcement cannot exceed 500 characters' })
  pinnedAnnouncement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Mission cannot exceed 1000 characters' })
  mission?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Phone number cannot exceed 20 characters' })
  phoneNumber?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  publicEmail?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryImages?: string[];
}

export class CreateSponsorshipTierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Title cannot exceed 100 characters' })
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description: string;

  @IsEnum(TierType)
  type: TierType;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Suggested value cannot exceed 50 characters' })
  suggestedValue?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true, message: 'Benefit cannot exceed 200 characters' })
  benefits?: string[];
}

export class UpdateSponsorshipTierDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Title cannot exceed 100 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description?: string;

  @IsOptional()
  @IsEnum(TierType)
  type?: TierType;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Suggested value cannot exceed 50 characters' })
  suggestedValue?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true, message: 'Benefit cannot exceed 200 characters' })
  benefits?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateCollaborationRequestDto {
  @IsString()
  @IsNotEmpty()
  sponsorId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'Proposal text cannot exceed 2000 characters' })
  proposalText: string;

  @IsOptional()
  @IsString()
  tierSelected?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Custom message cannot exceed 1000 characters' })
  customMessage?: string;

  @IsOptional()
  @IsString()
  eventId?: string;
}

export class SponsorshipPreferenceItemDto {
  @IsEnum(SponsorshipType)
  @IsNotEmpty()
  type: SponsorshipType;

  @IsEnum(SponsorshipTier)
  @IsNotEmpty()
  tier: SponsorshipTier;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Custom description cannot exceed 500 characters' })
  customDescription?: string;
}

export class CreateSponsorshipPreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SponsorshipPreferenceItemDto)
  @IsNotEmpty({ message: 'At least one sponsorship type must be selected' })
  sponsorshipTypes: SponsorshipPreferenceItemDto[];

  @IsEnum(CollaborationPreference)
  @IsNotEmpty()
  collaborationPreference: CollaborationPreference;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Custom notes cannot exceed 1000 characters' })
  customNotes?: string;
}

export class UpdateSponsorshipPreferencesDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SponsorshipPreferenceItemDto)
  sponsorshipTypes?: SponsorshipPreferenceItemDto[];

  @IsOptional()
  @IsEnum(CollaborationPreference)
  collaborationPreference?: CollaborationPreference;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Custom notes cannot exceed 1000 characters' })
  customNotes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SponsorshipItemDto {
  @IsEnum(PackageSponsorshipType)
  @IsNotEmpty()
  type: PackageSponsorshipType;

  @IsBoolean()
  isSelected: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Custom description cannot exceed 500 characters' })
  customDescription?: string;
}

export class CreateSponsorshipPackageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Package name cannot exceed 100 characters' })
  packageName: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Package description cannot exceed 1000 characters' })
  packageDescription?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SponsorshipItemDto)
  @IsNotEmpty({ message: 'At least one sponsorship type is required' })
  sponsorshipTypes: SponsorshipItemDto[];

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateSponsorshipPackageDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Package name cannot exceed 100 characters' })
  packageName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Package description cannot exceed 1000 characters' })
  packageDescription?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SponsorshipItemDto)
  sponsorshipTypes?: SponsorshipItemDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateCollaborationRequestDto {
  @IsOptional()
  @IsEnum(CollaborationStatus)
  status?: CollaborationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Review notes cannot exceed 1000 characters' })
  reviewNotes?: string;
}

export class CollaborationMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Message cannot exceed 1000 characters' })
  content: string;
}

export class AddSponsorTestimonialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Testimonial content cannot exceed 1000 characters' })
  content: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;
}

export class CreateSponsorEventDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Title cannot exceed 100 characters' })
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  description: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsBoolean()
  isFree: boolean = true;

  @IsEnum(SponsorEventStatus)
  status: SponsorEventStatus = SponsorEventStatus.DRAFT;

  @IsEnum(SponsorEventVisibility)
  visibility: SponsorEventVisibility = SponsorEventVisibility.PUBLIC;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  invitedUsers?: string[];
}

export class UpdateSponsorEventDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Title cannot exceed 100 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  description?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsEnum(SponsorEventStatus)
  status?: SponsorEventStatus;

  @IsOptional()
  @IsEnum(SponsorEventVisibility)
  visibility?: SponsorEventVisibility;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  invitedUsers?: string[];
} 