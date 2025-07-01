import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SponsorshipPackageDocument = SponsorshipPackage & Document;

// Simplified sponsorship types (10 types)
export enum PackageSponsorshipType {
  LOCATION_HOSTING = 'Location Hosting',
  PRODUCT_SAMPLES_SWAG = 'Product Samples & Swag',
  RAFFLE_GIVEAWAY_DONATION = 'Raffle & Giveaway Donation',
  BUSINESS_PRODUCT_SERVICE_DISCOUNT = 'Business Product & Service Discount',
  EVENT_PROMOTION = 'Event Promotion',
  ENTERTAINMENT = 'Entertainment',
  EVENT_STAFFING_SUPPORT = 'Event Staffing & Support',
  MONETARY_CLUB_DONATION = 'Monetary Club Donation',
  ORGANIZER_BUSINESS_CREDIT = 'Organizer Business Credit',
  CUSTOM_SPONSORSHIP = 'Custom Sponsorship'
}

// Simplified sponsorship item - no tiers, just selected types
export interface SponsorshipItem {
  type: PackageSponsorshipType;
  isSelected: boolean;
  customDescription?: string;
}

@Schema({ timestamps: true })
export class SponsorshipPackage {
  @Prop({ type: Types.ObjectId, ref: 'Sponsor', required: true })
  sponsorId: Types.ObjectId;

  @Prop({ 
    required: [true, 'Package name is required'], 
    trim: true,
    maxlength: [100, 'Package name cannot exceed 100 characters']
  })
  packageName: string;

  @Prop({ 
    trim: true, 
    maxlength: [1000, 'Package description cannot exceed 1000 characters']
  })
  packageDescription?: string;

  @Prop({ 
    type: [{ 
      type: { type: String, enum: Object.values(PackageSponsorshipType), required: true },
      isSelected: { type: Boolean, default: true, required: true },
      customDescription: { type: String, trim: true, maxlength: 500 }
    }], 
    validate: {
      validator: function(items: SponsorshipItem[]) {
        // At least one selected item required
        return items.some(item => item.isSelected);
      },
      message: 'At least one sponsorship type must be selected'
    }
  })
  sponsorshipTypes: SponsorshipItem[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const SponsorshipPackageSchema = SchemaFactory.createForClass(SponsorshipPackage);

// Add indexes for better query performance
SponsorshipPackageSchema.index({ sponsorId: 1 });
SponsorshipPackageSchema.index({ isActive: 1 });
SponsorshipPackageSchema.index({ sponsorId: 1, isActive: 1 });
SponsorshipPackageSchema.index({ 'sponsorshipTypes.type': 1 }); 