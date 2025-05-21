import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Protected routes - require authentication
router.use(authenticate);

// Specific routes first
router.get('/me', UserController.getProfile.bind(UserController));
router.put('/me', UserController.updateProfile.bind(UserController));

// Parameterized routes last
router.get('/:userId', UserController.getPublicProfile.bind(UserController));

export default router;