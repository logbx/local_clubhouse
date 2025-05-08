import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  cost: number;
  isFree: boolean;
  status: 'DRAFT' | 'LIVE' | 'PAST';
  visibility: 'PUBLIC' | 'PRIVATE';
  recurrence: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  tags: string[];
  imageUrl?: string;
  organizerId: mongoose.Types.ObjectId;
  rsvps: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: { type: String, required: true },
    cost: { type: Number, default: 0 },
    isFree: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['DRAFT', 'LIVE', 'PAST'],
      default: 'DRAFT',
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'PRIVATE'],
      default: 'PUBLIC',
    },
    recurrence: {
      type: String,
      enum: ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'],
      default: 'NONE',
    },
    tags: [{ type: String }],
    imageUrl: String,
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rsvps: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export const Event = mongoose.model<IEvent>('Event', eventSchema); 