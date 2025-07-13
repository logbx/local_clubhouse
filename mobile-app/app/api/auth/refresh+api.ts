import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/user';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    // Try to get refresh token from body or cookie
    let refreshToken: string | undefined;
    
    const body = await request.json().catch(() => ({}));
    if (body.refreshToken) {
      refreshToken = body.refreshToken;
    } else {
      // Try to get from cookie for web platform
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split(';').map(c => {
            const [key, value] = c.trim().split('=');
            return [key, value];
          })
        );
        refreshToken = cookies.refreshToken;
      }
    }

    if (!refreshToken) {
      return ExpoResponse.json(
        { error: 'Refresh token required' },
        { status: 401 }
      );
    }

    // Verify refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as {
        sub: string;
        tokenId: string;
        type: string;
      };
    } catch (error) {
      return ExpoResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    if (decoded.type !== 'refresh') {
      return ExpoResponse.json(
        { error: 'Invalid token type' },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user and verify refresh token exists
    const user = await User.findById(decoded.sub).select('+refreshTokens');
    if (!user) {
      return ExpoResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Find the refresh token in user's tokens
    const tokenIndex = user.refreshTokens.findIndex(
      rt => rt.token === decoded.tokenId
    );

    if (tokenIndex === -1) {
      return ExpoResponse.json(
        { error: 'Refresh token not found or revoked' },
        { status: 401 }
      );
    }

    // Update last used time
    user.refreshTokens[tokenIndex].lastUsed = new Date();

    // Generate new access token
    const newAccessToken = jwt.sign(
      { 
        sub: user._id.toString(),
        email: user.email,
        type: 'access'
      },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '15m' }
    );

    // Optionally rotate refresh token (more secure)
    const shouldRotate = Math.random() < 0.1; // 10% chance to rotate
    let newRefreshToken = refreshToken;
    
    if (shouldRotate) {
      // Remove old token
      user.refreshTokens.splice(tokenIndex, 1);
      
      // Generate new refresh token
      const newRefreshTokenId = crypto.randomBytes(32).toString('hex');
      newRefreshToken = jwt.sign(
        { 
          sub: user._id.toString(),
          tokenId: newRefreshTokenId,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      // Add new token
      user.refreshTokens.push({
        token: newRefreshTokenId,
        createdAt: new Date(),
        lastUsed: new Date(),
        deviceInfo: user.refreshTokens[tokenIndex]?.deviceInfo || 'Unknown device',
      });
    }

    await user.save();

    const response = ExpoResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900, // 15 minutes in seconds
    });

    // Update cookie if rotated for web platform
    if (shouldRotate && request.headers.get('user-agent')?.includes('Mozilla')) {
      response.headers.set(
        'Set-Cookie',
        `refreshToken=${newRefreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`
      );
    }

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return ExpoResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return ExpoResponse.json(
        { error: 'Refresh token required' },
        { status: 400 }
      );
    }

    // Verify token to get user ID
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
    } catch {
      // Token is invalid, but we still return success
      return ExpoResponse.json({ message: 'Token revoked' });
    }

    await connectDB();

    // Remove the refresh token from user's tokens
    await User.findByIdAndUpdate(decoded.sub, {
      $pull: {
        refreshTokens: { token: decoded.tokenId }
      }
    });

    const response = ExpoResponse.json({ message: 'Token revoked successfully' });

    // Clear cookie for web platform
    if (request.headers.get('user-agent')?.includes('Mozilla')) {
      response.headers.set(
        'Set-Cookie',
        'refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
      );
    }

    return response;
  } catch (error) {
    console.error('Token revocation error:', error);
    return ExpoResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}