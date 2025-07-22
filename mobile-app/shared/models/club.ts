import mongoose, { Schema, Document } from 'mongoose';

export interface IClub extends Document {
  name: string;
  username: string;
  description: string;
  category: string;
  logoUrl?: string;
  bannerUrl?: string;
  isPrivate: boolean;
  memberLimit?: number;
  tags: string[];
  location?: {
    city: string;
    country: string;
    coordinates?: [number, number];
  };
  socialLinks: {
    website?: string;
    twitter?: string;
    discord?: string;
    instagram?: string;
  };
  settings: {
    allowMemberInvites: boolean;
    requireApproval: boolean;
    allowChat: boolean;
    allowEvents: boolean;
  };
  stats: {
    memberCount: number;
    eventCount: number;
    messageCount: number;
    lastActivity: Date;
  };
  owner: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const clubSchema = new Schema<IClub>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: [/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores'],
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  category: {
    type: String,
    required: true,
    enum: ['gaming', 'sports', 'technology', 'music', 'art', 'education', 'business', 'social', 'other'],
  },
  logoUrl: String,
  bannerUrl: String,
  isPrivate: {
    type: Boolean,
    default: false,
  },
  memberLimit: {
    type: Number,
    min: 1,
    max: 10000,
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30,
  }],
  location: {
    city: String,
    country: String,
    coordinates: {
      type: [Number],
      index: '2dsphere',
    },
  },
  socialLinks: {
    website: String,
    twitter: String,
    discord: String,
    instagram: String,
  },
  settings: {
    allowMemberInvites: {
      type: Boolean,
      default: true,
    },
    requireApproval: {
      type: Boolean,
      default: false,
    },
    allowChat: {
      type: Boolean,
      default: true,
    },
    allowEvents: {
      type: Boolean,
      default: true,
    },
  },
  stats: {
    memberCount: {
      type: Number,
      default: 1,
    },
    eventCount: {
      type: Number,
      default: 0,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
clubSchema.index({ username: 1 });
clubSchema.index({ category: 1 });
clubSchema.index({ name: 'text', description: 'text', tags: 'text' });
clubSchema.index({ 'stats.memberCount': -1 });
clubSchema.index({ 'stats.lastActivity': -1 });
clubSchema.index({ createdAt: -1 });

export const Club = mongoose.models.Club || mongoose.model<IClub>('Club', clubSchema);