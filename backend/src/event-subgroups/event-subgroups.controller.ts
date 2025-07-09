import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { IEvent } from '../models/event.model';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AuthenticatedRequest } from '../types/express';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

@Controller('event-subgroups')
@UseGuards(JwtAuthGuard)
export class EventSubGroupsController {
  constructor(
    @InjectModel('Event') private eventModel: Model<IEvent>,
    @InjectModel('EventSubGroup') private eventSubGroupModel: Model<any>,
    @InjectModel('EventSubGroupMessage') private eventSubGroupMessageModel: Model<any>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private webSocketGateway: AppWebSocketGateway,
  ) {}

  @Get('event/:eventId')
  async getEventSubGroups(@Param('eventId') eventId: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    
    try {
      const event = await this.eventModel.findById(eventId);
      if (!event) {
        return { success: false, message: 'Event not found' };
    }

      const subGroups = await this.eventSubGroupModel.find({ eventId }).populate('members', 'username profileImage').populate('createdBy', 'username profileImage');
      
      // Filter subgroups to only show ones the user is a member of
      const userSubGroups = subGroups.filter((sg: any) => sg.members.some((m: any) => m._id.toString() === userId));
      
      return { success: true, subGroups: userSubGroups };
    } catch (error) {
      console.error('Error getting event sub-groups:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  @Get(':subGroupId/messages')
  async getSubGroupMessages(@Param('subGroupId') subGroupId: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user.sub;
      
    try {
      const subGroup = await this.eventSubGroupModel.findById(subGroupId);
      if (!subGroup) {
        return { success: false, message: 'Sub-group not found' };
      }
      
      // Check if user is a member of the sub-group
      const isMember = (subGroup as any).members.some((m: any) => m.toString() === userId);
      if (!isMember) {
        return { success: false, message: 'Access denied: You are not a member of this sub-group' };
      }
      
      const messages = await this.eventSubGroupMessageModel.find({ subGroupId }).populate('senderId', 'username fullName profileImage').sort({ createdAt: 1 });
      
      return { success: true, messages };
    } catch (error) {
      console.error('Error getting sub-group messages:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  @Post(':subGroupId/messages')
  async sendSubGroupMessage(
    @Param('subGroupId') subGroupId: string,
    @Body() body: { content: string },
    @Request() req: AuthenticatedRequest
  ) {
    const userId = req.user.sub;
      
    try {
      const subGroup = await this.eventSubGroupModel.findById(subGroupId);
      if (!subGroup) {
        return { success: false, message: 'Sub-group not found' };
      }
      
      // Check if user is a member
      const isMember = (subGroup as any).members.some((m: any) => m.toString() === userId);
      if (!isMember) {
        return { success: false, message: 'Access denied: You are not a member of this sub-group' };
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      const message = new this.eventSubGroupMessageModel({
        subGroupId,
        senderId: userId,
        senderName: user.fullName || user.username,
        content: body.content,
        createdAt: new Date(),
      });

      await message.save();
      await message.populate('senderId', 'username fullName profileImage');
      
      // Emit to WebSocket
      this.webSocketGateway.server.to(`subgroup-${subGroupId}`).emit('newSubGroupMessage', message);

      return { success: true, message };
    } catch (error) {
      console.error('Error sending sub-group message:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  @Post('event/:eventId/create')
  async createEventSubGroup(
    @Param('eventId') eventId: string,
    @Body() body: { name: string; members: string[] }
  ) {
    try {
      const event = await this.eventModel.findById(eventId);
      if (!event) {
        return { success: false, message: 'Event not found' };
      }

      const subGroup = new this.eventSubGroupModel({
        eventId,
        name: body.name,
        members: body.members,
        createdBy: event.creator,
        createdAt: new Date(),
      });

      await subGroup.save();
      await subGroup.populate('members', 'username profileImage');
      await subGroup.populate('createdBy', 'username profileImage');

      return { success: true, subGroup };
    } catch (error) {
      console.error('Error creating event sub-group:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  @Delete(':subGroupId')
  async deleteEventSubGroup(@Param('subGroupId') subGroupId: string) {
    try {
      const deletedSubGroup = await this.eventSubGroupModel.findByIdAndDelete(subGroupId);
      if (!deletedSubGroup) {
        return { success: false, message: 'Sub-group not found' };
      }

      // Also delete all messages in this sub-group
      await this.eventSubGroupMessageModel.deleteMany({ subGroupId });
      
      return { success: true, message: 'Sub-group deleted successfully' };
    } catch (error) {
      console.error('Error deleting event sub-group:', error);
      return { success: false, message: 'Internal server error' };
    }
  }
} 