import express, { Request } from 'express';
import GroupMessage from '../models/groupMessage.model';
import { authenticate } from '../middleware/auth.middleware';

interface AuthenticatedRequest extends Request {
  user?: any;
}

const router = express.Router();

// GET all group messages
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  const messages = await GroupMessage.find()
    .populate('sender', 'fullName profileImage')
    .sort({ timestamp: 1 });
  res.json(messages);
});

// POST a new group message
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  const { content } = req.body;
  const message = new GroupMessage({
    sender: req.user._id,
    content,
  });
  await message.save();
  const populated = await message.populate('sender', 'fullName profileImage');
  res.status(201).json(populated);
});

export default router; 