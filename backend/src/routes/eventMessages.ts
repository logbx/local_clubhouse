import { Router, Request, Response } from 'express';
import { EventMessageModel } from '../models/eventMessage.model';
import { AuthenticatedRequest } from '../types/express';
import { validateObjectId } from '../middleware/validation.middleware';
import { UserRole } from '../users/schemas/user.schema';

const router = Router();

// Get messages for an event
router.get('/:eventId', validateObjectId('eventId'), async (req: Request, res: Response) => {
  try {
    const messages = await EventMessageModel.find({ eventId: req.params.eventId })
      .populate('userId', 'name profileImage')
      .sort({ createdAt: 1 })
      .exec();
    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create a new message
router.post('/:eventId', validateObjectId('eventId'), async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    if (!authenticatedReq.user?.sub) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const message = new EventMessageModel({
      eventId: req.params.eventId,
      userId: authenticatedReq.user.sub,
      content: req.body.content,
      type: req.body.type || 'text'
    });
    await message.save();
    const populated = await message.populate('userId', 'name profileImage');
    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create message' });
  }
});

// Delete a message
router.delete('/:messageId', validateObjectId('messageId'), async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    if (!authenticatedReq.user?.sub) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const message = await EventMessageModel.findById(req.params.messageId).exec();
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only allow message deletion by the creator or a creator role
    if (message.userId.toString() !== authenticatedReq.user.sub && !authenticatedReq.user.roles.includes(UserRole.Creator)) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    await EventMessageModel.findByIdAndDelete(req.params.messageId).exec();
    return res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router; 