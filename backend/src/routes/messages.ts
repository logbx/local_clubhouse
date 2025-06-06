import express, { Request } from 'express';
import Message from '../models/message.model';
import { authenticate } from '../middleware/auth.middleware';

interface AuthenticatedRequest extends Request {
  user?: any;
}

const router = express.Router();

// POST /api/messages - Send a message
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { receiver, content } = req.body;
    const sender = req.user._id;

    const message = new Message({ sender, receiver, content });
    await message.save();

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// GET /api/messages/:userId - Get conversation with another user
router.get('/:userId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.params.userId;
    const currentUserId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// GET /api/messages - Get all conversations for the current user
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserId = req.user._id;
    // Find all messages where the user is sender or receiver
    const messages = await Message.find({
      $or: [
        { sender: currentUserId },
        { receiver: currentUserId },
      ],
    }).sort({ timestamp: -1 });

    // Map to store the latest message per conversation (other user)
    const conversationsMap = new Map();
    for (const msg of messages) {
      // The other user in the conversation
      const otherUserId = msg.sender.equals(currentUserId) ? msg.receiver.toString() : msg.sender.toString();
      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, msg);
      }
    }

    // Fetch user info for each conversation
    const userIds = Array.from(conversationsMap.keys());
    const users = await (await import('../models/user.model')).User.find({ _id: { $in: userIds } });
    const usersMap = new Map(users.map(u => [u._id.toString(), u]));

    // Build response
    const conversations = userIds.map(userId => {
      const user = usersMap.get(userId);
      const lastMessage = conversationsMap.get(userId);
      return {
        userId,
        username: user?.username || 'Unknown',
        profileImage: user?.profileImage,
        lastMessage,
      };
    });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

export default router; 