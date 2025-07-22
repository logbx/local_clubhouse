import mongoose, { Schema, Document } from 'mongoose';

export interface IEventRSVP extends Document {
  event: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  status: 'going' | 'interested' | 'not_going' | 'waitlist';
  response: {
    willAttend: boolean;
    guestCount: number;
    dietaryRestrictions?: string;
    accessibility?: string;
    notes?: string;
  };
  registeredAt: Date;
  checkedIn: boolean;
  checkInTime?: Date;
  checkInLocation?: {
    coordinates: [number, number];
    accuracy: number;
  };
  qrCode?: string;
  notifications: {
    rsvpConfirmation: boolean;
    reminder24h: boolean;
    reminder1h: boolean;
    eventUpdates: boolean;
    cancellation: boolean;
  };
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentId?: string;
  invitedBy?: mongoose.Types.ObjectId;
  inviteCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventRSVPSchema = new Schema<IEventRSVP>({
  event: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['going', 'interested', 'not_going', 'waitlist'],
    required: true,
  },
  response: {
    willAttend: {
      type: Boolean,
      required: true,
    },
    guestCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    dietaryRestrictions: String,
    accessibility: String,
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  checkedIn: {
    type: Boolean,
    default: false,
  },
  checkInTime: Date,
  checkInLocation: {
    coordinates: {
      type: [Number],
      validate: {
        validator: function(coords: number[]) {
          return coords.length === 2;
        },
        message: 'Coordinates must be [longitude, latitude]',
      },
    },
    accuracy: Number,
  },
  qrCode: String,
  notifications: {
    rsvpConfirmation: {
      type: Boolean,
      default: true,
    },
    reminder24h: {
      type: Boolean,
      default: true,
    },
    reminder1h: {
      type: Boolean,
      default: true,
    },
    eventUpdates: {
      type: Boolean,
      default: true,
    },
    cancellation: {
      type: Boolean,
      default: true,
    },
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
  },
  paymentId: String,
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  inviteCode: String,
}, {
  timestamps: true,
});

// Compound indexes
eventRSVPSchema.index({ event: 1, user: 1 }, { unique: true });
eventRSVPSchema.index({ event: 1, status: 1 });
eventRSVPSchema.index({ user: 1, status: 1, registeredAt: -1 });
eventRSVPSchema.index({ event: 1, checkedIn: 1 });
eventRSVPSchema.index({ qrCode: 1 }, { sparse: true });

// Generate QR code for attendees
eventRSVPSchema.pre('save', function(next) {
  if (this.isNew && this.status === 'going') {
    this.qrCode = `event:${this.event}:user:${this.user}:${Date.now()}`;
  }
  next();
});

export const EventRSVP = mongoose.models.EventRSVP || mongoose.model<IEventRSVP>('EventRSVP', eventRSVPSchema);