import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CollaborationRequestDocument = CollaborationRequest & Document;

export enum CollaborationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DECLINED = 'declined',
  CANCELLED = 'cancelled'
}

export interface CollaborationMessage {
  _id?: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  senderType: 'club' | 'sponsor';
  content: string;
  createdAt: Date;
}

@Schema({ timestamps: true })
export class CollaborationRequest {
  @Prop({ type: Types.ObjectId, ref: 'Sponsor', required: true })
  sponsorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Club', required: true })
  clubId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requestedBy: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: Object.values(CollaborationStatus), 
    default: CollaborationStatus.PENDING 
  })
  status: CollaborationStatus;

  @Prop({ required: [true, 'Proposal text is required'], trim: true, maxlength: 2000 })
  proposalText: string;

  @Prop({ type: Types.ObjectId, ref: 'SponsorshipTier' })
  tierSelected?: Types.ObjectId;

  @Prop({ trim: true, maxlength: 1000 })
  customMessage?: string;

  @Prop({ type: Types.ObjectId, ref: 'Event' })
  eventId?: Types.ObjectId;

  @Prop({ 
    type: [{ 
      senderId: { type: Types.ObjectId, ref: 'User' },
      senderName: String,
      senderType: { type: String, enum: ['club', 'sponsor'] },
      content: String,
      createdAt: { type: Date, default: Date.now }
    }], 
    default: [] 
  })
  messages: CollaborationMessage[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop()
  reviewedAt?: Date;

  @Prop({ trim: true })
  reviewNotes?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CollaborationRequestSchema = SchemaFactory.createForClass(CollaborationRequest);

// Indexes
CollaborationRequestSchema.index({ sponsorId: 1 });
CollaborationRequestSchema.index({ clubId: 1 });
CollaborationRequestSchema.index({ status: 1 });
CollaborationRequestSchema.index({ sponsorId: 1, status: 1 });
CollaborationRequestSchema.index({ clubId: 1, status: 1 }); 