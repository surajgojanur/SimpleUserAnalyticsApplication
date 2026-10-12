import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const storeOrigin = process.env.STORE_URL || 'http://localhost:5174';
const apiOrigin = process.env.API_URL || 'http://localhost:5000';
const screenshotDir = process.env.SCREENSHOT_DIR
  ? resolve(process.env.SCREENSHOT_DIR)
  : new URL('../docs/screenshots/', import.meta.url).pathname;
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const mongoose = require('mongoose');
const products = JSON.parse(
  await readFile(new URL('../apps/demo-site/data/products.json', import.meta.url)),
);
const browser = await chromium.launch({
  headless: true,
  channel: 'chromium',
  executablePath: process.env.CHROME_PATH,
});
const errors = [];
const unexpected = [];
async function ready(page) {
  await page.waitForFunction(() => document.body.dataset.ready === 'true' && window.__insightflow);
}
async function stored(session, paths) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const events = await mongoose.connection
      .collection('events')
      .find({ site_id: 'demo_store', session_id: session })
      .sort({ timestamp: 1, _id: 1 })
      .toArray();
    if (
      paths.every((path) =>
        events.some(
          (event) => event.event_type === 'page_view' && event.page_url === storeOrigin + path,
        ),
      )
    )
      return events;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Purchase page views missing in MongoDB');
}
try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/insightflow');
  await mkdir(screenshotDir, { recursive: true });
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    context.on('request', (request) => {
      const url = new URL(request.url());
      if (![storeOrigin, apiOrigin].includes(url.origin)) unexpected.push(request.url());
      if (request.method() === 'POST') {
        assert.equal(url.pathname, '/api/events');
        const data = JSON.parse(request.postData());
        assert(!JSON.stringify(data).includes('shopper@example'));
      }
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(storeOrigin + '/?discarded=yes#start');
    await ready(page);
    if (!mobile)
      await page.screenshot({
        path: join(screenshotDir, 'storefront.png'),
        fullPage: true,
      });
    const session = await page.evaluate(
      () => JSON.parse(localStorage.getItem('insightflow:demo_store:session')).id,
    );
    if (mobile) {
      await page.getByRole('button', { name: 'Open menu', exact: true }).tap();
      assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
    }
    await page.locator('#main-nav a[href="/shop.html"]').click();
    await ready(page);
    await page.locator('[data-filter="Home"]').click();
    assert.equal(await page.locator('#shop-grid .product-card:visible').count(), 3);
    await page.locator('[data-filter="All"]').click();
    await page.selectOption('#sort', 'low');
    const prices = await page
      .locator('#shop-grid .product-card')
      .evaluateAll((cards) => cards.map((card) => Number(card.dataset.price)));
    assert.deepEqual(
      prices,
      [...prices].sort((a, b) => a - b),
    );
    await page.fill('#search', 'does not exist');
    await page.click('#search-button');
    assert(await page.locator('#no-results').isVisible());
    await page.fill('#search', '');
    await page.click('#search-button');
    await page.locator('a.product-art[href="/products/aurora-headphones.html"]').click();
    await ready(page);
    await page.locator('[data-gallery="1"]').click();
    assert((await page.locator('#gallery-main').getAttribute('aria-label')).includes('side'));
    await page.locator('[data-option="Forest"]').click();
    await page.locator('[data-step="1"]').click();
    await page.locator('[data-tab="2"]').click();
    assert(await page.locator('#panel-2').isVisible());
    await page.locator('.faq summary').first().click();
    await page.locator('#add-to-cart').click();
    assert.equal(await page.locator('[data-cart-count]').innerText(), '2');
    await page.reload();
    await ready(page);
    assert.equal(await page.locator('[data-cart-count]').innerText(), '2');
    await page.click('.cart-link');
    await ready(page);
    assert.match(await page.locator('#cart-totals').innerText(), /\$258\.00/);
    await page.locator('[data-cart-step="1"]').click();
    assert.match(await page.locator('#cart-totals').innerText(), /\$387\.00/);
    await page.locator('[data-cart-step="-1"]').click();
    await page.fill('#promo', 'DEMO10');
    await page.click('#apply-promo');
    assert.match(await page.locator('#cart-totals').innerText(), /\$232\.20/);
    await page.click('#checkout-link');
    await ready(page);
    assert.match(await page.locator('#checkout-summary').innerText(), /\$232\.20/);
    assert.equal(await page.locator('#demo-name').getAttribute('readonly'), '');
    await page.click('#place-order');
    await page.waitForURL('**/order-confirmation.html');
    await ready(page);
    assert.match(await page.locator('#order-number').innerText(), /NW-[A-F0-9]{8}/);
    assert.equal(await page.locator('[data-cart-count]').innerText(), '0');
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('insightflow:demo_store:session')).id,
      ),
      session,
    );
    const paths = [
      '/',
      '/shop.html',
      '/products/aurora-headphones.html',
      '/cart.html',
      '/checkout.html',
      '/order-confirmation.html',
    ];
    const events = await stored(session, paths);
    assert(events.filter((event) => event.event_type === 'click').length >= 15);
    assert(events.every((event) => !event.page_url.includes('?') && !event.page_url.includes('#')));
    const clicks = events.filter((event) => event.click);
    assert(clicks.some((event) => event.click.y > event.click.viewport_height));
    assert(
      clicks.every(
        (event) =>
          event.click.x >= 0 &&
          event.click.x <= event.click.document_width &&
          event.click.y >= 0 &&
          event.click.y <= event.click.document_height,
      ),
    );
    // All pages render at both viewport sizes, with no offsite resources or CSP errors.
    for (const path of [
      '/',
      '/shop.html',
      '/cart.html',
      '/checkout.html',
      '/order-confirmation.html',
      '/about.html',
      '/contact.html',
      ...products.map((product) => `/products/${product.slug}.html`),
    ]) {
      await page.goto(storeOrigin + path);
      await ready(page);
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${mobile ? 'mobile' : 'desktop'} overflow on ${path}`,
      );
      assert(
        await page
          .locator('footer')
          .innerText()
          .then((text) => text.includes('Demo store, no real orders')),
      );
    }
    await page.goto(storeOrigin + '/cart.html');
    await ready(page);
    assert(await page.getByText('Your bag is waiting for a little good.').isVisible());
    assert.equal(await page.locator('#checkout-link').getAttribute('aria-disabled'), 'true');
    await page.goto(storeOrigin + '/checkout.html');
    await ready(page);
    assert(await page.locator('#place-order').isDisabled());
    // Buy-now is a real client-side path to the same fake checkout.
    await page.goto(storeOrigin + '/products/ceramic-mug.html');
    await ready(page);
    await page.click('#buy-now');
    await page.waitForURL('**/checkout.html');
    await ready(page);
    assert.match(await page.locator('#checkout-summary').innerText(), /\$24\.00/);
    // A second tab must update an open checkout, including its empty state.
    const otherTab = await context.newPage();
    await otherTab.goto(storeOrigin + '/cart.html');
    await ready(otherTab);
    await otherTab.locator('[data-cart-step="1"]').click();
    await page.waitForFunction(() =>
      document.querySelector('#checkout-summary').textContent.includes('$48.00'),
    );
    await otherTab.fill('#promo', 'DEMO10');
    await otherTab.click('#apply-promo');
    await page.waitForFunction(() =>
      document.querySelector('#checkout-summary').textContent.includes('$43.20'),
    );
    await otherTab.locator('[data-remove]').click();
    await page.waitForFunction(() => document.querySelector('#place-order').disabled);
    assert.match(await page.locator('#checkout-summary').innerText(), /Your bag is empty/);
    await otherTab.close();
    await page.goto(storeOrigin + '/products/ceramic-mug.html');
    await ready(page);
    await page.click('#add-to-cart');
    await page.goto(storeOrigin + '/cart.html');
    await ready(page);
    await page.locator('[data-remove]').click();
    assert(await page.getByText('Your bag is waiting for a little good.').isVisible());
    console.log(
      `PASS: ${mobile ? 'mobile touch' : 'desktop'} purchase, totals/persistence/promo, 15 pages, empty/remove/buy-now, session ${session}, ${events.length} stored events`,
    );
    await context.close();
  }
  const broken = await browser.newContext();
  await broken.addInitScript(() => localStorage.setItem('northwind-goods:cart:v1', '{bad'));
  const badPage = await broken.newPage();
  await badPage.goto(storeOrigin + '/cart.html');
  await ready(badPage);
  assert.match(await badPage.locator('#feedback').innerText(), /Saved cart is invalid/);
  await broken.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  console.log(
    'PASS: strict CSP, no offsite resources, no form data transmitted, zero console/page errors',
  );
} finally {
  await browser.close();
  await mongoose.disconnect();
}
