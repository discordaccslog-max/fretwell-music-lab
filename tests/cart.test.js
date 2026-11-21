import test from 'node:test';
import assert from 'node:assert/strict';

// A stand-in for the browser's local storage.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
const { addToCart, removeFromCart, clearCart, getCart, cartLines, cartTotal, cartCount, inCart } = await import('../js/cart.js');

test('add, update, remove and total, with prices worked out from the catalogue', () => {
  clearCart();
  assert.deepEqual(addToCart('chord-builder'), { ok: true, updated: false });
  assert.deepEqual(addToCart('treble-clef-sprint', ['bonus', 'planner']), { ok: true, updated: false });
  assert.equal(cartCount(), 2);
  assert.equal(cartTotal(), 19 + 20 + 2 + 4);
  assert.deepEqual(cartLines()[1].addons.map((a) => a.id), ['planner', 'bonus']);
  assert.deepEqual(addToCart('treble-clef-sprint', ['guide']), { ok: true, updated: true });
  assert.equal(cartCount(), 2);
  assert.equal(cartTotal(), 19 + 20 + 3);
  removeFromCart('chord-builder');
  assert.equal(inCart('chord-builder'), false);
  assert.equal(cartTotal(), 23);
});

test('stored prices, unknown products and add-ons a product does not offer are ignored', () => {
  localStorage.setItem('fretwell.cart', JSON.stringify({ v: 1, items: [
    { id: 'note-reader', addons: ['planner'], price: 0 },
    { id: 'not-a-product' },
    { id: 'treble-clef-sprint', addons: ['export', 'guide'] },
    { id: 'treble-clef-sprint', addons: [] },
  ] }));
  assert.deepEqual(getCart().map((i) => [i.id, i.addons]), [['note-reader', []], ['treble-clef-sprint', ['guide']]]);
  assert.equal(cartTotal(), 10 + 20 + 3);
});

test('tools already included in a bundle or course in the cart are flagged', () => {
  clearCart();
  addToCart('note-reader');
  addToCart('foundations-bundle');
  addToCart('atelier');
  addToCart('complete-musicianship-program');
  const by = Object.fromEntries(cartLines().map((l) => [l.id, l.alsoIn]));
  assert.ok(by['note-reader']);
  assert.equal(by['atelier'], 'Complete Musicianship Program');
  assert.equal(by['foundations-bundle'], 'Complete Musicianship Program');
  assert.equal(by['complete-musicianship-program'], null);
  clearCart();
  assert.equal(cartCount(), 0);
});
