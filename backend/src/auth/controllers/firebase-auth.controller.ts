import { 
  Controller, 
  Post, 
  Body, 
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UserRole } from '../../users/schemas/user.schema';

interface FirebaseAuthDto {
  idToken: string;
  authUser: {
    uid: string;
    email: string | null;
    phoneNumber: string | null;
    displayName: string | null;
    photoURL: string | null;
    username?: string;
    authMethod?: 'phone' | 'email';
    emailVerified?: boolean;
  };
}

@Controller('auth')
export class FirebaseAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('firebase-login')
  @HttpCode(HttpStatus.OK)
  async firebaseLogin(@Body() firebaseAuthDto: FirebaseAuthDto) {
    try {
      // 1. Verify Firebase ID token
      const decodedToken = await this.verifyFirebaseToken(firebaseAuthDto.idToken);
      
      // 2. Check if user exists in MongoDB
      let user = await this.authService.findUserByFirebaseUID(decodedToken.uid);
      
      if (!user) {
        // 3. Create new user if doesn't exist
        user = await this.authService.createFirebaseUser({
          firebaseUID: decodedToken.uid,
          email: firebaseAuthDto.authUser.email || decodedToken.email,
          fullName: firebaseAuthDto.authUser.displayName || 'User',
          username: firebaseAuthDto.authUser.username,
          phoneNumber: firebaseAuthDto.authUser.phoneNumber,
          authMethod: firebaseAuthDto.authUser.authMethod || 'phone',
          emailVerified: firebaseAuthDto.authUser.emailVerified || false,
          roles: [UserRole.Member],
          profileImage: firebaseAuthDto.authUser.photoURL,
        });
      }

      // 4. Generate JWT tokens for your system
      const tokens = await this.authService.generateTokens(user);
      
      return {
        user: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          roles: user.roles,
          profileImage: user.profileImage,
          authMethod: user.authMethod,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error: any) {
      console.error('Firebase login error:', error);
      throw new UnauthorizedException('Firebase authentication failed');
    }
  }

  private async verifyFirebaseToken(idToken: string) {
    // TODO: Implement Firebase Admin SDK token verification
    // For now, return mock data for development
    if (process.env.NODE_ENV === 'development') {
      return {
        uid: 'mock-firebase-uid-' + Date.now(),
        email: 'test@example.com',
        email_verified: true,
      };
    }
    
    // In production, use Firebase Admin SDK:
    // const admin = require('firebase-admin');
    // return await admin.auth().verifyIdToken(idToken);
    throw new Error('Firebase Admin SDK not implemented yet');
  }
}