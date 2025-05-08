import express, { Request } from 'express';
import EventSubGroup from '../models/eventSubGroup.model';
import EventSubGroupMessage from '../models/eventSubGroupMessage.model';
import { authenticate } from '../middleware/auth.middleware';

interface AuthenticatedRequest extends Request {
  user?: any;
}

const router = express.Router();

// Create a sub-group (organizer only)
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  const { eventId, name, members } = req.body;
  // TODO: Check if req.user is event organizer
  const subGroup = new EventSubGroup({
    eventId,
    name,
    members,
    createdBy: req.user._id,
  });
  await subGroup.save();
  res.status(201).json(subGroup);
});

// Add member to sub-group (organizer only)
router.post('/:subGroupId/add-member', authenticate, async (req: AuthenticatedRequest, res) => {
  const { userId } = req.body;
  const subGroup = await EventSubGroup.findById(req.params.subGroupId);
  // TODO: Check if req.user is event organizer
  if (!subGroup) return res.status(404).json({ error: 'Sub-group not found' });
  if (!subGroup.members.includes(userId)) {
    subGroup.members.push(userId);
    await subGroup.save();
  }
  res.json(subGroup);
});

// Remove member from sub-group (organizer only)
router.post('/:subGroupId/remove-member', authenticate, async (req: AuthenticatedRequest, res) => {
  const { userId } = req.body;
  const subGroup = await EventSubGroup.findById(req.params.subGroupId);
  // TODO: Check if req.user is event organizer
  if (!subGroup) return res.status(404).json({ error: 'Sub-group not found' });
  subGroup.members = subGroup.members.filter((id: any) => id.toString() !== userId);
  await subGroup.save();
  res.json(subGroup);
});

// List sub-groups for an event (participants)
router.get('/event/:eventId', authenticate, async (req: AuthenticatedRequest, res) => {
  const subGroups = await EventSubGroup.find({ eventId: req.params.eventId });
  res.json(subGroups);
});

// Get messages for a sub-group (members only)
router.get('/:subGroupId/messages', authenticate, async (req: AuthenticatedRequest, res) => {
  // TODO: Check if req.user is a member
  const messages = await EventSubGroupMessage.find({ subGroupId: req.params.subGroupId })
    .populate('sender', 'fullName profileImage')
    .sort({ timestamp: 1 });
  res.json(messages);
});

// Post a message to a sub-group (members only)
router.post('/:subGroupId/messages', authenticate, async (req: AuthenticatedRequest, res) => {
  // TODO: Check if req.user is a member
  const { content } = req.body;
  const message = new EventSubGroupMessage({
    subGroupId: req.params.subGroupId,
    sender: req.user._id,
    content,
  });
  await message.save();
  const populated = await message.populate('sender', 'fullName profileImage');
  res.status(201).json(populated);
});

export default router; 