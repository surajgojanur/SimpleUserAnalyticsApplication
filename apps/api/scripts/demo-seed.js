import { createHash } from 'node:crypto';
function stableUuid(key) {
  const bytes = createHash('sha256').update(key).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function demoSeed(products, base, now = Date.now()) {
  const events = [];
  for (let session = 0; session < 30; session++) {
    const session_id = stableUuid(`northwind-seed:${base}:session:${session}`);
    const mobile = session % 3 === 0;
    const width = mobile ? 390 : 1440;
    let timestamp = Math.floor(now / 3600000) * 3600000 - (72 - session * 2) * 3600000;
    const product = products[(session + 3) % products.length];
    const paths = ['/'];
    if (session >= 9) paths.push('/shop.html', `/products/${product.slug}.html`);
    if (session >= 9 && session < 18 && session % 2 === 0)
      paths.push(`/products/${products[(session + 4) % products.length].slug}.html`);
    if (session === 15) paths.push('/about.html');
    if (session === 17) paths.push('/contact.html');
    if (session >= 18) paths.push('/cart.html');
    if (session >= 25) paths.push('/checkout.html');
    if (session >= 28) paths.push('/order-confirmation.html');
    let number = 0;
    for (const path of paths) {
      const productPage = path.startsWith('/products/');
      const height =
        path === '/'
          ? mobile
            ? 4850
            : 2800
          : path === '/shop.html'
            ? mobile
              ? 2700
              : 1800
            : productPage
              ? mobile
                ? 3900
                : 2650
              : mobile
                ? 1450
                : 1200;
      const emit = (event_type, click) =>
        events.push({
          site_id: 'demo_store',
          event_id: stableUuid(`northwind-seed:${base}:event:${session}:${number++}`),
          session_id,
          event_type,
          page_url: base + path,
          timestamp: new Date(timestamp),
          ...(click && { click }),
        });
      emit('page_view');
      const hotspots =
        path === '/'
          ? mobile
            ? [
                [0.75, 72],
                [0.3, 450],
                [0.28, 1300],
              ]
            : [
                [0.56, 75],
                [0.2, 415],
                [0.17, 1030],
              ]
          : path === '/shop.html'
            ? mobile
              ? [
                  [0.2, 365],
                  [0.24, 800],
                  [0.74, 1100],
                ]
              : [
                  [0.25, 330],
                  [0.18, 815],
                  [0.59, 815],
                ]
            : productPage
              ? mobile
                ? [
                    [0.23, 640],
                    [0.28, 1220],
                    [0.34, 1800],
                    [0.45, 2640],
                  ]
                : [
                    [0.21, 765],
                    [0.63, 505],
                    [0.68, 660],
                    [0.2, 1100],
                  ]
              : path === '/cart.html'
                ? mobile
                  ? [
                      [0.45, 450],
                      [0.5, 970],
                    ]
                  : [
                      [0.33, 510],
                      [0.76, 680],
                    ]
                : path === '/checkout.html'
                  ? mobile
                    ? [
                        [0.5, 540],
                        [0.5, 950],
                      ]
                    : [
                        [0.26, 710],
                        [0.29, 890],
                      ]
                  : [
                      [0.5, 410],
                      [0.5, 600],
                    ];
      const clicks = productPage
        ? 4 + (session % 4)
        : session < 9
          ? 1 + (session % 2)
          : 2 + (session % 3);
      for (let index = 0; index < clicks; index++) {
        timestamp += (3 + ((session + index) % 18)) * 1000;
        const [x, y] = hotspots[(session + index) % hotspots.length];
        // Small deterministic spread around actual controls, preserving repeatable seed IDs.
        const jitter = ((session * 17 + index * 13) % 31) - 15;
        emit('click', {
          x: Math.round(width * x + jitter),
          y: y + jitter,
          viewport_width: width,
          viewport_height: mobile ? 844 : 900,
          document_width: width,
          document_height: height,
        });
      }
      timestamp += 8000;
    }
  }
  return events;
}
