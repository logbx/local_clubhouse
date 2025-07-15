import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchController } from '../controllers/search.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { EventSchema } from '../models/event.model';
import { Club, ClubSchema } from '../clubs/schemas/club.schema';
import { Sponsor, SponsorSchema } from '../sponsors/schemas/sponsor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: 'Event', schema: EventSchema },
      { name: Club.name, schema: ClubSchema },
      { name: Sponsor.name, schema: SponsorSchema },
    ]),
  ],
  controllers: [SearchController],
})
export class SearchModule {} 