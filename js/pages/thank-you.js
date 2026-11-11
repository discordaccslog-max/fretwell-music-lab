// Thank-you page: the order confirmation. Generates the license key in the browser and reveals it.
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

// Payment providers add their order reference to the address when they redirect here
// (Square uses orderId and transactionId; others use the names below). It is shown, never sent anywhere.
const params = new URLSearchParams(location.search);
const ORDER_PARAMS = ['order_id', 'orderId', 'order', 'session_id', 'transaction_id', 'transactionId', 'txn_id', 'token'];
const orderRaw = ORDER_PARAMS.map((n) => params.get(n)).find((v) => v) || '';
const orderRef = /^[A-Za-z0-9_.:-]{4,120}$/.test(orderRaw) ? orderRaw : '';
if (orderRef) {
  document.querySelector('[data-order-number]').textContent = orderRef;
  document.querySelector('[data-order-row]').hidden = false;
}

// Delivery time: the moment the key was generated and shown.
const delivered = new Date();
const timeZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; } })();
const deliveredText = (() => {
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(delivered) + (timeZone ? ` (${timeZone})` : ''); } catch { return delivered.toString(); }
})();
document.querySelector('[data-confirm-date]').textContent = deliveredText;

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

const abs = (path) => new URL('../../' + path, location.href).href;

function confirmationText() {
  const name = product ? product.name : productId;
  return [
    'Fretwell Music Lab — Order confirmation',
    '',
    'Status: Order complete — delivered',
    `Product: ${name}`,
    `Date and time: ${deliveredText}`,
    orderRef ? `Order reference: ${orderRef}` : null,
    `License key: ${key}`,
    'Delivery: digital license key, shown on the order confirmation page. No physical shipment.',
    '',
    'How to use your key:',
    `1. Go to ${abs('unlock/')}`,
    '2. Enter your license key and press Unlock.',
    '3. Your tools open straight away in your practice room. Enter the same key on each of your own devices.',
    '',
    `Terms of Service: ${abs('terms/')}`,
    `Refund Policy: ${abs('refunds/')}`,
    `Delivery Policy: ${abs('delivery/')}`,
    `Support: ${abs('contact/')}`,
    '',
    'Keep this confirmation somewhere safe. If you lose your key, contact us with your order reference for a replacement.',
    '',
  ].filter((line) => line !== null).join('\n');
}

document.querySelector('[data-save-confirmation]').addEventListener('click', () => {
  const blob = new Blob([confirmationText()], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const day = `${delivered.getFullYear()}-${String(delivered.getMonth() + 1).padStart(2, '0')}-${String(delivered.getDate()).padStart(2, '0')}`;
  a.download = `fretwell-order-confirmation-${productId}-${day}.txt`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  say('✓ Confirmation saved as a text file.');
});

document.querySelector('[data-print]').addEventListener('click', () => window.print());

document.querySelector('[data-open-tools]').addEventListener('click', () => {
  try { sessionStorage.setItem('fretwell.pendingKey', key); } catch { /* the buyer can paste the key instead */ }
});
