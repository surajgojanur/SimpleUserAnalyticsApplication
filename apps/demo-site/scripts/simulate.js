import { chromium } from 'playwright';
import { parseOptions, isLocalOrigin, random, persona, RateGate } from './simulation.js';
const options = parseOptions(process.argv.slice(2));
const gate = new RateGate();
const summary = {
  seed: options.seed,
  sessions: 0,
  personas: {},
  accepted: 0,
  rateLimited: 0,
  failed: 0,
  rotated: 0,
  sessionIds: [],
};
const browser = await chromium.launch({ headless: !options.headed, channel: 'chromium' });
let nextSession = 0;
const requestTimes = [];
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function shopper(index) {
  const rng = random(options.seed + index * 104729);
  const type = persona(rng());
  const mobile = type === 'mobile' || rng() < 0.25;
  const context = await browser.newContext({
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: [1280, 1440, 1536][Math.floor(rng() * 3)], height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await context.newPage();
  const errors = [];
  const pending = new Set();
  const sessionIds = new Set();
  let apiOrigin;
  page.on('pageerror', (error) => errors.push(error.message));
  context.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/events') {
      sessionIds.add(JSON.parse(request.postData()).session_id);
    }
  });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (
      !isLocalOrigin(url) ||
      (url.origin !== options.baseUrl && !['/sdk/tracker.js', '/api/events'].includes(url.pathname))
    ) {
      errors.push(`Blocked non-demo request: ${url.origin}${url.pathname}`);
      return route.abort();
    }
    if (url.pathname === '/sdk/tracker.js') {
      if (apiOrigin && apiOrigin !== url.origin) {
        errors.push('Multiple API origins');
        return route.abort();
      }
      apiOrigin = url.origin;
    }
    if (url.pathname === '/api/events') {
      if (url.origin !== apiOrigin || route.request().method() !== 'POST') {
        errors.push('Unexpected ingestion target');
        return route.abort();
      }
      pending.add(route.request());
      try {
        await gate.wait();
        requestTimes.push(Date.now());
        // Forward the real tracker request unchanged. Explicit forwarding settles
        // keepalive requests even when Playwright loses their navigation lifecycle.
        const response = await route.fetch({ maxRedirects: 0 });
        if ([200, 202].includes(response.status())) summary.accepted++;
        else if (response.status() === 429) {
          summary.rateLimited++;
          const seconds = Math.max(60, Number(response.headers()['retry-after']) || 60);
          gate.backoff(seconds);
          console.warn(`429 received; slowing all workers for ${seconds}s. Event not retried.`);
        } else errors.push(`Ingestion returned ${response.status()}`);
        await route.fulfill({ response });
      } catch (error) {
        errors.push(`Ingestion transport failed: ${error.message}`);
      } finally {
        pending.delete(route.request());
      }
      return;
    }
    await route.continue();
  });
  async function settle() {
    // Allow the synchronous click/navigation callbacks to schedule their fetches.
    await sleep(100);
    for (let attempt = 0; pending.size && attempt < 1200; attempt++) await sleep(100);
    if (pending.size) throw new Error('Events did not finish within two minutes');
    if (errors.length) throw new Error(errors.join('; '));
  }
  const think = () => sleep(350 + rng() * 1100);
  async function ready() {
    await page.waitForFunction(
      () => document.body.dataset.ready === 'true' && window.__insightflow,
    );
    await settle();
  }
  async function scroll() {
    const steps = 1 + Math.floor(rng() * 3);
    for (let step = 0; step < steps; step++) {
      await page.mouse.wheel(0, 200 + Math.floor(rng() * 450));
      await sleep(150 + rng() * 300);
    }
  }
  async function click(selector, nth = 0) {
    const element = page.locator(selector).nth(nth);
    await element.evaluate((element) =>
      element.scrollIntoView({ block: 'center', inline: 'center' }),
    );
    await think();
    const box = await element.boundingBox();
    if (!box) throw new Error(`No clickable ${selector}`);
    const x = box.x + box.width * (0.35 + rng() * 0.3);
    const y = box.y + box.height * (0.35 + rng() * 0.3);
    const href = await element.getAttribute('href');
    const navigates = href?.startsWith('/') || (await element.getAttribute('id')) === 'place-order';
    const press = async () => {
      if (mobile) await page.touchscreen.tap(x, y);
      else {
        await page.mouse.move(x, y, { steps: 3 });
        await page.mouse.click(x, y);
      }
    };
    if (navigates) await Promise.all([page.waitForEvent('load'), press()]);
    else await press();
    await ready();
  }
  async function openShop() {
    if (mobile) {
      await click('.menu-toggle');
      await click('#main-nav a[href="/shop.html"]');
    } else await click('#main-nav a[href="/shop.html"]');
  }
  async function inspectProduct() {
    await scroll();
    await click('#shop-grid .product-card:not([hidden]) .product-art', Math.floor(rng() * 8));
    await click('[data-gallery]', 1 + Math.floor(rng() * 2));
    await click('[data-option]', Math.floor(rng() * 3));
    await scroll();
    await click('[data-tab]', 1 + Math.floor(rng() * 2));
    if (rng() < 0.5) await click('.faq summary', Math.floor(rng() * 3));
  }
  try {
    console.log(`Starting session ${index + 1}: ${type}, ${mobile ? 'mobile' : 'desktop'}`);
    await page.goto(options.baseUrl);
    await ready();
    await think();
    if (rng() < 0.25) {
      // A harmless click on non-interactive copy adds occasional off-target points.
      const text = page.locator('.hero h1');
      await text.scrollIntoViewIfNeeded();
      const box = await text.boundingBox();
      await page.mouse.click(box.x + box.width * 0.72, box.y + box.height * 0.6);
      await settle();
    }
    if (type === 'bounce') {
      if (rng() < 0.5) await scroll();
    } else {
      await openShop();
      if (type === 'researcher') {
        const reads = 2 + Math.floor(rng() * 3);
        for (let product = 0; product < reads; product++) {
          await inspectProduct();
          await openShop();
        }
        if (rng() < 0.5) {
          if (mobile) await click('.menu-toggle');
          await click('#main-nav a[href="/about.html"]');
        }
      } else {
        await inspectProduct();
        if (rng() < 0.35) await click('[data-step="1"]');
        await click('#add-to-cart');
        await click('.cart-link');
        if (type === 'buyer' || (type === 'mobile' && rng() < 0.5)) {
          if (rng() < 0.5) {
            await page.fill('#promo', 'DEMO10');
            await click('#apply-promo');
          }
          await click('#checkout-link');
          await click('#place-order');
          if (rng() < 0.3) await click('main a[href="/shop.html"]');
        } else await scroll();
      }
      if (rng() < 0.12) {
        await page.evaluate(() => {
          const key = 'insightflow:demo_store:session';
          const stored = JSON.parse(localStorage.getItem(key));
          stored.last = Date.now() - 31 * 60000;
          localStorage.setItem(key, JSON.stringify(stored));
        });
        await click('.cart-link');
        summary.rotated++;
      }
    }
    await settle();
    summary.sessions++;
    summary.personas[type] = (summary.personas[type] || 0) + 1;
    summary.sessionIds.push(...sessionIds);
    console.log(
      `Session ${index + 1}/${options.sessions}: ${type}, ${mobile ? 'mobile' : 'desktop'}, ${sessionIds.size} tracker session(s)`,
    );
  } catch (error) {
    summary.failed++;
    console.error(`Session ${index + 1} failed: ${error.message}`);
  } finally {
    await context.close();
  }
}
try {
  console.log(
    `Simulating only ${options.baseUrl}; global ingestion budget ≤172/min, concurrency ${options.concurrency}, seed ${options.seed}`,
  );
  await Promise.all(
    Array.from({ length: options.concurrency }, async () => {
      while (nextSession < options.sessions) await shopper(nextSession++);
    }),
  );
  let peak = 0,
    start = 0;
  for (let end = 0; end < requestTimes.length; end++) {
    while (requestTimes[end] - requestTimes[start] >= 60000) start++;
    peak = Math.max(peak, end - start + 1);
  }
  summary.peakRequestsPerMinute = peak;
  console.log('SUMMARY ' + JSON.stringify(summary));
  if (summary.failed || !summary.accepted) process.exitCode = 1;
} finally {
  await browser.close();
}
