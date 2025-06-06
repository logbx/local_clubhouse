import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// Event routes
router.get('/', EventController.getEvents.bind(EventController));
router.get('/:id', EventController.getEvent.bind(EventController));
router.post('/', EventController.createEvent.bind(EventController));
router.put('/:id', EventController.updateEvent.bind(EventController));
router.delete('/:id', EventController.deleteEvent.bind(EventController));
router.post('/:id/publish', EventController.publishEvent.bind(EventController));
router.post('/:id/rsvp', EventController.rsvpEvent.bind(EventController));

export default router; 