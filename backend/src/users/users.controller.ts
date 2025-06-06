import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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