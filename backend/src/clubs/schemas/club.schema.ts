import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClubDocument = Club & Document;

export interface SocialLink {
  platform: string;
  url: string;
}

export interface ClubSponsor {
  name: string;
  isFeatured: boolean;
}

export interface ClubComment {
  _id?: Types.ObjectId;
  authorName: string;
  authorEmail?: string;
  content: string;
  createdAt: Date;
}

export interface ClubMember {
  userId: Types.ObjectId;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface ClubChat {
  _id?: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  content: string;
  createdAt: Date;
}

@Schema({ timestamps: true })
export class Club {
  @Prop({ required: [true, 'Club name is required'], trim: true })
  name: string;

  @Prop({ 
    required: [true, 'Club username is required'], 
    unique: true, 
    trim: true, 
    lowercase: true,
    match: [/^[-a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores']
  })
  username: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  logoUrl?: string;

  @Prop({ type: [{ platform: String, url: String }], default: [] })
  socialLinks: SocialLink[];

  @Prop({ type: [String], default: [] })
  photoGallery: string[];

  @Prop({ 
    type: [{ 
      name: String, 
      isFeatured: { type: Boolean, default: false } 
    }], 
    default: [] 
  })
  sponsors: ClubSponsor[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  club_founder?: Types.ObjectId;

  @Prop({ 
    type: [{ 
      userId: { type: Types.ObjectId, ref: 'User' },
      role: { type: String, enum: ['admin', 'member'], default: 'member' },
      joinedAt: { type: Date, default: Date.now }
    }], 
    default: [] 
  })
  members: ClubMember[];

  @Prop({ 
    type: [{ 
      senderId: { type: Types.ObjectId, ref: 'User' },
      senderName: String,
      content: String,
      createdAt: { type: Date, default: Date.now }
    }], 
    default: [] 
  })
  chatMessages: ClubChat[];

  @Prop({ 
    type: [{ 
      authorName: String, 
      authorEmail: String, 
      content: String, 
      createdAt: { type: Date, default: Date.now } 
    }], 
    default: [] 
  })
  comments: ClubComment[];

  @Prop({ trim: true })
  pinnedMessage?: string;

  @Prop({ trim: true })
  instagramHandle?: string;

  @Prop({ type: [String], default: [] })
  activeCities: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ClubSchema = SchemaFactory.createForClass(Club);

// Index for faster username lookups
ClubSchema.index({ username: 1 });
// Index for searching clubs
ClubSchema.index({ name: 'text', description: 'text' }); 