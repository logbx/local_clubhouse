import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FriendGroup, FriendGroupDocument } from './schemas/friend-group.schema';
import { FriendGroupMessage, FriendGroupMessageDocument } from './schemas/friend-group-message.schema';

@Injectable()
export class FriendGroupsService {
  constructor(
    @InjectModel(FriendGroup.name) private friendGroupModel: Model<FriendGroupDocument>,
    @InjectModel(FriendGroupMessage.name) private friendGroupMessageModel: Model<FriendGroupMessageDocument>,
  ) {}

  async createGroup(name: string, members: string[], createdBy: string) {
    const group = new this.friendGroupModel({
      name,
      members: [...members, createdBy], // Include creator in members
      createdBy,
    });
    
    return await group.save();
  }

  async getUserGroups(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const groups = await this.friendGroupModel
      .find({ members: new Types.ObjectId(userId) })
      .populate('members', 'username email profileImage')
      .populate('createdBy', 'username email profileImage');
    
    return groups;
  }

  async addMemberToGroup(groupId: string, userId: string, requesterId: string) {
    if (!Types.ObjectId.isValid(groupId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid ID');
    }

    const group = await this.friendGroupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if requester is a member or creator
    const requesterObjectId = new Types.ObjectId(requesterId);
    if (!group.members.some(id => id.equals(requesterObjectId)) && !group.createdBy.equals(requesterObjectId)) {
      throw new ForbiddenException('Not authorized to add members to this group');
    }

    const userObjectId = new Types.ObjectId(userId);
    if (!group.members.some(id => id.equals(userObjectId))) {
      group.members.push(userObjectId);
      await group.save();
    }

    return await group.populate('members', 'username email profileImage');
  }

  async removeMemberFromGroup(groupId: string, userId: string, requesterId: string) {
    if (!Types.ObjectId.isValid(groupId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid ID');
    }

    const group = await this.friendGroupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const requesterObjectId = new Types.ObjectId(requesterId);
    const userObjectId = new Types.ObjectId(userId);

    // Check if requester is authorized (creator, the user themselves, or admin)
    if (!group.createdBy.equals(requesterObjectId) && requesterId !== userId) {
      throw new ForbiddenException('Not authorized to remove this member');
    }

    group.members = group.members.filter(id => !id.equals(userObjectId));
    await group.save();

    return await group.populate('members', 'username email profileImage');
  }

  async getGroupMessages(groupId: string, userId: string) {
    if (!Types.ObjectId.isValid(groupId)) {
      throw new BadRequestException('Invalid group ID');
    }

    const group = await this.friendGroupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    if (!group.members.some(id => id.equals(userObjectId))) {
      throw new ForbiddenException('Not a member of this group');
    }

    const messages = await this.friendGroupMessageModel
      .find({ groupId: new Types.ObjectId(groupId) })
      .populate('sender', 'username profileImage')
      .sort({ timestamp: 1 });

    return messages;
  }

  async postMessage(groupId: string, content: string, senderId: string) {
    if (!Types.ObjectId.isValid(groupId)) {
      throw new BadRequestException('Invalid group ID');
    }

    const group = await this.friendGroupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const senderObjectId = new Types.ObjectId(senderId);
    if (!group.members.some(id => id.equals(senderObjectId))) {
      throw new ForbiddenException('Not a member of this group');
    }

    const message = new this.friendGroupMessageModel({
      groupId: new Types.ObjectId(groupId),
      sender: senderObjectId,
      content,
    });

    await message.save();
    return await message.populate('sender', 'username profileImage');
  }
} 