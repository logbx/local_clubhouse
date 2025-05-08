import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Event routes
router.get('/', (req, res) => EventController.getEvents(req, res));
router.get('/:id', (req, res) => EventController.getEvent(req, res));
router.post('/', uploadMiddleware.single('image'), (req, res) => EventController.createEvent(req, res));
router.put('/:id', uploadMiddleware.single('image'), (req, res) => EventController.updateEvent(req, res));
router.delete('/:id', (req, res) => EventController.deleteEvent(req, res));
router.post('/:id/publish', (req, res) => EventController.publishEvent(req, res));
router.post('/:id/rsvp', (req, res) => EventController.rsvpEvent(req, res));

export default router; 