import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public route for public profile
router.get('/:userId', UserController.getPublicProfile.bind(UserController));

// Protected routes (require authentication)
router.use(authenticate);

router.get('/me', UserController.getProfile.bind(UserController));

// Profile update routes
router.put('/me', uploadMiddleware.single('file'), UserController.updateProfile.bind(UserController));
router.post('/me/avatar', uploadMiddleware.single('file'), UserController.uploadProfileImage.bind(UserController));

export default router; 