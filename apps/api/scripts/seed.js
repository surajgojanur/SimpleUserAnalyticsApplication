import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import Site from '../src/models/Site.js';
import Event from '../src/models/Event.js';
const siteId = 'demo_store';
const origins = (process.env.DEMO_ORIGINS || 'http://localhost:5174').split(',').map((value) => value.trim()).filter(Boolean);
const rand = (min, max) => Math.round(min + Math.random() * (max - min));
try {
  if (!origins.length || origins.some((origin) => new URL(origin).origin !== origin)) throw new Error('DEMO_ORIGINS must contain origins without paths or trailing slashes');
  await connectDB(process.env.MONGODB_URI);
  await Site.findByIdAndUpdate(siteId, { name: 'Demo Store', allowed_origins: origins }, { upsert: true });
  if (process.argv.includes('--reset')) await Event.deleteMany({ site_id: siteId });
  const events = [];
  for (let session = 0; session < 30; session++) {
    const sessionId = randomUUID();
    const desktop = session % 3 !== 0;
    const width = desktop ? 1440 : 390;
    const height = desktop ? 2400 : 4200;
    let time = Date.now() - rand(1, 72) * 3600000;
    for (const path of ['/', '/products.html', '/cart.html'].slice(0, rand(1, 3))) {
      const event = (type, click) => ({ site_id: siteId, event_id: randomUUID(), session_id: sessionId,
        event_type: type, page_url: origins[0] + path, timestamp: new Date(time), ...(click && { click }) });
      events.push(event('page_view'));
      for (let index = 0; index < rand(2, 8); index++) {
        time += rand(2, 20) * 1000;
        const [x, y] = [[0.5, 0.12], [0.3, 0.4], [0.7, 0.62]][rand(0, 2)];
        const jitter = () => (Math.random() - 0.5) * 0.08;
        events.push(event('click', { x: Math.round(width * (x + jitter())), y: Math.round(height * (y + jitter())),
          viewport_width: width, viewport_height: desktop ? 900 : 844, document_width: width, document_height: height }));
      }
      time += 5000;
    }
  }
  await Event.insertMany(events);
  console.log(`Seeded 30 synthetic sessions / ${events.length} events for ${siteId}`);
} catch (error) { console.error('Seed failed:', error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
