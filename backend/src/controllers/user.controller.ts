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

      // Validate and sanitize input
      const profileData = {
        roles: Array.isArray(req.body.roles) ? req.body.roles : 
               (typeof req.body.roles === 'string' ? JSON.parse(req.body.roles) : []),
        interests: Array.isArray(req.body.interests) ? req.body.interests :
                  (typeof req.body.interests === 'string' ? JSON.parse(req.body.interests) : []),
        profileImage: req.body.profileImage || null
      };

      console.log('[UserController] Sanitized profile data:', JSON.stringify(profileData, null, 2));

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
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        roles: updatedUser.roles,
        phoneNumber: updatedUser.phoneNumber,
        bio: updatedUser.bio,
        interests: updatedUser.interests,
        profileImage: updatedUser.profileImage,
        profileCompleted: updatedUser.profileCompleted
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

      return res.json({
        data: {
          id: user._id,
          fullName: user.fullName,
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