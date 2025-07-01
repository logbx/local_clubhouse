import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sponsor, SponsorSchema } from './schemas/sponsor.schema';
import { SponsorshipTier, SponsorshipTierSchema } from './schemas/sponsorship-tier.schema';
import { CollaborationRequest, CollaborationRequestSchema } from './schemas/collaboration-request.schema';
import { SponsorshipPreferences, SponsorshipPreferencesSchema } from './schemas/sponsorship-preferences.schema';
import { SponsorshipPackage, SponsorshipPackageSchema } from './schemas/sponsorship-package.schema';
import { SponsorsController } from './sponsors.controller';
import { SponsorsService } from './sponsors.service';
import { Club, ClubSchema } from '../clubs/schemas/club.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sponsor.name, schema: SponsorSchema },
      { name: SponsorshipTier.name, schema: SponsorshipTierSchema },
      { name: CollaborationRequest.name, schema: CollaborationRequestSchema },
      { name: SponsorshipPreferences.name, schema: SponsorshipPreferencesSchema },
      { name: SponsorshipPackage.name, schema: SponsorshipPackageSchema },
      { name: Club.name, schema: ClubSchema },
      { name: User.name, schema: UserSchema }
    ]),
  ],
  controllers: [SponsorsController],
  providers: [SponsorsService],
  exports: [SponsorsService],
})
export class SponsorsModule {} 