import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { EventMessage } from '../models/eventMessage.model';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

interface AuthenticatedRequest {
  user: {
    sub: string;
    email: string;
    _id?: string;
    id?: string;
  };
}

interface PopulatedUser {
  _id: string;
  username: string;
  profileImage?: string;
}

interface PopulatedEventMessage {
  _id: string;
  eventId: string;
  userId?: PopulatedUser | string;
  content: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

@Controller('event-messages')
@UseGuards(JwtAuthGuard)
export class EventMessagesController {
  constructor(
    @InjectModel(EventMessage.name) private eventMessageModel: Model<EventMessage>,
    private readonly webSocketGateway: AppWebSocketGateway
  ) {}

  // Get messages for an event
  @Get(':eventId')
  @Public()
  async getEventMessages(@Param('eventId') eventId: string) {
    try {
      console.log('[DEBUG] Fetching messages for eventId:', eventId);
      
      if (!eventId || eventId === 'undefined') {
        console.log('[DEBUG] Invalid eventId provided:', eventId);
        return [];
      }
      
      const messages = await this.eventMessageModel
        .find({ eventId })
        .populate({
          path: 'userId',
          select: 'username profileImage'
        })
        .sort({ createdAt: 1 })
        .exec();
      
      console.log('[DEBUG] Found messages:', messages.length);
      
      // Transform the data to match frontend interface
      const transformedMessages = messages.map((message: any) => {
        const user = message.userId || {};
        return {
          _id: message._id,
          sender: {
            _id: user._id || 'unknown',
            username: user.username || 'Unknown User',
            profileImage: user.profileImage
          },
          content: message.content,
          timestamp: message.createdAt || message.updatedAt || new Date()
        };
      });
      
      console.log('[DEBUG] Transformed messages:', transformedMessages.length);
      return transformedMessages;
    } catch (error) {
      console.error('[DEBUG] Error fetching messages:', error);
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }
  }

  // Post a message to an event
  @Post(':eventId')
  async createEventMessage(
    @Param('eventId') eventId: string,
    @Body() messageData: { content: string; type?: string },
    @Request() req: AuthenticatedRequest
  ) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      const message = new this.eventMessageModel({
        eventId,
        userId,
        content: messageData.content,
        type: messageData.type || 'text',
      });
      await message.save();
      const populated = await message.populate({
        path: 'userId',
        select: 'username profileImage'
      }) as PopulatedEventMessage;
      
      const user = populated.userId ? (populated.userId as PopulatedUser) : null;
      
      // Transform the response to match frontend interface
      const messageResponse = {
        _id: populated._id,
        sender: {
          _id: user?._id || 'unknown',
          username: user?.username || 'Unknown User',
          profileImage: user?.profileImage
        },
        content: populated.content,
        timestamp: populated.createdAt || new Date()
      };

      // Broadcast real-time message to event participants (excluding the sender)
      this.webSocketGateway.broadcastNewEventMessage(eventId, messageResponse, userId);
      
      return messageResponse;
    } catch (error) {
      throw new Error('Failed to create message');
    }
  }

  // Delete a message (if user is the author)
  @Delete(':messageId')
  async deleteEventMessage(
    @Param('messageId') messageId: string,
    @Request() req: AuthenticatedRequest
  ) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      const message = await this.eventMessageModel.findById(messageId);
      
      if (!message) {
        throw new Error('Message not found');
      }
      
      if (!message.userId || message.userId.toString() !== userId?.toString()) {
        throw new Error('Not authorized to delete this message');
      }
      
      await this.eventMessageModel.findByIdAndDelete(messageId);
      return { message: 'Message deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete message');
    }
  }
} 