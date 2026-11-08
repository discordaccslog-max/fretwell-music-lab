import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceTwoFiveOne, twoFiveOne, jazzSymbol, extensionVoicing, playVoicing, voicingTarget, FAMILIES } from '../js/core/jazz.js';
import { parseNote, noteId, midi, pc, majorKeys, CHORD_TYPES, chordTones } from '../js/core/theory.js';

const ids = (ns) => ns.map((n) => noteId(n, false)).join(' ');

test('ii–V–I symbols in major and minor', () => {
  assert.deepEqual(twoFiveOne(parseNote('C4'), 'major').map((c) => jazzSymbol(c.root, c.sevenths)), ['Dm7', 'G7', 'Cmaj7']);
  assert.deepEqual(twoFiveOne(parseNote('Eb4'), 'major').map((c) => jazzSymbol(c.root, c.sevenths)), ['Fm7', 'B♭7', 'E♭maj7']);
  assert.deepEqual(twoFiveOne(parseNote('C4'), 'minor').map((c) => jazzSymbol(c.root, c.sevenths)), ['Dm7♭5', 'G7♭9', 'Cm(maj7)']);
});

test('rootless voicings in C are the classic A/B forms', () => {
  const v = voiceTwoFiveOne(parseNote('C4'), 'major', 'A');
  assert.equal(ids(v[0].notes), 'F A C E');   // Dm9, A form: 3 5 7 9
  assert.equal(ids(v[1].notes), 'F A B E');   // G13, B form: 7 9 3 13
  assert.equal(ids(v[2].notes), 'E G B D');   // Cmaj9, A form
  const b = voiceTwoFiveOne(parseNote('C4'), 'major', 'B');
  assert.equal(ids(b[0].notes), 'C E F A');   // Dm9, B form: 7 9 3 5
  assert.equal(ids(b[1].notes), 'B E F A');   // G13, A form: 3 13 7 9
  assert.equal(ids(b[2].notes), 'B D E G');   // Cmaj9, B form
});

test('ii–V–I voicings move smoothly in every key and keep the right chord tones', () => {
  for (const mode of ['major', 'minor']) {
    for (const k of majorKeys()) {
      for (const kind of ['shell', 'A', 'B']) {
        const v = voiceTwoFiveOne(k, mode, kind);
        for (let i = 1; i < v.length; i++) {
          // Compare the upper voices by register (the root of a shell is free to leap).
          const up = (c) => (kind === 'shell' ? c.notes.slice(1) : c.notes).map(midi).sort((a, b) => a - b);
          const a = up(v[i - 1]), b = up(v[i]);
          const move = b.reduce((s, m, j) => s + Math.abs(m - a[j]), 0);
          assert.ok(move <= 10, `${noteId(k)} ${mode} ${kind} moves ${move}`);
        }
        for (const c of v) {
          if (mode === 'major') {
            const allowed = new Set(chordTones(c.root, c.type).map(pc));
            for (const n of c.notes) assert.ok(allowed.has(pc(n)), `${noteId(n)} belongs to ${c.type}`);
          }
          for (let j = 1; j < c.notes.length; j++) assert.ok(midi(c.notes[j]) > midi(c.notes[j - 1]));
        }
      }
    }
  }
  const t = voicingTarget(twoFiveOne(parseNote('C4'), 'major')[1], 'A');
  assert.deepEqual(t.notes.map((n) => noteId(n, false)), ['B', 'E', 'F', 'A']);
});

test('extension voicings put the extension on top', () => {
  const root = parseNote('G3');
  const want = { '9': 'A', b9: 'Ab', '#9': 'A#', '#11': 'C#', '13': 'E', b13: 'Eb' };
  for (const [ext, name] of Object.entries(want)) {
    const v = extensionVoicing(root, ext);
    assert.equal(noteId(v[v.length - 1], false), name);
    assert.ok(v.every((n, i) => i === 0 || midi(n) > midi(v[i - 1])));
  }
});

test('every jazz chord type has a playable voicing with its root in the bass', () => {
  for (const fam of Object.values(FAMILIES)) {
    for (const t of fam.types) {
      assert.ok(CHORD_TYPES[t], t);
      const v = playVoicing(parseNote('Bb3'), t);
      assert.equal(noteId(v[0], false), 'Bb');
      for (let i = 1; i < v.length; i++) assert.ok(midi(v[i]) > midi(v[i - 1]), t);
    }
  }
});
