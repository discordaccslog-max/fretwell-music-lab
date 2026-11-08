import test from 'node:test';
import assert from 'node:assert/strict';
import { npsPattern, windowPattern, patternsFor, findVoicings } from '../js/core/fretwork.js';
import { tuningMidis, buildScale, pc, parseNote, chordTones, TUNINGS, mod } from '../js/core/theory.js';

const std = tuningMidis('standard');
const pcsOf = (t, id) => buildScale(parseNote(t), id).map(pc);

test('three-notes-per-string patterns climb the scale in order', () => {
  const g = pcsOf('G3', 'major');
  const p = npsPattern(std, g, 0, 3);
  assert.equal(p.length, 18);
  assert.deepEqual(p.slice(0, 3).map((x) => x.fret), [3, 5, 7]);
  for (let i = 1; i < p.length; i++) assert.ok(p[i].midi > p[i - 1].midi);
  for (const x of p) assert.ok(g.includes(mod(x.midi, 12)));
  for (let s = 0; s < 6; s++) assert.equal(p.filter((x) => x.string === s).length, 3);
});

test('patterns exist for every scale type in every tuning', () => {
  for (const tuning of Object.keys(TUNINGS)) {
    const open = tuningMidis(tuning);
    for (const id of ['major', 'dorian', 'harmonicMinor', 'minorPentatonic', 'majorPentatonic', 'blues']) {
      const list = patternsFor(open, pcsOf('A3', id));
      assert.ok(list.length >= 4, `${id} in ${tuning}`);
      for (const pat of list) for (const x of pat.positions) assert.ok(x.fret >= 0 && x.fret <= 17);
    }
  }
  const box = windowPattern(std, pcsOf('A3', 'minorPentatonic'), 5, 8);
  assert.equal(box.length, 12);
});

test('chord voicings contain every chord tone with the right bass note', () => {
  for (const [root, type] of [['C3', 'maj'], ['A2', 'min'], ['G2', 'dom7'], ['D3', 'min7'], ['B2', 'hdim7'], ['F3', 'maj7'], ['E3', 'dim7']]) {
    const tones = chordTones(parseNote(root), type).map(pc);
    for (let inv = 0; inv < tones.length; inv++) {
      const v = findVoicings(std, tones, tones[inv], { limit: 3 });
      assert.ok(v.length >= 1, `${root} ${type} inversion ${inv}`);
      for (const shape of v) {
        const lowest = shape.reduce((a, b) => (b.midi < a.midi ? b : a));
        assert.equal(mod(lowest.midi, 12), tones[inv]);
        for (const t of tones) assert.ok(shape.some((x) => mod(x.midi, 12) === t));
      }
    }
  }
});
