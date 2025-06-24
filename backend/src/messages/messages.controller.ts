import { Controller, Get, Post, Body, Param, UseGuards, Request, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

interface AuthenticatedRequest {
  user: {
    sub: string;
    email: string;
    _id?: string;
    id?: string;
  };
}

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly webSocketGateway: AppWebSocketGateway
  ) {}

  // POST /api/messages - Send a message
  @Post()
  async sendMessage(@Request() req: AuthenticatedRequest, @Body() body: { receiver: string; content: string }) {
    const senderId = req.user.sub || req.user._id || req.user.id;
    if (!senderId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    
    const { receiver, content } = body;
    
    try {
      const message = await this.messagesService.sendMessage(senderId, receiver, content);
      
      // Get the full sender information for the WebSocket broadcast
      const senderInfo = await this.messagesService.getUserInfo(senderId);
      const receiverInfo = await this.messagesService.getUserInfo(receiver);
      
      // Transform response to match frontend expectations with populated sender
      const messageResponse = {
        _id: message._id,
        sender: {
          _id: senderId,
          username: senderInfo?.username || 'Unknown User',
          fullName: senderInfo?.fullName || 'Unknown User',
          profileImage: senderInfo?.profileImage
        },
        receiver: {
          _id: receiver,
          username: receiverInfo?.username || 'Unknown User',
          fullName: receiverInfo?.fullName || 'Unknown User', 
          profileImage: receiverInfo?.profileImage
        },
        content: message.content,
        timestamp: message.timestamp,
        read: message.read
      };

      // Broadcast real-time message to both participants (excluding the sender)
      const conversationId = [senderId, receiver].sort().join('_');
      this.webSocketGateway.broadcastNewMessage(conversationId, messageResponse, senderId);
      
      return messageResponse;
    } catch (error) {
      throw new Error('Failed to send message');
    }
  }

  // GET /api/messages/:userId - Get conversation with another user
  @Get(':userId')
  async getConversation(@Request() req: AuthenticatedRequest, @Param('userId') otherUserId: string) {
    const currentUserId = req.user.sub || req.user._id || req.user.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    
    try {
      const messages = await this.messagesService.getConversation(currentUserId, otherUserId);
      
      // Transform messages to match frontend expectations
      return messages.map(message => ({
        _id: message._id,
        sender: message.sender,
        receiver: message.receiver,
        content: message.content,
        timestamp: message.timestamp,
        read: message.read
      }));
    } catch (error) {
      throw new Error('Failed to fetch conversation');
    }
  }

  // GET /api/messages - Get all conversations for the current user
  @Get()
  async getConversations(@Request() req: AuthenticatedRequest) {
    const currentUserId = req.user.sub || req.user._id || req.user.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    
    try {
      const conversations = await this.messagesService.getConversations(currentUserId);
      return conversations;
    } catch (error) {
      throw new Error('Failed to fetch conversations');
    }
  }

  // POST /api/messages/:messageId/read - Mark message as read
  @Post(':messageId/read')
  async markAsRead(@Request() req: AuthenticatedRequest, @Param('messageId') messageId: string) {
    const currentUserId = req.user.sub || req.user._id || req.user.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    
    try {
      const message = await this.messagesService.markAsRead(messageId, currentUserId);
      return {
        _id: message._id,
        read: message.read
      };
    } catch (error) {
      throw new Error('Failed to mark message as read');
    }
  }
} 