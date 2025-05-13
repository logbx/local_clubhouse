import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public route for public profile
router.get('/:userId', UserController.getPublicProfile.bind(UserController));

// Protected routes
router.use(authenticate);

router.get('/me', UserController.getProfile.bind(UserController));

// Profile update route - no upload middleware needed since we're using S3
router.put('/me', UserController.updateProfile.bind(UserController));

// Profile image upload route - uses upload middleware
router.post('/me/avatar', uploadMiddleware, UserController.uploadProfileImage.bind(UserController));

export default router;