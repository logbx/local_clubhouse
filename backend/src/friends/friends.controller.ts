import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(
    private readonly friendsService: FriendsService,
    private readonly webSocketGateway: AppWebSocketGateway
  ) {}

  @Post('request')
  async sendFriendRequest(@Request() req: any, @Body() body: { receiverId: string }) {
    try {
      const senderId = req.user.sub; // JWT payload has user ID in 'sub' field
      const { receiverId } = body;

      console.log('Friend request attempt:', { senderId, receiverId });

      if (!receiverId) {
        throw new Error('Missing receiverId');
      }

      const result = await this.friendsService.sendFriendRequest(senderId, receiverId);
      console.log('Friend request success:', result);
      
      // Broadcast real-time friend request notification
      this.webSocketGateway.broadcastFriendRequest(receiverId, {
        type: 'friend_request',
        senderId,
        message: 'You have a new friend request'
      });
      
      return result;
    } catch (error) {
      console.error('Friend request error:', {
        message: error.message,
        stack: error.stack,
        name: error.constructor.name
      });
      
      // Re-throw the error so NestJS can handle it properly
      throw error;
    }
  }

  @Post('accept')
  async acceptFriendRequest(@Request() req: any, @Body() body: { requesterId: string }) {
    const userId = req.user.sub;
    const { requesterId } = body;

    if (!requesterId) {
      throw new Error('Missing requesterId');
    }

    const result = await this.friendsService.acceptFriendRequest(userId, requesterId);
    
    // Broadcast real-time friend request acceptance
    this.webSocketGateway.broadcastFriendRequestUpdate(requesterId, {
      type: 'friend_request_accepted',
      userId,
      message: 'Your friend request was accepted'
    });
    
    return result;
  }

  @Post('decline')
  async declineFriendRequest(@Request() req: any, @Body() body: { requesterId: string }) {
    const userId = req.user.sub;
    const { requesterId } = body;

    if (!requesterId) {
      throw new Error('Missing requesterId');
    }

    return await this.friendsService.declineFriendRequest(userId, requesterId);
  }

  @Get('list')
  async getFriendsList(@Request() req: any) {
    const userId = req.user.sub;
    const friends = await this.friendsService.getFriendsList(userId);
    return { friends };
  }

  @Get('requests')
  async getFriendRequests(@Request() req: any) {
    const userId = req.user.sub;
    return await this.friendsService.getFriendRequests(userId);
  }

  @Get('status/:userId')
  async getFriendStatus(@Request() req: any, @Param('userId') targetUserId: string) {
    const currentUserId = req.user.sub;
    return await this.friendsService.getFriendStatus(currentUserId, targetUserId);
  }

  @Get('debug/:userId')
  async debugFriendshipData(@Request() req: any, @Param('userId') targetUserId: string) {
    const currentUserId = req.user.sub;
    
    // This is a debug endpoint to help troubleshoot friendship data
    const [currentUser, targetUser] = await Promise.all([
      this.friendsService['userModel'].findById(currentUserId).select('sentRequests receivedRequests friends username'),
      this.friendsService['userModel'].findById(targetUserId).select('sentRequests receivedRequests friends username')
    ]);

    return {
      currentUser: {
        id: currentUser?._id,
        username: currentUser?.username,
        sentRequests: currentUser?.sentRequests?.map(id => id.toString()) || [],
        receivedRequests: currentUser?.receivedRequests?.map(id => id.toString()) || [],
        friends: currentUser?.friends?.map(id => id.toString()) || []
      },
      targetUser: {
        id: targetUser?._id,
        username: targetUser?.username,
        sentRequests: targetUser?.sentRequests?.map(id => id.toString()) || [],
        receivedRequests: targetUser?.receivedRequests?.map(id => id.toString()) || [],
        friends: targetUser?.friends?.map(id => id.toString()) || []
      }
    };
  }

  @Post('cleanup')
  async cleanupAllFriendshipData(@Request() req: any) {
    const userId = req.user.sub;
    
    // Get all users to check for inconsistencies
    const allUsers = await this.friendsService['userModel'].find({}).select('_id sentRequests receivedRequests friends');
    let cleanupCount = 0;

    for (const user of allUsers) {
      let userUpdated = false;

      // Clean up sentRequests
      if (user.sentRequests && user.sentRequests.length > 0) {
        const validSentRequests = [];
        for (const requestId of user.sentRequests) {
          const recipient = await this.friendsService['userModel'].findById(requestId);
          if (recipient && recipient.receivedRequests?.some(id => id.toString() === user._id.toString())) {
            validSentRequests.push(requestId);
          } else {
            console.log(`Removing orphaned sentRequest: ${user._id} -> ${requestId}`);
            userUpdated = true;
          }
        }
        if (userUpdated) {
          user.sentRequests = validSentRequests;
        }
      }

      // Clean up receivedRequests
      if (user.receivedRequests && user.receivedRequests.length > 0) {
        const validReceivedRequests = [];
        for (const requestId of user.receivedRequests) {
          const sender = await this.friendsService['userModel'].findById(requestId);
          if (sender && sender.sentRequests?.some(id => id.toString() === user._id.toString())) {
            validReceivedRequests.push(requestId);
          } else {
            console.log(`Removing orphaned receivedRequest: ${requestId} -> ${user._id}`);
            userUpdated = true;
          }
        }
        if (userUpdated || validReceivedRequests.length !== user.receivedRequests.length) {
          user.receivedRequests = validReceivedRequests;
          userUpdated = true;
        }
      }

      if (userUpdated) {
        await user.save();
        cleanupCount++;
      }
    }

    return { 
      message: `Cleanup completed. Fixed ${cleanupCount} users with data inconsistencies.`,
      cleanupCount 
    };
  }
} 