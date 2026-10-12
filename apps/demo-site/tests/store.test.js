import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { build, apiOrigin, verifyBuild } from '../scripts/build.js';
import { addItem, setQuantity, totals, validateCart, loadCart, cartKey } from '../js/cart.js';
const products = JSON.parse(await readFile(new URL('../data/products.json', import.meta.url)));
test('generator creates all 15 pages with identical tracker and strict CSP', async () => {
  const output = await mkdtemp(join(tmpdir(), 'insightflow-generator-'));
  try {
    const paths = await build({ output, apiUrl: 'https://api.example.invalid', production: false });
    assert.equal(paths.length, 15);
    for (const product of products) assert(paths.includes(`products/${product.slug}.html`));
    for (const path of paths) {
      const html = await readFile(join(output, path), 'utf8');
      assert(
        html.includes(
          '<script async src="https://api.example.invalid/sdk/tracker.js" data-site-id="demo_store" data-api-url="https://api.example.invalid/api/events"></script>',
        ),
      );
      assert(html.includes("script-src 'self' https://api.example.invalid"));
      assert(!html.includes('http://localhost:5000'));
      assert(!/on(?:click|load)=/.test(html));
    }
    const shop = await readFile(join(output, 'shop.html'), 'utf8');
    for (const product of products) assert(shop.includes(`/products/${product.slug}.html`));
    await build({ output, apiUrl: 'http://localhost:5000', production: false });
    assert(
      (await readFile(join(output, 'index.html'), 'utf8')).includes(
        'http://localhost:5000/sdk/tracker.js',
      ),
    );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
const productionApi = 'https://insightflow-api-re52.onrender.com';
test('production rejects missing, local, insecure, malformed and placeholder origins', () => {
  for (const value of [
    undefined,
    '',
    ' ',
    'not-a-url',
    'http://insightflow-api-re52.onrender.com',
    'https://localhost:5000',
    'http://localhost:5000',
    'https://127.0.0.1',
    'https://[::1]',
    'https://api.example.invalid',
    'https://your-api.onrender.com',
    'https://example.com',
    'https://user:password@api.company.com',
    productionApi + '/',
    productionApi + '/api/events',
    productionApi + '?key=x',
    productionApi + '#fragment',
  ])
    assert.throws(() => apiOrigin(value, true));
  assert.equal(apiOrigin(productionApi, true), productionApi);
  assert.equal(apiOrigin(undefined, false), 'http://localhost:5000');
});
test('Netlify CLI build fails instead of silently falling back when its variable is missing or empty', () => {
  const env = { ...process.env, NETLIFY: 'true' };
  delete env.DEMO_API_URL;
  for (const missing of [env, { ...env, DEMO_API_URL: '' }]) {
    const result = spawnSync(process.execPath, ['scripts/build.js'], {
      cwd: new URL('../', import.meta.url),
      env: missing,
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /DEMO_API_URL/);
    assert(!result.stdout.includes('Built and verified'));
  }
});
test('production output contains exactly 15 valid pages and required assets, removes stale files, and detects corruption', async () => {
  const output = await mkdtemp(join(tmpdir(), 'insightflow-production-'));
  try {
    await writeFile(join(output, 'stale.html'), 'localhost');
    const paths = await build({ output, apiUrl: productionApi, production: true });
    assert.equal(paths.length, 15);
    const files = (await readdir(output, { recursive: true, withFileTypes: true })).filter(
      (entry) => entry.isFile(),
    );
    assert.equal(files.length, 21);
    for (const path of paths) {
      const html = await readFile(join(output, path), 'utf8');
      assert(html.includes(`src="${productionApi}/sdk/tracker.js"`));
      assert(html.includes(`data-api-url="${productionApi}/api/events"`));
      assert(html.includes('data-site-id="demo_store"'));
      assert(html.includes(`script-src 'self' ${productionApi};`));
      assert(html.includes(`connect-src 'self' ${productionApi};`));
      assert(!/localhost|127\.0\.0\.1/.test(html));
      for (const [, link] of html.matchAll(/href="(\/products\/[^"#?]+\.html)"/g))
        assert(paths.includes(link.slice(1)), `Unresolved product link in ${path}`);
    }
    for (const asset of [
      'style.css',
      'js/store.js',
      'js/cart.js',
      'js/art.js',
      'data/products.json',
    ])
      assert.deepEqual(
        await readFile(join(output, asset)),
        await readFile(new URL('../' + asset, import.meta.url)),
      );
    const html = await readFile(join(output, 'index.html'), 'utf8');
    await writeFile(
      join(output, 'index.html'),
      html.replace(productionApi, 'http://localhost:5000'),
    );
    await assert.rejects(verifyBuild({ output, apiUrl: productionApi, production: true }));
    await build({ output, apiUrl: productionApi, production: true });
    await writeFile(join(output, '.env'), 'unexpected-file');
    await assert.rejects(verifyBuild({ output, apiUrl: productionApi, production: true }));
    await assert.rejects(
      verifyBuild({ output, apiUrl: 'http://localhost:5000', production: true }),
    );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
test('generator rejects credential or non-origin API values', async () => {
  for (const apiUrl of [
    'file:///secret',
    'https://user:password@example.invalid',
    'https://example.invalid/api',
    'https://example.invalid/?key=secret',
  ])
    await assert.rejects(build({ apiUrl }));
});
test('cart combines identical options and computes cents and discount exactly', () => {
  let cart = addItem([], products[0].slug, 'Sand', 2, products);
  cart = addItem(cart, products[0].slug, 'Sand', 1, products);
  cart = addItem(cart, products[1].slug, 'Forest', 1, products);
  assert.deepEqual(totals(cart, products, 'DEMO10'), {
    subtotal: 47600,
    discount: 4760,
    total: 42840,
    count: 4,
  });
  assert.equal(cart.length, 2);
  assert.equal(addItem(cart, products[0].slug, 'Sand', 20, products)[0].quantity, 20);
  cart = setQuantity(cart, 0, 1, products);
  assert.equal(totals(cart, products).subtotal, 21800);
  assert.equal(setQuantity(cart, 0, 0, products).length, 1);
});
test('invalid quantities, products, variants and saved carts fail safely', () => {
  for (const value of [
    null,
    {},
    [{ slug: 'unknown', option: 'Sand', quantity: 1 }],
    [{ slug: products[0].slug, option: 'Sand', quantity: -1 }],
    [{ slug: products[0].slug, option: 'oops', quantity: 1 }],
  ])
    assert.throws(() => validateCart(value, products));
  assert.throws(() => setQuantity([], 0, 1, products));
  assert.throws(() => addItem([], products[0].slug, 'Sand', 1.5, products));
  assert.equal(
    loadCart({ getItem: () => '{broken', removeItem: () => {} }, products).cart.length,
    0,
  );
  assert.equal(
    loadCart(
      {
        getItem: () => {
          throw new Error('blocked');
        },
        removeItem: () => {},
      },
      products,
    ).cart.length,
    0,
  );
  assert(!cartKey.startsWith('insightflow:'));
});
