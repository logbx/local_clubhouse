import { User, IUser } from '../models/user.model';
import { UserRole } from '../types/user';
import path from 'path';
import fs from 'fs';

interface UpdateProfileData {
  fullName?: string;
  roles?: UserRole[];
  phoneNumber?: string;
  bio?: string;
  profileImage?: string;
  interests?: string[];
}

export class UserService {
  static async updateProfile(userId: string, data: UpdateProfileData) {
    console.log('Updating profile for user:', userId);
    console.log('Update data:', data);

    // Get current user to preserve existing data
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const updateData: UpdateProfileData = {};

    // Handle text fields
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.bio !== undefined) updateData.bio = data.bio;

    // Handle roles if provided, otherwise preserve existing roles
    if (data.roles !== undefined) {
      console.log('Updating roles:', data.roles);
      if (!Array.isArray(data.roles)) {
        throw new Error('Roles must be an array');
      }
      // Validate each role
      const validRoles = Object.values(UserRole);
      const invalidRoles = data.roles.filter(role => !validRoles.includes(role as UserRole));
      if (invalidRoles.length > 0) {
        throw new Error(`Invalid roles: ${invalidRoles.join(', ')}`);
      }
      updateData.roles = data.roles;
    } else {
      // Preserve existing roles if not provided
      updateData.roles = currentUser.roles;
    }

    // Handle interests if provided, otherwise preserve existing interests
    if (data.interests !== undefined) {
      if (!Array.isArray(data.interests)) {
        throw new Error('Interests must be an array');
      }
      updateData.interests = data.interests;
    } else {
      updateData.interests = currentUser.interests || [];
    }

    // Handle profile image if provided
    if (data.profileImage) {
      // Delete old profile image if it exists
      if (currentUser.profileImage) {
        try {
          const oldImagePath = path.join(__dirname, '../../', currentUser.profileImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } catch (error) {
          console.error('Error deleting old profile image:', error);
        }
      }
      updateData.profileImage = data.profileImage;
    }

    // Set profileCompleted to true if all required fields are present
    const hasRequiredFields = 
      (updateData.fullName || currentUser.fullName) && 
      ((updateData.roles && updateData.roles.length > 0) || (currentUser.roles && currentUser.roles.length > 0));
    
    updateData.profileCompleted = hasRequiredFields;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      throw new Error('Failed to update user');
    }

    console.log('User updated successfully:', updatedUser);
    return updatedUser;
  }

  static async deleteProfileImage(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.profileImage) {
      const imagePath = path.join(__dirname, '../../uploads', user.profileImage.replace('/uploads/', ''));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      user.profileImage = undefined;
      await user.save();
    }
  }

  static async getUserProfile(userId: string): Promise<IUser> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if profile is completed based on required fields
      const isProfileCompleted = 
        user.fullName && 
        user.roles && 
        user.roles.length > 0;
      
      // Update profileCompleted if needed
      if (user.profileCompleted !== isProfileCompleted) {
        user.profileCompleted = isProfileCompleted;
        await user.save();
      }
      
      return user.toObject();
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
} 