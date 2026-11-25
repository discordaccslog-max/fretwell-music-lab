// Checkout page: order summary from the cart (prices worked out from products.js), the Terms agreement,
// and the payment buttons. No personal or card details are entered on this page.
import { cartLines, cartTotal, CART_EVENT } from '../cart.js';

/*
 * Payment options. Both handlers currently null — clicking either payment button does nothing.
 * Direct-checkout routing was removed on 2026-11-24.
 */
const PAYMENT_OPTIONS = {
  'option-1': null,
  'option-2': null,
};

const root = new URL('../../', import.meta.url).href;
const summary = document.querySelector('[data-checkout-summary]');
const payArea = document.querySelector('[data-checkout-pay]');
const box = document.querySelector('#agree-checkout');
const hint = document.querySelector('#agree-hint-checkout');
const status = document.querySelector('[data-pay-status]');
const buttons = [...document.querySelectorAll('[data-pay]')];

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) e.append(kid);
  return e;
}

function renderSummary() {
  const lines = cartLines();
  summary.textContent = '';
  if (!lines.length) {
    payArea.hidden = true;
    summary.append(el('div', { class: 'cart-empty' },
      el('p', { class: 'lede' }, 'Your cart is empty, so there is nothing to check out.'),
      el('p', {}, 'Browse the ', el('a', { href: root + '#foundations' }, 'tools'), ' and ', el('a', { href: root + '#guides' }, 'guides'), ', then choose “Add to cart” on any product page.')));
    return;
  }
  payArea.hidden = false;
  const total = cartTotal();
  summary.append(
    el('ul', { class: 'co-lines' }, lines.map((l) => el('li', { class: 'co-line' },
      el('div', {},
        el('p', { class: 'co-name' }, l.product.name),
        el('p', { class: 'co-sub' }, `${l.product.tier === 'Courses' ? 'Course' : l.product.tier === 'Studio Editions' ? 'Studio Edition' : 'Foundations tool'} · $${l.price}`),
        l.addons.length ? el('ul', { class: 'co-addons' }, l.addons.map((a) => el('li', {}, `+ ${a.name} · $${a.price}`))) : null,
        l.alsoIn ? el('p', { class: 'cart-note' }, `Already included in ${l.alsoIn}, which is also in your order. You can remove it in your cart.`) : null),
      el('p', { class: 'co-price' }, `$${l.total}`)))),
    el('dl', { class: 'co-totals' },
      el('div', {}, el('dt', {}, 'Subtotal'), el('dd', {}, `$${total}`)),
      el('div', {}, el('dt', {}, 'Taxes'), el('dd', {}, 'Calculated by the payment provider, if applicable, before you pay')),
      el('div', { class: 'co-grand' }, el('dt', {}, 'Total before taxes'), el('dd', {}, `$${total} USD`))),
    el('p', { class: 'small' }, el('a', { href: root + 'cart/' }, 'Edit your cart')));
  buttons.forEach((b) => { b.dataset.total = String(total); });
}

function sync() {
  const on = box.checked;
  buttons.forEach((b) => {
    if (on) b.removeAttribute('aria-disabled'); else b.setAttribute('aria-disabled', 'true');
  });
  hint.textContent = on ? '' : 'Tick the box above to agree to the Terms of Service and Refund Policy before you pay.';
  hint.classList.remove('is-needed');
}

buttons.forEach((b) => {
  b.addEventListener('click', () => {
    if (!box.checked) { hint.textContent = 'Tick the box above to agree to the Terms of Service and Refund Policy before you pay.'; hint.classList.add('is-needed'); box.focus(); return; }
    const handler = PAYMENT_OPTIONS[b.dataset.pay];
    if (handler) handler({ lines: cartLines(), total: cartTotal(), currency: 'USD' });
    // All handlers currently null — click consumes event, nothing else.
  });
});

box.addEventListener('change', sync);
window.addEventListener(CART_EVENT, renderSummary);
window.addEventListener('storage', (e) => { if (e.key === 'fretwell.cart') renderSummary(); });
renderSummary();
sync();
