import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SponsorshipTierDocument = SponsorshipTier & Document;

export enum TierType {
  MONETARY = 'monetary',
  IN_KIND = 'in_kind',
  PROMOTION = 'promotion',
  CUSTOM = 'custom'
}

@Schema({ timestamps: true })
export class SponsorshipTier {
  @Prop({ type: Types.ObjectId, ref: 'Sponsor', required: true })
  sponsorId: Types.ObjectId;

  @Prop({ required: [true, 'Tier title is required'], trim: true })
  title: string;

  @Prop({ required: [true, 'Tier description is required'], trim: true, maxlength: 1000 })
  description: string;

  @Prop({ 
    type: String, 
    enum: Object.values(TierType), 
    default: TierType.MONETARY 
  })
  type: TierType;

  @Prop({ trim: true })
  suggestedValue?: string;

  @Prop({ type: [String], default: [] })
  benefits: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const SponsorshipTierSchema = SchemaFactory.createForClass(SponsorshipTier);

// Indexes
SponsorshipTierSchema.index({ sponsorId: 1 });
SponsorshipTierSchema.index({ sponsorId: 1, sortOrder: 1 }); 