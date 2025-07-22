import mongoose, { Schema, Document } from 'mongoose';

export interface ClubDocument extends Document {
  name: string;
  username: string;
  description: string;
  avatar?: string;
  coverImage?: string;
  memberCount: number;
  isPrivate: boolean;
  owner: mongoose.Types.ObjectId;
  admins: mongoose.Types.ObjectId[];
  members: mongoose.Types.ObjectId[];
  settings: {
    allowChat: boolean;
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
    messageCount: number;
    lastActivity: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const clubSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-zA-Z0-9_-]+$/,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  avatar: {
    type: String,
  },
  coverImage: {
    type: String,
  },
  memberCount: {
    type: Number,
    default: 0,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  admins: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  settings: {
    allowChat: {
      type: Boolean,
      default: true,
    },
    allowGuestEvents: {
      type: Boolean,
      default: true,
    },
    requireApprovalToJoin: {
      type: Boolean,
      default: false,
    },
    allowMemberInvites: {
      type: Boolean,
      default: true,
    },
    maxMembers: {
      type: Number,
    },
  },
  stats: {
    eventsHosted: {
      type: Number,
      default: 0,
    },
    tournamentsHeld: {
      type: Number,
      default: 0,
    },
    totalMembers: {
      type: Number,
      default: 0,
    },
    activeMembers: {
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
}, {
  timestamps: true,
});

// Index for efficient queries
clubSchema.index({ username: 1 });
clubSchema.index({ owner: 1 });
clubSchema.index({ members: 1 });
clubSchema.index({ 'stats.lastActivity': -1 });

export const Club = mongoose.models.Club || mongoose.model<ClubDocument>('Club', clubSchema);