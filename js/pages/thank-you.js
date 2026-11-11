// Thank-you page: generate a license key in the browser and reveal it.
import { generateKey } from '../core/license.js';
import { PRODUCT_BY_ID } from '../products.js';
import { arpeggio, isReady } from '../core/audio.js';
import { initSoundToggles, onSoundChange, isSoundOn } from '../core/sound-ui.js';

const section = document.querySelector('[data-product]');
const productId = section && section.getAttribute('data-product');
const product = PRODUCT_BY_ID[productId];
const display = document.querySelector('[data-key-display]');
const status = document.querySelector('[data-key-status]');
const key = generateKey(productId);
const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Checkouts such as Square payment links add the order number to the address when they redirect here
// (Square uses orderId and transactionId). Show it beside the key; it is never sent anywhere.
const params = new URLSearchParams(location.search);
const orderRaw = params.get('orderId') || params.get('order_id') || params.get('transactionId') || params.get('transaction_id') || '';
const orderRef = /^[A-Za-z0-9_-]{4,80}$/.test(orderRaw) ? orderRaw : '';
if (orderRef) {
  document.querySelector('[data-order-number]').textContent = orderRef;
  document.querySelector('[data-order-ref]').hidden = false;
}

initSoundToggles();

function reveal() {
  display.textContent = '';
  const spoken = document.createElement('span');
  spoken.className = 'sr-only';
  spoken.textContent = key.split('').join(' ');
  display.appendChild(spoken);
  let i = 0;
  key.split('-').forEach((part, gi, all) => {
    // Each group stays on one line; the key only wraps between groups.
    const g = document.createElement('span');
    g.className = 'key-group';
    g.setAttribute('aria-hidden', 'true');
    const chars = gi < all.length - 1 ? part + '-' : part;
    for (const ch of chars) {
      const s = document.createElement('span');
      s.className = 'key-char' + (ch === '-' ? ' is-dash' : '');
      s.style.setProperty('--i', i++);
      s.textContent = ch;
      g.appendChild(s);
    }
    display.appendChild(g);
  });
}

function chime() {
  if (isSoundOn() && isReady()) arpeggio([60, 64, 67, 72, 76], { gap: reduced ? 0.12 : 0.11 });
}

reveal();
// Audio can only start after a click, so the chime plays if sound is already running,
// or as soon as the visitor turns sound on.
setTimeout(chime, 150);
let chimed = false;
onSoundChange((on) => {
  if (on && !chimed) {
    chimed = true;
    setTimeout(() => chime(), 120);
  }
});

function say(text) {
  status.textContent = text;
}

document.querySelector('[data-copy-key]').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(key);
    say('✓ Key copied. Paste it somewhere safe.');
  } catch {
    const range = document.createRange();
    range.selectNodeContents(display);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    try { document.execCommand('copy'); say('✓ Key copied. Paste it somewhere safe.'); } catch { say('Select the key above and copy it.'); }
  }
});

document.querySelector('[data-save-key]').addEventListener('click', () => {
  const unlockUrl = new URL('../../unlock/', location.href).href;
  const text = `Fretwell Music Lab — license key\n\nProduct: ${product ? product.name : productId}\nKey: ${key}\n${orderRef ? `Order number: ${orderRef}\n` : ''}\nTo open your tools, enter this key at:\n${unlockUrl}\n\nYou can enter the same key on each of your own devices.\nKeep this file somewhere safe.\n`;
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fretwell-license-key-${productId}.txt`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  say('✓ Saved as a text file.');
});

document.querySelector('[data-open-tools]').addEventListener('click', () => {
  try { sessionStorage.setItem('fretwell.pendingKey', key); } catch { /* the buyer can paste the key instead */ }
});
