import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKey, validateKey, toolsForKeys, ALPHABET, PRODUCT_CODES, formatKey } from '../js/core/license.js';
import { renderPluck, renderKeys, renderClick, estimatePitch } from '../js/core/synth.js';
import { PRODUCTS } from '../js/products.js';

const KEY_RE = new RegExp(`^FRET-[A-Z]{2}-[${ALPHABET}]{5}-[${ALPHABET}]{5}-[${ALPHABET}]{4}$`);

test('keys have the documented format and validate for the right product', () => {
  for (const code of Object.keys(PRODUCT_CODES)) {
    for (let i = 0; i < 300; i++) {
      const key = generateKey(code);
      assert.match(key, KEY_RE);
      assert.ok(!/[01OIL]/.test(key.slice(5)), 'no confusable characters');
      const v = validateKey(key);
      assert.equal(v.ok, true, key);
      assert.equal(v.code, code);
      assert.deepEqual(v.tools, PRODUCT_CODES[code].tools);
    }
  }
  assert.equal(validateKey(generateKey('foundations-bundle')).tools.length, 5);
  assert.deepEqual(validateKey(generateKey('atelier')).tools, ['atelier']);
  const all = validateKey(generateKey('AA'));
  assert.equal(all.ok, true);
  assert.deepEqual(all.tools.sort(), ['atelier', 'chord-builder', 'interval-trainer', 'jazz-harmony', 'melodic-dictation', 'note-reader', 'progression-lab', 'rhythm-lab', 'scale-explorer']);
});

test('every product in products.js has a key code and a thank-you page path', () => {
  for (const p of PRODUCTS) {
    const v = validateKey(generateKey(p.id));
    assert.equal(v.ok, true, p.id);
    assert.equal(v.product, p.id);
    assert.match(p.thankYouPath, /^thank-you\/[a-z-]+\/$/);
    assert.ok(p.checkoutUrl === '' || /^https:\/\/\S+$/.test(p.checkoutUrl), `${p.id} checkout link must be empty or https`);
    assert.equal(typeof p.price, 'number');
  }
  const prices = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.price]));
  assert.deepEqual(prices, {
    'note-reader': 10, 'interval-trainer': 14, 'scale-explorer': 16, 'chord-builder': 19, 'rhythm-lab': 22,
    'foundations-bundle': 49, 'progression-lab': 35, 'jazz-harmony': 45, 'melodic-dictation': 55, atelier: 75,
  });
});

test('typing variations are accepted, mistakes are rejected', () => {
  const key = generateKey('ET');
  assert.equal(validateKey(key.toLowerCase()).ok, true);
  assert.equal(validateKey(key.replace(/-/g, '')).ok, true);
  assert.equal(validateKey(key.replace(/-/g, ' ')).ok, true);
  assert.equal(validateKey(key.slice(5)).ok, true, 'FRET prefix optional');
  assert.equal(formatKey(key.replace(/-/g, '').toLowerCase()), key);
  assert.equal(validateKey('').reason, 'empty');
  assert.equal(validateKey(key.slice(0, -1)).reason, 'short');
  assert.equal(validateKey(key + 'A').reason, 'long');
  assert.equal(validateKey(key.slice(0, 8) + 'O' + key.slice(9)).reason, 'confusable');
  assert.equal(validateKey('FRET-QQ-' + key.slice(8)).reason, 'product');
  // Every single-character substitution in the random or checksum part is caught.
  let caught = 0, total = 0;
  for (let n = 0; n < 40; n++) {
    const k = generateKey('NR');
    for (const pos of [8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 20, 21, 22, 23]) {
      for (const ch of ALPHABET) {
        if (ch === k[pos]) continue;
        total++;
        if (!validateKey(k.slice(0, pos) + ch + k.slice(pos + 1)).ok) caught++;
      }
    }
  }
  assert.ok(caught / total > 0.9995, `substitutions caught ${caught}/${total}`);
  assert.deepEqual(toolsForKeys([generateKey('NR'), generateKey('ET'), 'nonsense']).sort(), ['interval-trainer', 'note-reader']);
});

test('random characters are evenly distributed', () => {
  const counts = Object.fromEntries([...ALPHABET].map((c) => [c, 0]));
  for (let i = 0; i < 4000; i++) {
    const k = generateKey('AT').replace(/-/g, '').slice(6, 16);
    for (const c of k) counts[c]++;
  }
  const exp = 40000 / ALPHABET.length;
  for (const c of ALPHABET) assert.ok(Math.abs(counts[c] - exp) < exp * 0.12, `${c}: ${counts[c]}`);
});

test('synthesized plucked strings are in tune across the guitar range', () => {
  const sr = 44100;
  for (let m = 40; m <= 88; m += 3) {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    const buf = renderPluck(sr, f, { duration: 1.0 });
    const est = estimatePitch(buf, sr, f);
    const cents = 1200 * Math.log2(est / f);
    assert.ok(Math.abs(cents) < 4, `MIDI ${m}: ${cents.toFixed(2)} cents`);
    let peak = 0;
    for (const x of buf) { assert.ok(Number.isFinite(x)); peak = Math.max(peak, Math.abs(x)); }
    assert.ok(peak <= 0.55 && peak > 0.05, `peak ${peak}`);
  }
});

test('synthesized keyboard notes are in tune and do not clip', () => {
  const sr = 44100;
  for (let m = 36; m <= 96; m += 4) {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    const buf = renderKeys(sr, f, { duration: 1.0 });
    const est = estimatePitch(buf, sr, f);
    const cents = 1200 * Math.log2(est / f);
    assert.ok(Math.abs(cents) < 4, `MIDI ${m}: ${cents.toFixed(2)} cents`);
    let peak = 0;
    for (const x of buf) { assert.ok(Number.isFinite(x)); peak = Math.max(peak, Math.abs(x)); }
    assert.ok(peak <= 0.45, `peak ${peak}`);
  }
  for (const level of [0, 1, 2]) {
    const c = renderClick(sr, level);
    assert.ok(c.length > 0 && Math.max(...c.map(Math.abs)) < 0.8);
  }
});
