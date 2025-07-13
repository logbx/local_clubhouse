// Local Clubhouse specific business logic and features
import { Platform } from 'react-native';
import { localClubhouseAPI } from '../api-client-localclubhouse';
import type { Club, Event, User, Tournament } from '../../../shared/types';

// Distance calculation utility for local discovery
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Local discovery service
export class LocalDiscoveryService {
  private userLocation: { latitude: number; longitude: number } | null = null;

  setUserLocation(latitude: number, longitude: number) {
    this.userLocation = { latitude, longitude };
  }

  async discoverNearbyClubs(radius: number = 25): Promise<Club[]> {
    if (!this.userLocation) {
      throw new Error('User location not set');
    }

    const response = await localClubhouseAPI.getNearbyClubs(
      this.userLocation.latitude,
      this.userLocation.longitude,
      radius
    );

    return response.data || [];
  }

  async discoverNearbyEvents(radius: number = 25): Promise<Event[]> {
    if (!this.userLocation) {
      throw new Error('User location not set');
    }

    const response = await localClubhouseAPI.getNearbyEvents(
      this.userLocation.latitude,
      this.userLocation.longitude,
      radius
    );

    return response.data || [];
  }

  // Find clubs by category within a specific area
  async findClubsByCategory(category: string, radius: number = 25): Promise<Club[]> {
    const nearbyClubs = await this.discoverNearbyClubs(radius);
    return nearbyClubs.filter(club => club.category === category);
  }

  // Get recommended clubs based on user's interests and location
  async getRecommendedClubs(user: User, radius: number = 25): Promise<Club[]> {
    const nearbyClubs = await this.discoverNearbyClubs(radius);
    
    // Score clubs based on user interests
    const scoredClubs = nearbyClubs.map(club => {
      let score = 0;
      
      // Category match
      if (user.interests.includes(club.category)) {
        score += 3;
      }
      
      // Tag matches
      const tagMatches = club.tags.filter(tag => 
        user.interests.some(interest => 
          interest.toLowerCase().includes(tag.toLowerCase()) ||
          tag.toLowerCase().includes(interest.toLowerCase())
        )
      ).length;
      score += tagMatches;
      
      // Distance factor (closer is better)
      if (this.userLocation && club.location.coordinates) {
        const distance = calculateDistance(
          this.userLocation.latitude,
          this.userLocation.longitude,
          club.location.coordinates[1],
          club.location.coordinates[0]
        );
        score += Math.max(0, 10 - distance); // Bonus for closer clubs
      }
      
      // Member count factor (popular clubs get slight boost)
      score += Math.min(2, club.memberCount / 50);
      
      return { ...club, score };
    });

    // Sort by score and return top recommendations
    return scoredClubs
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ score, ...club }) => club);
  }

  // Find events happening this week in the area
  async getThisWeeksEvents(radius: number = 25): Promise<Event[]> {
    const nearbyEvents = await this.discoverNearbyEvents(radius);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return nearbyEvents.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate >= now && eventDate <= weekFromNow;
    });
  }
}

// Community engagement features
export class CommunityEngagementService {
  // Calculate user's community engagement score
  calculateEngagementScore(user: User, activities: {
    clubsJoined: number;
    eventsAttended: number;
    tournamentsPlayed: number;
    messagesPosted: number;
    eventsCreated: number;
  }): number {
    let score = 0;
    
    // Base points for joining clubs
    score += activities.clubsJoined * 10;
    
    // Points for event participation
    score += activities.eventsAttended * 5;
    
    // Points for tournament participation
    score += activities.tournamentsPlayed * 8;
    
    // Points for community interaction
    score += Math.min(activities.messagesPosted, 100) * 0.5; // Cap message points
    
    // Bonus for organizing events
    score += activities.eventsCreated * 15;
    
    return Math.round(score);
  }

  // Get achievement badges based on activities
  getAchievementBadges(activities: {
    clubsJoined: number;
    eventsAttended: number;
    tournamentsPlayed: number;
    tournamentsWon: number;
    eventsCreated: number;
    daysActive: number;
  }): Array<{ name: string; description: string; icon: string; earned: boolean }> {
    return [
      {
        name: 'Social Butterfly',
        description: 'Join 5 different clubs',
        icon: '🦋',
        earned: activities.clubsJoined >= 5,
      },
      {
        name: 'Event Enthusiast',
        description: 'Attend 10 events',
        icon: '🎉',
        earned: activities.eventsAttended >= 10,
      },
      {
        name: 'Tournament Fighter',
        description: 'Participate in 5 tournaments',
        icon: '⚔️',
        earned: activities.tournamentsPlayed >= 5,
      },
      {
        name: 'Champion',
        description: 'Win a tournament',
        icon: '🏆',
        earned: activities.tournamentsWon >= 1,
      },
      {
        name: 'Event Organizer',
        description: 'Create 3 events',
        icon: '📅',
        earned: activities.eventsCreated >= 3,
      },
      {
        name: 'Community Regular',
        description: 'Be active for 30 days',
        icon: '📱',
        earned: activities.daysActive >= 30,
      },
      {
        name: 'Local Legend',
        description: 'Join 10 clubs and attend 25 events',
        icon: '⭐',
        earned: activities.clubsJoined >= 10 && activities.eventsAttended >= 25,
      },
    ];
  }

