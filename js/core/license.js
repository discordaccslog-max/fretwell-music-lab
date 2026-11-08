// Fretwell Music Lab — license keys.
// A key looks like FRET-ET-7KQ4M-X9D2P-H6TR:
//   FRET   fixed prefix
//   ET     product code
//   7KQ4M-X9D2P  ten random characters
//   H6TR   checksum calculated from the product code and the random part
// The alphabet leaves out characters that are easy to confuse: 0, O, 1, I and L.
// Everything here runs in the browser; there is no server and no database.

export const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 31 characters
const BASE = ALPHABET.length;
const PREFIX = 'FRET';
const SALT = 'fretwell-music-lab/keys/v1';

// Product codes. FB (Foundations Bundle) unlocks all five Foundations tools.
// AA is the owner's all-access code: it unlocks every tool and has no product page or thank-you page.
export const PRODUCT_CODES = {
  NR: { product: 'note-reader', tools: ['note-reader'] },
  ET: { product: 'interval-trainer', tools: ['interval-trainer'] },
  SM: { product: 'scale-explorer', tools: ['scale-explorer'] },
  CB: { product: 'chord-builder', tools: ['chord-builder'] },
  RH: { product: 'rhythm-lab', tools: ['rhythm-lab'] },
  FB: { product: 'foundations-bundle', tools: ['note-reader', 'interval-trainer', 'scale-explorer', 'chord-builder', 'rhythm-lab'] },
  PG: { product: 'progression-lab', tools: ['progression-lab'] },
  JZ: { product: 'jazz-harmony', tools: ['jazz-harmony'] },
  MD: { product: 'melodic-dictation', tools: ['melodic-dictation'] },
  AT: { product: 'atelier', tools: ['atelier'] },
  AA: { product: 'all-access', label: 'Every tool (administrator access)', tools: ['note-reader', 'interval-trainer', 'scale-explorer', 'chord-builder', 'rhythm-lab', 'progression-lab', 'jazz-harmony', 'melodic-dictation', 'atelier'] },
};

export const CODE_FOR_PRODUCT = Object.fromEntries(Object.entries(PRODUCT_CODES).map(([c, v]) => [v.product, c]));

// 32-bit FNV-1a followed by a murmur-style finaliser, run twice with different seeds.
function hash32(str, seed) {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Four checksum characters for a product code and ten random characters. */
export function checksum(code, random) {
  const body = `${SALT}|${PREFIX}|${code}|${random}`;
  const a = hash32(body, 0x9e3779b9);
  const b = hash32(body + '|' + a.toString(36), 0x7f4a7c15);
  // Combine into a number below 31^4 (923521) using both halves.
  let n = (a % 961) * 961 + (b % 961);
  n %= BASE ** 4;
  let out = '';
  for (let i = 0; i < 4; i++) { out = ALPHABET[n % BASE] + out; n = Math.floor(n / BASE); }
  return out;
}

function randomChars(count, getRandomValues) {
  const out = [];
  const buf = new Uint8Array(1);
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % BASE);
  while (out.length < count) {
    getRandomValues(buf);
    if (buf[0] < limit) out.push(ALPHABET[buf[0] % BASE]);
  }
  return out.join('');
}

function defaultRandom(arr) {
  const c = globalThis.crypto;
  if (c && c.getRandomValues) return c.getRandomValues(arr);
  for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  return arr;
}

/** Create a new key for a product id (e.g. "interval-trainer") or product code (e.g. "ET"). */
export function generateKey(productOrCode, getRandomValues = defaultRandom) {
  const code = PRODUCT_CODES[productOrCode] ? productOrCode : CODE_FOR_PRODUCT[productOrCode];
  if (!code) throw new Error('Unknown product ' + productOrCode);
  const random = randomChars(10, getRandomValues);
  return `${PREFIX}-${code}-${random.slice(0, 5)}-${random.slice(5)}-${checksum(code, random)}`;
}

/** Uppercase, remove spaces and dashes. */
export function compact(input) {
  return String(input || '').toUpperCase().replace(/[\s\-–—_.]/g, '');
}

/** Pretty-print a compact or messy key as FRET-XX-XXXXX-XXXXX-XXXX. */
export function formatKey(input) {
  let c = compact(input);
  if (!c.startsWith(PREFIX)) c = PREFIX + c;
  const parts = [c.slice(0, 4), c.slice(4, 6), c.slice(6, 11), c.slice(11, 16), c.slice(16, 20)].filter(Boolean);
  return parts.join('-');
}

/**
 * Check a key. Returns { ok: true, code, product, tools, key } or { ok: false, reason, message }.
 * Messages are written for buyers.
 */
export function validateKey(input) {
  let c = compact(input);
  if (!c) return { ok: false, reason: 'empty', message: 'Enter your license key to continue.' };
  if (!c.startsWith(PREFIX)) c = PREFIX + c;
  const confusable = c.slice(4).match(/[01OIL]/);
  if (confusable) {
    const ch = confusable[0];
    const hint = { '0': 'the digit 0', '1': 'the digit 1', O: 'the letter O', I: 'the letter I', L: 'the letter L' }[ch];
    return { ok: false, reason: 'confusable', message: `Keys never contain ${hint}. Check that character against the key you saved.` };
  }
  if (c.length < 20) return { ok: false, reason: 'short', message: 'That key looks too short. A full key has 4 groups after FRET, like FRET-ET-7KQ4M-X9D2P-H6TR.' };
  if (c.length > 20) return { ok: false, reason: 'long', message: 'That key has extra characters. A full key looks like FRET-ET-7KQ4M-X9D2P-H6TR.' };
  if (![...c].every((ch) => ALPHABET.includes(ch) || PREFIX.includes(ch))) {
    return { ok: false, reason: 'chars', message: 'That key contains characters that aren’t used in license keys. Check it against the key you saved.' };
  }
  const code = c.slice(4, 6);
  const random = c.slice(6, 16);
  const sum = c.slice(16, 20);
  if (!PRODUCT_CODES[code]) return { ok: false, reason: 'product', message: 'We don’t recognise the product part of that key (the two letters after FRET). Check it against the key you saved.' };
  if (checksum(code, random) !== sum) return { ok: false, reason: 'checksum', message: 'That key doesn’t add up. One or more characters may be mistyped — check it against the key you saved.' };
  const info = PRODUCT_CODES[code];
  return { ok: true, code, product: info.product, label: info.label || null, tools: info.tools.slice(), key: formatKey(c) };
}

/** Unique tool ids unlocked by a list of keys. */
export function toolsForKeys(keys) {
  const set = new Set();
  for (const k of keys) {
    const v = validateKey(k);
    if (v.ok) v.tools.forEach((t) => set.add(t));
  }
  return [...set];
}
