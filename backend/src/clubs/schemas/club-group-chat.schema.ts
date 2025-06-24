import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClubGroupChatDocument = ClubGroupChat & Document;

export interface ClubGroupChatMessage {
  _id?: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  senderProfileImage?: string;
  content: string;
  createdAt: Date;
}

@Schema({ timestamps: true })
export class ClubGroupChat {
  @Prop({ required: [true, 'Group chat name is required'], trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Club', required: true })
  clubId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];

  @Prop({ 
    type: [{ 
      senderId: { type: Types.ObjectId, ref: 'User' },
      senderName: String,
      senderProfileImage: String,
      content: String,
      createdAt: { type: Date, default: Date.now }
    }], 
    default: [] 
  })
  messages: ClubGroupChatMessage[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ClubGroupChatSchema = SchemaFactory.createForClass(ClubGroupChat);

// Index for faster club lookups
ClubGroupChatSchema.index({ clubId: 1 });
// Index for member lookups
ClubGroupChatSchema.index({ members: 1 }); 