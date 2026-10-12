import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import eventsRoutes from './routes/events.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
export function createApp({ ingestionLimit = 300 } = {}) {
  const app = express();
  app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use('/sdk', express.static(fileURLToPath(new URL('../public/', import.meta.url)), { maxAge: '5m' }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/events', cors({ origin: '*', methods: ['POST', 'OPTIONS'] }),
    rateLimit({ windowMs: 60000, limit: ingestionLimit, standardHeaders: 'draft-7', legacyHeaders: false,
      message: { error: 'Too many events; try again later' } }),
    express.text({ type: () => true, limit: '10kb' }), eventsRoutes);
  const origins = (process.env.DASHBOARD_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  app.use('/api', cors({ origin: origins }), analyticsRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
