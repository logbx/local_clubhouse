import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  shortDescription: string;
  type: 'tournament' | 'meetup' | 'workshop' | 'conference' | 'social' | 'online' | 'other';
  startDate: Date;
  endDate: Date;
  timezone: string;
  isAllDay: boolean;
  location: {
    name: string;
    address: string;
    coordinates: [number, number]; // [longitude, latitude]
    city: string;
    country: string;
    postalCode?: string;
    placeId?: string; // Google Places ID
  };
  isOnline: boolean;
  onlineDetails?: {
    platform: string;
    meetingLink: string;
    meetingId?: string;
    password?: string;
  };
  visibility: 'public' | 'private' | 'club_only';
  imageUrl?: string;
  images: string[];
  capacity?: number;
  cost: {
    isFree: boolean;
    amount?: number;
    currency?: string;
    paymentRequired: boolean;
  };
  requirements: {
    ageLimit?: number;
    skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'all';
    equipment?: string[];
    prerequisites?: string[];
  };
  tags: string[];
  club?: mongoose.Types.ObjectId;
  organizer: mongoose.Types.ObjectId;
  coOrganizers: mongoose.Types.ObjectId[];
  stats: {
    attendeeCount: number;
    interestedCount: number;
    viewCount: number;
    shareCount: number;
    checkInCount: number;
  };
  settings: {
    allowWaitlist: boolean;
    requireApproval: boolean;
    allowGuests: boolean;
    sendReminders: boolean;
    enableCheckIn: boolean;
    allowCancellation: boolean;
    cancellationDeadline?: Date;
  };
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  publishedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  remindersSent: {
    oneDayBefore: boolean;
    oneHourBefore: boolean;
    fifteenMinsBefore: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    maxlength: 10000,
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 300,
  },
  type: {
    type: String,
    enum: ['tournament', 'meetup', 'workshop', 'conference', 'social', 'online', 'other'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  timezone: {
    type: String,
    required: true,
    default: 'UTC',
  },
  isAllDay: {
    type: Boolean,
    default: false,
  },
  location: {
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere',
    },
    city: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    postalCode: String,
    placeId: String,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  onlineDetails: {
    platform: String,
    meetingLink: String,
    meetingId: String,
    password: String,
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'club_only'],
    default: 'public',
  },
  imageUrl: String,
  images: [String],
  capacity: {
    type: Number,
    min: 1,
  },
  cost: {
    isFree: {
      type: Boolean,
      default: true,
    },
    amount: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    paymentRequired: {
      type: Boolean,
      default: false,
    },
  },
  requirements: {
    ageLimit: {
      type: Number,
      min: 0,
      max: 120,
    },
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all'],
      default: 'all',
    },
    equipment: [String],
    prerequisites: [String],
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30,
  }],
  club: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
  },
  organizer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  coOrganizers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  stats: {
    attendeeCount: {
      type: Number,
      default: 0,
    },
    interestedCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
    },
    checkInCount: {
      type: Number,
      default: 0,
    },
  },
  settings: {
    allowWaitlist: {
      type: Boolean,
      default: true,
    },
    requireApproval: {
      type: Boolean,
      default: false,
    },
    allowGuests: {
      type: Boolean,
      default: true,
    },
    sendReminders: {
      type: Boolean,
      default: true,
    },
    enableCheckIn: {
      type: Boolean,
      default: true,
    },
    allowCancellation: {
      type: Boolean,
      default: true,
    },
    cancellationDeadline: Date,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft',
  },
  publishedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  remindersSent: {
    oneDayBefore: {
      type: Boolean,
      default: false,
    },
    oneHourBefore: {
      type: Boolean,
      default: false,
    },
    fifteenMinsBefore: {
      type: Boolean,
      default: false,
    },
  },
}, {
  timestamps: true,
});

// Indexes
eventSchema.index({ 'location.coordinates': '2dsphere' });
eventSchema.index({ startDate: 1, status: 1 });
eventSchema.index({ club: 1, startDate: 1 });
eventSchema.index({ organizer: 1, startDate: 1 });
eventSchema.index({ type: 1, startDate: 1 });
eventSchema.index({ visibility: 1, status: 1, startDate: 1 });
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });
eventSchema.index({ 'location.city': 1, 'location.country': 1 });

// Validate end date is after start date
eventSchema.pre('validate', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

// Set published date when status changes to published
eventSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

export const Event = mongoose.models.Event || mongoose.model<IEvent>('Event', eventSchema);