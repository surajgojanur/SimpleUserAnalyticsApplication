import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import Site from '../src/models/Site.js';
import Event from '../src/models/Event.js';
import { demoSeed } from './demo-seed.js';
const siteId = 'demo_store';
const origins = (process.env.DEMO_ORIGINS || 'http://localhost:5174')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
try {
  if (
    !origins.length ||
    origins.some(
      (origin) =>
        !['http:', 'https:'].includes(new URL(origin).protocol) ||
        new URL(origin).origin !== origin,
    )
  )
    throw new Error('DEMO_ORIGINS must contain origins without paths or trailing slashes');
  const products = JSON.parse(
    await readFile(new URL('../../demo-site/data/products.json', import.meta.url)),
  );
  await connectDB(process.env.MONGODB_URI);
  await Site.findByIdAndUpdate(
    siteId,
    { name: 'Northwind Goods (demo)', allowed_origins: origins },
    { upsert: true },
  );
  if (process.argv.includes('--reset')) await Event.deleteMany({ site_id: siteId });
  const events = demoSeed(products, origins[0]);
  const result = await Event.bulkWrite(
    events.map((event) => ({
      updateOne: {
        filter: { site_id: siteId, event_id: event.event_id },
        update: { $setOnInsert: event },
        upsert: true,
      },
    })),
  );
  console.log(
    `Seeded 30 historical shopper sessions / ${events.length} events; ${result.upsertedCount} inserted. Repeated runs preserve existing events.`,
  );
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
