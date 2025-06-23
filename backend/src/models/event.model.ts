import { Schema, Document, Types, model } from 'mongoose';

export type EventStatus = 'DRAFT' | 'LIVE' | 'PAST';

export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  cost: number;
  isFree: boolean;
  status: EventStatus;
  visibility: string;
  recurrence: string;
  tags: string[];
  features?: string[];
  imageUrl?: string;
  creator: Types.ObjectId;
  clubId?: Types.ObjectId;
  invitedUsers?: Types.ObjectId[];
  rsvps: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export const EventSchema = new Schema<IEvent>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: { type: String, required: true },
  cost: { type: Number, default: 0 },
  isFree: { type: Boolean, default: true },
  status: { type: String, enum: ['DRAFT', 'LIVE', 'PAST'], default: 'DRAFT' },
  visibility: { type: String, enum: ['PUBLIC', 'PRIVATE', 'CLUB'], default: 'PUBLIC' },
  recurrence: { type: String, default: 'none' },
  tags: [{ type: String }],
  features: [{ type: String }],
  imageUrl: { type: String },
  creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clubId: { type: Schema.Types.ObjectId, ref: 'Club' },
  invitedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  rsvps: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, {
  timestamps: true,
  toObject: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      return ret;
    }
  }
});

export const Event = model<IEvent>('Event', EventSchema); 