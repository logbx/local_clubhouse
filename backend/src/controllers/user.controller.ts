import { Response, Request } from 'express';
import { UserService } from '../services/user.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../types/user';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { User } from '../models/user.model';
import { S3Service } from '../services/s3.service';

// Initialize S3 service
const s3Service = new S3Service();

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
    }
  }
});

export class UserController {
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      console.log('[UserController] Updating profile for user:', req.user?.id);
      console.log('[UserController] Request body:', {
        ...req.body,
        profileImage: req.body.profileImage ? 'URL present' : 'No URL'
      });

      const profileData = {
        ...req.body,
        profileImage: req.body.profileImage
      };

      console.log('[UserController] Profile data to update:', {
        ...profileData,
        profileImage: profileData.profileImage ? 'URL present' : 'No URL'
      });

      const updatedUser = await UserService.updateProfile(req.user!.id, profileData);
      
      // Create sanitized response object with only the fields we want to expose
      const userResponse = {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        roles: updatedUser.roles,
        phoneNumber: updatedUser.phoneNumber,
        bio: updatedUser.bio,
        interests: updatedUser.interests,
        profileImage: updatedUser.profileImage,
        profileCompleted: updatedUser.profileCompleted
      };

      console.log('[UserController] Profile updated successfully:', {
        userId: userResponse.id,
        hasProfileImage: !!userResponse.profileImage
      });

      res.json(userResponse);
    } catch (error) {
      console.error('[UserController] Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }

  static async uploadProfileImage(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Get current user to handle old image deletion
      const currentUser = await UserService.getUserProfile(userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate S3 key
      const fileExtension = path.extname(file.originalname);
      const key = `profile-images/${userId}/${Date.now()}${fileExtension}`;
      
      // Upload to S3
      await s3Service.uploadFile(file.buffer, key, file.mimetype);
      
      // Get the public URL
      const publicUrl = s3Service.getFileUrl(key);

      // Delete old profile image from S3 if it exists
      if (currentUser.profileImage) {
        try {
          const oldKey = currentUser.profileImage.split('/').pop();
          if (oldKey) {
            await s3Service.deleteFile(oldKey);
          }
        } catch (error) {
          console.error('Error deleting old profile image:', error);
        }
      }

      // Update user profile with new image URL
      const updatedUser = await UserService.updateProfile(userId, {
        profileImage: publicUrl,
      });

      res.json({
        message: 'Profile image uploaded successfully',
        profileImage: updatedUser.profileImage,
      });
    } catch (error: any) {
      console.error('Profile image upload error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const user = await UserService.getUserProfile(userId);
      console.log('User profile from database:', user);

      const userResponse = {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        interests: user.interests || [],
        profileImage: user.profileImage,
        profileCompleted: user.profileCompleted || false
      };

      console.log('Sending profile response:', userResponse);
      res.json({
        user: userResponse,
      });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  static async getPublicProfile(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const user = await User.findById(userId).select('username fullName bio tags interests avatarUrl roles phoneNumber createdAt updatedAt profileCompleted profileImage');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        data: {
          id: user._id,
          username: user.username || user.fullName,
          fullName: user.fullName,
          bio: user.bio || '',
          tags: user.tags || [],
          interests: user.interests || [],
          avatarUrl: user.avatarUrl,
          profileImage: user.profileImage || null,
          roles: user.roles || [],
          phoneNumber: user.phoneNumber,
          profileCompleted: user.profileCompleted || false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      console.error('Error fetching public profile:', error);
      res.status(500).json({ message: 'Error fetching user profile' });
    }
  }
}

export const uploadMiddleware = upload.single('profileImage'); 