import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GroupMessage, GroupMessageDocument } from './schemas/group-message.schema';

@Injectable()
export class GroupMessagesService {
  constructor(
    @InjectModel(GroupMessage.name) private groupMessageModel: Model<GroupMessageDocument>,
  ) {}

  async getGroupMessages() {
    return await this.groupMessageModel
      .find()
      .populate('sender', 'username profileImage')
      .sort({ timestamp: 1 })
      .exec();
  }

  async sendGroupMessage(userId: string, content: string) {
    const message = new this.groupMessageModel({
      sender: userId,
      content,
    });
    await message.save();
    return await message.populate('sender', 'username profileImage');
  }
} 