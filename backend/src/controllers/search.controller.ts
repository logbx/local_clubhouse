import { Controller, Get, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { IEvent } from '../models/event.model';
import { Club, ClubDocument } from '../clubs/schemas/club.schema';
import { Sponsor, SponsorDocument } from '../sponsors/schemas/sponsor.schema';

interface SearchResults {
  users: any[];
  events: any[];
  clubs: any[];
  recommendations?: {
    events: any[];
    clubs: any[];
    sponsors: any[];
  };
}

@Controller('search')
export class SearchController {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel('Event') private eventModel: Model<IEvent>,
    @InjectModel(Club.name) private clubModel: Model<ClubDocument>,
    @InjectModel(Sponsor.name) private sponsorModel: Model<SponsorDocument>,
  ) {}

  @Get()
  async search(@Query('q') query: string): Promise<SearchResults> {
    if (!query || typeof query !== 'string') {
      return {
        users: [],
        events: [],
        clubs: []
      };
    }

    try {
      console.log('[SearchController] Starting search for query:', query);

      // Search users
      let userDocs = [];
      try {
        userDocs = await this.userModel.find({
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { interests: { $regex: query, $options: 'i' } }
          ]
        }).select('username email interests profileImage');
        console.log('[SearchController] Found users:', userDocs.length);
      } catch (userError) {
        console.error('[SearchController] Error searching users:', userError);
      }

      // Enhanced event search with sponsor and club associations
      let eventDocs = [];
      let recommendedEventDocs = [];
      try {
        // Direct event matches
        eventDocs = await this.eventModel.find({
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { tags: { $regex: query, $options: 'i' } },
            { location: { $regex: query, $options: 'i' } }
          ]
        }).populate('creator', 'username')
          .populate('clubId', 'name username')
          .select('title description startDate endDate location tags creator clubId sponsors features status');
        
        console.log('[SearchController] Found direct event matches:', eventDocs.length);

        // Search for events by club associations
        const relatedClubs = await this.clubModel.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { interests: { $regex: query, $options: 'i' } }
          ]
        }).select('_id');

        if (relatedClubs.length > 0) {
          const clubIds = relatedClubs.map(club => club._id);
          const clubEvents = await this.eventModel.find({
            clubId: { $in: clubIds },
            _id: { $nin: eventDocs.map(e => e._id) } // Exclude already found events
          }).populate('creator', 'username')
            .populate('clubId', 'name username')
            .select('title description startDate endDate location tags creator clubId sponsors features status')
            .limit(5);
          
          recommendedEventDocs.push(...clubEvents);
        }

        // Search for events by interest/keyword matching
        const interestBasedEvents = await this.eventModel.find({
          $and: [
            {
              $or: [
                { features: { $regex: query, $options: 'i' } },
                { 'tags': { $regex: query, $options: 'i' } }
              ]
            },
            { _id: { $nin: [...eventDocs.map(e => e._id), ...recommendedEventDocs.map(e => e._id)] } }
          ]
        }).populate('creator', 'username')
          .populate('clubId', 'name username')
          .select('title description startDate endDate location tags creator clubId sponsors features status')
          .limit(3);

        recommendedEventDocs.push(...interestBasedEvents);

        console.log('[SearchController] Found recommended events:', recommendedEventDocs.length);
      } catch (eventError) {
        console.error('[SearchController] Error searching events:', eventError);
      }

      // Enhanced club search
      let clubDocs = [];
      let recommendedClubDocs = [];
      try {
        clubDocs = await this.clubModel.find({
          $and: [
            { isActive: true },
            {
              $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { username: { $regex: query, $options: 'i' } },
                { interests: { $regex: query, $options: 'i' } },
                { location: { $regex: query, $options: 'i' } }
              ]
            }
          ]
        }).select('name description username members sponsors interests location');
        
        // Find clubs with similar interests for recommendations
        if (clubDocs.length > 0) {
          const interests = clubDocs.flatMap(club => club.interests || []);
          if (interests.length > 0) {
            recommendedClubDocs = await this.clubModel.find({
              $and: [
                { isActive: true },
                { interests: { $in: interests } },
                { _id: { $nin: clubDocs.map(c => c._id) } }
              ]
            }).select('name description username members sponsors interests location')
              .limit(3);
          }
        }
        
        console.log('[SearchController] Found clubs:', clubDocs.length);
        console.log('[SearchController] Found recommended clubs:', recommendedClubDocs.length);
      } catch (clubError) {
        console.error('[SearchController] Error searching clubs:', clubError);
      }

      // Search sponsors
      let sponsorDocs = [];
      try {
        sponsorDocs = await this.sponsorModel.find({
          $and: [
            { isActive: true },
            {
              $or: [
                { companyName: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { username: { $regex: query, $options: 'i' } },
                { industry: { $regex: query, $options: 'i' } },
                { location: { $regex: query, $options: 'i' } }
              ]
            }
          ]
        }).select('companyName description username industry location logoUrl website');
        console.log('[SearchController] Found sponsors:', sponsorDocs.length);
      } catch (sponsorError) {
        console.error('[SearchController] Error searching sponsors:', sponsorError);
      }

      // Transform users to include id field
      const users = userDocs.map(user => ({
        id: user._id?.toString() || user.id || '',
        username: user.username,
        email: user.email,
        interests: user.interests,
        profileImage: user.profileImage
      }));

      // Transform events to include id field and additional data
      const events = eventDocs.map(event => ({
        id: event._id?.toString() || event.id || '',
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        tags: event.tags,
        creator: event.creator,
        club: event.clubId,
        features: event.features,
        status: event.status,
        relevanceScore: this.calculateEventRelevance(event, query)
      }));

      // Transform clubs to include id field and additional data
      const clubs = clubDocs.map(club => ({
        id: club._id?.toString() || club.id || '',
        name: club.name,
        description: club.description,
        username: club.username,
        memberCount: club.members?.length || 0,
        sponsors: club.sponsors || [],
        interests: club.interests || [],
        location: club.location,
        relevanceScore: this.calculateClubRelevance(club, query)
      }));

      // Transform sponsors
      const sponsors = sponsorDocs.map(sponsor => ({
        id: sponsor._id?.toString() || sponsor.id || '',
        companyName: sponsor.companyName,
        description: sponsor.description,
        username: sponsor.username,
        industry: sponsor.industry,
        location: sponsor.location,
        logoUrl: sponsor.logoUrl,
        website: sponsor.website,
        relevanceScore: this.calculateSponsorRelevance(sponsor, query)
      }));

      // Transform recommended events
      const recommendedEvents = recommendedEventDocs.map(event => ({
        id: event._id?.toString() || event.id || '',
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        tags: event.tags,
        creator: event.creator,
        club: event.clubId,
        features: event.features,
        status: event.status,
        recommendationReason: this.getEventRecommendationReason(event, query)
      }));

      // Transform recommended clubs
      const recommendedClubs = recommendedClubDocs.map(club => ({
        id: club._id?.toString() || club.id || '',
        name: club.name,
        description: club.description,
        username: club.username,
        memberCount: club.members?.length || 0,
        sponsors: club.sponsors || [],
        interests: club.interests || [],
        location: club.location,
        recommendationReason: 'Similar interests'
      }));

      // Sort results by relevance score
      events.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      clubs.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      sponsors.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      return {
        users,
        events,
        clubs,
        sponsors,
        recommendations: {
          events: recommendedEvents,
          clubs: recommendedClubs,
          sponsors: sponsors.slice(0, 3) // Top 3 sponsors as recommendations
        }
      };
    } catch (error) {
      console.error('[SearchController] Search error:', error);
      // Return empty results instead of throwing to prevent 500 errors
      return {
        users: [],
        events: [],
        clubs: [],
        sponsors: [],
        recommendations: {
          events: [],
          clubs: [],
          sponsors: []
        }
      };
    }
  }

  private calculateEventRelevance(event: any, query: string): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    
    // Title match - highest weight
    if (event.title && event.title.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }
    
    // Tags match - high weight
    if (event.tags && event.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery))) {
      score += 8;
    }
    
    // Description match - medium weight
    if (event.description && event.description.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }
    
    // Location match - medium weight
    if (event.location && event.location.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }
    
    // Features match - lower weight
    if (event.features && event.features.some((feature: string) => feature.toLowerCase().includes(lowerQuery))) {
      score += 3;
    }
    
    return score;
  }

  private calculateClubRelevance(club: any, query: string): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    
    // Name match - highest weight
    if (club.name && club.name.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }
    
    // Username match - high weight
    if (club.username && club.username.toLowerCase().includes(lowerQuery)) {
      score += 8;
    }
    
    // Interests match - high weight
    if (club.interests && club.interests.some((interest: string) => interest.toLowerCase().includes(lowerQuery))) {
      score += 8;
    }
    
    // Description match - medium weight
    if (club.description && club.description.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }
    
    // Location match - medium weight
    if (club.location && club.location.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }
    
    return score;
  }

  private calculateSponsorRelevance(sponsor: any, query: string): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    
    // Company name match - highest weight
    if (sponsor.companyName && sponsor.companyName.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }
    
    // Industry match - high weight
    if (sponsor.industry && sponsor.industry.toLowerCase().includes(lowerQuery)) {
      score += 8;
    }
    
    // Username match - high weight
    if (sponsor.username && sponsor.username.toLowerCase().includes(lowerQuery)) {
      score += 8;
    }
    
    // Description match - medium weight
    if (sponsor.description && sponsor.description.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }
    
    // Location match - medium weight
    if (sponsor.location && sponsor.location.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }
    
    return score;
  }

  private getEventRecommendationReason(event: any, query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (event.club && event.club.name && event.club.name.toLowerCase().includes(lowerQuery)) {
      return `From ${event.club.name}`;
    }
    
    if (event.tags && event.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery))) {
      return 'Similar interests';
    }
    
    if (event.features && event.features.some((feature: string) => feature.toLowerCase().includes(lowerQuery))) {
      return 'Related features';
    }
    
    if (event.location && event.location.toLowerCase().includes(lowerQuery)) {
      return 'Same location';
    }
    
    return 'You might like this';
  }
} 