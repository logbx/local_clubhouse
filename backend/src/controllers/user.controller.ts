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
    console.log('Received update profile request:', req.body);
    
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Get current user to preserve existing data
      const currentUser = await UserService.getUserProfile(userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const updateData: any = {};

      // Handle text fields
      if (req.body.fullName !== undefined) updateData.fullName = req.body.fullName;
      if (req.body.phoneNumber !== undefined) updateData.phoneNumber = req.body.phoneNumber;
      if (req.body.bio !== undefined) updateData.bio = req.body.bio;
      if (req.body.profileImage !== undefined) updateData.profileImage = req.body.profileImage;

      // Handle roles
      if (req.body.roles) {
        try {
          const roles = JSON.parse(req.body.roles);
          if (!Array.isArray(roles)) {
            return res.status(400).json({ message: 'Roles must be an array' });
          }
          // Validate roles against UserRole enum
          const validRoles = Object.values(UserRole);
          const invalidRoles = roles.filter(role => !validRoles.includes(role as UserRole));
          if (invalidRoles.length > 0) {
            return res.status(400).json({ message: `Invalid roles: ${invalidRoles.join(', ')}` });
          }
          updateData.roles = roles;
        } catch (error) {
          console.error('Error parsing roles:', error);
          // If roles parsing fails, keep existing roles
          updateData.roles = currentUser.roles;
        }
      } else {
        // Preserve existing roles if not provided
        updateData.roles = currentUser.roles;
      }

      // Handle interests
      if (req.body.interests) {
        try {
          const interests = JSON.parse(req.body.interests);
          if (!Array.isArray(interests)) {
            return res.status(400).json({ message: 'Interests must be an array' });
          }
          updateData.interests = interests;
        } catch (error) {
          console.error('Error parsing interests:', error);
          // If interests parsing fails, keep existing interests
          updateData.interests = currentUser.interests || [];
        }
      }

      // Handle profile image if provided
      if (req.file) {
        const file = req.file;
        const fileExtension = path.extname(file.originalname);
        const key = `profile-images/${userId}/${Date.now()}${fileExtension}`;
        
        // Upload to S3
        await s3Service.uploadFile(file.buffer, key, file.mimetype);
        
        // Get the public URL
        const publicUrl = s3Service.getFileUrl(key);
        updateData.profileImage = publicUrl;
        
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
      }

      console.log('Processing update with:', updateData);

      const updatedUser = await UserService.updateProfile(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create sanitized user object for response
      const userResponse = {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        roles: updatedUser.roles || [],
        phoneNumber: updatedUser.phoneNumber || '',
        bio: updatedUser.bio || '',
        interests: updatedUser.interests || [],
        profileImage: updatedUser.profileImage || null,
        profileCompleted: updatedUser.profileCompleted || false
      };

      console.log('Sending response:', userResponse);
      res.json({ user: userResponse });

    } catch (error: any) {
      console.error('Profile update error:', error);
      res.status(500).json({ message: error.message || 'Error updating profile' });
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