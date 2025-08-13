import { Controller, Get, Put, Delete, Body, Param, UseGuards, Request, Post, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    roles: string[];
  };
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getCurrentUserProfile(@Request() req: RequestWithUser): Promise<any> {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      return null;
    }
    
    // Return user's own profile with all allowed fields
    return {
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      bio: user.bio,
      interests: user.interests,
      profileImage: user.profileImage,
      roles: user.roles,
      phoneNumber: user.phoneNumber,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profileCompleted: user.profileCompleted,
      authMethod: user.authMethod,
    };
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

  @Get('check-username/:username')
  @HttpCode(HttpStatus.OK)
  async checkUsernameAvailability(@Param('username') username: string) {
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

  @Get('public/:id')
  async getPublicProfile(@Param('id') id: string): Promise<any> {
    const user = await this.usersService.findById(id);
    if (!user) {
      return null;
    }
    
    // Return only public fields, exclude sensitive information
    return {
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email, // Note: Consider if email should be public
      bio: user.bio,
      interests: user.interests,
      profileImage: user.profileImage,
      roles: user.roles,
      createdAt: user.createdAt,
      profileCompleted: user.profileCompleted,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUser(@Param('id') id: string): Promise<User | null> {
    return this.usersService.findById(id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateCurrentUserProfile(
    @Request() req: RequestWithUser,
    @Body() userData: Partial<User>,
  ): Promise<User | null> {
    return this.usersService.update(req.user.sub, userData);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('id') id: string,
    @Body() userData: Partial<User>,
  ): Promise<User | null> {
    return this.usersService.update(id, userData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Param('id') id: string): Promise<User | null> {
    return this.usersService.delete(id);
  }
} 