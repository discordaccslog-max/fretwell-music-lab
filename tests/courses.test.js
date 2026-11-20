import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES, COURSE_BY_ID, courseLessons, describeLesson } from '../js/courses.js';
import { ADDONS, ADDON_ORDER, allCombos, comboKey, comboPath, checkoutFor, totalFor } from '../js/addons.js';
import { PRODUCTS } from '../js/products.js';
import { generateKey, validateKey, ALPHABET, PRODUCT_CODES } from '../js/core/license.js';

// Just enough of a browser for the tool modules to load in Node.
globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {}, key() {}, length: 0 };
globalThis.document = {
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
  createElementNS: () => ({ setAttribute() {} }),
  documentElement: { classList: { add() {} } },
  querySelectorAll: () => [],
  addEventListener() {},
};

const COURSE_PRODUCTS = PRODUCTS.filter((p) => p.tier === 'Courses');
const PREFS = { naming: 'letters', accidentals: 'sharps', instrument: 'keys', tuning: 'standard', leftHanded: false };

test('25 courses priced $20–$145, each with 3 or 4 add-ons at $1–$5', () => {
  assert.equal(COURSE_PRODUCTS.length, 25);
  assert.equal(COURSES.length, 25);
  for (const p of COURSE_PRODUCTS) {
    assert.ok(COURSE_BY_ID[p.id], `${p.id} has course content`);
    assert.ok(p.price >= 20 && p.price <= 145, `${p.id} price ${p.price}`);
    const ids = Object.keys(p.addons);
    assert.ok(ids.length === 3 || ids.length === 4, `${p.id} has ${ids.length} add-ons`);
    for (const [id, price] of Object.entries(p.addons)) {
      assert.ok(ADDONS[id], `${p.id}: unknown add-on ${id}`);
      assert.ok(Number.isInteger(price) && price >= 1 && price <= 5, `${p.id}: ${id} costs ${price}`);
    }
    const c = COURSE_BY_ID[p.id];
    if (ids.includes('bonus')) assert.equal(c.bonus.length, 3, `${p.id} bonus lessons`);
    assert.match(p.pagePath, /^courses\/[a-z0-9-]+\/$/);
    assert.equal(p.checkoutUrl, '');
    for (const [k, url] of Object.entries(p.addonCheckoutUrls)) {
      assert.ok(allCombos(ids).some((combo) => comboKey(combo) === k), `${p.id}: ${k} is not a combination of its add-ons`);
      assert.ok(url === '' || /^https:\/\/\S+$/.test(url));
    }
    assert.ok(Object.values(PRODUCT_CODES).some((v) => v.product === p.id && v.course), `${p.id} has a course key code`);
  }
  const prices = COURSE_PRODUCTS.map((p) => p.price);
  assert.equal(Math.min(...prices), 20);
  assert.equal(Math.max(...prices), 145);
});

test('add-on combinations, totals and checkout lookup', () => {
  assert.equal(allCombos(['planner', 'guide', 'bonus']).length, 8);
  assert.equal(allCombos(ADDON_ORDER).length, 16);
  assert.equal(comboKey(['bonus', 'planner']), 'planner+bonus');
  assert.equal(comboPath(['export', 'guide']), 'guide-export/');
  assert.equal(comboPath([]), '');
  const p = { price: 20, addons: { planner: 2, guide: 3, bonus: 4 }, checkoutUrl: 'https://a', addonCheckoutUrls: { 'planner+bonus': 'https://b' } };
  assert.equal(totalFor(p, ['planner', 'bonus']), 26);
  assert.equal(checkoutFor(p, []), 'https://a');
  assert.equal(checkoutFor(p, ['bonus', 'planner']), 'https://b');
  assert.equal(checkoutFor(p, ['guide']), '');
});

test('course keys carry their add-ons and stay checksum-protected', () => {
  for (const p of COURSE_PRODUCTS) {
    for (const combo of allCombos(Object.keys(p.addons))) {
      const key = generateKey(p.id, { addons: combo });
      const v = validateKey(key);
      assert.equal(v.ok, true, key);
      assert.equal(v.course, true);
      assert.equal(v.product, p.id);
      assert.deepEqual(v.addons, ADDON_ORDER.filter((a) => combo.includes(a)));
    }
  }
  // Changing the add-on character breaks the checksum.
  const k = generateKey('treble-clef-sprint', { addons: ['planner'] });
  const forged = k.slice(0, 8) + ALPHABET[7] + k.slice(9);
  assert.equal(validateKey(forged).ok, false);
  // Tool keys are unaffected and report no add-ons.
  const t = validateKey(generateKey('note-reader'));
  assert.equal(t.course, false);
  assert.deepEqual(t.addons, []);
  assert.deepEqual(validateKey(generateKey('complete-musicianship-program')).tools.length, 9);
  assert.deepEqual(validateKey(generateKey('complete-foundations-course')).tools.length, 5);
  assert.deepEqual(validateKey(generateKey('fretboard-map')).tools, []);
});

test('every lesson uses real exercises and valid settings for its tool', async () => {
  const defs = {};
  for (const c of COURSES) {
    const lessons = courseLessons(c, ['bonus']);
    assert.ok(lessons.length >= 6, `${c.id} has ${lessons.length} lessons`);
    for (const l of lessons) {
      if (!defs[l.tool]) defs[l.tool] = (await import(`../js/tools/${l.tool}.js`)).default;
      const def = defs[l.tool];
      const where = `${c.id} / ${l.key} ${l.t}`;
      assert.ok(def.exercises.some((e) => e.id === l.s.exercise), `${where}: exercise ${l.s.exercise}`);
      for (const k of Object.keys(l.s)) assert.ok(k in def.defaults, `${where}: unknown setting ${k}`);
      const settings = { ...def.defaults, ...l.s };
      for (const field of def.settingsSchema(settings, PREFS)) {
        if (!field.key || !(field.key in l.s)) continue;
        const v = l.s[field.key];
        const opts = (field.options || []).map((o) => (o && typeof o === 'object' && 'value' in o ? o.value : Array.isArray(o) ? o[0] : o));
        if (field.type === 'select' || field.type === 'segmented') assert.ok(opts.includes(v), `${where}: ${field.key}=${v} not in ${opts}`);
        if (field.type === 'checks') {
          assert.ok(Array.isArray(v) && v.every((x) => opts.includes(x)), `${where}: ${field.key}=${v}`);
          assert.ok(v.length >= (field.min || 1), `${where}: ${field.key} needs at least ${field.min}`);
        }
        if (field.type === 'range') assert.ok(v >= field.min && v <= field.max, `${where}: ${field.key}=${v}`);
        if (field.type === 'toggle') assert.equal(typeof v, 'boolean', `${where}: ${field.key}`);
      }
      assert.ok(l.pass >= 40 && l.pass <= 95, `${where}: pass ${l.pass}`);
      assert.ok(describeLesson(l).length > 3, `${where}: description`);
    }
  }
});
