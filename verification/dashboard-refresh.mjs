import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { filterPages } from '../apps/dashboard/src/pages/heatmapPages.js';

const production = 'https://insightflow-store.netlify.app';
const local = 'http://localhost:5174';
let pages = [
  { page_url: `${local}/`, clicks: 99 },
  { page_url: `${production}/shop.html`, clicks: 3 },
  { page_url: `${production}/`, clicks: 2 },
  { page_url: 'http://127.0.0.1:5174/shop.html', clicks: 1 },
  { page_url: 'https://insightflow-store.netlify.app.evil.test/', clicks: 1 },
];
const invalid = [...pages, { page_url: 'invalid' }, { page_url: 'javascript:alert(1)' }];
assert.deepEqual(filterPages(invalid, 'production'), pages.slice(1, 3));
assert.deepEqual(filterPages(invalid, 'local'), [pages[0], pages[3]]);
assert.deepEqual(filterPages(invalid, 'all'), pages);
assert.equal(filterPages([{ page_url: 'http://[::1]:5174/' }], 'local').length, 1);
assert.equal(filterPages([{ page_url: 'https://localhost.evil.test/' }], 'local').length, 0);

const server = spawn('npm', ['run', 'dev', '--prefix', 'apps/dashboard'], {
  cwd: new URL('../', import.meta.url),
  stdio: 'ignore',
  detached: true,
});
let browser;
async function eventually(check) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await check()) return;
    await delay(50);
  }
  throw new Error('Timed out waiting for assertion');
}
try {
  await eventually(async () => {
    try {
      return (await fetch('http://localhost:5173')).ok;
    } catch {
      return false;
    }
  });
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-10-12T10:00:00Z') });
  let fail = false;
  let releaseList;
  let releaseMap;
  let holdMap = false;
  let listRequests = 0;
  let mapRequests = 0;
  const initialList = new Promise((resolve) => (releaseList = resolve));
  const click = {
    x: 100,
    y: 100,
    document_width: 1000,
    document_height: 2000,
    viewport_width: 1000,
    viewport_height: 800,
  };
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    let body;
    if (url.pathname === '/api/sites') {
      body = {
        sites: [
          { _id: 'demo_store', name: 'Demo Store' },
          { _id: 'empty', name: 'Empty' },
        ],
      };
    } else if (url.pathname.endsWith('/sessions')) {
      listRequests++;
      await initialList;
      body = {
        total: 20,
        sessions: [
          {
            session_id: 'session-one',
            event_count: 2,
            page_views: 1,
            clicks: 1,
            last_seen_at: '2026-10-12T10:00:00Z',
          },
        ],
      };
    } else if (url.pathname.endsWith('/events')) {
      body = {
        events: [
          {
            event_type: 'page_view',
            page_url: `${production}/`,
            timestamp: '2026-10-12T09:00:00Z',
          },
          {
            event_type: 'click',
            page_url: `${production}/`,
            timestamp: '2026-10-12T09:00:01Z',
            element: { tag: 'button', text: 'Add' },
          },
        ],
      };
    } else if (url.pathname.endsWith('/pages')) {
      body = { pages: url.pathname.includes('/empty/') ? [] : pages };
    } else if (url.pathname.endsWith('/heatmap')) {
      mapRequests++;
      if (holdMap) await new Promise((resolve) => (releaseMap = resolve));
      body = {
        total_clicks: url.searchParams.get('url') === `${production}/shop.html` ? 3 : 2,
        clicks: [click, { ...click, viewport_width: 400 }],
      };
    } else throw new Error(`Unexpected endpoint: ${url.pathname}`);
    await route.fulfill({
      status: fail ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(fail ? { error: 'Temporary outage' } : body),
    });
  });
  const stamp = () => page.getByTestId('last-updated').innerText();
  await page.goto('http://localhost:5173');
  await page.getByTestId('last-updated').waitFor();
  assert.equal(await stamp(), 'Last updated: —');
  releaseList();
  await page.getByRole('button', { name: 'View session session-one' }).waitFor();
  const firstStamp = await stamp();
  assert.notEqual(firstStamp, 'Last updated: —');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'View session session-one' }).click();
  await page.getByRole('list', { name: 'Ordered user journey' }).waitFor();
  assert.equal(await page.locator('ol li').count(), 2);
  const beforePoll = listRequests;
  await page.clock.fastForward(15000);
  await eventually(async () => (await stamp()) !== firstStamp);
  assert.equal(listRequests, beforePoll + 1);
  assert.match(await page.locator('main').innerText(), /Page 2 of 2/);
  await page.getByRole('list', { name: 'Ordered user journey' }).waitFor();
  const successStamp = await stamp();
  fail = true;
  await page.clock.fastForward(15000);
  await page.getByText('Unable to load sessions: Temporary outage').waitFor();
  assert.equal(await stamp(), successStamp);
  assert.equal(await page.getByRole('button', { name: 'View session session-one' }).count(), 1);
  fail = false;
  await page.clock.fastForward(15000);
  await eventually(async () => (await stamp()) !== successStamp);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hiddenCount = listRequests;
  await page.clock.fastForward(30000);
  await delay(100);
  assert.equal(listRequests, hiddenCount);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await eventually(() => listRequests === hiddenCount + 1);
  await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
  await page.getByRole('img', { name: 'Click heatmap showing 2 clicks' }).waitFor();
  assert.equal(await page.getByLabel('Environment', { exact: true }).inputValue(), 'production');
  assert.equal(
    await page.getByLabel('Page URL', { exact: true }).inputValue(),
    `${production}/shop.html`,
  );
  assert.equal(await page.locator('select[aria-label="Page URL"] option').count(), 3);
  assert.match(await page.getByTestId('click-summary').innerText(), /2 clicks shown · 3 total/);
  await page.getByLabel('Display', { exact: true }).selectOption('dots');
  await page.getByLabel('Device', { exact: true }).selectOption('mobile');
  await page.getByRole('img', { name: 'Click dots showing 1 clicks' }).waitFor();
  pages = [pages[2], pages[1], pages[0], pages[3], pages[4]];
  const oldMap = mapRequests;
  const heatStamp = await stamp();
  await page.clock.fastForward(15000);
  await eventually(async () => (await stamp()) !== heatStamp);
  assert.equal(mapRequests, oldMap + 1);
  assert.equal(
    await page.getByLabel('Page URL', { exact: true }).inputValue(),
    `${production}/shop.html`,
  );
  assert.equal(await page.getByLabel('Device', { exact: true }).inputValue(), 'mobile');
  assert.equal(await page.getByLabel('Display', { exact: true }).inputValue(), 'dots');
  const mapSuccessStamp = await stamp();
  fail = true;
  await page.clock.fastForward(15000);
  await page.getByText('Unable to load click data: Temporary outage').waitFor();
  assert.equal(await stamp(), mapSuccessStamp);
  await page.getByRole('img', { name: 'Click dots showing 1 clicks' }).waitFor();
  fail = false;
  await page.clock.fastForward(15000);
  await eventually(async () => (await stamp()) !== mapSuccessStamp);
  holdMap = true;
  await page.getByLabel('Environment', { exact: true }).selectOption('local');
  await page.getByText('Loading click data…').waitFor();
  assert.equal(await page.locator('canvas').count(), 0);
  assert.equal(await stamp(), 'Last updated: —');
  assert.equal(await page.getByLabel('Page URL', { exact: true }).inputValue(), `${local}/`);
  await eventually(() => !!releaseMap);
  holdMap = false;
  releaseMap();
  await page.getByRole('img', { name: 'Click dots showing 1 clicks' }).waitFor();
  await page.getByLabel('Environment', { exact: true }).selectOption('all');
  assert.equal(await page.getByLabel('Page URL', { exact: true }).inputValue(), `${local}/`);
  assert.equal(await page.locator('select[aria-label="Page URL"] option').count(), 6);
  await page.getByLabel('Environment', { exact: true }).selectOption('production');
  assert.equal(await page.getByLabel('Page URL', { exact: true }).inputValue(), `${production}/`);
  await page.getByRole('img', { name: 'Click dots showing 1 clicks' }).waitFor();
  // A canceled, slower page request must never overwrite the newer selection.
  holdMap = true;
  releaseMap = null;
  await page.getByLabel('Page URL', { exact: true }).selectOption(`${production}/shop.html`);
  await page.getByText('Loading click data…').waitFor();
  await eventually(() => !!releaseMap);
  const pendingCount = mapRequests;
  await page.clock.fastForward(15000);
  await delay(100);
  assert.equal(mapRequests, pendingCount);
  const finishOldMap = releaseMap;
  holdMap = false;
  await page.getByLabel('Page URL', { exact: true }).selectOption(`${production}/`);
  await page.getByRole('img', { name: 'Click dots showing 1 clicks' }).waitFor();
  const currentStamp = await stamp();
  finishOldMap();
  await delay(100);
  assert.match(await page.getByTestId('click-summary').innerText(), /2 total for this page/);
  assert.equal(await stamp(), currentStamp);
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByLabel('Site', { exact: true }).selectOption('empty');
  await page
    .getByText(
      'No pages tracked for this environment. Choose another environment to view historical data.',
    )
    .waitFor();
  assert.equal(await page.locator('canvas').count(), 0);
  assert.equal(await stamp(), 'Last updated: —');
  const stoppedMaps = mapRequests;
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  await page.getByRole('button', { name: 'View session session-one' }).waitFor();
  await page.clock.fastForward(15000);
  await delay(100);
  assert.equal(mapRequests, stoppedMaps);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: URL classification, environment selection, click/device/display counts, successful timestamps, failures/recovery, 15-second polling, hidden tabs, stable selections, empty states, mobile layout. All API requests mocked; no database writes.',
  );
} finally {
  await browser?.close();
  process.kill(-server.pid, 'SIGTERM');
}
