import { Controller, Get, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { IEvent } from '../models/event.model';
import { Club, ClubDocument } from '../clubs/schemas/club.schema';

interface SearchResults {
  users: any[];
  events: any[];
  clubs: any[];
}

@Controller('search')
export class SearchController {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel('Event') private eventModel: Model<IEvent>,
    @InjectModel(Club.name) private clubModel: Model<ClubDocument>,
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

      // Search clubs
      const clubDocs = await this.clubModel.find({
        $and: [
          { isActive: true },
          {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
              { username: { $regex: query, $options: 'i' } }
            ]
          }
        ]
      }).select('name description username members sponsors');

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

      // Transform clubs to include id field
      const clubs = clubDocs.map(club => ({
        id: club._id.toString(),
        name: club.name,
        description: club.description,
        username: club.username,
        memberCount: club.members.length,
        sponsors: club.sponsors || []
      }));

      return {
        users,
        events,
        clubs
      };
    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Internal server error');
    }
  }
} 