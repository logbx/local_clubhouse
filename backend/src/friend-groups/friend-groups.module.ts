import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendGroupsController } from './friend-groups.controller';
import { FriendGroupsService } from './friend-groups.service';
import { FriendGroup, FriendGroupSchema } from './schemas/friend-group.schema';
import { FriendGroupMessage, FriendGroupMessageSchema } from './schemas/friend-group-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FriendGroup.name, schema: FriendGroupSchema },
      { name: FriendGroupMessage.name, schema: FriendGroupMessageSchema },
    ]),
  ],
  controllers: [FriendGroupsController],
  providers: [FriendGroupsService],
  exports: [FriendGroupsService],
})
export class FriendGroupsModule {} 