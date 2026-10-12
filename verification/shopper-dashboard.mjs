import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const api = 'http://localhost:5000/api/sites/demo_store';
async function read(path) {
  const response = await fetch(`${api}${path}`);
  assert.equal(response.status, 200);
  return response.json();
}
const list = await read('/sessions?limit=100');
const pages = await read('/pages');
assert(list.total >= 30);
assert(pages.pages.length >= 15);
const candidate = list.sessions.find((session) => session.page_views >= 6 && session.clicks >= 15);
assert(candidate, 'Expected a long shopper journey');
const journey = await read(`/sessions/${candidate.session_id}/events`);
assert.equal(journey.events.length, candidate.event_count);
assert(new Set(journey.events.map((event) => event.page_url)).size >= 4);
assert.deepEqual(
  journey.events.map((event) => event.timestamp),
  journey.events.map((event) => event.timestamp).toSorted(),
);
const browser = await chromium.launch({
  channel: 'chromium',
  executablePath: process.env.CHROME_PATH,
});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await mkdir(new URL('../docs/screenshots/', import.meta.url), { recursive: true });
  await page.goto('http://localhost:5173');
  await page
    .getByRole('button', { name: /^View session / })
    .first()
    .waitFor();
  await page.screenshot({ path: 'docs/screenshots/sessions.png' });
  const targetPage = Math.floor(list.sessions.indexOf(candidate) / 10) + 1;
  for (let number = 1; number < targetPage; number += 1) {
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page
      .getByText(`Page ${number + 1} of ${Math.ceil(list.total / 10)}`, { exact: true })
      .waitFor();
  }
  const selected = page.getByRole('button', {
    name: `View session ${candidate.session_id}`,
    exact: true,
  });
  await selected.click();
  const timeline = page.getByRole('list', { name: 'Ordered user journey' });
  await timeline.waitFor();
  assert.equal(await timeline.locator('li').count(), candidate.event_count);
  assert.deepEqual(
    await timeline.locator('time').evaluateAll((nodes) => nodes.map((node) => node.dateTime)),
    journey.events.map((event) => event.timestamp),
  );
  assert.deepEqual(
    await timeline.locator('strong').allTextContents(),
    journey.events.map((event) => (event.event_type === 'click' ? 'Click' : 'Page view')),
  );
  await page.screenshot({ path: 'docs/screenshots/journey.png' });
  await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
  const selector = page.getByLabel('Page URL', { exact: true });
  await page.getByRole('img', { name: /^Click heatmap showing/ }).waitFor();
  assert.equal(await selector.locator('option').count(), pages.pages.length + 1);
  const url = pages.pages.find((entry) =>
    entry.page_url.endsWith('/products/aurora-headphones.html'),
  )?.page_url;
  assert(url);
  await selector.selectOption(url);
  const map = await read(`/heatmap?url=${encodeURIComponent(url)}`);
  assert(map.clicks.length > 10);
  await page.getByLabel('Display', { exact: true }).selectOption('dots');
  await page.getByRole('img', { name: `Click dots showing ${map.clicks.length} clicks` }).waitFor();
  const point = map.clicks[0];
  const pixel = await page.locator('canvas').evaluate((canvas, click) => {
    const x = Math.floor((click.x / click.document_width) * canvas.width);
    const y = Math.floor((click.y / click.document_height) * canvas.height);
    return [...canvas.getContext('2d').getImageData(x, y, 1, 1).data];
  }, point);
  assert(pixel[0] > pixel[1] + 30);
  assert(await page.locator('canvas').evaluate((canvas) => canvas.height > canvas.width));
  for (const device of ['desktop', 'mobile']) {
    const clicks = map.clicks.filter((click) =>
      device === 'mobile' ? click.viewport_width < 768 : click.viewport_width >= 768,
    );
    assert(clicks.length > 0);
    await page.getByLabel('Device', { exact: true }).selectOption(device);
    await page.getByRole('img', { name: `Click dots showing ${clicks.length} clicks` }).waitFor();
  }
  await page.getByLabel('Device', { exact: true }).selectOption('all');
  await page.getByLabel('Display', { exact: true }).selectOption('heat');
  await page
    .getByRole('img', { name: `Click heatmap showing ${map.clicks.length} clicks` })
    .waitFor();
  await page.screenshot({ path: 'docs/screenshots/product-heatmap.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: 'PASS',
        sessions: list.total,
        pages: pages.pages.length,
        journeyEvents: candidate.event_count,
        productClicks: map.clicks.length,
        screenshots: ['sessions.png', 'journey.png', 'product-heatmap.png'],
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
