import mongoose, { Schema, Document } from 'mongoose';

export interface ChatMessageDocument extends Document {
  club: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';
  replyTo?: mongoose.Types.ObjectId;
  mentions: mongoose.Types.ObjectId[];
  attachments: Array<{
    type: 'image' | 'video' | 'audio' | 'file';
    url: string;
    filename: string;
    size: number;
    mimeType: string;
  }>;
  reactions: Array<{
    user: mongoose.Types.ObjectId;
    emoji: string;
    createdAt: Date;
  }>;
  readBy: Array<{
    user: mongoose.Types.ObjectId;
    readAt: Date;
  }>;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  edited: {
    isEdited: boolean;
    editedAt?: Date;
    history: Array<{
      content: string;
      editedAt: Date;
      editedBy: mongoose.Types.ObjectId;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema({
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
    trim: true,
    maxlength: 4000,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'system'],
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
      enum: ['image', 'video', 'audio', 'file'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    filename: {
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
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
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
  deletedAt: {
    type: Date,
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  edited: {
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    history: [{
      content: {
        type: String,
        required: true,
      },
      editedAt: {
        type: Date,
        required: true,
      },
      editedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    }],
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
chatMessageSchema.index({ club: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1 });
chatMessageSchema.index({ club: 1, isDeleted: 1 });
chatMessageSchema.index({ 'readBy.user': 1 });

export const ChatMessage = mongoose.models.ChatMessage || mongoose.model<ChatMessageDocument>('ChatMessage', chatMessageSchema);