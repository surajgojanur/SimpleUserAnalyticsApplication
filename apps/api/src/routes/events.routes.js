import { Router } from 'express';
import { ingestEvent } from '../controllers/events.controller.js';
const router = Router();
router.post('/', ingestEvent);
export default router;
