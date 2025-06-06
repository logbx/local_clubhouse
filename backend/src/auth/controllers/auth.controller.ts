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
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(error.message || 'Registration failed');
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto.identifier, loginDto.password);
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
} 