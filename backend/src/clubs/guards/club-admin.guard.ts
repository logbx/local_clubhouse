import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Club, ClubDocument } from '../schemas/club.schema';

@Injectable()
export class ClubAdminGuard implements CanActivate {
  constructor(
    @InjectModel(Club.name) private clubModel: Model<ClubDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const clubUsername = request.params.username || request.params.clubUsername;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!clubUsername) {
      throw new ForbiddenException('Club username required');
    }

    const club = await this.clubModel.findOne({ 
      username: clubUsername, 
      isActive: true 
    }).populate('createdBy', 'username email')
    .populate('club_founder', 'username email')
    .exec();

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Use user.sub instead of user.id for JWT tokens
    const userIdString = user.sub || user.id;
    const userId = new Types.ObjectId(userIdString);

    // Check if user is the creator or club founder
    if (club.createdBy?._id?.equals(userId) || club.club_founder?._id?.equals(userId)) {
      return true;
    }

    // Check if user is an admin member
    const adminMember = club.members.find(
      member => member.userId && member.userId.equals(userId) && member.role === 'admin'
    );

    if (adminMember) {
      return true;
    }

    throw new ForbiddenException('Admin access required');
  }
} 