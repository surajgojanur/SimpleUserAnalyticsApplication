import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { eventSchema } from '../src/validators/event.schema.js';
const valid = { site_id: 'demo_store', event_id: randomUUID(), session_id: randomUUID(), event_type: 'page_view', page_url: 'https://example.com/path?private=yes#section', timestamp: new Date().toISOString() };
const click = { x: 0, y: 0, viewport_width: 390, viewport_height: 844, document_width: 390, document_height: 2000 };
describe('event validator', () => {
  it('normalizes URLs and strips unrelated fields', () => {
    const parsed = eventSchema.parse({ ...valid, unrelated: 'value' });
    expect(parsed.page_url).toBe('https://example.com/path'); expect(parsed.unrelated).toBeUndefined();
  });
  it('accepts zero coordinates for click events', () => { expect(eventSchema.safeParse({ ...valid, event_type: 'click', click }).success).toBe(true); });
  it.each(['not-a-url', 'file:///private', 'javascript:alert(1)'])('rejects non-web URL %s without throwing', page_url => {
    expect(eventSchema.safeParse({ ...valid, page_url }).success).toBe(false);
  });
  it.each([{ event_id: 'invalid' }, { session_id: '' }, { event_type: 'hover' }, { timestamp: 'yesterday' }, { site_id: '' }])('rejects invalid identity/type/time %j', overrides => {
    expect(eventSchema.safeParse({ ...valid, ...overrides }).success).toBe(false);
  });
  it.each([{ x: -1 }, { document_width: 0 }, { viewport_height: 1.5 }, { document_height: 100001 }, { y: NaN }])('rejects invalid click dimensions %j', overrides => {
    expect(eventSchema.safeParse({ ...valid, event_type: 'click', click: { ...click, ...overrides } }).success).toBe(false);
  });
});
