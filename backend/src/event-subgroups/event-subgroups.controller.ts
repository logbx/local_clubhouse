import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

interface AuthenticatedRequest {
  user: {
    sub: string;
    email: string;
    _id?: string;
    id?: string;
  };
}

interface EventSubGroup {
  _id: string;
  eventId: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: Date;
}

interface EventSubGroupMessage {
  _id: string;
  subGroupId: string;
  sender: string;
  content: string;
  timestamp: Date;
}

interface PopulatedUser {
  _id: string;
  username: string;
  profileImage?: string;
}

interface PopulatedSubGroupMessage {
  _id: string;
  subGroupId: string;
  sender: PopulatedUser;
  content: string;
  timestamp: Date;
}

@Controller('event-subgroups')
@UseGuards(JwtAuthGuard)
export class EventSubGroupsController {
  constructor(
    @InjectModel('EventSubGroup') private eventSubGroupModel: Model<EventSubGroup>,
    @InjectModel('EventSubGroupMessage') private eventSubGroupMessageModel: Model<EventSubGroupMessage>,
    private readonly webSocketGateway: AppWebSocketGateway
  ) {}

  // Get sub-groups for an event (only show sub-groups user is a member of)
  @Get('event/:eventId')
  async getEventSubGroups(@Param('eventId') eventId: string, @Request() req: AuthenticatedRequest) {
    try {
      if (!eventId || eventId === 'undefined') {
        console.log('[DEBUG] Invalid eventId provided for subgroups:', eventId);
        return [];
      }

      const userId = req.user.sub || req.user._id || req.user.id;
      
      // Only return sub-groups where user is a member
      const subGroups = await this.eventSubGroupModel
        .find({ 
          eventId,
          members: userId  // User must be in the members array
        })
        .populate('members', 'username profileImage')
        .populate('createdBy', 'username')
        .exec();
      return subGroups;
    } catch (error) {
      throw new Error('Failed to fetch sub-groups');
    }
  }

  // Get all sub-groups the user is a member of (for messages page)
  @Get('user-subgroups')
  async getUserSubGroups(@Request() req: AuthenticatedRequest) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      
      const subGroups = await this.eventSubGroupModel
        .find({ 
          members: userId  // User must be in the members array
        })
        .populate('members', 'username profileImage')
        .populate('createdBy', 'username')
        .populate({
          path: 'eventId',
          select: 'title',
          model: 'Event'
        })
        .exec();
      
