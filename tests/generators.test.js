import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNote, makeRng, midi, majorKeys, minorKeys, buildScale, noteId } from '../js/core/theory.js';
import { generateMelody, checkMelody, generateTwoVoice, checkTwoVoice } from '../js/core/melody.js';
import { generateRhythm, barTotals, METERS, clickPattern } from '../js/core/rhythm.js';

test('rhythms fill every bar exactly, in every meter and level', () => {
  const rng = makeRng(1);
  for (const id of Object.keys(METERS)) {
    for (let level = 1; level <= 5; level++) {
      for (let i = 0; i < 60; i++) {
        const ev = generateRhythm(id, 2, level, rng, { tuplets: METERS[id].den === 4 });
        const totals = barTotals(ev, id);
        assert.deepEqual(totals, [METERS[id].bar, METERS[id].bar], `${id} level ${level}`);
        assert.equal(ev[0].rest, false, 'starts with a note');
        const longEnd = generateRhythm(id, 3, level, rng, { rests: false, tuplets: false, longEnding: true });
        assert.deepEqual(barTotals(longEnd, id), [METERS[id].bar, METERS[id].bar, METERS[id].bar], `${id} ending`);
        assert.ok(longEnd[longEnd.length - 1].dur >= 12, 'ends on a long note');
      }
    }
  }
  assert.deepEqual(clickPattern('7/8').map((c) => c.level), [2, 0, 1, 0, 1, 0, 0]);
  assert.deepEqual(clickPattern('4/4').map((c) => c.level), [2, 1, 1, 1]);
  assert.deepEqual(clickPattern('6/8').map((c) => c.level), [2, 0, 0, 1, 0, 0]);
});

test('generated melodies follow the melodic rules for their key and range', () => {
  const rng = makeRng(2024);
  const keys = [...majorKeys().map((k) => [k, 'major']), ...minorKeys().map((k) => [k, 'minor'])];
  let count = 0;
  for (const [tonic, mode] of keys) {
    for (const meter of ['2/4', '3/4', '4/4', '6/8']) {
      for (let level = 1; level <= 4; level++) {
        for (const [low, high] of [[60, 72], [57, 76], [55, 79]]) {
          const m = generateMelody({ tonic, mode, meter, bars: 1 + (count % 4), low, high, level, rng });
          count++;
          assert.deepEqual(checkMelody(m.notes, { tonic, mode, low, high }), [], `${noteId(tonic, false)} ${mode} ${meter} L${level}`);
          const totals = barTotals(m.notes, meter);
          assert.ok(totals.every((t) => t === METERS[meter].bar), 'bars full');
          for (const n of m.notes) assert.ok(midi(n.note) >= low && midi(n.note) <= high, 'in range');
          const scale = buildScale(tonic, mode === 'minor' ? 'naturalMinor' : 'major');
          const last = m.notes[m.notes.length - 1].note;
          assert.ok(last.l === scale[0].l && last.a === scale[0].a, 'ends on the tonic');
        }
      }
    }
  }
  assert.ok(count > 1000);
});

test('the melody checker rejects rule breaks', () => {
  const C = parseNote('C4');
  const mk = (s) => s.split(' ').map((x) => ({ note: parseNote(x), dur: 12 }));
  assert.ok(checkMelody(mk('C4 F4 B4 C5'), { tonic: C }).some((e) => e.startsWith('augOrDim')));
  assert.ok(checkMelody(mk('C4 A4 B4 C5'), { tonic: C }).includes('leapRecovery'));
  assert.ok(checkMelody(mk('C4 D4 E4 F#4 E4 D4 C4'), { tonic: C }).includes('notInKey'));
  assert.ok(checkMelody(mk('E4 D4 C4 B3 A3 C4'), { tonic: C }).includes('cadence'));
  assert.ok(checkMelody(mk('C4 C4 C4 D4 C4'), { tonic: C }).includes('tripleRepeat'));
  assert.ok(checkMelody(mk('C4 E4 G4 C5 D5 C5'), { tonic: C }).includes('leapsSameDirection'));
  assert.ok(checkMelody(mk('C4 D4 E4 F4 G4 A4 G4 F4 E4 D4 C4'), { tonic: C }).includes('longRun'));
  assert.ok(checkMelody(mk('E4 F4 D4 E4 G4 A4 F4 G4 E4 D4 C4'), { tonic: C }).includes('repeatedMotif'));
  assert.deepEqual(checkMelody(mk('E4 D4 F4 E4 G4 F4 D4 C4'), { tonic: C }), []);
});

test('two-voice exercises follow note-against-note rules', () => {
  const rng = makeRng(77);
  for (let i = 0; i < 150; i++) {
    const keys = i % 2 ? minorKeys() : majorKeys();
    const tonic = keys[i % keys.length];
    const mode = i % 2 ? 'minor' : 'major';
    const length = 6 + (i % 5);
    const ex = generateTwoVoice({ tonic, mode, length, rng });
    assert.equal(ex.lower.length, length);
    assert.deepEqual(checkTwoVoice(ex.lower, ex.upper, { tonic, mode }), [], `${noteId(tonic, false)} ${mode}`);
  }
  const C = parseNote('C4');
  const v = (s) => s.split(' ').map(parseNote);
  assert.ok(checkTwoVoice(v('C3 D3 C3'), v('G3 A3 C4'), { tonic: C }).some((e) => e.startsWith('parallel')));
  assert.ok(checkTwoVoice(v('C3 D3 C3'), v('C4 E4 C4'), { tonic: C }).some((e) => e.startsWith('dissonance')));
  assert.deepEqual(checkTwoVoice(v('C3 D3 C3'), v('C4 B3 C4'), { tonic: C }), []);
});
