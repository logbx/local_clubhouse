import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Event routes
router.get('/', EventController.getEvents);
router.get('/:id', EventController.getEvent);
router.post('/', EventController.createEvent);
router.put('/:id', EventController.updateEvent);
router.delete('/:id', EventController.deleteEvent);
router.post('/:id/publish', EventController.publishEvent);
router.post('/:id/rsvp', (req, res) => EventController.rsvpEvent(req, res));

export default router; 