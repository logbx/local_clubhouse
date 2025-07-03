import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { Tournament, TournamentSchema } from '../models/tournament.model';
import { Event, EventSchema } from '../events/schemas/event.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { WebSocketModule } from '../websocket/websocket.module';
import { BaseTournamentService } from './services/base-tournament.service';
import { TournamentStrategyFactory } from './strategies/tournament-strategy.factory';
import { SingleEliminationStrategy } from './strategies/single-elimination.strategy';
import { SwissTournamentStrategy } from './strategies/swiss-tournament.strategy';

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
  providers: [
    TournamentsService,
    BaseTournamentService,
    TournamentStrategyFactory,
    SingleEliminationStrategy,
    SwissTournamentStrategy,
  ],
  exports: [TournamentsService, BaseTournamentService, TournamentStrategyFactory],
})
export class TournamentsModule {} 