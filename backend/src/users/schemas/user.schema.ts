import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  CLUB_FOUNDER = 'club_founder',
  MEMBER = 'member',
  SPONSOR = 'sponsor',
  CREATOR = 'creator',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, type: [String], enum: UserRole })
  roles: UserRole[];

  @Prop()
  phone?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User); 