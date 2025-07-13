import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/user';
import { AuthRequest, verifyToken } from '@/lib/middleware/auth';
import { uploadImage } from '@/lib/upload';

const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  preferences: z.object({
    notifications: z.boolean().optional(),
    newsletter: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
  }).optional(),
});

// GET /api/auth/profile - Get current user profile
export async function GET(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    verifyToken(request, new ExpoResponse(), async () => {
      try {
        if (!request.user) {
          resolve(ExpoResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          ));
          return;
        }

        await connectDB();

        const user = await User.findById(request.user.id);
        if (!user) {
          resolve(ExpoResponse.json(
            { error: 'User not found' },
            { status: 404 }
          ));
          return;
        }

        resolve(ExpoResponse.json({
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            emailVerified: user.emailVerified,
            preferences: user.preferences,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLoginAt: user.lastLoginAt,
          }
        }));
      } catch (error) {
        console.error('Get profile error:', error);
        resolve(ExpoResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        ));
      }
    });
  });
}

// PUT /api/auth/profile - Update user profile
export async function PUT(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    verifyToken(request, new ExpoResponse(), async () => {
      try {
        if (!request.user) {
          resolve(ExpoResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          ));
          return;
        }

        const body = await request.json();
        const validatedData = updateProfileSchema.parse(body);

        await connectDB();

        const user = await User.findById(request.user.id);
        if (!user) {
          resolve(ExpoResponse.json(
            { error: 'User not found' },
            { status: 404 }
          ));
          return;
        }

        // Update fields
        if (validatedData.name !== undefined) {
          user.name = validatedData.name;
        }
        if (validatedData.bio !== undefined) {
          user.bio = validatedData.bio;
        }
        if (validatedData.avatar !== undefined) {
          user.avatar = validatedData.avatar;
        }
        if (validatedData.preferences) {
          user.preferences = {
            ...user.preferences,
            ...validatedData.preferences,
          };
        }

        await user.save();

        resolve(ExpoResponse.json({
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            emailVerified: user.emailVerified,
            preferences: user.preferences,
            updatedAt: user.updatedAt,
          },
          message: 'Profile updated successfully',
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(ExpoResponse.json(
            { 
              error: 'Validation failed',
              details: error.errors,
            },
            { status: 400 }
          ));
          return;
        }

        console.error('Update profile error:', error);
        resolve(ExpoResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        ));
      }
    });
  });
}

// POST /api/auth/profile/avatar - Upload profile picture
export async function POST(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    verifyToken(request, new ExpoResponse(), async () => {
      try {
        if (!request.user) {
          resolve(ExpoResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          ));
          return;
        }

        const formData = await request.formData();
        const imageFile = formData.get('image') as File;

        if (!imageFile) {
          resolve(ExpoResponse.json(
            { error: 'No image file provided' },
            { status: 400 }
          ));
          return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(imageFile.type)) {
          resolve(ExpoResponse.json(
            { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
            { status: 400 }
          ));
          return;
        }

        // Validate file size (max 5MB)
        if (imageFile.size > 5 * 1024 * 1024) {
          resolve(ExpoResponse.json(
            { error: 'File too large. Maximum size is 5MB.' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        // Upload image
        const imageUrl = await uploadImage(imageFile, 'avatars', request.user.id);

        // Update user avatar
        const user = await User.findByIdAndUpdate(
          request.user.id,
          { avatar: imageUrl },
          { new: true }
        );

        resolve(ExpoResponse.json({
          avatar: imageUrl,
          message: 'Avatar uploaded successfully',
        }));
      } catch (error) {
        console.error('Avatar upload error:', error);
        resolve(ExpoResponse.json(
          { error: 'Failed to upload avatar' },
          { status: 500 }
        ));
      }
    });
  });
}