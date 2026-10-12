import { readFile } from 'node:fs/promises';
import { describe, it, expect } from 'vitest';
import { demoSeed } from '../scripts/demo-seed.js';
import { eventSchema } from '../src/validators/event.schema.js';
const products = JSON.parse(
  await readFile(new URL('../../demo-site/data/products.json', import.meta.url)),
);
describe('historical shopper seed', () => {
  it('uses all 15 real paths with monotone funnel drop-off and mobile/desktop clicks', () => {
    const events = demoSeed(products, 'http://localhost:5174');
    const pages = events.filter((event) => event.event_type === 'page_view');
    const count = (path) =>
      pages.filter((event) => event.page_url === 'http://localhost:5174' + path).length;
    expect(new Set(events.map((event) => event.session_id)).size).toBe(30);
    expect(new Set(pages.map((event) => event.page_url)).size).toBe(15);
    expect([
      count('/'),
      count('/shop.html'),
      count('/cart.html'),
      count('/checkout.html'),
      count('/order-confirmation.html'),
    ]).toEqual([30, 21, 12, 5, 2]);
    expect(events.some((event) => event.click?.viewport_width === 390)).toBe(true);
    expect(events.some((event) => event.click?.viewport_width === 1440)).toBe(true);
    for (const event of events)
      expect(
        eventSchema.safeParse({ ...event, timestamp: event.timestamp.toISOString() }).success,
      ).toBe(true);
  });
  it('has stable IDs across repeat seeding and no future timestamps', () => {
    const first = demoSeed(products, 'http://localhost:5174', Date.now());
    const next = demoSeed(products, 'http://localhost:5174', Date.now() + 86400000);
    expect(first.map((event) => event.event_id)).toEqual(next.map((event) => event.event_id));
    expect(new Set(first.map((event) => event.event_id)).size).toBe(first.length);
    expect(first.every((event) => event.timestamp.getTime() < Date.now())).toBe(true);
  });
});
