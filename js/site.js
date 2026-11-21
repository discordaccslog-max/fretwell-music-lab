// Fretwell Music Lab — behaviour shared by every page: theme, menu, prices, buy buttons, contact details.
import { PRODUCT_BY_ID } from './products.js';
import { ADDONS, ADDON_ORDER, checkoutFor, totalFor } from './addons.js';
import { addToCart, inCart, cartCount, CART_EVENT } from './cart.js';
import { SITE_CONFIG } from './site-config.js';
import { hasKeys } from './core/keys.js';

const root = document.documentElement;

function effectiveTheme() {
  const t = root.getAttribute('data-theme');
  if (t) return t;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initTheme() {
  const buttons = document.querySelectorAll('.theme-toggle');
  const label = () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    buttons.forEach((b) => b.setAttribute('aria-label', `Switch to ${next} mode`));
  };
  buttons.forEach((b) => b.addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('fretwell.theme', next); } catch { /* storage unavailable */ }
    label();
  }));
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', label);
  label();
}

function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    });
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); toggle.focus(); }
    });
  }
  const here = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.site-nav a').forEach((a) => {
    const target = new URL(a.getAttribute('href'), location.href);
    if (!target.hash && target.pathname === here) a.setAttribute('aria-current', 'page');
  });
  if (hasKeys()) document.querySelectorAll('.nav-room').forEach((li) => { li.hidden = false; });
}

function initPrices() {
  document.querySelectorAll('[data-price-for]').forEach((el) => {
    const p = PRODUCT_BY_ID[el.getAttribute('data-price-for')];
    if (p) el.textContent = '$' + p.price;
  });
  document.querySelectorAll('[data-buy-for]').forEach((slot) => {
    const p = PRODUCT_BY_ID[slot.getAttribute('data-buy-for')];
    slot.textContent = '';
    if (!p) return;
    if (p.addons) initCourseBuy(slot, p);
    else {
      if (p.checkoutUrl) slot.append(...buyButton(p, () => p.checkoutUrl, `Buy now — $${p.price}`).nodes); // no checkout connected yet: no checkbox and no buy button
      slot.append(...cartButton(p, () => [], !p.checkoutUrl));
    }
  });
}

/** "Add to cart" and its status line. getAddons() returns the course add-ons currently chosen. */
function cartButton(p, getAddons, primary) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-cart ' + (primary ? 'btn-ink' : 'btn-outline');
  btn.textContent = 'Add to cart';
  const status = document.createElement('p');
  status.className = 'cart-status';
  status.setAttribute('aria-live', 'polite');
  const say = (text) => {
    status.textContent = text + ' ';
    const a = document.createElement('a');
    a.href = siteRoot + 'cart/';
    a.textContent = 'View cart';
    status.append(a);
  };
  if (inCart(p.id)) say('This is in your cart.');
  btn.addEventListener('click', () => {
    const r = addToCart(p.id, getAddons());
    if (!r.ok) { status.textContent = 'This browser is not letting the site save your cart (private browsing can block storage).'; return; }
    say(r.updated ? (p.addons ? '✓ Your cart is updated with these add-ons.' : '✓ This is already in your cart.') : '✓ Added to your cart.');
  });
  return [btn, status];
}

/** Keep the cart count in the header up to date, including changes made in other tabs. */
function initCartCount() {
  const update = () => {
    const n = cartCount();
    document.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = String(n); });
    document.querySelectorAll('.nav-cart').forEach((a) => a.setAttribute('aria-label', `Cart, ${n} item${n === 1 ? '' : 's'}`));
  };
  window.addEventListener(CART_EVENT, update);
  window.addEventListener('storage', (e) => { if (e.key === 'fretwell.cart') update(); });
  update();
}

const siteRoot = new URL('../', import.meta.url).href;

/**
 * The Terms agreement checkbox, the buy button and its hint. Buyers must agree to the Terms of Service
 * and Refund Policy before the button works. getUrl() returns the checkout link for the current choice.
 */
