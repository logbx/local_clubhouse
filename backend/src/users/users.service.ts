import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async create(userData: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(userData);
    return user.save();
  }

  async update(id: string, userData: Partial<User>): Promise<UserDocument | null> {
    // Get current user to check existing data
    const currentUser = await this.userModel.findById(id).exec();
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Check if profile should be marked as completed
    const updatedUsername = userData.username || currentUser.username;
    const updatedRoles = userData.roles || currentUser.roles;
    
    const hasRequiredFields = Boolean(
      updatedUsername && 
      updatedRoles && 
      updatedRoles.length > 0
    );

    // Add profileCompleted to the update data
    const updateData = {
      ...userData,
      profileCompleted: hasRequiredFields
    };

    console.log('[UsersService] Updating user with profileCompleted:', hasRequiredFields);
    console.log('[UsersService] Update data:', {
      username: updatedUsername,
      roles: updatedRoles,
      profileCompleted: hasRequiredFields
    });

    return this.userModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }
} 