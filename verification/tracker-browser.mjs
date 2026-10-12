import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const mongoose = require('mongoose');
const root = new URL('../', import.meta.url).pathname;
const browser = await chromium.launch({ headless: true, channel: 'chromium' });
let server;
async function startServer() {
  server = spawn(process.execPath, ['src/server.js'], { cwd: root + 'apps/api', stdio: 'pipe' });
  server.stderr.on('data', (data) => process.stderr.write(data));
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch('http://localhost:5000/api/health')).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('API did not start');
}
async function stopServer() {
  const closed = new Promise((resolve) => server.once('exit', resolve));
  server.kill('SIGTERM');
  await closed;
}
async function waitCount(session, count) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const events = await mongoose.connection
      .collection('events')
      .find({ session_id: session })
      .sort({ timestamp: 1, _id: 1 })
      .toArray();
    if (events.length >= count) return events;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Missing events for ${session}`);
}
try {
  await mongoose.connect('mongodb://127.0.0.1:27017/insightflow');
  await startServer();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const key = 'insightflow:demo_store:session';
  await page.goto('http://localhost:5174/?secret=discard#section');
  await page.waitForFunction(() => window.__insightflow && document.body.dataset.ready === 'true');
  const session = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).id, key);
  await waitCount(session, 1);
  await page.evaluate(() =>
    document
      .querySelector('#search-button')
      .addEventListener('click', (event) => event.stopPropagation()),
  );
  await page.click('#search-button');
  await page.locator('#newsletter-submit').scrollIntoViewIfNeeded();
  await page.click('#newsletter-submit');
  let events = await waitCount(session, 3);
  const clicks = events.filter((event) => event.event_type === 'click');
  assert.equal(clicks.length, 2);
  assert(clicks[1].click.y > 1600 && clicks[1].click.y > clicks[0].click.y);
  assert(
    clicks.every(
      (event) => event.click.x >= 0 && event.click.document_height > event.click.viewport_height,
    ),
  );
  assert(events.every((event) => event.page_url === 'http://localhost:5174/'));
  await page.locator('nav a[href="/shop.html"]').click();
  await page.waitForURL('**/shop.html');
  await page.waitForFunction(() => window.__insightflow && document.body.dataset.ready === 'true');
  await page.reload();
  await page.waitForFunction(() => window.__insightflow && document.body.dataset.ready === 'true');
  assert.equal(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).id, key),
    session,
  );
  events = await waitCount(session, 6);
  assert.equal(events.filter((event) => event.event_type === 'page_view').length, 3);
  await page.locator('.cart-link').click();
  await page.waitForURL('**/cart.html');
  await page.waitForFunction(() => window.__insightflow && document.body.dataset.ready === 'true');
  await waitCount(session, 8);
  await page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key));
    stored.last = Date.now() - 31 * 60000;
    localStorage.setItem(key, JSON.stringify(stored));
  }, key);
  await page.click('#apply-promo');
  const nextSession = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).id, key);
  assert.notEqual(nextSession, session);
  await waitCount(nextSession, 1);
  // Load the tracker first, then actually stop the API and exercise host controls.
  await stopServer();
  await page.click('#apply-promo');
  await page.waitForTimeout(250);
  assert.match(await page.locator('#promo-feedback').innerText(), /Enter DEMO10/);
  assert.deepEqual(errors, []);
  await startServer();
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage blocked');
      },
    });
  });
  const blockedPage = await blocked.newPage();
  const blockedErrors = [];
  blockedPage.on('pageerror', (error) => blockedErrors.push(error.message));
  const responses = [];
  blockedPage.on('request', (request) => {
    if (request.url().endsWith('/api/events')) responses.push(JSON.parse(request.postData()));
  });
  await blockedPage.goto('http://localhost:5174/');
  await blockedPage.waitForFunction(
    () => window.__insightflow && document.body.dataset.ready === 'true',
  );
  await blockedPage.click('#search-button');
  await blockedPage.click('#search-button');
  await blockedPage.waitForTimeout(250);
  assert.equal(responses.length, 3);
  assert.equal(new Set(responses.map((event) => event.session_id)).size, 1);
  await waitCount(responses[0].session_id, 3);
  assert.deepEqual(blockedErrors, []);
  console.log(
    `PASS: tracker events stored in MongoDB; navigation/reload persisted session; scrolled y=${clicks[1].click.y}; normalized URL; capture-phase clicks; timeout rotation; actual stopped API; blocked-storage fallback; zero page errors`,
  );
} finally {
  if (server && server.exitCode === null) await stopServer();
  await browser.close();
  await mongoose.disconnect();
}
