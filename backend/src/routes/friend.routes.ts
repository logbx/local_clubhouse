import { Router } from 'express';
import { FriendController } from '../controllers/friend.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All friend routes require authentication
router.use(authenticate);

// Friend request routes
router.post('/request', FriendController.sendFriendRequest);
router.post('/accept', FriendController.acceptFriendRequest);
router.post('/decline', FriendController.declineFriendRequest);

// Friend list routes
router.get('/list', FriendController.getFriendsList);
router.get('/requests', FriendController.getFriendRequests);

// Friend status route
router.get('/status/:userId', FriendController.getFriendStatus);

export default router; 