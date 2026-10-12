import { addItem, cartKey, loadCart, money, setQuantity, totals } from './cart.js';
import { productArt } from './art.js';
const feedback = document.querySelector('#feedback');
function notify(message) {
  feedback.textContent = message;
}
const storage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};
const menu = document.querySelector('.menu-toggle');
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.querySelector('#main-nav').classList.toggle('open', open);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open menu');
    document.querySelector('#main-nav').classList.remove('open');
  }
});
for (const [id, message] of [
  ['newsletter-form', 'You’re on the fictional list. No email was stored.'],
  ['contact-form', 'Demo message previewed. Nothing was sent or stored.'],
]) {
  document.getElementById(id)?.addEventListener('submit', (event) => {
    event.preventDefault();
    notify(message);
  });
}
try {
  const response = await fetch('/data/products.json');
  if (!response.ok) throw new Error('Unable to load collection');
  const products = await response.json();
  const loaded = loadCart(storage, products);
  let cart = loaded.cart;
  let promo = '';
  try {
    if (storage.getItem('northwind-goods:promo') === 'DEMO10') promo = 'DEMO10';
  } catch {}
  if (loaded.error) notify(loaded.error);
  const count = () =>
    document.querySelectorAll('[data-cart-count]').forEach((element) => {
      element.textContent = totals(cart, products).count;
    });
  function persist() {
    try {
      storage.setItem(cartKey, JSON.stringify(cart));
    } catch {
      notify('Cart storage is unavailable. Your cart will last until this page closes.');
    }
    count();
  }
  function add(slug, option, quantity) {
    cart = addItem(cart, slug, option, quantity, products);
    notify(`${products.find((product) => product.slug === slug).name} added to your bag.`);
    persist();
  }
  function summary() {
    const result = totals(cart, products, promo);
    return `<dl><div><dt>Subtotal</dt><dd>${money(result.subtotal)}</dd></div><div><dt>Demo discount</dt><dd>−${money(result.discount)}</dd></div><div><dt>Fictional delivery</dt><dd>Free</dd></div><div class="total"><dt>Total</dt><dd>${money(result.total)}</dd></div></dl>`;
  }
  function renderCart() {
    const lines = document.querySelector('#cart-lines');
    if (!lines) return;
    lines.innerHTML = cart.length
      ? cart
          .map((line, index) => {
            const product = products.find((product) => product.slug === line.slug);
            return `<article class="cart-line"><a class="product-art" href="/products/${product.slug}.html" aria-label="View ${product.name}">${productArt(product.art, line.option)}</a><div><h2><a href="/products/${product.slug}.html">${product.name}</a></h2><p>${line.option} · ${money(product.price)}</p><div class="quantity"><button data-cart-step="-1" data-index="${index}" aria-label="Decrease ${product.name} quantity">−</button><span aria-label="Quantity">${line.quantity}</span><button data-cart-step="1" data-index="${index}" aria-label="Increase ${product.name} quantity" ${line.quantity === 20 ? 'disabled' : ''}>+</button></div><button class="text-button" data-remove="${index}">Remove ${product.name}</button></div><strong>${money(product.price * line.quantity)}</strong></article>`;
          })
          .join('')
      : '<div class="empty-state"><h2>Your bag is waiting for a little good.</h2><p>No products yet. Explore the collection to find your everyday favorite.</p><a class="button primary" href="/shop.html">Explore the collection</a></div>';
    document.querySelector('#cart-totals').innerHTML = summary();
    const checkoutLink = document.querySelector('#checkout-link');
    checkoutLink.setAttribute('aria-disabled', String(!cart.length));
    lines.querySelectorAll('[data-cart-step]').forEach((button) =>
      button.addEventListener('click', () => {
        const index = Number(button.dataset.index);
        cart = setQuantity(
          cart,
          index,
          Math.max(0, Math.min(20, cart[index].quantity + Number(button.dataset.cartStep))),
          products,
        );
        persist();
        renderCart();
      }),
    );
    lines.querySelectorAll('[data-remove]').forEach((button) =>
      button.addEventListener('click', () => {
        cart = setQuantity(cart, Number(button.dataset.remove), 0, products);
        persist();
        renderCart();
      }),
    );
  }
  document.querySelector('#checkout-link')?.addEventListener('click', (event) => {
    if (!cart.length) {
      event.preventDefault();
      notify('Add a product before checkout.');
    }
  });
  document.querySelectorAll('[data-add]').forEach((button) =>
    button.addEventListener('click', () => {
      const product = products.find((product) => product.slug === button.dataset.add);
      add(product.slug, (product.colors || product.sizes)[0], 1);
    }),
  );
  const detail = document.querySelector('[data-product]');
  if (detail) {
    const product = products.find((product) => product.slug === detail.dataset.product);
    let option = (product.colors || product.sizes)[0];
    let view = 0;
    const gallery = () => {
      document.querySelector('#gallery-main').innerHTML = productArt(product.art, option, view);
      document
        .querySelector('#gallery-main')
        .setAttribute(
          'aria-label',
          `${product.name}, ${['front', 'side', 'detail'][view]} view, ${option}`,
        );
    };
    detail.querySelectorAll('[data-gallery]').forEach((button) =>
      button.addEventListener('click', () => {
        view = Number(button.dataset.gallery);
        detail
          .querySelectorAll('[data-gallery]')
          .forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        gallery();
      }),
    );
    detail.querySelectorAll('[data-option]').forEach((button) =>
      button.addEventListener('click', () => {
        option = button.dataset.option;
        document.querySelector('#selected-option').textContent = option;
        detail
          .querySelectorAll('[data-option]')
          .forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        gallery();
      }),
    );
    detail.querySelectorAll('[data-step]').forEach((button) =>
      button.addEventListener('click', () => {
        const quantity = document.querySelector('#quantity');
        quantity.value = Math.max(
          1,
          Math.min(20, Number(quantity.value) + Number(button.dataset.step)),
        );
      }),
    );
    for (const [id, buy] of [
      ['add-to-cart', false],
      ['buy-now', true],
    ])
      document.getElementById(id).addEventListener('click', () => {
        add(product.slug, option, Number(document.querySelector('#quantity').value));
        if (buy) location.href = '/checkout.html';
      });
  }
  const tabs = [...document.querySelectorAll('[data-tab]')];
  tabs.forEach((button, index) => {
    button.addEventListener('click', () =>
      tabs.forEach((tab, tabIndex) => {
        const active = tabIndex === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        document.querySelector(`#panel-${tabIndex}`).hidden = !active;
      }),
    );
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? tabs.length - 1
            : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    });
  });
  const cards = [...document.querySelectorAll('.product-card')];
  let category = 'All';
  if (document.body.dataset.page === 'shop') {
    try {
      category = sessionStorage.getItem('northwind-goods:category') || 'All';
      sessionStorage.removeItem('northwind-goods:category');
    } catch {}
    if (!['All', 'Home', 'Everyday', 'Tech', 'Wear'].includes(category)) category = 'All';
  }
  function filterCards() {
    const query = document.querySelector('#search').value.trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      card.hidden =
        !(category === 'All' || card.dataset.category === category) ||
        !card.dataset.name.includes(query);
      if (!card.hidden) visible++;
    });
    document
      .querySelectorAll('[data-filter]')
      .forEach((button) =>
        button.setAttribute('aria-pressed', String(button.dataset.filter === category)),
      );
    if (document.querySelector('#results-count'))
      document.querySelector('#results-count').textContent = `${visible} essentials`;
    if (document.querySelector('#no-results'))
      document.querySelector('#no-results').hidden = visible > 0;
  }
  document.querySelectorAll('[data-filter]').forEach((button) =>
    button.addEventListener('click', () => {
      category = button.dataset.filter;
      filterCards();
    }),
  );
  document.querySelector('#sort')?.addEventListener('change', (event) => {
    const sorted = [...cards].sort((a, b) =>
      event.target.value === 'low'
        ? Number(a.dataset.price) - Number(b.dataset.price)
        : event.target.value === 'high'
          ? Number(b.dataset.price) - Number(a.dataset.price)
          : event.target.value === 'name'
            ? a.dataset.name.localeCompare(b.dataset.name)
            : cards.indexOf(a) - cards.indexOf(b),
    );
    sorted.forEach((card) => document.querySelector('#shop-grid').append(card));
  });
  document.querySelector('#search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    filterCards();
    notify(
      cards.length ? 'Collection filtered on this page.' : 'Search is available in the collection.',
    );
  });
  document.querySelectorAll('[data-category-link]').forEach((link) =>
    link.addEventListener('click', () => {
      try {
        sessionStorage.setItem('northwind-goods:category', link.dataset.categoryLink);
      } catch {}
    }),
  );
  document.querySelector('#promo-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    promo =
      document.querySelector('#promo').value.trim().toUpperCase() === 'DEMO10' ? 'DEMO10' : '';
    document.querySelector('#promo-feedback').textContent = promo
      ? 'Demo discount applied: 10%.'
      : 'Enter DEMO10 for a fictional discount.';
    try {
      storage.setItem('northwind-goods:promo', promo);
    } catch {}
    renderCart();
  });
  function renderCheckout() {
    const checkoutSummary = document.querySelector('#checkout-summary');
    if (!checkoutSummary) return;
    checkoutSummary.innerHTML = cart.length
      ? cart
          .map(
            (line) =>
              `<p>${products.find((product) => product.slug === line.slug).name} × ${line.quantity}</p>`,
          )
          .join('') + summary()
      : '<p>Your bag is empty. Add an item before placing a demo order.</p>';
    document.querySelector('#place-order').disabled = !cart.length;
  }
  document.querySelector('#checkout-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!cart.length) {
      notify('Your bag is empty.');
      return;
    }
    // Do not read form values. Store only a fictional order token, never personal data.
    try {
      sessionStorage.setItem(
        'northwind-goods:order',
        'NW-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
      );
      storage.removeItem('northwind-goods:promo');
    } catch {}
    cart = [];
    persist();
    location.href = '/order-confirmation.html';
  });
  if (document.querySelector('#order-number')) {
    try {
      const number = sessionStorage.getItem('northwind-goods:order');
      if (/^NW-[A-F0-9]{8}$/.test(number))
        document.querySelector('#order-number').textContent = `Demo order number: ${number}`;
    } catch {}
  }
  window.addEventListener('storage', (event) => {
    if (event.key === cartKey || event.key === 'northwind-goods:promo' || event.key === null) {
      const loaded = loadCart(storage, products);
      cart = loaded.cart;
      if (loaded.error) notify(loaded.error);
      try {
        promo = storage.getItem('northwind-goods:promo') === 'DEMO10' ? 'DEMO10' : '';
      } catch {}
      count();
      renderCart();
      renderCheckout();
    }
  });
  count();
  filterCards();
  renderCart();
  renderCheckout();
  document.body.dataset.ready = 'true';
} catch (error) {
  notify(`The demo collection could not load. Please reload. ${error.message}`);
  document
    .querySelectorAll('[data-add], #add-to-cart, #buy-now, #place-order')
    .forEach((button) => {
      button.disabled = true;
    });
  document.body.dataset.ready = 'error';
}
