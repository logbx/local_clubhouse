import mongoose, { Schema, Document } from 'mongoose';

export interface IClubMember extends Document {
  club: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  status: 'active' | 'pending' | 'banned';
  permissions: {
    canInvite: boolean;
    canManageEvents: boolean;
    canModerateChat: boolean;
    canManageMembers: boolean;
  };
  joinedAt: Date;
  invitedBy?: mongoose.Types.ObjectId;
  lastActive?: Date;
  notificationSettings: {
    newMessages: boolean;
    newEvents: boolean;
    newMembers: boolean;
    mentions: boolean;
  };
}

const clubMemberSchema = new Schema<IClubMember>({
  club: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'moderator', 'member'],
    default: 'member',
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'banned'],
    default: 'active',
  },
  permissions: {
    canInvite: {
      type: Boolean,
      default: false,
    },
    canManageEvents: {
      type: Boolean,
      default: false,
    },
    canModerateChat: {
      type: Boolean,
      default: false,
    },
    canManageMembers: {
      type: Boolean,
      default: false,
    },
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  lastActive: Date,
  notificationSettings: {
    newMessages: {
      type: Boolean,
      default: true,
    },
    newEvents: {
      type: Boolean,
      default: true,
    },
    newMembers: {
      type: Boolean,
      default: false,
    },
    mentions: {
      type: Boolean,
      default: true,
    },
  },
}, {
  timestamps: true,
});

// Compound indexes
clubMemberSchema.index({ club: 1, user: 1 }, { unique: true });
clubMemberSchema.index({ club: 1, role: 1 });
clubMemberSchema.index({ user: 1, status: 1 });
clubMemberSchema.index({ club: 1, joinedAt: -1 });

// Update permissions based on role
clubMemberSchema.pre('save', function(next) {
  switch (this.role) {
    case 'owner':
      this.permissions = {
        canInvite: true,
        canManageEvents: true,
        canModerateChat: true,
        canManageMembers: true,
      };
      break;
    case 'admin':
      this.permissions = {
        canInvite: true,
        canManageEvents: true,
        canModerateChat: true,
        canManageMembers: true,
      };
      break;
    case 'moderator':
      this.permissions = {
        canInvite: true,
        canManageEvents: false,
        canModerateChat: true,
        canManageMembers: false,
      };
      break;
    case 'member':
      this.permissions = {
        canInvite: false,
        canManageEvents: false,
        canModerateChat: false,
        canManageMembers: false,
      };
      break;
  }
  next();
});

export const ClubMember = mongoose.models.ClubMember || mongoose.model<IClubMember>('ClubMember', clubMemberSchema);