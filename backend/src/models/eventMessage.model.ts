import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, model } from 'mongoose';

@Schema({ timestamps: true })
export class EventMessage extends Document {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Event' })
  eventId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 'text' })
  type: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const EventMessageSchema = SchemaFactory.createForClass(EventMessage);
export const EventMessageModel = model<EventMessage>('EventMessage', EventMessageSchema); 