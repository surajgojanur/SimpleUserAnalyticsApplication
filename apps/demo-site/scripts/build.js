import { readFile, writeFile, mkdir, copyFile, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
import { productArt } from '../js/art.js';
import { money } from '../js/cart.js';
const root = fileURLToPath(new URL('../', import.meta.url));
export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
const buttonLink = (href, label, primary = false) =>
  `<a class="button ${primary ? 'primary' : ''}" href="${href}">${label}</a>`;
export function productCard(product) {
  return `<article class="product-card" data-category="${product.category}" data-name="${product.name.toLowerCase()}" data-price="${product.price}"><a class="product-art" href="/products/${product.slug}.html" aria-label="View ${product.name}">${productArt(product.art, product.colors?.[0])}</a><div class="card-caption"><p class="eyebrow">${product.category}</p><h3><a href="/products/${product.slug}.html">${product.name}</a></h3><p>${money(product.price)} <span class="rating" aria-label="Rated 4.8 out of 5, fictional">★★★★★</span></p><button class="add-card" data-add="${product.slug}">Add to bag</button></div></article>`;
}
const newsletter = `<section class="newsletter wrap"><div><p class="eyebrow">The occasional good thing</p><h2>A note for your next slow morning.</h2><p>New arrivals and small ideas for everyday living. This demo does not collect your email.</p></div><form id="newsletter-form"><label for="newsletter-email">Demo email (fixed fictional value)</label><input id="newsletter-email" type="email" value="shopper@example.invalid" readonly><button id="newsletter-submit" class="primary">Join the demo list</button></form></section>`;
function home(products) {
  return `<section class="hero wrap"><div><p class="eyebrow">Thoughtfully chosen. Everyday loved.</p><h1>Good things.<br>Better everyday.</h1><p>Quiet essentials for the little moments — at home, on the move, and somewhere in between.</p><div class="actions">${buttonLink('/shop.html', 'Explore the collection', true)}${buttonLink('/about.html', 'Meet Northwind')}</div><p class="hero-note">Made-up goods. A very real analytics journey.</p></div><a href="/products/aurora-headphones.html" class="hero-art" aria-label="Discover Aurora Headphones">${productArt('headphones', 'Forest')}<span>The Aurora Collection · From $129</span></a></section>
  <section class="benefits wrap"><p>↗ Considered everyday essentials</p><p>◇ Thoughtful materials</p><p>✓ Fictional 30-day returns</p></section>
  <section class="wrap section"><div class="section-heading"><div><p class="eyebrow">The everyday edit</p><h2>Small upgrades. Big favorites.</h2></div><a href="/shop.html">See the full collection →</a></div><div class="product-grid">${products.slice(0, 4).map(productCard).join('')}</div></section>
  <section class="wrap section"><p class="eyebrow">Find your kind of good</p><h2>For wherever life happens.</h2><div class="categories">${['Home', 'Everyday', 'Tech', 'Wear'].map((category, index) => `<a href="/shop.html" class="category-tile tone-${index}" data-category-link="${category}"><span aria-hidden="true">${['⌂', '↗', '◉', '≈'][index]}</span><h3>${category}</h3><p>Explore the ${category.toLowerCase()} edit →</p></a>`).join('')}</div></section>
  <section class="story-band"><div class="wrap"><p class="eyebrow">Less, but a little better</p><h2>Things that fit your life,<br>not the other way around.</h2><p>We believe the everyday deserves a little care. Meet a fictional store built around useful objects, honest details, and unhurried browsing.</p>${buttonLink('/about.html', 'Read our story')}</div></section>
  <section class="wrap section"><p class="eyebrow">Kind words · fictional reviews</p><h2>Made for everyday people.</h2><div class="testimonials"><blockquote>“The mug I reach for every morning.”<cite>— Alex, demo shopper</cite></blockquote><blockquote>“Simple, useful, and a joy to carry.”<cite>— Sam, demo shopper</cite></blockquote><blockquote>“A quieter corner of the internet.”<cite>— Taylor, demo shopper</cite></blockquote></div></section>${newsletter}`;
}
function shop(products) {
  return `<section class="wrap section"><p class="eyebrow">The full collection</p><h1>Find your everyday favorite.</h1><p>Eight thoughtful essentials. Browse by category, explore the details, and build a fictional bag.</p><div class="shop-controls"><div class="filters" role="group" aria-label="Filter by category">${['All', 'Home', 'Everyday', 'Tech', 'Wear'].map((category) => `<button data-filter="${category}" aria-pressed="${category === 'All'}">${category}</button>`).join('')}</div><label>Sort by <select id="sort"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="name">Name</option></select></label></div><p id="results-count" role="status">8 essentials</p><p id="no-results" hidden>No products match your search. Try another word or category.</p><div id="shop-grid" class="product-grid">${products.map(productCard).join('')}</div></section>${newsletter}`;
}
function productPage(product, products) {
  const options = product.colors || product.sizes;
  return `<section class="wrap section"><p class="breadcrumbs"><a href="/shop.html">Collection</a> / ${product.category} / ${product.name}</p><div class="product-detail" data-product="${product.slug}"><div class="gallery"><div id="gallery-main" class="product-art" role="img" aria-label="${product.name}, front view">${productArt(product.art, product.colors?.[0])}</div><div class="thumbnails" role="group" aria-label="Product gallery">${['Front', 'Side', 'Detail'].map((view, index) => `<button data-gallery="${index}" aria-label="${view} view" aria-pressed="${index === 0}">${productArt(product.art, product.colors?.[0], index)}</button>`).join('')}</div></div><div class="product-info"><p class="eyebrow">${product.category} · The Northwind edit</p><h1>${product.name}</h1><p class="rating">★★★★★ <span>4.8 · 24 fictional reviews</span></p><p class="price">${money(product.price)}</p><p>${product.description}</p><fieldset><legend>${product.colors ? 'Color' : 'Size'}: <span id="selected-option">${options[0]}</span></legend><div class="options">${options.map((option, index) => `<button type="button" data-option="${option}" aria-pressed="${index === 0}">${option}</button>`).join('')}</div></fieldset><label for="quantity">Quantity</label><div class="quantity"><button data-step="-1" aria-label="Decrease quantity">−</button><input id="quantity" type="number" min="1" max="20" value="1" readonly><button data-step="1" aria-label="Increase quantity">+</button></div><div class="purchase-actions"><button class="primary" id="add-to-cart">Add to bag</button><button id="buy-now">Buy now</button></div><p class="fine-print">Fictional free delivery · No real orders or payments</p><ul>${product.details.map((detail) => `<li>${detail}</li>`).join('')}</ul></div></div></section>
  <section class="wrap section product-reading"><div role="tablist" aria-label="Product information" class="tabs">${['Description', 'Details', 'Reviews'].map((label, index) => `<button role="tab" id="tab-${index}" aria-controls="panel-${index}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-tab="${index}">${label}</button>`).join('')}</div><div id="panel-0" role="tabpanel" aria-labelledby="tab-0"><h2>A place in your everyday.</h2><p>${product.description}</p><p>Built around the moments between the big moments: a familiar routine, a change of pace, an afternoon outside. Thoughtfully chosen proportions and soft finishes keep this piece easy to enjoy.</p><div class="detail-story"><div class="product-art">${productArt(product.art, product.colors?.[1], 1)}</div><div><h3>Simple on purpose.</h3><p>No unnecessary extras. Just useful details, a considered finish, and room to make it your own.</p><p>All specifications are illustrative, for this fictional demo collection.</p></div></div></div><div id="panel-1" role="tabpanel" aria-labelledby="tab-1" hidden><h2>The little details.</h2><ul>${product.details.map((detail) => `<li>${detail}</li>`).join('')}</ul><p>Care gently, use often. This is illustrative product information, not a real product warranty.</p></div><div id="panel-2" role="tabpanel" aria-labelledby="tab-2" hidden><h2>From the demo community.</h2><blockquote>“A useful little upgrade to my everyday.”<cite>— Jamie · Fictional verified review</cite></blockquote><blockquote>“The details feel thoughtfully considered.”<cite>— Morgan · Fictional review</cite></blockquote></div></section>
  <section class="wrap section faq"><p class="eyebrow">A few helpful answers</p><h2>Before you make it yours.</h2>${[
    [
      'How does delivery work?',
      'In this demo, shipping is fictional and always free. No parcel will be sent.',
    ],
    ['Can I return it?', 'The fictional policy is 30 days. There are no real purchases to return.'],
    [
      'Will I be charged?',
      'No. Checkout uses fixed fictional values, with no payment or personal data collected.',
    ],
  ]
    .map(
      ([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`,
    )
    .join('')}</section>
  <section class="wrap section"><div class="section-heading"><div><p class="eyebrow">Better together</p><h2>You may also like</h2></div><a href="/shop.html">Shop all →</a></div><div class="product-grid recommendations">${products
    .filter((item) => item.slug !== product.slug)
    .slice(0, 3)
    .map(productCard)
    .join('')}</div></section>`;
}
const cart = `<section class="wrap section"><p class="eyebrow">Your everyday edit</p><h1>Your bag</h1><p>Take a moment. This is a fictional cart; no real purchases.</p><div class="cart-layout"><div id="cart-lines"></div><aside class="order-summary"><h2>Order summary</h2><div id="cart-totals"></div><form id="promo-form"><label for="promo">Demo promo code</label><div class="promo-row"><input id="promo" placeholder="Try DEMO10" maxlength="20"><button id="apply-promo">Apply</button></div></form><p id="promo-feedback" role="status"></p><a class="button primary" id="checkout-link" href="/checkout.html">Checkout</a><a class="button" href="/shop.html">Continue shopping</a><p class="fine-print">No real orders. Fictional free shipping.</p></aside></div></section>`;
const checkout = `<section class="wrap section"><p class="eyebrow">One last step</p><h1>Demo checkout</h1><p>Use the fixed fictional values below. Nothing is sent anywhere, and no real personal information is collected.</p><div class="cart-layout"><form id="checkout-form" class="checkout-form"><h2>Fictional delivery details</h2>${[
  ['demo-name', 'Demo name', 'Demo Shopper'],
  ['demo-email', 'Demo email', 'shopper@example.invalid'],
  ['demo-address', 'Demo address', '123 Fictional Lane'],
  ['demo-city', 'Demo city', 'Example City'],
  ['demo-postcode', 'Demo postal code', '00000'],
]
  .map(
    ([id, label, value]) =>
      `<label for="${id}">${label}</label><input id="${id}" value="${value}" readonly>`,
  )
  .join(
    '',
  )}<label for="demo-delivery">Demo delivery option</label><select id="demo-delivery"><option>Standard · Free (fictional)</option><option>Express · Free (fictional)</option></select><fieldset><legend>Payment</legend><p>Demo only. No payment fields or charges.</p></fieldset><button class="primary" id="place-order">Place demo order</button></form><aside class="order-summary"><h2>Your order</h2><div id="checkout-summary"></div><a href="/cart.html">Back to bag</a></aside></div></section>`;
const confirmation = `<section class="wrap section confirmation"><p class="success-mark" aria-hidden="true">✓</p><p class="eyebrow">All set · Demo order</p><h1>A little good is on its way.</h1><p>Thanks for exploring Northwind. No actual order was placed and no payment was taken.</p><p id="order-number">Demo order number: NW-DEMO</p>${buttonLink('/shop.html', 'Keep exploring', true)}${buttonLink('/', 'Back home')}</section>`;
const about = `<section class="wrap section prose"><p class="eyebrow">Our fictional story</p><h1>For a life well lived,<br>one small thing at a time.</h1><p class="lead">Northwind Goods is a made-up shop with a simple idea: the everyday deserves a little care.</p><h2>Fewer things, chosen thoughtfully.</h2><p>From a quiet morning cup to a bag that follows you everywhere, useful objects become familiar companions. Our collection brings together soft colors, thoughtful shapes, and practical details.</p><h2>A store with a purpose.</h2><p>This experience demonstrates InsightFlow Analytics. Browsing, comparing, and adding products creates real click and page-view events. Every product, review, and order is fictional.</p><h2>Nothing to buy. Plenty to explore.</h2><p>There are no payments or personal data forms. Wander through the collection and see your journey in the analytics dashboard.</p>${buttonLink('/shop.html', 'Find your favorite', true)}</section>`;
const contact = `<section class="wrap section prose"><p class="eyebrow">A friendly hello</p><h1>Let’s keep it simple.</h1><p>This is a demo contact page. Please do not enter real personal information. The fixed values below are not sent or stored.</p><form id="contact-form" class="checkout-form"><label for="contact-email">Fictional email</label><input id="contact-email" value="shopper@example.invalid" readonly><label for="contact-topic">Demo topic</label><select id="contact-topic"><option>Product details</option><option>Fictional delivery</option><option>Demo returns</option></select><label for="contact-message">Fictional message</label><textarea id="contact-message" readonly>Hello, I am exploring this fictional store.</textarea><button class="primary">Preview demo message</button></form><h2>Questions about the demo?</h2><p>The store is static HTML and vanilla JavaScript. Your bag stays in this browser. Nothing here sends an order or a message.</p>${buttonLink('/about.html', 'About this store')}</section>`;
export const productionBuild = () =>
  process.env.NETLIFY === 'true' ||
  process.env.CONTEXT === 'production' ||
  process.env.NODE_ENV === 'production';
export function apiOrigin(apiUrl, production = productionBuild()) {
  if (apiUrl === undefined && !production) apiUrl = 'http://localhost:5000';
  let api;
  try {
    api = new URL(apiUrl);
  } catch {
    throw new Error('DEMO_API_URL is required and must be a valid public API origin');
  }
  if (
    !['http:', 'https:'].includes(api.protocol) ||
    api.username ||
    api.password ||
    api.pathname !== '/' ||
    api.search ||
    api.hash ||
    api.origin !== apiUrl
  )
    throw new Error(
      'DEMO_API_URL must be an HTTP(S) origin without credentials, path, query, or fragment',
    );
  if (
    production &&
    (api.protocol !== 'https:' ||
      isIP(api.hostname.replace(/^\[|\]$/g, '')) ||
      !api.hostname.includes('.') ||
      /(^|\.)(localhost|local|internal|invalid|test|example)$/.test(api.hostname) ||
      /(^|[.-])(example|placeholder|your-api|your-backend)([.-]|$)/.test(api.hostname))
  )
    throw new Error(
      'Production DEMO_API_URL must be an HTTPS origin with a public, non-placeholder hostname',
    );
  return api.origin;
}
const assets = ['style.css', 'js/store.js', 'js/cart.js', 'js/art.js', 'data/products.json'];
async function readProducts() {
  return JSON.parse(await readFile(new URL('../data/products.json', import.meta.url), 'utf8'));
}
export async function verifyBuild({ output, apiUrl, production = productionBuild() }) {
  const origin = apiOrigin(apiUrl, production);
  const products = await readProducts();
  const pages = [
    'index.html',
    'shop.html',
    'cart.html',
    'checkout.html',
    'order-confirmation.html',
    'about.html',
    'contact.html',
    ...products.map((p) => `products/${p.slug}.html`),
  ];
  const expected = new Set([...pages, ...assets, 'build-info.json']);
  const entries = await readdir(output, { recursive: true, withFileTypes: true });
  if (
    entries.some(
      (entry) =>
        !entry.isFile() &&
        (!entry.isDirectory() ||
          !['js', 'data', 'products'].includes(
            relative(output, resolve(entry.parentPath, entry.name)),
          )),
    )
  )
    throw new Error('Build output contains unexpected directories or symbolic links');
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(output, resolve(entry.parentPath, entry.name)));
  if (files.length !== expected.size || files.some((file) => !expected.has(file)))
    throw new Error('Build output contains missing or unexpected deployable files');
  for (const path of pages) {
    const html = await readFile(resolve(output, path), 'utf8');
    if (
      !html.includes(
        `<script async src="${origin}/sdk/tracker.js" data-site-id="demo_store" data-api-url="${origin}/api/events"></script>`,
      ) ||
      (html.match(/\/sdk\/tracker\.js/g) || []).length !== 1 ||
      !html.includes(`script-src 'self' ${origin};`) ||
      !html.includes(`connect-src 'self' ${origin};`) ||
      (production && /localhost|127\.0\.0\.1|\{\{[A-Z_]+\}\}/.test(html))
    )
      throw new Error(`Generated tracker or CSP verification failed for ${path}`);
    for (const [, link] of html.matchAll(/(?:href|src)="(\/[^"?#]*)"/g)) {
      if (!expected.has(link === '/' ? 'index.html' : link.slice(1)))
        throw new Error(`Generated page has an unresolved local link: ${path}`);
    }
  }
  return pages;
}
export async function build({
  output = resolve(root, 'dist'),
  apiUrl = process.env.DEMO_API_URL,
  production = productionBuild(),
} = {}) {
  const origin = apiOrigin(apiUrl, production);
  output = resolve(output);
  const sourceRelative = relative(root, output);
  if (
    !relative(output, root).startsWith('..') ||
    (!sourceRelative.startsWith('..') && sourceRelative !== 'dist')
  )
    throw new Error(
      'Build output must be dist or a separate temporary directory, never source files',
    );
  await rm(output, { recursive: true, force: true });
  const products = await readProducts();
  const template = await readFile(new URL('../templates/page.html', import.meta.url), 'utf8');
  const pages = [
    ['index.html', 'Home', home(products), 'home'],
    ['shop.html', 'Collection', shop(products), 'shop'],
    ['cart.html', 'Your bag', cart, 'cart'],
    ['checkout.html', 'Checkout', checkout, 'checkout'],
    ['order-confirmation.html', 'Thank you', confirmation, 'confirmation'],
    ['about.html', 'Our story', about, 'about'],
    ['contact.html', 'Contact', contact, 'contact'],
    ...products.map((product) => [
      `products/${product.slug}.html`,
      product.name,
      productPage(product, products),
      'product',
    ]),
  ];
  const tracker = `<script async src="${origin}/sdk/tracker.js" data-site-id="demo_store" data-api-url="${origin}/api/events"></script>`;
  for (const [filename, title, content, page] of pages) {
    const values = {
      TITLE: escapeHtml(title),
      CONTENT: content,
      PAGE: page,
      API_ORIGIN: origin,
      TRACKER: tracker,
    };
    await mkdir(resolve(output, filename, '..'), { recursive: true });
    await writeFile(
      resolve(output, filename),
      template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => values[key]),
    );
  }
  for (const asset of assets) {
    await mkdir(resolve(output, asset, '..'), { recursive: true });
    await copyFile(resolve(root, asset), resolve(output, asset));
  }
  let commit = process.env.COMMIT_REF;
  if (!commit) {
    try {
      commit = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      commit = null;
    }
  }
  await writeFile(
    resolve(output, 'build-info.json'),
    JSON.stringify({ commit, apiOrigin: origin, pages: pages.length }, null, 2) + '\n',
  );
  return verifyBuild({ output, apiUrl: origin, production });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const pages = await build();
    console.log(
      `Built and verified ${pages.length} Northwind pages in dist; public tracker API ${apiOrigin(process.env.DEMO_API_URL)}`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
