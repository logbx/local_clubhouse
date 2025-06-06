import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventMessagesController } from './event-messages.controller';
import { EventMessage, EventMessageSchema } from '../models/eventMessage.model';
import { User, UserSchema } from '../users/schemas/user.schema';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EventMessage.name, schema: EventMessageSchema },
      { name: User.name, schema: UserSchema },
    ]),
    WebSocketModule,
  ],
  controllers: [EventMessagesController],
})
export class EventMessagesModule {} 