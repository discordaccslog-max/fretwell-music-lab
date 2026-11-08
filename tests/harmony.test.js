import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNote, PROGRESSIONS, majorKeys, minorKeys, makeRng, noteId } from '../js/core/theory.js';
import { chordsFor, chordsInKeys, checkSATB, realize } from '../js/core/voicelead.js';
import { SECONDARY_PROGRESSIONS, MODULATIONS, modulationChords } from '../js/core/harmony-sets.js';

const N = parseNote;
const v = (s) => s.split(' ').map(N);
const rules = (r) => r.errors.map((e) => e.rule);

test('a correct textbook progression passes', () => {
  const chords = chordsFor(N('C4'), 'major', ['I', 'IV', 'V', 'I']);
  const r = checkSATB(chords, [v('C3 G3 E4 C5'), v('F2 A3 F4 C5'), v('G2 G3 D4 B4'), v('C3 G3 E4 C5')]);
  assert.deepEqual(r.errors, []);
});

test('parallel fifths and octaves are caught', () => {
  const chords = chordsFor(N('C4'), 'major', ['I', 'ii']);
  const r = checkSATB(chords, [v('C3 G3 E4 C5'), v('D3 A3 F4 D5')]);
  assert.ok(r.errors.some((e) => e.rule === 'parallel' && e.message.includes('5ths')));
  assert.ok(r.errors.some((e) => e.rule === 'parallel' && e.message.includes('octaves')));
});

test('doubled leading tone, unresolved leading tone and unresolved seventh are caught', () => {
  let r = checkSATB(chordsFor(N('C4'), 'major', ['V']), [v('G2 B3 D4 B4')]);
  assert.ok(rules(r).includes('doubledLeadingTone'));
  r = checkSATB(chordsFor(N('C4'), 'major', ['V', 'I']), [v('G2 G3 D4 B4'), v('C3 G3 E4 G4')]);
  assert.ok(rules(r).includes('leadingTone'));
  r = checkSATB(chordsFor(N('C4'), 'major', ['V7', 'I']), [v('G2 F3 D4 B4'), v('C3 G3 E4 C5')]);
  assert.ok(rules(r).includes('seventh'));
});

test('crossing, spacing, augmented seconds, spelling, range and missing tones are caught', () => {
  assert.ok(rules(checkSATB(chordsFor(N('C4'), 'major', ['I']), [v('C3 E4 C4 G4')])).includes('crossing'));
  assert.ok(rules(checkSATB(chordsFor(N('C4'), 'major', ['I']), [v('C3 E3 G3 C5')])).includes('spacing'));
  const aug = checkSATB(chordsFor(N('A4'), 'minor', ['iv', 'V']), [v('D3 A3 D4 F4'), v('E3 B3 E4 G#4')]);
  assert.ok(rules(aug).includes('augmented'));
  assert.ok(rules(checkSATB(chordsFor(N('C4'), 'major', ['I']), [v('C3 G3 Fb4 C5')])).includes('spelling'));
  assert.ok(rules(checkSATB(chordsFor(N('C4'), 'major', ['I']), [v('C3 G3 E4 C6')])).includes('range'));
  assert.ok(rules(checkSATB(chordsFor(N('C4'), 'major', ['I']), [v('C3 G3 C4 G4')])).includes('missingThird'));
  assert.ok(rules(checkSATB(chordsFor(N('C4'), 'major', ['V7']), [v('G2 B3 D4 G4')])).includes('missingSeventh'));
  assert.ok(rules(checkSATB(chordsFor(N('C4'), 'major', ['I6']), [v('C3 G3 E4 C5')])).includes('bass'));
  assert.ok(rules(checkSATB(chordsFor(N('C4'), 'major', ['V7']), [v('G2 F3 B3 F4')])).includes('doubledSeventh'));
});

test('the writer realizes every progression in every key with no rule errors', () => {
  const rng = makeRng(42);
  for (const p of PROGRESSIONS) {
    const keys = p.mode === 'minor' ? minorKeys() : majorKeys();
    for (const k of keys) {
      const chords = chordsFor(k, p.mode, p.rn);
      const out = realize(chords, { rng });
      assert.ok(out, `realization exists for ${p.name} in ${noteId(k, false)} ${p.mode}`);
      const r = checkSATB(chords, out);
      assert.deepEqual(r.errors, [], `${p.name} in ${noteId(k, false)}: ${r.errors.map((e) => e.message).join('; ')}`);
      // Writing the upper voices again over the same bass also works (the voice-leading exercise).
      const again = realize(chords, { rng, bassLine: out.map((x) => x[0]) });
      assert.ok(again);
      assert.deepEqual(checkSATB(chords, again).errors, []);
    }
  }
});

test('secondary dominant progressions realize correctly in every major key', () => {
  const rng = makeRng(7);
  for (const p of SECONDARY_PROGRESSIONS) {
    for (const k of majorKeys()) {
      const chords = chordsFor(k, 'major', p.rn);
      const out = realize(chords, { rng });
      assert.ok(out, `${p.id} in ${noteId(k, false)}`);
      assert.deepEqual(checkSATB(chords, out).errors, [], `${p.id} in ${noteId(k, false)}`);
    }
  }
});

test('modulating progressions realize correctly', () => {
  const rng = makeRng(9);
  for (const m of MODULATIONS) {
    for (const k of majorKeys().filter((x) => Math.abs(x.a) <= 1)) {
      const list = modulationChords(k, m.id);
      const chords = chordsInKeys(list);
      const out = realize(chords, { rng });
      assert.ok(out, `${m.id} from ${noteId(k, false)}`);
      assert.deepEqual(checkSATB(chords, out).errors, [], `${m.id} from ${noteId(k, false)}`);
    }
  }
});