      return subGroups.map(subGroup => ({
        _id: subGroup._id,
        name: subGroup.name,
        eventId: subGroup.eventId,
        eventTitle: (subGroup.eventId as any)?.title || 'Unknown Event',
        members: subGroup.members,
        createdBy: subGroup.createdBy,
        createdAt: subGroup.createdAt
      }));
    } catch (error) {
      throw new Error('Failed to fetch user sub-groups');
    }
  }

  // Create a sub-group (organizer only)
  @Post()
  async createEventSubGroup(
    @Body() subGroupData: { eventId: string; name: string; members: string[] },
    @Request() req: AuthenticatedRequest
  ) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      
      // Always include the event creator as a member
      const membersIncludingCreator = [...new Set([userId, ...(subGroupData.members || [])])];
      
      const subGroup = new this.eventSubGroupModel({
        eventId: subGroupData.eventId,
        name: subGroupData.name,
        members: membersIncludingCreator,
        createdBy: userId,
      });
      await subGroup.save();
      return subGroup;
    } catch (error) {
      throw new Error('Failed to create sub-group');
    }
  }

  // Add member to sub-group (organizer only)
  @Post(':subGroupId/add-member')
  async addMemberToSubGroup(
    @Param('subGroupId') subGroupId: string,
    @Body() memberData: { userId: string },
    @Request() req: AuthenticatedRequest
  ) {
    try {
      const subGroup = await this.eventSubGroupModel.findById(subGroupId);
      if (!subGroup) {
        throw new Error('Sub-group not found');
      }
      
      if (!subGroup.members.includes(memberData.userId)) {
        subGroup.members.push(memberData.userId);
        await subGroup.save();
      }
      return subGroup;
    } catch (error) {
      throw new Error('Failed to add member to sub-group');
    }
  }

  // Remove member from sub-group (organizer only)
  @Post(':subGroupId/remove-member')
  async removeMemberFromSubGroup(
    @Param('subGroupId') subGroupId: string,
    @Body() memberData: { userId: string },
    @Request() req: AuthenticatedRequest
  ) {
    try {
      const subGroup = await this.eventSubGroupModel.findById(subGroupId);
      if (!subGroup) {
        throw new Error('Sub-group not found');
      }
      
      subGroup.members = subGroup.members.filter(id => id.toString() !== memberData.userId);
      await subGroup.save();
      return subGroup;
    } catch (error) {
      throw new Error('Failed to remove member from sub-group');
    }
  }

  // Delete a sub-group (organizer only)
  @Delete(':subGroupId')
  async deleteEventSubGroup(
    @Param('subGroupId') subGroupId: string,
    @Request() req: AuthenticatedRequest
  ) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      const subGroup = await this.eventSubGroupModel.findById(subGroupId);
      if (!subGroup) {
        throw new Error('Sub-group not found');
      }
      
      // TODO: Check if req.user is event organizer
      await this.eventSubGroupModel.findByIdAndDelete(subGroupId);
      return { message: 'Sub-group deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete sub-group');
    }
  }

  // Get messages for a sub-group (members only)
  @Get(':subGroupId/messages')
  async getSubGroupMessages(@Param('subGroupId') subGroupId: string, @Request() req: AuthenticatedRequest) {
    try {
      console.log('[DEBUG] getSubGroupMessages called with:', { subGroupId });
      
      if (!subGroupId || subGroupId === 'undefined') {
        throw new Error('Invalid subGroupId provided');
      }
      
      const userId = req.user.sub || req.user._id || req.user.id;
      console.log('[DEBUG] User ID:', userId);
      
      // Check if user is a member of the sub-group
      const subGroup = await this.eventSubGroupModel.findById(subGroupId);
      console.log('[DEBUG] Found sub-group:', subGroup ? 'Yes' : 'No');
      if (!subGroup) {
        throw new Error('Sub-group not found');
      }
      
      const isMember = subGroup.members.some(memberId => memberId.toString() === userId);
      console.log('[DEBUG] User is member:', isMember);
      if (!isMember) {
        throw new Error('Access denied: You are not a member of this sub-group');
      }
      
      console.log('[DEBUG] Fetching messages for subGroupId:', subGroupId);
      const messages = await this.eventSubGroupMessageModel
        .find({ subGroupId })
        .populate({
          path: 'sender',
          select: 'username profileImage'
        })
        .sort({ timestamp: 1 })
        .exec();
      console.log('[DEBUG] Found messages count:', messages.length);
      
      // Transform the data to match frontend interface
      const transformedMessages = messages.map((message: any) => ({
        _id: message._id,
        sender: {
          _id: message.sender._id,
          username: message.sender.username || 'Unknown User',
          profileImage: message.sender.profileImage
        },
        content: message.content,
        timestamp: message.timestamp
      }));
      
      return transformedMessages;
    } catch (error) {
      console.error('Error in getSubGroupMessages:', error);
      throw new Error(`Failed to fetch sub-group messages: ${error.message}`);
    }
  }

  // Post a message to a sub-group (members only)
  @Post(':subGroupId/messages')
  async createSubGroupMessage(
    @Param('subGroupId') subGroupId: string,
    @Body() messageData: { content: string },
    @Request() req: AuthenticatedRequest
  ) {
    try {
      console.log('[DEBUG] createSubGroupMessage called with:', { subGroupId, content: messageData.content });
      
      if (!subGroupId || subGroupId === 'undefined') {
        throw new Error('Invalid subGroupId provided');
      }
      
      const userId = req.user.sub || req.user._id || req.user.id;
      console.log('[DEBUG] User ID:', userId);
      
      // Check if user is a member of the sub-group
      const subGroup = await this.eventSubGroupModel.findById(subGroupId);
      console.log('[DEBUG] Found sub-group for message creation:', subGroup ? 'Yes' : 'No');
      if (!subGroup) {
        throw new Error('Sub-group not found');
      }
      
      const isMember = subGroup.members.some(memberId => memberId.toString() === userId);
      console.log('[DEBUG] User is member for message creation:', isMember);
      if (!isMember) {
        throw new Error('Access denied: You are not a member of this sub-group');
      }
      
      const message = new this.eventSubGroupMessageModel({
        subGroupId,
        sender: userId,
        content: messageData.content,
      });
      await message.save();
      const populated = await message.populate({
        path: 'sender',
        select: 'username profileImage'
      });
      
      // Transform the response to match frontend interface
      const messageResponse = {
        _id: populated._id,
        sender: {
          _id: (populated.sender as any)._id,
          username: (populated.sender as any).username || 'Unknown User',
          profileImage: (populated.sender as any).profileImage
        },
        content: populated.content,
        timestamp: populated.timestamp
      };

      // Broadcast real-time message to sub-group members (excluding the sender)
      this.webSocketGateway.broadcastNewSubgroupMessage(subGroupId, messageResponse, userId);
      
      return messageResponse;
    } catch (error) {
      console.error('Error in createSubGroupMessage:', error);
      throw new Error(`Failed to create sub-group message: ${error.message}`);
    }
  }
} 