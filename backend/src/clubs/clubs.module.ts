import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Club, ClubSchema } from './schemas/club.schema';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { ClubAdminGuard } from './guards/club-admin.guard';
import { EventSchema } from '../models/event.model';
import { ClubGroupChat, ClubGroupChatSchema } from './schemas/club-group-chat.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Club.name, schema: ClubSchema },
      { name: 'Event', schema: EventSchema },
      { name: ClubGroupChat.name, schema: ClubGroupChatSchema },
      { name: User.name, schema: UserSchema }
    ]),
  ],
  controllers: [ClubsController],
  providers: [ClubsService, ClubAdminGuard],
  exports: [ClubsService, ClubAdminGuard],
})
export class ClubsModule {} 