import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventMessage } from '../models/eventMessage.model';

@Injectable()
export class EventMessageService {
  constructor(
    @InjectModel(EventMessage.name) private eventMessageModel: Model<EventMessage>
  ) {}

  async getMessagesByEventId(eventId: string) {
    return this.eventMessageModel
      .find({ eventId })
      .populate('userId', 'name profileImage')
      .sort({ createdAt: 1 })
      .exec();
  }

  async getMessageById(messageId: string) {
    return this.eventMessageModel.findById(messageId).exec();
  }

  async createMessage(data: {
    eventId: string;
    userId: string;
    content: string;
    type?: string;
  }) {
    const message = new this.eventMessageModel(data);
    await message.save();
    return message.populate('userId', 'name profileImage');
  }

  async deleteMessage(messageId: string) {
    return this.eventMessageModel.findByIdAndDelete(messageId).exec();
  }
} 