import { Router } from 'express';
import { search } from '../controllers/search.controller';

const router = Router();

// GET /api/search?q=yourquery
router.get('/', search);

export default router; 