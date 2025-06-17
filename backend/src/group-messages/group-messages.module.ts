import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupMessagesController } from './group-messages.controller';
import { GroupMessagesService } from './group-messages.service';
import { GroupMessage, GroupMessageSchema } from './schemas/group-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GroupMessage.name, schema: GroupMessageSchema },
    ]),
  ],
  controllers: [GroupMessagesController],
  providers: [GroupMessagesService],
  exports: [GroupMessagesService],
})
export class GroupMessagesModule {} 