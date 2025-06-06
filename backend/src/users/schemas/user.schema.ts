import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Query } from 'mongoose';
import * as bcryptjs from 'bcryptjs';

export type UserDocument = User & Document & {
  comparePassword(candidatePassword: string): Promise<boolean>;
};

export enum UserRole {
  Member = 'Member',
  Sponsor = 'Sponsor',
  Creator = 'Creator',
  Club_Founder = 'Club_Founder'
}

@Schema({ timestamps: true })
export class User {
  @Prop({ trim: true })
  username?: string;

  @Prop({ required: [true, 'Full name is required'], trim: true })
  fullName: string;

  @Prop({
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  })
  email: string;

  @Prop({
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  })
  password: string;

  @Prop({
    type: [String],
    enum: Object.values(UserRole),
    default: [UserRole.Member]
  })
  roles: UserRole[];

  @Prop({
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  })
  phoneNumber?: string;

  @Prop()
  profileImage?: string;

  @Prop({ maxlength: [300, 'Bio cannot exceed 300 characters'], trim: true })
  bio?: string;

  @Prop({ type: [String], trim: true, default: [] })
  interests: string[];

  @Prop({ default: false })
  profileCompleted: boolean;

  @Prop({ type: [{ type: 'ObjectId', ref: 'User' }], default: [] })
  friends: Document[];

  @Prop({ type: [{ type: 'ObjectId', ref: 'User' }], default: [] })
  sentRequests: Document[];

  @Prop({ type: [{ type: 'ObjectId', ref: 'User' }], default: [] })
  receivedRequests: Document[];

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
}); 

// Add comparePassword method to the schema
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcryptjs.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
}; 