import { Request, Response } from 'express';
import { FriendService } from '../services/friend.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/user.model';
import mongoose from 'mongoose';

export class FriendController {
  static async sendFriendRequest(req: AuthRequest, res: Response) {
    try {
      const senderId = req.user?.id;
      const { receiverId } = req.body;

      if (!senderId || !receiverId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const result = await FriendService.sendFriendRequest(senderId, receiverId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async acceptFriendRequest(req: AuthRequest, res: Response) {
    console.log('acceptFriendRequest called', { body: req.body, user: req.user });
    try {
      const userId = req.user?.id;
      const { requesterId } = req.body;

      console.log('Accepting friend request:', {
        userId,
        requesterId,
        body: req.body
      });

      if (!userId || !requesterId) {
        console.error('Missing required fields:', { userId, requesterId });
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const result = await FriendService.acceptFriendRequest(userId, requesterId);
      console.log('Friend request accepted successfully:', result);
      res.json(result);
    } catch (error: any) {
      console.error('Error in acceptFriendRequest:', {
        message: error.message,
        stack: error.stack
      });
      res.status(400).json({ message: error.message });
    }
  }

  static async declineFriendRequest(req: AuthRequest, res: Response) {
    console.log('declineFriendRequest called', { body: req.body, user: req.user });
    try {
      const userId = req.user?.id;
      const { requesterId } = req.body;

      if (!userId || !requesterId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const result = await FriendService.declineFriendRequest(userId, requesterId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getFriendsList(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const friends = await FriendService.getFriendsList(userId);
      res.json({ friends });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getFriendRequests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const requests = await FriendService.getFriendRequests(userId);
      res.json(requests);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getFriendStatus(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const targetUserId = req.params.userId;

      if (!userId || !targetUserId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Get both users
      const [currentUser, targetUser] = await Promise.all([
        User.findById(userId),
        User.findById(targetUserId)
      ]);

      if (!currentUser || !targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const targetUserObjectId = targetUser._id;
      const currentUserObjectId = currentUser._id;

      // Check if they are friends (check both users' friends lists)
      const areFriends = currentUser.friends.some(id => id.equals(targetUserObjectId)) &&
                        targetUser.friends.some(id => id.equals(currentUserObjectId));
      
      if (areFriends) {
        return res.json({ status: 'friends' });
      }

      // Check if current user sent a request to target user
      const sentRequest = currentUser.sentRequests.some(id => id.equals(targetUserObjectId)) &&
                         targetUser.receivedRequests.some(id => id.equals(currentUserObjectId));
      
      if (sentRequest) {
        return res.json({ status: 'pending_sent' });
      }

      // Check if current user received a request from target user
      const receivedRequest = currentUser.receivedRequests.some(id => id.equals(targetUserObjectId)) &&
                            targetUser.sentRequests.some(id => id.equals(currentUserObjectId));
      
      if (receivedRequest) {
        return res.json({ status: 'pending_received' });
      }

      // No relationship
      return res.json({ status: 'none' });
    } catch (error: any) {
      console.error('Error in getFriendStatus:', error);
      res.status(400).json({ message: error.message });
    }
  }
} 