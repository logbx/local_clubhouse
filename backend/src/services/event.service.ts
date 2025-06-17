import { Event, IEvent } from '../models/event.model';
import mongoose from 'mongoose';
import createError from 'http-errors';

class EventService {
  // Create a new event
  async createEvent(eventData: Partial<IEvent>, organizerId: string): Promise<IEvent> {
    try {
      const event = new Event({
        ...eventData,
        creator: organizerId,
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
    startTime?: Date;
    endTime?: Date;
  } = {}): Promise<IEvent[]> {
    try {
      const query: any = {};
      const now = new Date();

      if (filters.status) {
        // If specifically querying for drafts, don't auto-categorize as past
        if (filters.status === 'DRAFT') {
          query.status = 'DRAFT';
        } else {
          // For non-draft events, check if they're past
                  query.$or = [
          {
            status: filters.status,
            endDate: { $gt: now }
          },
          {
            status: 'PAST'
          }
        ];
        }
      } else {
        // If no status filter, still respect past events
        query.$or = [
          {
            status: { $ne: 'DRAFT' },
            endDate: { $gt: now }
          },
          {
            status: 'PAST'
          },
          {
            status: 'DRAFT'
          }
        ];
      }

      if (filters.visibility) query.visibility = filters.visibility;
      if (filters.organizerId) query.creator = new mongoose.Types.ObjectId(filters.organizerId);
      if (filters.tags?.length) query.tags = { $in: filters.tags };
      if (filters.startTime || filters.endTime) {
        query.startTime = {};
        if (filters.startTime) query.startTime.$gte = filters.startTime;
        if (filters.endTime) query.startTime.$lte = filters.endTime;
      }

      // Update status of past events before returning
      await Event.updateMany(
        {
          status: { $ne: 'DRAFT' },
          endDate: { $lt: now }
        },
        {
          $set: { status: 'PAST' }
        }
      );

      return await Event.find(query)
        .populate('creator', 'username email')
        .sort({ startDate: 1 });
    } catch (error) {
      throw createError(400, 'Failed to fetch events');
    }
  }

  // Get a single event by ID
  async getEventById(eventId: string): Promise<IEvent> {
    try {
      const event = await Event.findById(eventId).populate('creator', 'username email');

      if (!event) {
        throw createError(404, 'Event not found');
      }

      // Update status if event is past
      const now = new Date();
      if (event.status !== 'DRAFT' && event.endDate < now && event.status !== 'PAST') {
        event.status = 'PAST';
        await event.save();
      }

      return event;
    } catch (error) {
      if (error.status) throw error;
      throw createError(400, 'Failed to fetch event');
    }
  }

  // Update an existing event
  async updateEvent(eventId: string, updateData: Partial<IEvent>, organizerId: string): Promise<IEvent> {
    try {
      const event = await Event.findById(eventId);

      if (!event) {
        throw createError(404, 'Event not found');
      }

      if (event.creator.toString() !== organizerId) {
        throw createError(403, 'Not authorized to update this event');
      }

      // Update the event
      Object.assign(event, updateData);
      await event.save();

      // Return populated event
      return await Event.findById(eventId).populate('creator', 'username email') as IEvent;
    } catch (error) {
      if (error.status) throw error;
      throw createError(400, 'Failed to update event');
    }
  }

  // Delete an event
  async deleteEvent(eventId: string, organizerId: string): Promise<void> {
    try {
      const event = await Event.findById(eventId);

      if (!event) {
        throw createError(404, 'Event not found');
      }

      if (event.creator.toString() !== organizerId) {
        throw createError(403, 'Not authorized to delete this event');
      }

      await Event.findByIdAndDelete(eventId);
    } catch (error) {
      if (error.status) throw error;
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

      const userObjectId = new mongoose.Types.ObjectId(userId);

      if (event.rsvps.includes(userObjectId)) {
        throw createError(400, 'Already RSVP\'d to this event');
      }

      event.rsvps.push(userObjectId);
      await event.save();

      return await Event.findById(eventId).populate('creator', 'username email') as IEvent;
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

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const rsvpIndex = event.rsvps.findIndex(rsvp => rsvp.toString() === userId);

      if (rsvpIndex === -1) {
        throw createError(400, 'Not RSVP\'d to this event');
      }

      event.rsvps.splice(rsvpIndex, 1);
      await event.save();

      return await Event.findById(eventId).populate('creator', 'username email') as IEvent;
    } catch (error) {
      if (error.status) throw error;
      throw createError(400, 'Failed to cancel RSVP');
    }
  }

  // Get user events (organized or RSVP'd)
  async getUserEvents(userId: string, type: 'organized' | 'rsvped'): Promise<IEvent[]> {
    try {
      const query = type === 'organized' 
        ? { creator: new mongoose.Types.ObjectId(userId) }
        : { rsvps: new mongoose.Types.ObjectId(userId) };

      return await Event.find(query)
        .populate('creator', 'username email')
        .sort({ startDate: 1 });
    } catch (error) {
      throw createError(400, 'Failed to fetch user events');
    }
  }
}

export default new EventService(); 