  // Generate personalized recommendations
  async getPersonalizedRecommendations(user: User): Promise<{
    clubs: Club[];
    events: Event[];
    tournaments: Tournament[];
  }> {
    const discoveryService = new LocalDiscoveryService();
    
    const [clubs, events] = await Promise.all([
      discoveryService.getRecommendedClubs(user),
      discoveryService.getThisWeeksEvents(),
    ]);

    // Filter events by user interests
    const relevantEvents = events.filter(event =>
      user.interests.some(interest =>
        event.category.includes(interest.toLowerCase()) ||
        event.tags.some(tag => tag.toLowerCase().includes(interest.toLowerCase()))
      )
    );

    // Get tournaments from preferred clubs
    const preferredClubIds = clubs.slice(0, 5).map(club => club.id);
    const tournaments = await localClubhouseAPI.getTournaments({
      limit: 10,
      // Add filter for preferred clubs when API supports it
    });

    return {
      clubs: clubs.slice(0, 5),
      events: relevantEvents.slice(0, 5),
      tournaments: tournaments.data?.slice(0, 5) || [],
    };
  }
}

// Local networking features
export class LocalNetworkingService {
  // Find users with similar interests in nearby clubs
  async findSimilarUsers(user: User): Promise<User[]> {
    // This would need backend support to find users by interests
    // For now, return empty array as placeholder
    return [];
  }

  // Suggest clubs based on friends' memberships
  async getClubSuggestionsByFriends(userId: string): Promise<Club[]> {
    // This would need backend support for friend relationships
    // For now, return empty array as placeholder
    return [];
  }

  // Create a local meetup event
  async createLocalMeetup(meetupData: {
    title: string;
    description: string;
    location: { latitude: number; longitude: number; address: string };
    dateTime: string;
    maxAttendees?: number;
    interests: string[];
  }): Promise<Event> {
    const eventData = {
      title: meetupData.title,
      description: meetupData.description,
      category: 'social' as const,
      type: 'one_time' as const,
      startDate: meetupData.dateTime,
      endDate: new Date(new Date(meetupData.dateTime).getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours default
      location: {
        type: 'physical' as const,
        address: meetupData.location.address,
        city: '', // Would be geocoded from address
        state: '',
        country: '',
        coordinates: [meetupData.location.longitude, meetupData.location.latitude] as [number, number],
      },
      maxAttendees: meetupData.maxAttendees,
      isPrivate: false,
      requiresApproval: false,
      tags: meetupData.interests,
    };

    return await localClubhouseAPI.createEvent(eventData);
  }
}

// Safety and moderation features
export class SafetyService {
  // Report inappropriate content
  async reportContent(
    type: 'club' | 'event' | 'user' | 'message',
    id: string,
    reason: string,
    description?: string
  ): Promise<void> {
    await localClubhouseAPI.reportContent(type, id, reason);
    
    // Log safety event for monitoring
    console.log(`Safety report submitted: ${type} ${id} - ${reason}`);
  }

  // Block a user (local-only, would need backend support)
  async blockUser(userId: string): Promise<void> {
    // Store blocked users locally for now
    // In production, this would sync with backend
    // Implementation would depend on storage strategy
  }

  // Verify if a location is safe for meetups
  async verifyLocationSafety(coordinates: [number, number]): Promise<{
    isSafe: boolean;
    warnings: string[];
    recommendations: string[];
  }> {
    // This would integrate with safety APIs or databases
    // For now, return basic safety check
    return {
      isSafe: true,
      warnings: [],
      recommendations: [
        'Meet in well-lit, public areas',
        'Share your location with trusted contacts',
        'Consider meeting during daylight hours',
      ],
    };
  }
}

// Notification preferences for local features
export class LocalNotificationService {
  private preferences = {
    nearbyEvents: true,
    clubUpdates: true,
    tournamentReminders: true,
    newMembersInClubs: false,
    weatherAlerts: true,
    safetyAlerts: true,
  };

  async updatePreferences(newPreferences: Partial<typeof this.preferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...newPreferences };
    // Store in AsyncStorage and sync with backend
  }

  getPreferences() {
    return this.preferences;
  }

  // Check if user should be notified about nearby events
  shouldNotifyAboutNearbyEvents(): boolean {
    return this.preferences.nearbyEvents;
  }

  // Generate location-based notification content
  generateLocationNotification(type: 'event' | 'club' | 'tournament', item: any): {
    title: string;
    body: string;
    data: any;
  } {
    switch (type) {
      case 'event':
        return {
          title: 'New Event Nearby!',
          body: `${item.title} is happening near you`,
          data: { type: 'event', id: item.id },
        };
      case 'club':
        return {
          title: 'New Club in Your Area',
          body: `${item.name} just joined Local Clubhouse`,
          data: { type: 'club', id: item.id },
        };
      case 'tournament':
        return {
          title: 'Tournament Starting Soon',
          body: `${item.name} tournament begins in your area`,
          data: { type: 'tournament', id: item.id },
        };
      default:
        return {
          title: 'Local Clubhouse Update',
          body: 'Something new is happening in your area',
          data: {},
        };
    }
  }
}

// Export service instances
export const localDiscovery = new LocalDiscoveryService();
export const communityEngagement = new CommunityEngagementService();
export const localNetworking = new LocalNetworkingService();
export const safetyService = new SafetyService();
export const localNotifications = new LocalNotificationService();

// Utility functions
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 5280)} ft`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)} mi`;
  } else {
    return `${Math.round(distance)} mi`;
  }
}

export function getLocationString(location: { city?: string; state?: string; country?: string }): string {
  const parts = [location.city, location.state].filter(Boolean);
  return parts.join(', ') || location.country || 'Unknown Location';
}

export function isEventHappeningSoon(eventDate: string, hoursThreshold: number = 24): boolean {
  const now = new Date();
  const event = new Date(eventDate);
  const diffHours = (event.getTime() - now.getTime()) / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= hoursThreshold;
}

export function getEventTimeStatus(startDate: string, endDate: string): 'upcoming' | 'happening' | 'past' {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'happening';
  return 'past';
}