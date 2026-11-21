// Cart page: lists what is in the cart with prices from products.js, lets the buyer remove items,
// and shows the checkout button once a checkout page is set in site-config.js.
import { cartLines, cartTotal, removeFromCart, clearCart, CART_EVENT } from '../cart.js';
import { SITE_CONFIG } from '../site-config.js';

const host = document.querySelector('[data-cart]');
const root = new URL('../../', import.meta.url).href;
const status = document.querySelector('[data-cart-status]');

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) e.append(kid);
  return e;
}

function render() {
  const lines = cartLines();
  host.textContent = '';
  if (!lines.length) {
    host.append(el('div', { class: 'cart-empty' },
      el('p', { class: 'lede' }, 'Your cart is empty.'),
      el('p', {}, 'Browse the ', el('a', { href: root + '#foundations' }, 'tools'), ' and ', el('a', { href: root + '#courses' }, 'courses'), ', then choose “Add to cart” on any product page.')));
    return;
  }
  const list = el('ul', { class: 'cart-list' });
  for (const l of lines) {
    const kind = l.product.tier === 'Courses' ? 'Course' : l.product.tier === 'Studio Editions' ? 'Studio Edition' : 'Foundations tool';
    list.append(el('li', { class: 'cart-line' },
      el('div', { class: 'cart-item' },
        el('p', { class: 'cart-kind' }, kind),
        el('h2', { class: 'cart-name' }, el('a', { href: root + l.product.pagePath }, l.product.name)),
        l.addons.length ? el('ul', { class: 'cart-addons' }, l.addons.map((a) => el('li', {}, `${a.name}`, el('span', {}, `+$${a.price}`)))) : null,
        l.product.addons ? el('p', { class: 'cart-change' }, el('a', { href: root + l.product.pagePath }, l.addons.length ? 'Change add-ons' : 'Add add-ons')) : null,
        l.alsoIn ? el('p', { class: 'cart-note' }, `Already included in ${l.alsoIn}, which is also in your cart.`) : null),
      el('div', { class: 'cart-side' },
        el('p', { class: 'cart-price' }, `$${l.total}`),
        el('button', { type: 'button', class: 'linklike cart-remove', 'aria-label': `Remove ${l.product.name} from your cart`, onclick: () => { removeFromCart(l.id); status.textContent = `${l.product.name} was removed from your cart.`; } }, 'Remove'))));
  }
  const total = cartTotal();
  const checkout = (SITE_CONFIG.checkoutUrl || '').trim();
  const summary = el('div', { class: 'cart-summary' },
    el('p', { class: 'cart-total' }, 'Total ', el('strong', {}, `$${total}`), ' USD'),
    el('p', { class: 'small' }, `${lines.length} item${lines.length === 1 ? '' : 's'} · One-time purchase · Applicable taxes are shown at checkout`));
  if (checkout) {
    // Same agreement as on the product pages: checkout stays inactive until the box is ticked.
    const box = el('input', { type: 'checkbox', id: 'agree-cart' });
    const go = el('a', { class: 'btn btn-buy btn-lg', role: 'link', tabindex: '0', 'aria-disabled': 'true', 'aria-describedby': 'agree-hint-cart' }, `Checkout — $${total}`);
    const hint = el('p', { class: 'agree-hint', id: 'agree-hint-cart', 'aria-live': 'polite' });
    const sync = () => {
      if (box.checked) { go.href = new URL(checkout, root).href; go.removeAttribute('aria-disabled'); hint.textContent = ''; hint.classList.remove('is-needed'); }
      else { go.removeAttribute('href'); go.setAttribute('aria-disabled', 'true'); hint.textContent = 'Tick the box above to agree to the Terms of Service and Refund Policy before checkout.'; }
    };
    go.addEventListener('click', (e) => { if (!box.checked) { e.preventDefault(); hint.classList.add('is-needed'); box.focus(); } });
    go.addEventListener('keydown', (e) => { if (!box.checked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go.click(); } });
    box.addEventListener('change', sync);
    summary.append(el('div', { class: 'agree' }, box, el('label', { for: 'agree-cart' }, 'I agree to the ', el('a', { href: root + 'terms/' }, 'Terms of Service'), ' and ', el('a', { href: root + 'refunds/' }, 'Refund Policy'))), go, hint);
    sync();
  } else {
    summary.append(el('p', { class: 'cart-soon' }, 'Checkout for the cart isn’t available yet. Your cart is saved in this browser.'));
  }
  summary.append(el('p', {}, el('button', { type: 'button', class: 'linklike', onclick: () => { clearCart(); status.textContent = 'Your cart was emptied.'; } }, 'Empty cart')));
  host.append(el('div', { class: 'cart-grid' }, list, summary));
}

window.addEventListener(CART_EVENT, render);
window.addEventListener('storage', (e) => { if (e.key === 'fretwell.cart') render(); });
render();
