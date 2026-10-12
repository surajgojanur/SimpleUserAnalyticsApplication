import { Router } from 'express';
import * as controller from '../controllers/analytics.controller.js';
const router = Router();
router.get('/sites', controller.sites);
router.get('/sites/:siteId/sessions', controller.sessions);
router.get('/sites/:siteId/sessions/:sessionId/events', controller.sessionEvents);
router.get('/sites/:siteId/pages', controller.pages);
router.get('/sites/:siteId/heatmap', controller.heatmap);
export default router;
