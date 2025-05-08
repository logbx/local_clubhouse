import express from 'express';
import EventMessage from '../models/eventMessage.model';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// GET messages for an event
router.get('/:eventId', authenticate, async (req, res) => {
  const messages = await EventMessage.find({ eventId: req.params.eventId })
    .populate('sender', 'fullName profileImage')
    .sort({ timestamp: 1 });
  res.json(messages);
});

// POST a new message to an event
router.post('/', authenticate, async (req, res) => {
  const { eventId, content } = req.body;
  const message = new EventMessage({
    eventId,
    sender: req.user._id,
    content,
  });
  await message.save();
  const populated = await message.populate('sender', 'fullName profileImage');
  res.status(201).json(populated);
});

export default router; 