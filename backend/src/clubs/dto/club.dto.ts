import { IsString, IsOptional, IsArray, IsNotEmpty, Matches, MaxLength, MinLength, IsEmail, IsIn, ValidateNested, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SocialLinkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'Platform name cannot exceed 50 characters' })
  platform: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500, { message: 'URL cannot exceed 500 characters' })
  @Matches(/^https?:\/\/.+/, { message: 'URL must start with http:// or https://' })
  url: string;
}

export class ClubSponsorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Sponsor name cannot exceed 100 characters' })
  name: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isFeatured?: boolean;
}

export class CreateClubDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Club name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Club name cannot exceed 100 characters' })
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
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Mission cannot exceed 2000 characters' })
  mission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Story cannot exceed 2000 characters' })
  story?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsArray()
  socialLinks?: SocialLinkDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoGallery?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClubSponsorDto)
  sponsors?: ClubSponsorDto[];

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Instagram handle cannot exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9._]*$/, { message: 'Instagram handle can only contain letters, numbers, dots, and underscores' })
  instagramHandle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true, message: 'City name cannot exceed 50 characters' })
  activeCities?: string[];
}

export class UpdateClubDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Club name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Club name cannot exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Mission cannot exceed 2000 characters' })
  mission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Story cannot exceed 2000 characters' })
  story?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsArray()
  socialLinks?: SocialLinkDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoGallery?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClubSponsorDto)
  sponsors?: ClubSponsorDto[];

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Instagram handle cannot exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9._]*$/, { message: 'Instagram handle can only contain letters, numbers, dots, and underscores' })
  instagramHandle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true, message: 'City name cannot exceed 50 characters' })
  activeCities?: string[];
}

export class AddClubCommentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Author name is required' })
  @MaxLength(100, { message: 'Author name cannot exceed 100 characters' })
  authorName: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  authorEmail?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Comment content is required' })
  @MaxLength(500, { message: 'Comment cannot exceed 500 characters' })
  content: string;
}

export class JoinClubDto {
  // This DTO is empty for now, but can be extended if needed
}

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Message content is required' })
  @MaxLength(1000, { message: 'Message cannot exceed 1000 characters' })
  content: string;
}

export class UpdateMemberRoleDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsIn(['admin', 'member'], { message: 'Role must be either admin or member' })
  role: 'admin' | 'member';
}

export class UpdateClubProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Club name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Club name cannot exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Mission cannot exceed 2000 characters' })
  mission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Story cannot exceed 2000 characters' })
  story?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        // Filter out any links with empty platform or url
        return Array.isArray(parsed) ? parsed.filter(link => 
          link && 
          typeof link.platform === 'string' && 
          typeof link.url === 'string' && 
          link.platform.trim() && 
          link.url.trim()
        ) : [];
      } catch {
        return [];
      }
    }
    // Filter out any links with empty platform or url
    return Array.isArray(value) ? value.filter(link => 
      link && 
      typeof link.platform === 'string' && 
      typeof link.url === 'string' && 
      link.platform.trim() && 
      link.url.trim()
    ) : [];
  })
  socialLinks?: SocialLinkDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value || [];
  })
  photoGallery?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClubSponsorDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(sponsor => 
          sponsor && 
          typeof sponsor.name === 'string' && 
          sponsor.name.trim()
        ) : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value.filter(sponsor => 
      sponsor && 
      typeof sponsor.name === 'string' && 
      sponsor.name.trim()
    ) : [];
  })
  sponsors?: ClubSponsorDto[];

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Pinned message cannot exceed 300 characters' })
  pinnedMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Instagram handle cannot exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9._]*$/, { message: 'Instagram handle can only contain letters, numbers, dots, and underscores' })
  instagramHandle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true, message: 'City name cannot exceed 50 characters' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value || [];
  })
  activeCities?: string[];
}

export class DeleteCommentDto {
  @IsString()
  @IsNotEmpty()
  commentId: string;
}

export class CreateClubGroupChatDto {
  name: string;
  description?: string;
  members?: string[]; // Array of user IDs
}

export class UpdateClubGroupChatDto {
  name?: string;
  description?: string;
}

export class AddGroupChatMemberDto {
  userId: string;
}

export class GroupChatMessageDto {
  content: string;
} 