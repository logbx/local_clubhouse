import { Event, IEvent } from '../models/event.model';
import mongoose from 'mongoose';
import createError from 'http-errors';
import { EventStatus } from '../types/event';

class EventService {
  // Create a new event
  async createEvent(eventData: Partial<IEvent>, organizerId: string): Promise<IEvent> {
    try {
      const event = new Event({
        ...eventData,
        organizerId,
        status: 'DRAFT',
        rsvps: []
      });
      
      return await event.save();
    } catch (error) {
      throw createError(400, 'Failed to create event');
    }
  }

  // Get all events with filtering options
  async getEvents(filters: {
    status?: string;
    visibility?: string;
    organizerId?: string;
    tags?: string[];
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<IEvent[]> {
    try {
      const query: any = {};
      const now = new Date();

      if (filters.status) {
        // If specifically querying for drafts, don't auto-categorize as past
        if (filters.status === EventStatus.DRAFT) {
          query.status = EventStatus.DRAFT;
        } else {
          // For non-draft events, check if they're past
          query.$or = [
            {
              status: filters.status,
              endDate: { $gt: now }
            },
            {
              status: EventStatus.PAST
            }
          ];
        }
      } else {
        // If no status filter, still respect past events
        query.$or = [
          {
            status: { $ne: EventStatus.DRAFT },
            endDate: { $gt: now }
          },
          {
            status: EventStatus.PAST
          },
          {
            status: EventStatus.DRAFT
          }
        ];
      }

      if (filters.visibility) query.visibility = filters.visibility;
      if (filters.organizerId) query.organizerId = new mongoose.Types.ObjectId(filters.organizerId);
      if (filters.tags?.length) query.tags = { $in: filters.tags };
      if (filters.startDate || filters.endDate) {
        query.startDate = {};
        if (filters.startDate) query.startDate.$gte = filters.startDate;
        if (filters.endDate) query.startDate.$lte = filters.endDate;
      }

      // Update status of past events before returning
      await Event.updateMany(
        {
          status: { $ne: EventStatus.DRAFT },
          endDate: { $lt: now }
        },
        {
          $set: { status: EventStatus.PAST }
        }
      );

      return await Event.find(query)
        .populate('organizerId', 'fullName email')
        .sort({ startDate: 1 });
    } catch (error) {
      throw createError(400, 'Failed to fetch events');
    }
  }

  // Get a single event by ID
  async getEventById(eventId: string): Promise<IEvent> {
    try {
      const event = await Event.findById(eventId)
        .populate('organizerId', 'fullName email')
        .populate('rsvps', 'fullName email');

      if (!event) {
        throw createError(404, 'Event not found');
      }

      return event;
    } catch (error) {
      if (error.status === 404) throw error;
      throw createError(400, 'Failed to fetch event');
    }
  }

  // Update an event
  async updateEvent(eventId: string, updateData: Partial<IEvent>, organizerId: string): Promise<IEvent> {
    try {
      const event = await Event.findOne({ _id: eventId, organizerId });
      
      if (!event) {
        throw createError(404, 'Event not found or unauthorized');
      }

      // Prevent updating certain fields
      delete updateData.organizerId;
      delete updateData.rsvps;
      delete updateData.createdAt;

      Object.assign(event, updateData);
      return await event.save();
    } catch (error) {
      if (error.status === 404) throw error;
      throw createError(400, 'Failed to update event');
    }
  }

  // Delete an event
  async deleteEvent(eventId: string, organizerId: string): Promise<void> {
    try {
      const result = await Event.deleteOne({ _id: eventId, organizerId });
      
      if (result.deletedCount === 0) {
        throw createError(404, 'Event not found or unauthorized');
      }
    } catch (error) {
      if (error.status === 404) throw error;
      throw createError(400, 'Failed to delete event');
    }
  }

  // RSVP to an event
  async rsvpToEvent(eventId: string, userId: string): Promise<IEvent> {
    try {
      const event = await Event.findById(eventId);
      
      if (!event) {
        throw createError(404, 'Event not found');
      }

      if (event.status !== 'LIVE') {
        throw createError(400, 'Cannot RSVP to a non-live event');
      }

      if (event.rsvps.includes(new mongoose.Types.ObjectId(userId))) {
        throw createError(400, 'Already RSVP\'d to this event');
      }

      event.rsvps.push(new mongoose.Types.ObjectId(userId));
      return await event.save();
    } catch (error) {
      if (error.status) throw error;
      throw createError(400, 'Failed to RSVP to event');
    }
  }

  // Cancel RSVP to an event
  async cancelRsvp(eventId: string, userId: string): Promise<IEvent> {
    try {
      const event = await Event.findById(eventId);
      
      if (!event) {
        throw createError(404, 'Event not found');
      }

      const userIdObj = new mongoose.Types.ObjectId(userId);
      const index = event.rsvps.findIndex(id => id.equals(userIdObj));
      
      if (index === -1) {
        throw createError(400, 'No RSVP found for this event');
      }

      event.rsvps.splice(index, 1);
      return await event.save();
    } catch (error) {
      if (error.status) throw error;
      throw createError(400, 'Failed to cancel RSVP');
    }
  }

  // Get events for a specific user (either as organizer or participant)
  async getUserEvents(userId: string, type: 'organized' | 'rsvped'): Promise<IEvent[]> {
    try {
      const query = type === 'organized' 
        ? { organizerId: new mongoose.Types.ObjectId(userId) }
        : { rsvps: new mongoose.Types.ObjectId(userId) };

      return await Event.find(query)
        .populate('organizerId', 'fullName email')
        .sort({ startDate: 1 });
    } catch (error) {
      throw createError(400, 'Failed to fetch user events');
    }
  }
}

export const eventService = new EventService(); 