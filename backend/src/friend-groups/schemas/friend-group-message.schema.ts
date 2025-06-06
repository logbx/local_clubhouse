import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FriendGroupMessageDocument = FriendGroupMessage & Document;

@Schema({ timestamps: true })
export class FriendGroupMessage {
  @Prop({ type: Types.ObjectId, ref: 'FriendGroup', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const FriendGroupMessageSchema = SchemaFactory.createForClass(FriendGroupMessage); 