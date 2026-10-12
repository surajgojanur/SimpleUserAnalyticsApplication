import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const apiOrigin = process.env.API_URL || 'http://localhost:5000';
const dashboardOrigin = process.env.DASHBOARD_URL || 'http://localhost:5173';
const browser = await chromium.launch({
  headless: true,
  channel: 'chromium',
  executablePath: process.env.CHROME_PATH,
});
const errors = [];
async function pageWith(routes = []) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  for (const [pattern, body, status = 200] of routes)
    await page.route(pattern, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
  await page.goto(dashboardOrigin);
  return page;
}
async function visible(page, text) {
  await page.getByText(text, { exact: true }).waitFor();
}
const siteFixture = { sites: [{ _id: 'demo_store', name: 'Demo Store' }] };
const siteRoute = ['**/api/sites', siteFixture];
try {
  await mkdir(new URL('artifacts/', import.meta.url), { recursive: true });
  const page = await pageWith();
  await page
    .getByRole('button', { name: /^View session / })
    .first()
    .waitFor();
  const first = page.getByRole('button', { name: /^View session / }).first();
  const sid = (await first.getAttribute('aria-label')).replace('View session ', '');
  const list = await (await fetch(`${apiOrigin}/api/sites/demo_store/sessions?limit=10`)).json();
  assert.equal(
    await first.locator('xpath=ancestor::tr').locator('td').nth(1).innerText(),
    String(list.sessions[0].event_count),
  );
  await first.click();
  await page.getByRole('list', { name: 'Ordered user journey' }).waitFor();
  const journey = await (
    await fetch(`${apiOrigin}/api/sites/demo_store/sessions/${sid}/events`)
  ).json();
  assert.equal(
    await page.getByRole('list', { name: 'Ordered user journey' }).locator('li').count(),
    journey.events.length,
  );
  assert.deepEqual(
    await page
      .locator('ol[aria-label="Ordered user journey"] time')
      .evaluateAll((elements) => elements.map((element) => element.dateTime)),
    journey.events.map((event) => event.timestamp),
  );
  assert.deepEqual(
    await page.locator('ol[aria-label="Ordered user journey"] strong').allTextContents(),
    journey.events.map((event) => (event.event_type === 'click' ? 'Click' : 'Page view')),
  );
  await page.screenshot({
    path: new URL('artifacts/sessions.png', import.meta.url).pathname,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await visible(page, `Page 2 of ${Math.ceil(list.total / 10)}`);
  await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
  await page.getByRole('img', { name: /^Click heatmap showing/ }).waitFor();
  const url = await page.getByLabel('Page URL', { exact: true }).inputValue();
  const heatmap = await (
    await fetch(`${apiOrigin}/api/sites/demo_store/heatmap?url=${encodeURIComponent(url)}`)
  ).json();
  await page.getByLabel('Display', { exact: true }).selectOption('dots');
  await page
    .getByRole('img', { name: `Click dots showing ${heatmap.clicks.length} clicks` })
    .waitFor();
  const sample = heatmap.clicks[0];
  const pixel = await page.locator('canvas').evaluate((canvas, click) => {
    const x = Math.floor((click.x / click.document_width) * canvas.width);
    const y = Math.floor((click.y / click.document_height) * canvas.height);
    return Array.from(canvas.getContext('2d').getImageData(x, y, 1, 1).data);
  }, sample);
  assert(pixel[0] > pixel[1] + 30, `Expected red dot at scaled coordinates, got ${pixel}`);
  for (const device of ['desktop', 'mobile']) {
    await page.getByLabel('Device', { exact: true }).selectOption(device);
    const count = heatmap.clicks.filter((click) =>
      device === 'mobile' ? click.viewport_width < 768 : click.viewport_width >= 768,
    ).length;
    assert(count > 0);
    await page.getByRole('img', { name: `Click dots showing ${count} clicks` }).waitFor();
  }
  await page.getByLabel('Device', { exact: true }).selectOption('all');
  await page.screenshot({
    path: new URL('artifacts/heatmap.png', import.meta.url).pathname,
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  const otherUrl = await page
    .getByLabel('Page URL', { exact: true })
    .locator('option')
    .nth(2)
    .getAttribute('value');
  await page.getByLabel('Page URL', { exact: true }).selectOption(otherUrl);
  const otherMap = await (
    await fetch(`${apiOrigin}/api/sites/demo_store/heatmap?url=${encodeURIComponent(otherUrl)}`)
  ).json();
  await page
    .getByRole('img', { name: `Click dots showing ${otherMap.clicks.length} clicks` })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.close();
  const emptySites = await pageWith([['**/api/sites', { sites: [] }]]);
  await visible(emptySites, 'Loading sites…');
  await visible(emptySites, 'No sites found. Run the seed script to create the demo site.');
  await emptySites.close();
  const brokenSites = await pageWith([['**/api/sites', { error: 'Test outage' }, 503]]);
  await brokenSites.getByRole('alert').waitFor();
  await brokenSites.close();
  const empty = await pageWith([
    siteRoute,
    ['**/sessions?*', { sessions: [], total: 0, page: 1, limit: 10 }],
    ['**/pages', { pages: [] }],
  ]);
  await visible(empty, 'Loading sessions…');
  await visible(empty, 'No sessions yet. Visit the demo site to start tracking.');
  await empty.getByRole('button', { name: 'Heatmap', exact: true }).click();
  await visible(empty, 'Loading pages…');
  await visible(
    empty,
    'No pages tracked for this environment. Choose another environment to view historical data.',
  );
  await empty.close();
  const brokenSessions = await pageWith([
    siteRoute,
    ['**/sessions?*', { error: 'Test outage' }, 503],
  ]);
  await visible(brokenSessions, 'Unable to load sessions: Test outage');
  await brokenSessions.close();
  const brokenJourney = await pageWith([['**/events', { error: 'Test outage' }, 503]]);
  await brokenJourney
    .getByRole('button', { name: /^View session / })
    .first()
    .click();
  await visible(brokenJourney, 'Loading journey…');
  await visible(brokenJourney, 'Unable to load journey: Test outage');
  await brokenJourney.close();
  const emptyJourney = await pageWith([['**/events', { events: [] }]]);
  await emptyJourney
    .getByRole('button', { name: /^View session / })
    .first()
    .click();
  await visible(emptyJourney, 'No events in this session.');
  await emptyJourney.close();
  for (const [pattern, body, status, text] of [
    ['**/pages', { error: 'Test outage' }, 503, 'Unable to load pages: Test outage'],
    ['**/heatmap?*', { error: 'Test outage' }, 503, 'Unable to load click data: Test outage'],
    [
      '**/heatmap?*',
      { total_clicks: 0, clicks: [] },
      200,
      'No clicks recorded for this selection.',
    ],
  ]) {
    const fixture = await pageWith([[pattern, body, status]]);
    const loading = pattern.includes('heatmap') ? visible(fixture, 'Loading click data…') : null;
    await fixture.getByRole('button', { name: 'Heatmap', exact: true }).click();
    if (loading) await loading;
    await visible(fixture, text);
    await fixture.close();
  }
  // HTTP error responses intentionally produce browser network diagnostics; only unexpected errors fail.
  const unexpected = errors.filter((error) => !error.includes('503'));
  assert.deepEqual(unexpected, []);
  console.log(
    'PASS: live seeded sessions/counts/journey; pagination; page selector; canvas pixels at scaled coordinates; desktop/mobile filters; responsive width; screenshots; loading/empty/error for each view; no unexpected browser errors',
  );
} finally {
  await browser.close();
}
