import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/user';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendWelcomeEmail } from '@/lib/email';
import { createRateLimiter } from '@/lib/middleware/rate-limit';
import { Platform } from 'react-native';

const registerSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  email: z.string().email().toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  newsletter: z.boolean().optional(),
  deviceInfo: z.string().optional(),
});

// Rate limit: 3 registration attempts per hour
const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many registration attempts, please try again later',
});

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    registerRateLimiter(request, new ExpoResponse(), async () => {
      try {
        const body = await request.json();
        const { name, email, password, acceptTerms, newsletter, deviceInfo } = registerSchema.parse(body);

        await connectDB();

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          resolve(ExpoResponse.json(
            { error: 'An account with this email already exists' },
            { status: 400 }
          ));
          return;
        }

        // Create new user
        const user = new User({
          name,
          email,
          password, // Will be hashed by the pre-save hook
          preferences: {
            newsletter: newsletter || false,
            notifications: true,
            theme: 'system',
          },
        });

        // Generate tokens
        const accessToken = jwt.sign(
          { 
            sub: user._id.toString(),
            email: user.email,
            type: 'access'
          },
          process.env.JWT_ACCESS_SECRET!,
          { expiresIn: '15m' }
        );

        const refreshTokenId = crypto.randomBytes(32).toString('hex');
        const refreshToken = jwt.sign(
          { 
            sub: user._id.toString(),
            tokenId: refreshTokenId,
            type: 'refresh'
          },
          process.env.JWT_REFRESH_SECRET!,
          { expiresIn: '7d' }
        );

        // Store refresh token
        user.refreshTokens = [{
          token: refreshTokenId,
          createdAt: new Date(),
          lastUsed: new Date(),
          deviceInfo: deviceInfo || request.headers.get('user-agent') || 'Unknown device',
        }];

        user.lastLoginAt = new Date();

        await user.save();

        // Send welcome email (only on web platform)
        const isWebPlatform = request.headers.get('user-agent')?.includes('Mozilla');
        if (isWebPlatform) {
          // Fire and forget - don't wait for email
          sendWelcomeEmail(user.email, user.name).catch(console.error);
        }

        // Prepare response
        const response = ExpoResponse.json({
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            emailVerified: user.emailVerified,
            preferences: user.preferences,
          },
          accessToken,
          refreshToken,
          expiresIn: 900, // 15 minutes in seconds
          message: 'Registration successful! Welcome to the app.',
        });

        // Set secure cookie for web platform
        if (isWebPlatform) {
          response.headers.set(
            'Set-Cookie',
            `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`
          );
        }

        resolve(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(ExpoResponse.json(
            { 
              error: 'Validation failed', 
              details: error.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
              }))
            },
            { status: 400 }
          ));
          return;
        }

        console.error('Registration error:', error);
        resolve(ExpoResponse.json(
          { error: 'Failed to create account. Please try again.' },
          { status: 500 }
        ));
      }
    });
  });
}