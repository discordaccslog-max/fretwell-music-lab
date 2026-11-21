// Fretwell Music Lab — the shopping cart, kept in this browser's local storage.
//
// Stored under "fretwell.cart" as { v: 1, items: [{ id, addons, added }] }:
//   id      a product id from products.js
//   addons  course add-on ids from addons.js (empty for tools)
//   added   when it was put in the cart (milliseconds since 1970)
// Prices are never stored: cartLines() works them out from products.js each time, so a checkout page
// should call cartLines() / cartTotal() rather than trust anything saved in the browser.
// Each product can be in the cart once; adding it again updates its add-ons.

import { PRODUCT_BY_ID } from './products.js';
import { ADDONS, ADDON_ORDER, totalFor } from './addons.js';
import { PRODUCT_CODES, CODE_FOR_PRODUCT } from './core/license.js';

const KEY = 'fretwell.cart';
export const CART_EVENT = 'fretwell-cart';

function clean(raw) {
  const items = raw && Array.isArray(raw.items) ? raw.items : [];
  const seen = new Set();
  return items.filter((it) => {
    const p = it && PRODUCT_BY_ID[it.id];
    if (!p || seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  }).map((it) => ({
    id: it.id,
    addons: ADDON_ORDER.filter((a) => Array.isArray(it.addons) && it.addons.includes(a) && PRODUCT_BY_ID[it.id].addons && PRODUCT_BY_ID[it.id].addons[a] !== undefined),
    added: +it.added || Date.now(),
  }));
}

export function getCart() {
  try { return clean(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return []; }
}

function save(items) {
  try { localStorage.setItem(KEY, JSON.stringify({ v: 1, items })); } catch { return false; }
  try { window.dispatchEvent(new CustomEvent(CART_EVENT)); } catch { /* not in a browser */ }
  return true;
}

/** Add a product (with course add-ons). Returns { ok, updated } — updated when it was already in the cart. */
export function addToCart(id, addons = []) {
  if (!PRODUCT_BY_ID[id]) return { ok: false };
  const items = getCart();
  const existing = items.find((it) => it.id === id);
  if (existing) existing.addons = addons.slice();
  else items.push({ id, addons: addons.slice(), added: Date.now() });
  return { ok: save(clean({ items })), updated: !!existing };
}

export function removeFromCart(id) { return save(getCart().filter((it) => it.id !== id)); }
export function clearCart() { return save([]); }
export function inCart(id) { return getCart().some((it) => it.id === id); }
export function cartCount() { return getCart().length; }

/** Tools a product unlocks (courses that include full tool access count too). */
function toolsOf(id) {
  const code = CODE_FOR_PRODUCT[id];
  return code ? PRODUCT_CODES[code].tools : [];
}

/**
 * Cart lines with prices from products.js:
 * [{ id, product, addons: [{ id, name, price }], price, total, alsoIn }]
 * alsoIn names another cart item that already includes this tool (for example the Foundations Bundle).
 */
export function cartLines() {
  const items = getCart();
  return items.map((it) => {
    const p = PRODUCT_BY_ID[it.id];
    const mine = toolsOf(it.id);
    const cover = p.tier === 'Courses' || !mine.length ? null
      : items.find((o) => o.id !== it.id && toolsOf(o.id).length > mine.length && mine.every((t) => toolsOf(o.id).includes(t)));
    return {
      id: it.id,
      product: p,
      addons: it.addons.map((a) => ({ id: a, name: ADDONS[a].name, price: p.addons[a] })),
      price: p.price,
      total: totalFor(p, it.addons),
      alsoIn: cover ? PRODUCT_BY_ID[cover.id].name : null,
    };
  });
}

export function cartTotal() {
  return cartLines().reduce((sum, l) => sum + l.total, 0);
}
