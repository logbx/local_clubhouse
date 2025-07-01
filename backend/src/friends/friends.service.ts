import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private async cleanupDataInconsistencies(senderId: string, receiverId: string) {
    console.log('Cleaning up data inconsistencies between users:', { senderId, receiverId });
    
    const [sender, receiver] = await Promise.all([
      this.userModel.findById(senderId),
      this.userModel.findById(receiverId)
    ]);

    if (!sender || !receiver) return;

    let senderUpdated = false;
    let receiverUpdated = false;

    // Check for orphaned sentRequests in sender
    if (sender.sentRequests?.some(id => id.toString() === receiver._id.toString())) {
      const receiverHasRequest = receiver.receivedRequests?.some(id => id.toString() === sender._id.toString());
      if (!receiverHasRequest) {
        console.log('Found orphaned sentRequest in sender - removing');
        sender.sentRequests = sender.sentRequests.filter(id => id.toString() !== receiver._id.toString());
        senderUpdated = true;
      }
    }

    // Check for orphaned receivedRequests in receiver
    if (receiver.receivedRequests?.some(id => id.toString() === sender._id.toString())) {
      const senderHasRequest = sender.sentRequests?.some(id => id.toString() === receiver._id.toString());
      if (!senderHasRequest) {
        console.log('Found orphaned receivedRequest in receiver - removing');
        receiver.receivedRequests = receiver.receivedRequests.filter(id => id.toString() !== sender._id.toString());
        receiverUpdated = true;
      }
    }

    // Save any updates
    const savePromises = [];
    if (senderUpdated) savePromises.push(sender.save());
    if (receiverUpdated) savePromises.push(receiver.save());
    
    if (savePromises.length > 0) {
      await Promise.all(savePromises);
      console.log('Data inconsistencies cleaned up');
    }
  }

  async sendFriendRequest(senderId: string, receiverId: string) {
    console.log('FriendsService: Starting sendFriendRequest', { senderId, receiverId });
    
    // Validate IDs
    if (!Types.ObjectId.isValid(senderId) || !Types.ObjectId.isValid(receiverId)) {
      throw new BadRequestException('Invalid user ID');
    }

    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Clean up any data inconsistencies first
    await this.cleanupDataInconsistencies(senderId, receiverId);

    // Re-fetch users after cleanup
    const [sender, receiver] = await Promise.all([
      this.userModel.findById(senderId),
      this.userModel.findById(receiverId)
    ]);

    if (!sender || !receiver) {
      throw new NotFoundException('User not found');
    }

    console.log('Sender sentRequests after cleanup:', sender.sentRequests?.map(id => id.toString()));
    console.log('Receiver receivedRequests after cleanup:', receiver.receivedRequests?.map(id => id.toString()));

    // Check if request already exists - using proper ObjectId comparison
    const requestAlreadySent = sender.sentRequests?.some(id => id.toString() === receiver._id.toString());
    const requestAlreadyReceived = receiver.receivedRequests?.some(id => id.toString() === sender._id.toString());
    
    console.log('Request already sent check:', requestAlreadySent);
    console.log('Request already received check:', requestAlreadyReceived);
    
    if (requestAlreadySent || requestAlreadyReceived) {
      console.log('Found existing request - throwing error');
      throw new BadRequestException('Friend request already sent');
    }

    // Check if they are already friends - using proper ObjectId comparison
    const alreadyFriends = sender.friends?.some(id => id.toString() === receiver._id.toString());
    console.log('Already friends check:', alreadyFriends);
    
    if (alreadyFriends) {
      throw new BadRequestException('Users are already friends');
    }

    // Add request to both users
    if (!sender.sentRequests) sender.sentRequests = [];
    if (!receiver.receivedRequests) receiver.receivedRequests = [];
    
    sender.sentRequests.push(new Types.ObjectId(receiver._id));
    receiver.receivedRequests.push(new Types.ObjectId(sender._id));

    console.log('Adding request - Sender will have:', [...(sender.sentRequests || []).map(id => id.toString()), receiver._id.toString()]);
    console.log('Adding request - Receiver will have:', [...(receiver.receivedRequests || []).map(id => id.toString()), sender._id.toString()]);

    // Save both users
    await Promise.all([sender.save(), receiver.save()]);
    
    console.log('Friend request saved successfully');
    return { message: 'Friend request sent successfully' };
  }

  async acceptFriendRequest(userId: string, requesterId: string) {
    console.log('FriendsService: Starting acceptFriendRequest', { userId, requesterId });
    
    // Validate IDs
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(requesterId)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Check if users exist
    const [user, requester] = await Promise.all([
      this.userModel.findById(userId),
      this.userModel.findById(requesterId)
    ]);

    if (!user || !requester) {
      throw new NotFoundException('User not found');
    }

    // Verify request exists in both directions
    const requestExistsInReceiver = user.receivedRequests?.some(id => id.equals(requester._id));
    const requestExistsInSender = requester.sentRequests?.some(id => id.equals(user._id));

    if (!requestExistsInReceiver || !requestExistsInSender) {
      throw new BadRequestException('Friend request not found');
    }

    // Check if they are already friends
    const alreadyFriends = user.friends?.some(id => id.equals(requester._id)) ||
                          requester.friends?.some(id => id.equals(user._id));

    if (alreadyFriends) {
      throw new BadRequestException('Users are already friends');
    }

    // Remove request from both users
    user.receivedRequests = user.receivedRequests?.filter(id => !id.equals(requester._id)) || [];
    requester.sentRequests = requester.sentRequests?.filter(id => !id.equals(user._id)) || [];

    // Add each user to the other's friends list
    if (!user.friends) user.friends = [];
    if (!requester.friends) requester.friends = [];
    
    user.friends.push(requester._id);
    requester.friends.push(user._id);

    // Save both users
    await Promise.all([user.save(), requester.save()]);
    
    return { message: 'Friend request accepted' };
  }

  async declineFriendRequest(userId: string, requesterId: string) {
    // Validate IDs
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(requesterId)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Check if users exist
    const [user, requester] = await Promise.all([
      this.userModel.findById(userId),
      this.userModel.findById(requesterId)
    ]);

    if (!user || !requester) {
      throw new NotFoundException('User not found');
    }

    // Remove request from both users
    user.receivedRequests = user.receivedRequests?.filter(id => !id.equals(requester._id)) || [];
    requester.sentRequests = requester.sentRequests?.filter(id => !id.equals(user._id)) || [];

    // Save both users
    await Promise.all([user.save(), requester.save()]);

    return { message: 'Friend request declined' };
  }

  async getFriendsList(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(userId).populate('friends', 'username email profileImage bio interests fullName');
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.friends || [];
  }

  async getFriendRequests(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(userId)
      .populate('receivedRequests', 'username email profileImage bio interests fullName')
      .populate('sentRequests', 'username email profileImage bio interests fullName');
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      received: user.receivedRequests || [],
      sent: user.sentRequests || []
    };
  }

  async getFriendStatus(currentUserId: string, targetUserId: string) {
    if (!Types.ObjectId.isValid(currentUserId) || !Types.ObjectId.isValid(targetUserId)) {
      throw new BadRequestException('Invalid user ID');
    }

    if (currentUserId === targetUserId) {
      return { status: 'self' };
    }

    const [currentUser, targetUser] = await Promise.all([
      this.userModel.findById(currentUserId),
      this.userModel.findById(targetUserId)
    ]);

    if (!currentUser || !targetUser) {
      throw new NotFoundException('User not found');
    }

    const targetUserObjectId = new Types.ObjectId(targetUserId);
    const currentUserObjectId = new Types.ObjectId(currentUserId);

    // Check if they are friends
    const areFriends = currentUser.friends?.some(id => (id as any).equals(targetUserObjectId)) &&
                      targetUser.friends?.some(id => (id as any).equals(currentUserObjectId));

    if (areFriends) {
      return { status: 'friends' };
    }

    // Check if current user sent a request to target user
    const requestSent = currentUser.sentRequests?.some(id => (id as any).equals(targetUserObjectId));
    if (requestSent) {
      return { status: 'pending_sent' };
    }

    // Check if target user sent a request to current user
    const requestReceived = currentUser.receivedRequests?.some(id => (id as any).equals(targetUserObjectId));
    if (requestReceived) {
      return { status: 'pending_received' };
    }

    return { status: 'none' };
  }
} 