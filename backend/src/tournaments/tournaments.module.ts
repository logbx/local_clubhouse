import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { Tournament, TournamentSchema } from '../models/tournament.model';
import { Event, EventSchema } from '../events/schemas/event.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema },
      { name: Event.name, schema: EventSchema },
      { name: User.name, schema: UserSchema },
    ]),
    WebSocketModule,
  ],
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TournamentsService],
})
export class TournamentsModule {} 