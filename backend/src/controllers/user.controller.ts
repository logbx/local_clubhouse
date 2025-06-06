import { Response, Request } from 'express';
import { UserService } from '../services/user.service';
import { AuthRequest } from '../middleware/auth.middleware';
import fs from 'fs';
import { User } from '../models/user.model';



// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

export class UserController {
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      console.log('[UserController] Raw request body:', JSON.stringify(req.body, null, 2));
      console.log('[UserController] User from auth:', req.user?.id);
      console.log('[UserController] Profile image from request:', {
        hasImage: !!req.body.profileImage,
        imageType: typeof req.body.profileImage,
        imageValue: req.body.profileImage
      });

      // Validate and sanitize input
      const profileData = {
        roles: Array.isArray(req.body.roles) ? req.body.roles : 
               (typeof req.body.roles === 'string' ? JSON.parse(req.body.roles) : []),
        interests: Array.isArray(req.body.interests) ? req.body.interests :
                  (typeof req.body.interests === 'string' ? JSON.parse(req.body.interests) : []),
        bio: req.body.bio || '',
        phoneNumber: req.body.phoneNumber || '',
        profileImage: typeof req.body.profileImage === 'string' ? req.body.profileImage : null
      };

      console.log('[UserController] Sanitized profile data:', JSON.stringify(profileData, null, 2));
      console.log('[UserController] Profile image after sanitization:', {
        hasImage: !!profileData.profileImage,
        imageType: typeof profileData.profileImage,
        imageValue: profileData.profileImage
      });

      if (!req.user?.id) {
        throw new Error('User not authenticated');
      }

      const updatedUser = await UserService.updateProfile(req.user.id, profileData);
      
      if (!updatedUser) {
        throw new Error('Failed to update user profile');
      }

      // Create sanitized response object
      const userResponse = {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        roles: updatedUser.roles || [],
        phoneNumber: updatedUser.phoneNumber || '',
        bio: updatedUser.bio || '',
        interests: updatedUser.interests || [],
        profileImage: updatedUser.profileImage || null,
        profileCompleted: updatedUser.profileCompleted || false
      };

      console.log('[UserController] Profile update successful:', {
        userId: userResponse.id,
        hasProfileImage: !!userResponse.profileImage,
        roles: userResponse.roles,
        interests: userResponse.interests
      });

      res.json(userResponse);
    } catch (error: any) {
      console.error('[UserController] Profile update error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        details: error.details || 'No additional details'
      });
      
      res.status(500).json({ 
        message: 'Failed to update profile',
        error: error.message,
        details: error.details || 'No additional details',
        code: error.code || 'UNKNOWN_ERROR'
      });
    }
  }

  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id || req.user?._id;
      console.log('[UserController] Getting profile for user:', userId);
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const user = await UserService.getUserProfile(userId);
      console.log('[UserController] User profile from database:', user);

      if (!user) {
        throw new Error('User not found');
      }

      const userResponse = {
        id: user._id,
        username: user.username,
        email: user.email,
        roles: user.roles || [],
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || '',
        interests: user.interests || [],
        profileImage: user.profileImage || null,
        profileCompleted: user.profileCompleted || false
      };

      console.log('[UserController] Sending profile response:', userResponse);
      res.json(userResponse);
    } catch (error: any) {
      console.error('[UserController] Get profile error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        details: error.details || 'No additional details'
      });
      res.status(500).json({ 
        message: 'Failed to get profile',
        error: error.message,
        details: error.details || 'No additional details'
      });
    }
  }

  static async getPublicProfile(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const user = await User.findById(userId).select('username username bio tags interests avatarUrl roles phoneNumber createdAt updatedAt profileCompleted profileImage');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({
        data: {
          id: user._id,
          username: user.username,
          bio: user.bio || '',
          interests: user.interests || [],
          profileImage: user.profileImage || null,
          roles: user.roles || [],
          phoneNumber: user.phoneNumber,
          profileCompleted: user.profileCompleted || false
        }
      });
    } catch (error) {
      console.error('Error fetching public profile:', error);
      return res.status(500).json({ message: 'Error fetching user profile' });
    }
  }
} 