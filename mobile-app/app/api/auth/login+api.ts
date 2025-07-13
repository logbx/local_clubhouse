import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/user';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createRateLimiter } from '@/lib/middleware/rate-limit';

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional(),
  deviceInfo: z.string().optional(),
});

// Rate limit: 5 login attempts per 15 minutes
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
});

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  // Apply rate limiting
  return new Promise((resolve) => {
    loginRateLimiter(request, new ExpoResponse(), async () => {
      try {
        const body = await request.json();
        const { email, password, rememberMe, deviceInfo } = loginSchema.parse(body);

        await connectDB();

        // Find user with password field
        const user = await User.findOne({ email }).select('+password +refreshTokens');
        
        if (!user) {
          resolve(ExpoResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
          ));
          return;
        }

        // Verify password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
          resolve(ExpoResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
          ));
          return;
        }

        // Update last login
        user.lastLoginAt = new Date();

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

        const refreshTokenExpiry = rememberMe ? '30d' : '7d';
        const refreshTokenId = crypto.randomBytes(32).toString('hex');
        
        const refreshToken = jwt.sign(
          { 
            sub: user._id.toString(),
            tokenId: refreshTokenId,
            type: 'refresh'
          },
          process.env.JWT_REFRESH_SECRET!,
          { expiresIn: refreshTokenExpiry }
        );

        // Store refresh token
        user.refreshTokens.push({
          token: refreshTokenId,
          createdAt: new Date(),
          lastUsed: new Date(),
          deviceInfo: deviceInfo || request.headers.get('user-agent') || 'Unknown device',
        });

        // Keep only last 5 refresh tokens
        if (user.refreshTokens.length > 5) {
          user.refreshTokens = user.refreshTokens.slice(-5);
        }

        await user.save();

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
        });

        // Set secure cookie for web platform
        if (request.headers.get('user-agent')?.includes('Mozilla')) {
          response.headers.set(
            'Set-Cookie',
            `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${rememberMe ? 2592000 : 604800}`
          );
        }

        resolve(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(ExpoResponse.json(
            { error: 'Invalid input', details: error.errors },
            { status: 400 }
          ));
          return;
        }

        console.error('Login error:', error);
        resolve(ExpoResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        ));
      }
    });
  });
}