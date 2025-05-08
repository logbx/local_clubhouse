import express, { Request } from 'express';
import FriendGroup from '../models/friendGroup.model';
import FriendGroupMessage from '../models/friendGroupMessage.model';
import { authenticate } from '../middleware/auth.middleware';

interface AuthenticatedRequest extends Request {
  user?: any;
}

const router = express.Router();

// Create a friend group
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  const { name, members } = req.body;
  const group = new FriendGroup({
    name,
    members,
    createdBy: req.user._id,
  });
  await group.save();
  res.status(201).json(group);
});

// Add member to group
router.post('/:groupId/add-member', authenticate, async (req: AuthenticatedRequest, res) => {
  const { userId } = req.body;
  const group = await FriendGroup.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.members.includes(userId)) {
    group.members.push(userId);
    await group.save();
  }
  res.json(group);
});

// Remove member from group
router.post('/:groupId/remove-member', authenticate, async (req: AuthenticatedRequest, res) => {
  const { userId } = req.body;
  const group = await FriendGroup.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  group.members = group.members.filter((id: any) => id.toString() !== userId);
  await group.save();
  res.json(group);
});

// List user's friend groups
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  const groups = await FriendGroup.find({ members: req.user._id });
  res.json(groups);
});

// Get messages for a group
router.get('/:groupId/messages', authenticate, async (req: AuthenticatedRequest, res) => {
  const group = await FriendGroup.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.members.includes(req.user._id)) {
    return res.status(403).json({ error: 'Not a member of this group' });
  }
  const messages = await FriendGroupMessage.find({ groupId: req.params.groupId })
    .populate('sender', 'fullName profileImage')
    .sort({ timestamp: 1 });
  res.json(messages);
});

// Post a message to a group
router.post('/:groupId/messages', authenticate, async (req: AuthenticatedRequest, res) => {
  const { content } = req.body;
  const group = await FriendGroup.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.members.includes(req.user._id)) {
    return res.status(403).json({ error: 'Not a member of this group' });
  }
  const message = new FriendGroupMessage({
    groupId: req.params.groupId,
    sender: req.user._id,
    content,
  });
  await message.save();
  const populated = await message.populate('sender', 'fullName profileImage');
  res.status(201).json(populated);
});

export default router; 