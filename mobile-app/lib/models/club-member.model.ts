import mongoose, { Schema, Document } from 'mongoose';

export interface ClubMemberDocument extends Document {
  user: mongoose.Types.ObjectId;
  club: mongoose.Types.ObjectId;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joinedAt: Date;
  status: 'active' | 'pending' | 'banned';
  permissions: {
    canModerateChat: boolean;
    canDeleteMessages: boolean;
    canManageEvents: boolean;
    canInviteMembers: boolean;
    canKickMembers: boolean;
  };
  stats: {
    eventsAttended: number;
    tournamentsWon: number;
    messagesPosted: number;
  };
  isActive: boolean;
  isMuted: boolean;
  mutedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const clubMemberSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  club: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: true,
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'moderator', 'member'],
    default: 'member',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'banned'],
    default: 'active',
  },
  permissions: {
    canModerateChat: {
      type: Boolean,
      default: false,
    },
    canDeleteMessages: {
      type: Boolean,
      default: false,
    },
    canManageEvents: {
      type: Boolean,
      default: false,
    },
    canInviteMembers: {
      type: Boolean,
      default: false,
    },
    canKickMembers: {
      type: Boolean,
      default: false,
    },
  },
  stats: {
    eventsAttended: {
      type: Number,
      default: 0,
    },
    tournamentsWon: {
      type: Number,
      default: 0,
    },
    messagesPosted: {
      type: Number,
      default: 0,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isMuted: {
    type: Boolean,
    default: false,
  },
  mutedUntil: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
clubMemberSchema.index({ club: 1, user: 1 }, { unique: true });
clubMemberSchema.index({ user: 1 });
clubMemberSchema.index({ club: 1, status: 1 });
clubMemberSchema.index({ club: 1, role: 1 });

export const ClubMember = mongoose.models.ClubMember || mongoose.model<ClubMemberDocument>('ClubMember', clubMemberSchema);