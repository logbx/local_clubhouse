import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { Tournament, TournamentSchema } from '../../models/tournament.model';
import { TournamentIntegrityMonitor } from './tournament-integrity-monitor';
import { TournamentHealthController } from './tournament-health-endpoint';
import { NumRoundsRepairService } from '../scripts/repair-numrounds-corruption';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema }
    ]),
    ScheduleModule.forRoot() // Enable scheduled tasks
  ],
  providers: [
    TournamentIntegrityMonitor,
    NumRoundsRepairService
  ],
  controllers: [
    TournamentHealthController
  ],
  exports: [
    TournamentIntegrityMonitor,
    NumRoundsRepairService
  ]
})
export class TournamentMonitoringModule {}