import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/database.js';
import Site from '../src/models/Site.js';
import Event from '../src/models/Event.js';
const siteId = 't_site';
const origin = 'http://localhost:5174';
const click = { x: 10, y: 1020, viewport_width: 1000, viewport_height: 800, document_width: 1000, document_height: 2000 };
const event = (overrides = {}) => ({ site_id: siteId, event_id: randomUUID(), session_id: 'session-test-1',
  event_type: 'page_view', page_url: origin + '/', timestamp: new Date().toISOString(), ...overrides });
process.env.DASHBOARD_ORIGIN = 'http://localhost:5173';
const app = createApp();
const post = (body, target = app) => request(target).post('/api/events').set('Content-Type', 'text/plain').send(JSON.stringify(body));
const path = `/api/sites/${siteId}`;
let safeDatabase = false;
beforeAll(async () => {
  const uri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/insightflow_test';
  const name = new URL(uri).pathname.slice(1);
  if (!name.endsWith('_test') || uri === process.env.MONGODB_URI) throw new Error('Tests require a separate database name ending in _test');
  await connectDB(uri);
  safeDatabase = true;
  await Site.deleteMany({});
  await Site.create({ _id: siteId, name: 'Test', allowed_origins: [origin] });
});
beforeEach(async () => { await Event.deleteMany({}); });
afterAll(async () => {
  if (safeDatabase) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
describe('event ingestion', () => {
  it('stores valid page view with structured fields and received_at', async () => {
    const payload = event();
    expect((await post(payload).set('Origin', origin)).status).toBe(202);
    const stored = await Event.findOne({ event_id: payload.event_id }).lean();
    expect(stored.session_id).toBe(payload.session_id);
    expect(stored.timestamp.toISOString()).toBe(payload.timestamp);
    expect(stored.received_at).toBeInstanceOf(Date);
  });
  it('stores document coordinates and dimensions for valid clicks', async () => {
    expect((await post(event({ event_type: 'click', click }))).status).toBe(202);
    expect((await Event.findOne().lean()).click).toEqual(click);
  });
  it('returns success for sequential and concurrent duplicate event IDs', async () => {
    const payload = event();
    const responses = await Promise.all([post(payload), post(payload)]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 202]);
    expect((await post(payload)).body).toEqual({ ok: true, duplicate: true });
    expect(await Event.countDocuments()).toBe(1);
  });
  it('rejects missing click data', async () => {
    const response = await post(event({ event_type: 'click' }));
    expect(response.status).toBe(400); expect(response.body.details[0].path).toBe('click');
    expect(await Event.countDocuments()).toBe(0);
  });
  it('rejects unknown site', async () => { expect((await post(event({ site_id: 'unknown' }))).status).toBe(404); });
  it('rejects forbidden origin without storing events', async () => {
    expect((await post(event()).set('Origin', 'https://evil.example')).status).toBe(403);
    expect(await Event.countDocuments()).toBe(0);
  });
  it('allows absent Origin for non-browser clients per documented trade-off', async () => { expect((await post(event())).status).toBe(202); });
  it('rejects timestamps beyond five minutes in future', async () => {
    expect((await post(event({ timestamp: new Date(Date.now() + 360000).toISOString() }))).status).toBe(400);
  });
  it('rejects malformed JSON', async () => {
    expect((await request(app).post('/api/events').set('Content-Type', 'text/plain').send('{')).status).toBe(400);
  });
  it('rejects invalid URLs with 400', async () => { expect((await post(event({ page_url: 'not-a-url' }))).status).toBe(400); });
  it('normalizes query/hash and accepts JSON media type through the text parser', async () => {
    const response = await request(app).post('/api/events').send(event({ page_url: origin + '/products.html?token=private#details' }));
    expect(response.status).toBe(202);
    expect((await Event.findOne()).page_url).toBe(origin + '/products.html');
  });
  it('enforces the 10kb body limit', async () => {
    const response = await post(event({ extra: 'x'.repeat(11000) }));
    expect(response.status).toBe(413); expect(response.body.error).toBeTruthy();
  });
  it('rate limits ingestion with 429', async () => {
    const limited = createApp({ ingestionLimit: 1 });
    expect((await post(event(), limited)).status).toBe(202);
    expect((await post(event(), limited)).status).toBe(429);
  });
  it('has open ingestion CORS without credential headers', async () => {
    const response = await post(event()).set('Origin', origin);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });
});
describe('analytics', () => {
  it('lists sites for selector', async () => {
    expect((await request(app).get('/api/sites')).body.sites).toEqual([{ _id: siteId, name: 'Test' }]);
  });
  it('returns exact session counts and pagination, isolated by site', async () => {
    await Event.insertMany([
      event({ session_id: 'session-count-1' }), event({ session_id: 'session-count-1', event_type: 'click', click }),
      event({ session_id: 'session-count-2', timestamp: new Date(Date.now() - 10000).toISOString() }),
      event({ site_id: 'other', session_id: 'session-count-1' }),
    ]);
    const response = await request(app).get(path + '/sessions').query({ limit: 1, page: 1 });
    expect(response.status).toBe(200); expect(response.body.total).toBe(2);
    expect(response.body.sessions).toHaveLength(1);
    expect(response.body.sessions[0]).toMatchObject({ session_id: 'session-count-1', event_count: 2, page_views: 1, clicks: 1 });
    const next = await request(app).get(path + '/sessions').query({ limit: 1, page: 2 });
    expect(next.body.sessions[0].session_id).toBe('session-count-2');
  });
  it('caps pagination and rejects noninteger or repeated query parameters', async () => {
    for (const query of ['limit=101', 'page=0', 'page=1.5', 'page=abc', 'page=1&page=2']) {
      expect((await request(app).get(path + '/sessions?' + query)).status).toBe(400);
    }
  });
  it('orders by timestamp then _id and returns all events for only one session/site', async () => {
    const stamp = new Date(Date.now() - 1000).toISOString();
    const rows = [
      event({ _id: new mongoose.Types.ObjectId('000000000000000000000003'), event_type: 'click', click }),
      event({ _id: new mongoose.Types.ObjectId('000000000000000000000002'), timestamp: stamp, event_type: 'click', click }),
      event({ _id: new mongoose.Types.ObjectId('000000000000000000000001'), timestamp: stamp }),
    ];
    await Event.insertMany([...rows, event({ site_id: 'other' }), event({ session_id: 'other-session' })]);
    const response = await request(app).get(path + '/sessions/session-test-1/events');
    expect(response.status).toBe(200);
    expect(response.body.events.map(item => item.event_id)).toEqual([rows[2].event_id, rows[1].event_id, rows[0].event_id]);
  });
  it('returns 404 for unknown sites and sessions', async () => {
    for (const suffix of ['/sessions', '/pages', '/heatmap?url=http://localhost:5174/']) {
      expect((await request(app).get('/api/sites/unknown' + suffix)).status).toBe(404);
    }
    expect((await request(app).get(path + '/sessions/absent/events')).status).toBe(404);
  });
  it('groups pages with exact views/clicks and returns only page clicks', async () => {
    await Event.insertMany([event(), event({ event_type: 'click', click }), event({ page_url: origin + '/cart.html', event_type: 'click', click })]);
    const pages = await request(app).get(path + '/pages');
    expect(pages.body.pages.find(page => page.page_url === origin + '/')).toMatchObject({ views: 1, clicks: 1 });
    const map = await request(app).get(path + '/heatmap').query({ url: origin + '/?ignored=1#fragment' });
    expect(map.status).toBe(200); expect(map.body.total_clicks).toBe(1); expect(map.body.clicks).toEqual([click]);
  });
  it('returns at most 5000 latest clicks and the untruncated total', async () => {
    const rows = Array.from({ length: 5001 }, (_, index) => event({ event_type: 'click', click: { ...click, x: index }, timestamp: new Date(index * 1000).toISOString() }));
    await Event.insertMany(rows);
    const response = await request(app).get(path + '/heatmap').query({ url: origin + '/' });
    expect(response.body.total_clicks).toBe(5001); expect(response.body.clicks).toHaveLength(5000);
    expect(response.body.clicks[0].x).toBe(5000); expect(response.body.clicks.at(-1).x).toBe(1);
  });
  it('provides empty states and validates heatmap URL', async () => {
    expect((await request(app).get(path + '/sessions')).body.total).toBe(0);
    expect((await request(app).get(path + '/pages')).body.pages).toEqual([]);
    expect((await request(app).get(path + '/heatmap').query({ url: origin + '/' })).body.clicks).toEqual([]);
    expect((await request(app).get(path + '/heatmap')).status).toBe(400);
  });
  it('restricts browser read CORS to DASHBOARD_ORIGIN', async () => {
    const allowed = await request(app).get('/api/sites').set('Origin', 'http://localhost:5173');
    const forbidden = await request(app).get('/api/sites').set('Origin', 'https://evil.example');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(forbidden.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('serves the committed tracker with cross-origin CORP', async () => {
    const response = await request(app).get('/sdk/tracker.js');
    expect(response.status).toBe(200); expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(response.text).toContain('page_view');
  });
});
