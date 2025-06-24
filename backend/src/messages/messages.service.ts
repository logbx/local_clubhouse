import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getUserInfo(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }
    
    const user = await this.userModel.findById(userId).select('username profileImage fullName').exec();
    return user ? {
      _id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      profileImage: user.profileImage
    } : null;
  }

  async sendMessage(senderId: string, receiverId: string, content: string) {
    if (!Types.ObjectId.isValid(senderId) || !Types.ObjectId.isValid(receiverId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const message = new this.messageModel({
      sender: new Types.ObjectId(senderId),
      receiver: new Types.ObjectId(receiverId),
      content,
    });

    await message.save();
    
    // Return the message without population to keep sender/receiver as ObjectId strings
    return {
      _id: message._id.toString(),
      sender: message.sender.toString(),
      receiver: message.receiver.toString(),
      content: message.content,
      timestamp: message.timestamp,
      read: message.read
    };
  }

  async getConversation(currentUserId: string, otherUserId: string) {
    if (!Types.ObjectId.isValid(currentUserId) || !Types.ObjectId.isValid(otherUserId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const currentUserObjectId = new Types.ObjectId(currentUserId);
    const otherUserObjectId = new Types.ObjectId(otherUserId);

    const messages = await this.messageModel
      .find({
        $or: [
          { sender: currentUserObjectId, receiver: otherUserObjectId },
          { sender: otherUserObjectId, receiver: currentUserObjectId },
        ],
      })
      .populate([
        { path: 'sender', select: 'username profileImage' },
        { path: 'receiver', select: 'username profileImage' }
      ])
      .sort({ timestamp: 1 })
      .exec();

    // Mark messages as read where current user is receiver
    await this.messageModel.updateMany(
      { sender: otherUserObjectId, receiver: currentUserObjectId, read: false },
      { read: true }
    );

    // Return messages with populated user data
    return messages.map(msg => ({
      _id: msg._id.toString(),
      sender: {
        _id: (msg.sender as any)._id.toString(),
        username: (msg.sender as any).username || 'Unknown User',
        profileImage: (msg.sender as any).profileImage
      },
      receiver: {
        _id: (msg.receiver as any)._id.toString(),
        username: (msg.receiver as any).username || 'Unknown User',
        profileImage: (msg.receiver as any).profileImage
      },
      content: msg.content,
      timestamp: msg.timestamp,
      read: msg.read
    }));
  }

  async getConversations(currentUserId: string) {
    if (!Types.ObjectId.isValid(currentUserId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const currentUserObjectId = new Types.ObjectId(currentUserId);

    // Find all messages where the user is sender or receiver
    const messages = await this.messageModel
      .find({
        $or: [
          { sender: currentUserObjectId },
          { receiver: currentUserObjectId },
        ],
      })
      .populate([
        { path: 'sender', select: 'username profileImage' },
        { path: 'receiver', select: 'username profileImage' }
      ])
      .sort({ timestamp: -1 })
      .exec();

    // Map to store the latest message per conversation (other user)
    const conversationsMap = new Map();
    
    for (const msg of messages) {
      // The other user in the conversation
      const otherUserId = msg.sender._id.equals(currentUserObjectId) 
        ? msg.receiver._id.toString() 
        : msg.sender._id.toString();
      
      if (!conversationsMap.has(otherUserId)) {
        const otherUser = msg.sender._id.equals(currentUserObjectId) 
          ? msg.receiver 
          : msg.sender;
        
        conversationsMap.set(otherUserId, {
          userId: otherUserId,
          username: (otherUser as any).username || 'Unknown',
          profileImage: (otherUser as any).profileImage,
          lastMessage: msg,
        });
      }
    }

    return Array.from(conversationsMap.values());
  }

  async markAsRead(messageId: string, currentUserId: string) {
    if (!Types.ObjectId.isValid(messageId) || !Types.ObjectId.isValid(currentUserId)) {
      throw new BadRequestException('Invalid ID format');
    }

    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only the receiver can mark as read
    if (!message.receiver.equals(new Types.ObjectId(currentUserId))) {
      throw new BadRequestException('Cannot mark message as read - you are not the receiver');
    }

    message.read = true;
    return await message.save();
  }
} 