function buyButton(p, getUrl, label) {
  const agree = document.createElement('div');
  agree.className = 'agree';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.id = 'agree-' + p.id;
  const lab = document.createElement('label');
  lab.htmlFor = box.id;
  lab.append('I agree to the ', policyLink(siteRoot + 'terms/', 'Terms of Service'), ' and ', policyLink(siteRoot + 'refunds/', 'Refund Policy'));
  agree.append(box, lab);
  const a = document.createElement('a');
  a.className = 'btn btn-buy';
  a.rel = 'noopener';
  a.textContent = label;
  a.setAttribute('role', 'link');
  a.tabIndex = 0;
  const hint = document.createElement('p');
  hint.className = 'agree-hint';
  hint.id = 'agree-hint-' + p.id;
  hint.setAttribute('aria-live', 'polite');
  a.setAttribute('aria-describedby', hint.id);
  const sync = () => {
    if (box.checked) {
      a.href = getUrl();
      a.removeAttribute('aria-disabled');
      hint.textContent = 'You will continue to our payment provider’s secure checkout.';
      hint.classList.remove('is-needed');
    } else {
      a.removeAttribute('href');
      a.setAttribute('aria-disabled', 'true');
      hint.textContent = 'Tick the box above to agree to the Terms of Service and Refund Policy before checkout.';
    }
  };
  a.addEventListener('click', (e) => {
    if (box.checked) return;
    e.preventDefault();
    hint.classList.add('is-needed');
    box.focus();
  });
  a.addEventListener('keydown', (e) => {
    if (!box.checked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); a.click(); }
  });
  box.addEventListener('change', sync);
  sync();
  return { nodes: [agree, a, hint], button: a, sync };
}

/** Course buy card: optional add-on checkboxes, a running total, then the agreement and buy button. */
function initCourseBuy(slot, p) {
  const offered = ADDON_ORDER.filter((id) => p.addons[id] !== undefined);
  const fs = document.createElement('fieldset');
  fs.className = 'addon-pick';
  const legend = document.createElement('legend');
  legend.textContent = 'Add-ons (optional)';
  fs.append(legend);
  const boxes = offered.map((id) => {
    const row = document.createElement('div');
    row.className = 'addon-opt';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = `addon-${p.id}-${id}`;
    box.value = id;
    const lab = document.createElement('label');
    lab.htmlFor = box.id;
    const name = document.createElement('span');
    name.className = 'addon-name';
    name.textContent = ADDONS[id].name;
    const price = document.createElement('span');
    price.className = 'addon-price';
    price.textContent = `+$${p.addons[id]}`;
    const desc = document.createElement('span');
    desc.className = 'addon-desc';
    desc.textContent = ADDONS[id].text;
    lab.append(name, price, desc);
    row.append(box, lab);
    fs.append(row);
    return box;
  });
  const total = document.createElement('p');
  total.className = 'addon-total';
  total.setAttribute('aria-live', 'polite');
  slot.append(fs, total);
  const chosen = () => boxes.filter((b) => b.checked).map((b) => b.value);
  const anyLink = !!p.checkoutUrl || Object.values(p.addonCheckoutUrls || {}).some(Boolean);
  let buy = null;
  const missing = document.createElement('p');
  missing.className = 'agree-hint';
  missing.textContent = 'This combination of add-ons can’t be bought yet. Choose a different combination.';
  if (anyLink) {
    buy = buyButton(p, () => checkoutFor(p, chosen()), '');
    slot.append(...buy.nodes, missing);
  }
  slot.append(...cartButton(p, chosen, !anyLink));
  const update = () => {
    const sum = totalFor(p, chosen());
    total.innerHTML = '';
    total.append('Total ', Object.assign(document.createElement('strong'), { textContent: '$' + sum }), ' USD');
    if (!buy) return;
    const url = checkoutFor(p, chosen());
    buy.button.textContent = `Buy now — $${sum}`;
    buy.nodes.forEach((n) => { n.hidden = !url; });
    missing.hidden = !!url;
    buy.sync();
  };
  boxes.forEach((b) => b.addEventListener('change', update));
  update();
}

function policyLink(href, text) {
  const l = document.createElement('a');
  l.href = href;
  l.textContent = text;
  return l;
}

function emailLink(email) {
  const a = document.createElement('a');
  a.href = 'mailto:' + email;
  a.textContent = email;
  return a;
}

function initContact() {
  const email = (SITE_CONFIG.supportEmail || '').trim();
  if (!email) return; // nothing is rendered without an address
  document.querySelectorAll('[data-footer-email]').forEach((el) => {
    const p = document.createElement('p');
    p.className = 'footer-email';
    p.appendChild(emailLink(email));
    el.appendChild(p);
  });
  document.querySelectorAll('[data-contact-email]').forEach((el) => {
    el.append('Email: ', emailLink(email));
  });
}

function initYear() {
  const y = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = y; });
}

initTheme();
initNav();
initPrices();
initCartCount();
initContact();
initYear();
