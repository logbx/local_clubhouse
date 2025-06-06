import { Controller, Get, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { IEvent } from '../models/event.model';
// For the Event model, we need to check if there's a NestJS event schema or use the Mongoose model

interface SearchResults {
  users: any[];
  events: any[];
}

@Controller('search')
export class SearchController {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel('Event') private eventModel: Model<IEvent>,
  ) {}

  @Get()
  async search(@Query('q') query: string): Promise<SearchResults> {
    if (!query || typeof query !== 'string') {
      throw new Error('Search query is required');
    }

    try {
      // Search users
      const userDocs = await this.userModel.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { interests: { $regex: query, $options: 'i' } }
        ]
      }).select('username email interests profileImage');

      // Search events
      const eventDocs = await this.eventModel.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $regex: query, $options: 'i' } }
        ]
      }).select('title description startDate endDate location tags');

      // Transform users to include id field
      const users = userDocs.map(user => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        interests: user.interests,
        profileImage: user.profileImage
      }));

      // Transform events to include id field  
      const events = eventDocs.map(event => ({
        id: event._id.toString(),
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        tags: event.tags
      }));

      return {
        users,
        events
      };
    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Internal server error');
    }
  }
} 