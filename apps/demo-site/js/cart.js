export const cartKey = 'northwind-goods:cart:v1';
export function validateCart(value, products) {
  if (!Array.isArray(value)) throw new Error('Saved cart is invalid. It has been cleared.');
  const seen = new Set();
  return value.map((line) => {
    if (!line || typeof line !== 'object')
      throw new Error('Saved cart is invalid. It has been cleared.');
    const product = products.find((item) => item.slug === line.slug);
    const options = product?.colors || product?.sizes || [];
    const key = `${line.slug}:${line.option}`;
    if (
      !product ||
      !options.includes(line.option) ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 20 ||
      seen.has(key)
    )
      throw new Error('Saved cart is invalid. It has been cleared.');
    seen.add(key);
    return { slug: line.slug, option: line.option, quantity: line.quantity };
  });
}
export function addItem(cart, slug, option, quantity, products) {
  const next = validateCart(cart, products).map((line) => ({ ...line }));
  validateCart([{ slug, option, quantity }], products);
  const existing = next.find((line) => line.slug === slug && line.option === option);
  if (existing) existing.quantity = Math.min(20, existing.quantity + quantity);
  else next.push({ slug, option, quantity });
  return next;
}
export function setQuantity(cart, index, quantity, products) {
  if (!Number.isInteger(index) || index < 0 || index >= cart.length)
    throw new Error('Unknown cart line');
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 20)
    throw new Error('Quantity must be between 0 and 20');
  const next = cart.map((line) => ({ ...line }));
  if (!quantity) next.splice(index, 1);
  else next[index].quantity = quantity;
  return validateCart(next, products);
}
export function totals(cart, products, promo = '') {
  const subtotal = validateCart(cart, products).reduce(
    (sum, line) =>
      sum + products.find((product) => product.slug === line.slug).price * line.quantity,
    0,
  );
  const discount = promo === 'DEMO10' ? Math.round(subtotal * 0.1) : 0;
  return {
    subtotal,
    discount,
    total: subtotal - discount,
    count: cart.reduce((sum, line) => sum + line.quantity, 0),
  };
}
export function loadCart(storage, products) {
  let raw;
  try {
    raw = storage.getItem(cartKey);
  } catch {
    return {
      cart: [],
      error: 'Cart storage is unavailable. Your cart will last until this page closes.',
    };
  }
  try {
    return { cart: validateCart(JSON.parse(raw || '[]'), products), error: '' };
  } catch {
    try {
      storage.removeItem(cartKey);
    } catch {}
    return { cart: [], error: 'Saved cart is invalid. It has been cleared.' };
  }
}
export const money = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
