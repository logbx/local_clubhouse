import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  club: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  replyTo?: mongoose.Types.ObjectId;
  mentions: mongoose.Types.ObjectId[];
  attachments: Array<{
    type: 'image' | 'file';
    url: string;
    name: string;
    size: number;
    mimeType: string;
  }>;
  reactions: Array<{
    emoji: string;
    users: mongoose.Types.ObjectId[];
    count: number;
  }>;
  edited: {
    at?: Date;
    by?: mongoose.Types.ObjectId;
    history: Array<{
      content: string;
      editedAt: Date;
    }>;
  };
  readBy: Array<{
    user: mongoose.Types.ObjectId;
    readAt: Date;
  }>;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>({
  club: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 4000,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text',
  },
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'ChatMessage',
  },
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
  }],
  reactions: [{
    emoji: {
      type: String,
      required: true,
    },
    users: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    count: {
      type: Number,
      default: 0,
    },
  }],
  edited: {
    at: Date,
    by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    history: [{
      content: String,
      editedAt: Date,
    }],
  },
  readBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  }],
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
chatMessageSchema.index({ club: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1, createdAt: -1 });
chatMessageSchema.index({ club: 1, isDeleted: 1, createdAt: -1 });
chatMessageSchema.index({ mentions: 1, createdAt: -1 });
chatMessageSchema.index({ replyTo: 1 });

// Text search index
chatMessageSchema.index({ content: 'text' });

export const ChatMessage = mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);