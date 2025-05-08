import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../types/user';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  roles: UserRole[];
  phoneNumber?: string;
  profileImage?: string;
  bio?: string;
  interests: string[];
  profileCompleted: boolean;
  friends: mongoose.Types.ObjectId[];      // Confirmed friends
  sentRequests: mongoose.Types.ObjectId[]; // Requests this user sent
  receivedRequests: mongoose.Types.ObjectId[]; // Requests this user received
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
    },
    roles: [{
      type: String,
      enum: Object.values(UserRole),
      default: [UserRole.Member]
    }],
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number'],
    },
    profileImage: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
      trim: true,
    },
    interests: [{
      type: String,
      trim: true,
    }],
    profileCompleted: {
      type: Boolean,
      default: false
    },
    friends: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: []
    }],
    sentRequests: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: []
    }],
    receivedRequests: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: []
    }]
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export const User = mongoose.model<IUser>('User', userSchema); 