import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event as EventModelSchema } from '../models/event.model';
import { Club, ClubSchema } from '../clubs/schemas/club.schema';
import { Sponsor, SponsorSchema } from '../sponsors/schemas/sponsor.schema';
import { Tournament, TournamentSchema } from '../models/tournament.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: 'Event', schema: EventModelSchema.schema },
      { name: Club.name, schema: ClubSchema },
      { name: Sponsor.name, schema: SponsorSchema },
      { name: Tournament.name, schema: TournamentSchema },
    ]),
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {} 