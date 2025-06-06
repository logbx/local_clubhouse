import { Request, Response } from 'express';
import { Event } from '../models/event.model';
import { Types } from 'mongoose';

interface AuthRequest extends Request {
  user: {
    _id: string | Types.ObjectId;
    id?: string;
    [key: string]: any;
  };
}

export class EventController {
  static async getEvents(_req: Request, res: Response) {
    try {
      const events = await Event.find({}).populate('organizerId', 'username email');
      
      // Transform events to match frontend interface
      const transformedEvents = events.map(event => ({
        _id: event._id,
        id: event._id,
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        cost: event.cost,
        isFree: event.isFree,
        status: event.status,
        visibility: event.visibility,
        recurrence: event.recurrence,
        tags: event.tags,
        imageUrl: event.imageUrl,
        creatorId: event.organizerId,
        creator: event.organizerId,
        attendees: event.rsvps.map(rsvp => ({
          _id: rsvp,
          username: 'User', // Would need to populate to get actual username
          email: 'user@example.com'
        })),
        attendeeCount: event.rsvps.length,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt
      }));
      
      return res.json({ data: transformedEvents });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch events' });
    }
  }

  static async getEvent(req: Request, res: Response) {
    try {
      const event = await Event.findById(req.params.id).populate('organizerId', 'username email');
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Transform event to match frontend interface
      const transformedEvent = {
        _id: event._id,
        id: event._id,
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        cost: event.cost,
        isFree: event.isFree,
        status: event.status,
        visibility: event.visibility,
        recurrence: event.recurrence,
        tags: event.tags,
        imageUrl: event.imageUrl,
        creatorId: event.organizerId,
        creator: event.organizerId,
        attendees: event.rsvps.map(rsvp => ({
          _id: rsvp,
          username: 'User',
          email: 'user@example.com'
        })),
        attendeeCount: event.rsvps.length,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt
      };
      
      return res.json({ data: transformedEvent });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch event' });
    }
  }

  static async createEvent(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const eventData = req.body;
      
      const event = new Event({
        ...eventData,
        organizerId: user._id,
        rsvps: []
      });
      
      await event.save();
      const populatedEvent = await Event.findById(event._id).populate('organizerId', 'username email');
      
      if (!populatedEvent) {
        return res.status(500).json({ error: 'Failed to create event' });
      }
      
      const transformedEvent = {
        _id: populatedEvent._id,
        id: populatedEvent._id,
        title: populatedEvent.title,
        description: populatedEvent.description,
        startTime: populatedEvent.startTime,
        endTime: populatedEvent.endTime,
        location: populatedEvent.location,
        cost: populatedEvent.cost,
        isFree: populatedEvent.isFree,
        status: populatedEvent.status,
        visibility: populatedEvent.visibility,
        recurrence: populatedEvent.recurrence,
        tags: populatedEvent.tags,
        imageUrl: populatedEvent.imageUrl,
        creatorId: populatedEvent.organizerId,
        creator: populatedEvent.organizerId,
        attendees: [],
        attendeeCount: 0,
        createdAt: populatedEvent.createdAt,
        updatedAt: populatedEvent.updatedAt
      };
      
      return res.status(201).json({ data: transformedEvent });
    } catch (error) {
      return res.status(400).json({ error: 'Failed to create event' });
    }
  }

  static async updateEvent(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      if (event.organizerId.toString() !== user._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      Object.assign(event, req.body);
      await event.save();
      
      const populatedEvent = await Event.findById(event._id).populate('organizerId', 'username email');
      
      if (!populatedEvent) {
        return res.status(500).json({ error: 'Failed to update event' });
      }
      
      const transformedEvent = {
        _id: populatedEvent._id,
        id: populatedEvent._id,
        title: populatedEvent.title,
        description: populatedEvent.description,
        startTime: populatedEvent.startTime,
        endTime: populatedEvent.endTime,
        location: populatedEvent.location,
        cost: populatedEvent.cost,
        isFree: populatedEvent.isFree,
        status: populatedEvent.status,
        visibility: populatedEvent.visibility,
        recurrence: populatedEvent.recurrence,
        tags: populatedEvent.tags,
        imageUrl: populatedEvent.imageUrl,
        creatorId: populatedEvent.organizerId,
        creator: populatedEvent.organizerId,
        attendees: populatedEvent.rsvps.map(rsvp => ({
          _id: rsvp,
          username: 'User',
          email: 'user@example.com'
        })),
        attendeeCount: populatedEvent.rsvps.length,
        createdAt: populatedEvent.createdAt,
        updatedAt: populatedEvent.updatedAt
      };
      
      return res.json({ data: transformedEvent });
    } catch (error) {
      return res.status(400).json({ error: 'Failed to update event' });
    }
  }

  static async deleteEvent(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      if (event.organizerId.toString() !== user._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      await Event.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Event deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete event' });
    }
  }

  static async publishEvent(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (event.organizerId.toString() !== user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to publish this event' });
      }
      const updatedEvent = await Event.findByIdAndUpdate(
        req.params.id,
        { status: 'LIVE' },
        { new: true }
      );
      return res.json({ data: updatedEvent });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to publish event' });
    }
  }

  static async rsvpEvent(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      const userId = user._id.toString();
      const isAlreadyRsvped = event.rsvps.some(rsvp => rsvp.toString() === userId);
      
      if (isAlreadyRsvped) {
        // Remove RSVP
        event.rsvps = event.rsvps.filter(rsvp => rsvp.toString() !== userId);
      } else {
        // Add RSVP
        event.rsvps.push(new Types.ObjectId(userId));
      }
      
      await event.save();
      return res.json({ data: event });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to RSVP to event' });
    }
  }
} 