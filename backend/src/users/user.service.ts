import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { generatePresignedUrl, getS3Url } from '../config/s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, updateData: Partial<User>) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async generateProfileImageUploadUrl(userId: string, fileType: string) {
    const fileExtension = fileType.split('/')[1];
    const key = `profile-images/${userId}/${uuidv4()}.${fileExtension}`;
    
    const presignedUrl = await generatePresignedUrl(key, fileType);
    const s3Url = getS3Url(key);

    // Update user's profile image URL
    await this.userModel.findByIdAndUpdate(userId, {
      profileImage: s3Url,
      profileImageKey: key,
    });

    return {
      uploadUrl: presignedUrl,
      imageUrl: s3Url,
    };
  }
} 