import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SponsorshipPreferencesDocument = SponsorshipPreferences & Document;

// Enum for sponsorship types
export enum SponsorshipType {
  LOCATION_HOSTING = 'Location Hosting',
  POPUP_SPACE = 'Pop-up Space',
  PRODUCT_SAMPLES_SWAG = 'Product Samples & Swag',
  RAFFLE_GIVEAWAY_DONATIONS = 'Raffle & Giveaway Donations',
  BRANDED_MERCHANDISE = 'Branded Merchandise',
  EVENT_SPONSORSHIP_FUNDS = 'Event Sponsorship Funds',
  GRANTS_DONATIONS = 'Grants & Donations',
  PRIZE_MONEY = 'Prize Money',
  CATERING_REFRESHMENTS = 'Catering & Refreshments',
  ENTERTAINMENT_SPONSORSHIP = 'Entertainment Sponsorship',
  PHOTOGRAPHY_VIDEOGRAPHY = 'Photography/Videography',
  EVENT_STAFFING_VOLUNTEERS = 'Event Staffing & Volunteers',
  DECOR_PRODUCTION_SUPPORT = 'Decor & Production Support',
  EVENT_PROMOTION = 'Event Promotion',
  CROSS_PROMOTION = 'Cross-Promotion',
  ADVERTISING_CREDIT = 'Advertising Credit',
  INFLUENCER_PARTNERSHIP = 'Influencer Partnership',
  CONSULTING_WORKSHOPS = 'Consulting / Workshops',
  LOGISTICS_TRANSPORTATION = 'Logistics / Transportation',
  TECHNOLOGY_EQUIPMENT = 'Technology / Equipment',
  PRINTING_MATERIALS = 'Printing & Materials',
  SOFTWARE_ACCESS_TOOLS = 'Software Access / Tools',
  INSURANCE_COMPLIANCE = 'Insurance & Compliance'
}

// Enum for sponsorship tiers
export enum SponsorshipTier {
  COMPLIMENTARY = 'Complimentary',
  PARTIAL_SUBSIDY = 'Partial Subsidy',
  FULL_SPONSORSHIP = 'Full Sponsorship',
  PREMIUM_EXCLUSIVE = 'Premium / Exclusive'
}

// Enum for collaboration preferences
export enum CollaborationPreference {
  ACTIVELY_COLLABORATE = 'Actively Collaborate',
  PASSIVE_LISTING = 'Passive'
}

// Interface for individual sponsorship preference
export interface SponsorshipPreferenceItem {
  type: SponsorshipType;
  tier: SponsorshipTier;
  isActive?: boolean;
  customDescription?: string;
}

@Schema({ timestamps: true })
export class SponsorshipPreferences {
  @Prop({ type: Types.ObjectId, ref: 'Sponsor', required: true, unique: true })
  sponsorId: Types.ObjectId;

  @Prop({ 
    type: [{ 
      type: { type: String, enum: Object.values(SponsorshipType), required: true },
      tier: { type: String, enum: Object.values(SponsorshipTier), required: true },
      isActive: { type: Boolean, default: true },
      customDescription: { type: String, trim: true, maxlength: 500 }
    }], 
    default: [] 
  })
  sponsorshipTypes: SponsorshipPreferenceItem[];

  @Prop({ 
    type: String, 
    enum: Object.values(CollaborationPreference), 
    required: [true, 'Collaboration preference is required'],
    default: CollaborationPreference.ACTIVELY_COLLABORATE
  })
  collaborationPreference: CollaborationPreference;

  @Prop({ trim: true, maxlength: 1000 })
  customNotes?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const SponsorshipPreferencesSchema = SchemaFactory.createForClass(SponsorshipPreferences);

// Add indexes for better query performance
SponsorshipPreferencesSchema.index({ sponsorId: 1 });
SponsorshipPreferencesSchema.index({ 'sponsorshipTypes.type': 1 });
SponsorshipPreferencesSchema.index({ collaborationPreference: 1 }); 