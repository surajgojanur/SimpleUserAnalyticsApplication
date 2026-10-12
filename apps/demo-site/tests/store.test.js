import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from '../scripts/build.js';
import { addItem, setQuantity, totals, validateCart, loadCart, cartKey } from '../js/cart.js';
const products = JSON.parse(await readFile(new URL('../data/products.json', import.meta.url)));
test('generator creates all 15 pages with identical tracker and strict CSP', async () => {
  const output = await mkdtemp(new URL('../../../.cache/generator-', import.meta.url));
  try {
    const paths = await build({ output, apiUrl: 'https://api.example.invalid' });
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
    await build({ output });
    assert(
      (await readFile(join(output, 'index.html'), 'utf8')).includes(
        'http://localhost:5000/sdk/tracker.js',
      ),
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
