import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Get, 
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ValidationPipe,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto/auth.dto';
import { Request as ExpressRequest } from 'express';
import { UserRole } from '../../users/schemas/user.schema';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: string;
    email: string;
    roles: UserRole[];
  };
}

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    try {
      // Set default role to Member if no roles provided during registration
      // Roles will be properly selected during profile setup
      if (!registerDto.roles || registerDto.roles.length === 0) {
        registerDto.roles = [UserRole.Member];
      }
      
      const result = await this.authService.register(registerDto);
      return {
        message: 'Registration successful',
        ...result
      };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Registration failed');
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    try {
      return await this.authService.login(loginDto.identifier, loginDto.password);
    } catch (error: any) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new UnauthorizedException(error.message || 'Login failed');
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    try {
      await this.authService.generatePasswordResetToken(body.email);
      return { 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      };
    } catch (error) {
      // Always return success message for security (don't reveal if email exists)
      return { 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      };
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    try {
      if (!body.token || !body.newPassword) {
        throw new BadRequestException('Token and new password are required');
      }
      
      if (body.newPassword.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long');
      }

      await this.authService.resetPasswordWithToken(body.token, body.newPassword);
      return { 
        message: 'Password has been reset successfully. You can now login with your new password.' 
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body(ValidationPipe) refreshTokenDto: RefreshTokenDto) {
    try {
      return await this.authService.refreshTokens(refreshTokenDto.refreshToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  async verifyToken(@Request() req: RequestWithUser) {
    // Fetch full user profile from database
    const user = await this.authService.verifyToken(req.headers.authorization?.replace('Bearer ', '') || '');
    
    return {
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles || [],
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || '',
        interests: user.interests || [],
        profileImage: user.profileImage || null,
        profileCompleted: user.profileCompleted || false
      }
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout() {
    return { message: 'Logged out successfully' };
  }

  // Temporary admin endpoint for development - remove in production
  @Post('admin/update-password')
  @HttpCode(HttpStatus.OK)
  async adminUpdatePassword(@Body() body: { email: string; newPassword: string }) {
    try {
      if (!body.email || !body.newPassword) {
        throw new BadRequestException('Email and new password are required');
      }
      
      if (body.newPassword.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long');
      }

      const result = await this.authService.resetPassword(body.email, body.newPassword);
      return { 
        message: 'Password updated successfully',
        user: result.user
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Failed to update password');
    }
  }

  @Get('check-username')
  @HttpCode(HttpStatus.OK)
  async checkUsernameAvailability(@Query('username') username: string) {
    try {
      if (!username || username.trim().length < 3) {
        throw new BadRequestException('Username must be at least 3 characters long');
      }

      // Validate username format
      if (!/^[a-z0-9_]+$/.test(username.trim())) {
        throw new BadRequestException('Username can only contain lowercase letters, numbers, and underscores');
      }

      const available = await this.authService.checkUsernameAvailability(username.trim());
      return { 
        available,
        username: username.trim(),
        message: available ? 'Username is available' : 'Username is already taken'
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error checking username availability');
    }
  }

  @Post('firebase-login')
  @HttpCode(HttpStatus.OK)
  async firebaseLogin(@Body() firebaseAuthDto: {
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
  }) {
    try {
      // For development, skip Firebase token verification
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Processing Firebase auth request');
        
        // Check if user exists in MongoDB
        let user = await this.authService.findUserByFirebaseUID(firebaseAuthDto.authUser.uid);
        
        if (!user) {
          // For phone users with null email, check if this might be an existing user
          if (!firebaseAuthDto.authUser.email && firebaseAuthDto.authUser.phoneNumber) {
            // Check if a user with this phone number already exists
            const existingUser = await this.authService.findUserByPhoneNumber(firebaseAuthDto.authUser.phoneNumber);
            if (existingUser) {
              // User exists with this phone number - they should log in instead
              throw new BadRequestException('An account with this phone number already exists. Please log in instead.');
            }
          }
          
          // Create new user if doesn't exist
          user = await this.authService.createFirebaseUser({
            firebaseUID: firebaseAuthDto.authUser.uid,
            email: firebaseAuthDto.authUser.email,
            fullName: firebaseAuthDto.authUser.displayName || 'User',
            username: firebaseAuthDto.authUser.username,
            phoneNumber: firebaseAuthDto.authUser.phoneNumber,
            authMethod: firebaseAuthDto.authUser.authMethod || 'phone',
            emailVerified: firebaseAuthDto.authUser.emailVerified || false,
            roles: [UserRole.Member],
            profileImage: firebaseAuthDto.authUser.photoURL,
          });
        }

        // Generate JWT tokens for your system
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
            profileCompleted: user.profileCompleted,
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
      }
      
      // TODO: In production, implement proper Firebase token verification
      throw new UnauthorizedException('Firebase authentication not fully implemented for production');
    } catch (error: any) {
      console.error('Firebase login error:', error);
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Firebase authentication failed');
    }
  }

  @Post('set-web-password')
  @HttpCode(HttpStatus.OK)
  async setWebPassword(@Body() body: {
    email: string;
    firebaseIdToken: string;
    newPassword: string;
  }) {
    try {
      if (!body.email || !body.firebaseIdToken || !body.newPassword) {
        throw new BadRequestException('Email, Firebase token, and new password are required');
      }
      
      if (body.newPassword.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long');
      }

      // For development, skip Firebase token verification
      if (process.env.NODE_ENV === 'development') {
        const result = await this.authService.setWebPasswordForFirebaseUser(
          body.email,
          body.newPassword
        );
        
        return {
          message: 'Password set successfully. You can now login on web.',
          user: {
            id: result._id,
            email: result.email,
            username: result.username,
            canLoginOnWeb: true
          }
        };
      }
      
      // TODO: In production, verify Firebase token first
      throw new BadRequestException('Feature not available in production yet');
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Failed to set web password');
    }
  }

  @Post('generate-username')
  @HttpCode(HttpStatus.OK)
  async generateUsername(@Body() body: { fullName: string }) {
    try {
      if (!body.fullName || body.fullName.trim().length === 0) {
        throw new BadRequestException('Full name is required');
      }

      const username = await this.authService.generateUniqueUsername(body.fullName.trim());
      return { 
        username,
        message: 'Username generated successfully'
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error generating username');
    }
  }

  @Post('check-user-type')
  @HttpCode(HttpStatus.OK)
  async checkUserType(@Body() body: { email: string }) {
    try {
      if (!body.email) {
        throw new BadRequestException('Email is required');
      }

      const user = await this.authService.findUserByEmail(body.email);
      
      if (!user) {
        return {
          exists: false,
          message: 'No account found with this email'
        };
      }

      if (user.firebaseUID) {
        return {
          exists: true,
          authMethod: user.authMethod, // 'phone', 'email', 'google', 'apple'
          requiresConfirmation: true,
          message: `This account uses ${user.authMethod} authentication. We'll send you a confirmation link.`,
          phoneNumber: user.phoneNumber ? `****${user.phoneNumber.slice(-4)}` : null
        };
      }

      return {
        exists: true,
        authMethod: 'password',
        requiresConfirmation: false,
        message: 'Please enter your password'
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error checking user type');
    }
  }

  @Post('send-web-login-confirmation')
  @HttpCode(HttpStatus.OK)
  async sendWebLoginConfirmation(@Body() body: { email: string }) {
    try {
      if (!body.email) {
        throw new BadRequestException('Email is required');
      }

      const result = await this.authService.sendWebLoginConfirmation(body.email);
      
      return {
        message: result.method === 'email' 
          ? `Confirmation email sent to ${body.email}` 
          : `Confirmation code sent to ${result.phoneNumber}`,
        method: result.method,
        expiresIn: '10 minutes'
      };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Failed to send confirmation');
    }
  }

  @Post('confirm-web-login')
  @HttpCode(HttpStatus.OK)
  async confirmWebLogin(@Body() body: { 
    email: string; 
    confirmationCode: string;
    rememberMe?: boolean;
  }) {
    try {
      if (!body.email || !body.confirmationCode) {
        throw new BadRequestException('Email and confirmation code are required');
      }

      const result = await this.authService.confirmWebLogin(
        body.email, 
        body.confirmationCode,
        body.rememberMe
      );
      
      return {
        message: 'Login successful',
        user: {
          id: result.user._id,
          username: result.user.username,
          fullName: result.user.fullName,
          email: result.user.email,
          roles: result.user.roles,
          profileCompleted: result.user.profileCompleted,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Web login confirmation failed');
    }
  }

  // Development only endpoint - remove in production
  @Post('dev-reset-password')
  @HttpCode(HttpStatus.OK)
  async devResetPassword(@Body() body: { 
    email: string; 
    newPassword: string;
  }) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('This endpoint is not available in production');
    }

    try {
      if (!body.email || !body.newPassword) {
        throw new BadRequestException('Email and new password are required');
      }

      const result = await this.authService.resetPassword(body.email, body.newPassword);
      
      return {
        message: 'Password reset successful for development',
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
        }
      };
    } catch (error: any) {
      console.error('Dev password reset error:', error);
      throw new BadRequestException('Failed to reset password: ' + error.message);
    }
  }
} 