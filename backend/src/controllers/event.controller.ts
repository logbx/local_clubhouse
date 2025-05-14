import { Request, Response } from 'express';
import { Event } from '../models/event.model';
import { Types } from 'mongoose';

interface AuthRequest extends Request {
  user: {
    _id: string | Types.ObjectId;
    id?: string;
    [key: string]: any;
  };
  file?: Express.Multer.File;
}

export class EventController {
  static async getEvents(_req: Request, res: Response) {
    try {
      const events = await Event.find().populate('organizerId', 'fullName email');
      return res.json({ data: events });
    } catch (error) {
      console.error('Failed to fetch events:', error);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }
  }

  static async getEvent(req: Request, res: Response) {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      return res.json({ data: event });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch event' });
    }
  }

  static async createEvent(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      console.log('Creating event with data:', req.body);
      console.log('User:', user);
      
      const { startDate, endDate, tags, ...rest } = req.body;
      
      // Handle tags
      let parsedTags = [];
      if (tags) {
        try {
          // If tags is a string, try to parse it
          if (typeof tags === 'string') {
            const parsed = JSON.parse(tags);
            parsedTags = Array.isArray(parsed) ? parsed : [parsed];
          }
          // If tags is already an array, use it as is
          else if (Array.isArray(tags)) {
            parsedTags = tags;
          }
        } catch (e) {
          // If parsing fails, treat it as a single tag
          parsedTags = [tags];
        }
      }
      
      const eventData = {
        ...rest,
        tags: parsedTags,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        organizerId: user._id,
        imageUrl: req.body.imageUrl,
      };
      
      console.log('Event data to save:', eventData);
      const event = await Event.create(eventData);
      console.log('Created event:', event);
      
      res.status(201).json({ data: event });
    } catch (error) {
      console.error('Failed to create event:', error);
      res.status(500).json({ error: 'Failed to create event', details: error.message });
    }
  }

  static async updateEvent(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const { id } = req.params;
      const updateData = { ...req.body };
      const userId = user?.id || user._id;

      // Remove fields that shouldn't be updated
      delete updateData.organizerId;
      delete updateData.rsvps;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      // Handle tags array
      if (updateData.tags) {
        try {
          // If tags is a string, try to parse it
          if (typeof updateData.tags === 'string') {
            const parsedTags = JSON.parse(updateData.tags);
            updateData.tags = Array.isArray(parsedTags) ? parsedTags : [parsedTags];
          }
          // If tags is already an array, use it as is
          else if (Array.isArray(updateData.tags)) {
            updateData.tags = updateData.tags;
          }
          // If neither, make it an empty array
          else {
            updateData.tags = [];
          }
        } catch (e) {
          // If parsing fails, treat it as a single tag
          updateData.tags = [updateData.tags];
        }
      }

      // Convert dates if present
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }

      if (updateData.imageUrl) {
        updateData.imageUrl = updateData.imageUrl;
      }

      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      if (event.organizerId.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to update this event' });
      }

      const updatedEvent = await Event.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      ).populate('organizerId', 'fullName email');

      return res.json(updatedEvent);
    } catch (error) {
      console.error('Error updating event:', error);
      return res.status(500).json({ message: 'Error updating event', details: error.message });
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
        return res.status(403).json({ error: 'Not authorized to delete this event' });
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
      if (event.rsvps.map((id: any) => id.toString()).includes(user._id.toString())) {
        return res.status(400).json({ error: 'Already RSVPed to this event' });
      }
      const updatedEvent = await Event.findByIdAndUpdate(
        req.params.id,
        { $push: { rsvps: user._id } },
        { new: true }
      );
      return res.json({ data: updatedEvent });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to RSVP to event' });
    }
  }
} 