import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SponsorDocument = Sponsor & Document;

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
  _id?: Types.ObjectId;
  clubId: Types.ObjectId;
  clubName: string;
  clubLogo?: string;
  content: string;
  rating?: number;
  createdAt: Date;
}

export interface TeamMember {
  userId: Types.ObjectId;
  role: string;
  permissions: string[];
  joinedAt: Date;
  isActive: boolean;
  invitedBy: Types.ObjectId;
}

@Schema({ timestamps: true })
export class Sponsor {
  @Prop({ required: [true, 'Sponsor name is required'], trim: true })
  name: string;

  @Prop({ 
    required: [true, 'Sponsor username is required'], 
    unique: true, 
    trim: true, 
    lowercase: true,
    match: [/^[-a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores']
  })
  username: string;

  @Prop()
  logoUrl?: string;

  @Prop({ trim: true })
  category?: string;

  @Prop({ type: [String], default: [] })
  locations: string[];

  @Prop({ trim: true })
  exactLocation?: string;

  @Prop({ trim: true, maxlength: 2000 })
  bio?: string;

  @Prop({ trim: true, maxlength: 500 })
  pinnedAnnouncement?: string;

  @Prop({ trim: true, maxlength: 1000 })
  mission?: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ trim: true, maxlength: 20 })
  phoneNumber?: string;

  @Prop({ trim: true, lowercase: true })
  publicEmail?: string;

  @Prop({ type: [{ platform: String, url: String }], default: [] })
  socialLinks: SocialLink[];

  @Prop({ type: [String], default: [] })
  galleryImages: string[];

  @Prop({ 
    type: {
      totalEventsSponsored: { type: Number, default: 0 },
      totalClubsPartnered: { type: Number, default: 0 },
      activeCollaborations: { type: Number, default: 0 }
    },
    default: () => ({
      totalEventsSponsored: 0,
      totalClubsPartnered: 0,
      activeCollaborations: 0
    })
  })
  stats: SponsorStats;

  @Prop({ 
    type: [{ 
      clubId: { type: Types.ObjectId, ref: 'Club' },
      clubName: String,
      clubLogo: String,
      content: String,
      rating: { type: Number, min: 1, max: 5 },
      createdAt: { type: Date, default: Date.now }
    }], 
    default: [] 
  })
  testimonials: SponsorTestimonial[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ 
    type: [{ 
      userId: { type: Types.ObjectId, ref: 'User' },
      role: { type: String, required: true },
      permissions: { type: [String], default: [] },
      joinedAt: { type: Date, default: Date.now },
      isActive: { type: Boolean, default: true },
      invitedBy: { type: Types.ObjectId, ref: 'User' }
    }], 
    default: [] 
  })
  teamMembers: TeamMember[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  followers: Types.ObjectId[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const SponsorSchema = SchemaFactory.createForClass(Sponsor);

// Indexes for better performance
SponsorSchema.index({ username: 1 });
SponsorSchema.index({ name: 'text', bio: 'text', category: 'text' });
SponsorSchema.index({ category: 1 });
SponsorSchema.index({ locations: 1 });
SponsorSchema.index({ isActive: 1, isVerified: 1 }); 