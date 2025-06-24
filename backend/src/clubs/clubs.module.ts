import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Club, ClubSchema } from './schemas/club.schema';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { ClubAdminGuard } from './guards/club-admin.guard';
import { Event, EventSchema } from '../models/event.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Club.name, schema: ClubSchema },
      { name: 'Event', schema: EventSchema },
    ]),
  ],
  controllers: [ClubsController],
  providers: [ClubsService, ClubAdminGuard],
  exports: [ClubsService, ClubAdminGuard],
})
export class ClubsModule {} 