import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventSubGroupsController } from './event-subgroups.controller';
import { WebSocketModule } from '../websocket/websocket.module';

// Import the EventSubGroup schema from the models directory
const EventSubGroupSchema = require('../models/eventSubGroup.model').default.schema;
const EventSubGroupMessageSchema = require('../models/eventSubGroupMessage.model').default.schema;

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'EventSubGroup', schema: EventSubGroupSchema },
      { name: 'EventSubGroupMessage', schema: EventSubGroupMessageSchema },
    ]),
    WebSocketModule,
  ],
  controllers: [EventSubGroupsController],
})
export class EventSubGroupsModule {} 