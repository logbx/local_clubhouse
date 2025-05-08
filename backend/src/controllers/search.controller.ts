import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { Event } from '../models/event.model';

export const search = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search users
    const users = await User.find({
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { interests: { $regex: q, $options: 'i' } }
      ]
    }).select('fullName email interests profilePicture');

    // Search events
    const events = await Event.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ]
    }).select('title description startDate endDate location tags');

    res.json({
      users,
      events
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 