import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { EventsController } from './events.controller';
import { Event as EventModelSchema } from '../models/event.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: 'Event', schema: EventModelSchema.schema },
    ]),
  ],
  controllers: [EventsController],
  providers: [],
})
export class EventsModule {} 