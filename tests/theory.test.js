import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNote, noteId, transpose, intervalBetween, parseInterval, intervalName, INTERVALS_SIMPLE, INTERVALS_COMPOUND,
  buildScale, SCALES, scaleTonics, chordTones, CHORD_TYPES, voiceChord, identifyChordType, TRIAD_TYPES, SEVENTH_TYPES,
  diatonicLabel, rnChord, PROGRESSIONS, midi, pc, majorKeys, minorKeys, keySignature, noteName, spellMidi, keyAccidental,
  scaleDegreeLabels, LETTERS, intervalLongName,
} from '../js/core/theory.js';

const ids = (notes) => notes.map((n) => noteId(n, false)).join(' ');
const N = parseNote;

test('transpose spells intervals correctly', () => {
  const cases = [
    ['C4', 'M3', 'E4'], ['E4', 'm3', 'G4'], ['B3', 'd5', 'F4'], ['F4', 'A4', 'B4'], ['C#4', 'M3', 'E#4'],
    ['Eb4', 'm3', 'Gb4'], ['B4', 'm2', 'C5'], ['Gb4', 'd7', 'Fbb5'], ['A4', 'M7', 'G#5'], ['D4', 'm9', 'Eb5'],
    ['G4', 'P11', 'C6'], ['F#4', 'A2', 'G##4'], ['Cb4', 'P5', 'Gb4'], ['E2', 'P15', 'E4'], ['Bb3', 'M6', 'G4'],
    ['Ab3', 'A6', 'F#4'], ['D#5', 'd4', 'G5'], ['E4', 'd4', 'Ab4'], ['C4', 'A11', 'F#5'], ['C4', 'm13', 'Ab5'], ['G#3', 'M10', 'B#4'],
  ];
  for (const [from, iv, to] of cases) assert.equal(noteId(transpose(N(from), iv)), to, `${from} + ${iv}`);
  assert.equal(noteId(transpose(N('C5'), 'M3', -1)), 'Ab4');
  assert.equal(noteId(transpose(N('F4'), 'A4', -1)), 'Cb4');
});

test('intervalBetween names intervals from spelling, not just semitones', () => {
  const cases = [
    ['C4', 'E4', 'M3'], ['E4', 'C5', 'm6'], ['B3', 'F4', 'd5'], ['F4', 'B4', 'A4'], ['C4', 'C4', 'P1'],
    ['C4', 'C5', 'P8'], ['C4', 'D5', 'M9'], ['G#4', 'F5', 'd7'], ['C4', 'D#4', 'A2'], ['C4', 'Eb4', 'm3'],
    ['Db4', 'B4', 'A6'], ['E3', 'G#4', 'M10'], ['A3', 'E5', 'P12'], ['C4', 'C6', 'P15'],
  ];
  for (const [a, b, name] of cases) assert.equal(intervalBetween(N(a), N(b)).name, name, `${a}–${b}`);
  const down = intervalBetween(N('E4'), N('C4'));
  assert.equal(down.name, 'M3');
  assert.equal(down.dir, -1);
});

test('interval names round-trip and simple intervals invert to an octave', () => {
  for (const name of [...INTERVALS_SIMPLE, ...INTERVALS_COMPOUND, 'P1', 'd5', 'A4', 'A5', 'd7', 'A6', 'd4']) {
    const iv = parseInterval(name);
    assert.equal(intervalName(iv.num, iv.semis), name);
  }
  const inverse = { m2: 'M7', M2: 'm7', m3: 'M6', M3: 'm6', P4: 'P5', A4: 'd5', P5: 'P4', m6: 'M3', M6: 'm3', m7: 'M2', M7: 'm2' };
  for (const [a, b] of Object.entries(inverse)) {
    for (const start of ['C4', 'F#4', 'Bb3', 'E4', 'Ab4', 'B3']) {
      const up = transpose(transpose(N(start), a), b);
      assert.equal(noteId(up), noteId(transpose(N(start), 'P8')), `${start} ${a}+${b}`);
    }
  }
  assert.equal(intervalLongName('m3'), 'minor 3rd');
  assert.equal(intervalLongName('P8'), 'octave');
  assert.equal(intervalLongName('M10'), 'major 10th');
});

test('known scale spellings', () => {
  const s = (t, id) => ids(buildScale(N(t), id));
  assert.equal(s('C4', 'major'), 'C D E F G A B');
  assert.equal(s('F#4', 'major'), 'F# G# A# B C# D# E#');
  assert.equal(s('Gb4', 'major'), 'Gb Ab Bb Cb Db Eb F');
  assert.equal(s('C#4', 'major'), 'C# D# E# F# G# A# B#');
  assert.equal(s('Cb4', 'major'), 'Cb Db Eb Fb Gb Ab Bb');
  assert.equal(s('A4', 'naturalMinor'), 'A B C D E F G');
  assert.equal(s('A4', 'harmonicMinor'), 'A B C D E F G#');
  assert.equal(s('A4', 'melodicMinor'), 'A B C D E F# G#');
  assert.equal(s('A#4', 'harmonicMinor'), 'A# B# C# D# E# F# G##');
  assert.equal(s('Eb4', 'naturalMinor'), 'Eb F Gb Ab Bb Cb Db');
  assert.equal(s('D4', 'dorian'), 'D E F G A B C');
  assert.equal(s('E4', 'phrygian'), 'E F G A B C D');
  assert.equal(s('F4', 'lydian'), 'F G A B C D E');
  assert.equal(s('G4', 'mixolydian'), 'G A B C D E F');
  assert.equal(s('B4', 'locrian'), 'B C D E F G A');
  assert.equal(s('Bb4', 'lydian'), 'Bb C D E F G A');
  assert.equal(s('C#4', 'dorian'), 'C# D# E F# G# A# B');
  assert.equal(s('C4', 'minorPentatonic'), 'C Eb F G Bb');
  assert.equal(s('Bb4', 'majorPentatonic'), 'Bb C D F G');
  assert.equal(s('A4', 'blues'), 'A C D Eb E G');
  assert.equal(s('E4', 'blues'), 'E G A Bb B D');
  assert.equal(s('Eb4', 'blues'), 'Eb Gb Ab A Bb Db');
  assert.equal(s('C4', 'majorBlues'), 'C D Eb E G A');
  assert.equal(s('Gb4', 'majorBlues'), 'Gb Ab A Bb Db Eb');
  assert.deepEqual(scaleDegreeLabels(N('C4'), 'blues'), ['1', '♭3', '4', '♭5', '5', '♭7']);
  assert.deepEqual(scaleDegreeLabels(N('Eb4'), 'blues'), ['1', '♭3', '4', '♯4', '5', '♭7']);
});

test('every scale in every key is spelled correctly', () => {
  for (const sc of SCALES) {
    const tonics = scaleTonics(sc.id);
    assert.ok(tonics.length >= 12, `${sc.id} has keys for all 12 pitch classes`);
    assert.equal(new Set(tonics.map(pc)).size, 12, `${sc.id} covers all 12 pitch classes`);
    for (const t of tonics) {
      const notes = buildScale(t, sc.id);
      // Semitone pattern matches the formula.
      const want = sc.ivls.map((iv) => parseInterval(iv).semis);
      const got = notes.map((n) => midi(n) - midi(t));
      if (sc.id === 'blues') want[3] = 6; // ♭5 or ♯4, both six semitones
      if (sc.id === 'majorBlues') want[2] = 3; // ♭3 or ♯2
      assert.deepEqual(got, want, `${sc.id} on ${noteId(t)}`);
      if (sc.ivls.length === 7) {
        // Seven-note scales use each letter exactly once.
        assert.equal(new Set(notes.map((n) => n.l)).size, 7, `${sc.id} on ${noteId(t)} uses 7 letters`);
      } else {
        // Letters ascend (or repeat only for the blue note / major-blues ♭3–3 pair).
        for (let i = 1; i < notes.length; i++) assert.ok((notes[i].l - notes[0].l + 7) % 7 >= (notes[i - 1].l - notes[0].l + 7) % 7);
      }
      const doubles = notes.filter((n) => Math.abs(n.a) >= 2);
      if (!['harmonicMinor', 'melodicMinor'].includes(sc.id)) assert.equal(doubles.length, 0, `${sc.id} on ${noteId(t)} has no double accidentals`);
    }
  }
  assert.equal(majorKeys().length, 15);
  assert.equal(minorKeys().length, 15);
});

test('key signatures', () => {
  const cases = [['C', 'major', 0], ['G', 'major', 1], ['F', 'major', -1], ['C#', 'major', 7], ['Cb', 'major', -7], ['A', 'minor', 0], ['E', 'minor', 1], ['D', 'minor', -1], ['G#', 'minor', 5], ['Eb', 'minor', -6], ['Bb', 'major', -2], ['B', 'major', 5]];
  for (const [t, m, sig] of cases) assert.equal(keySignature(N(t + '4'), m), sig, `${t} ${m}`);
  assert.equal(keyAccidental(2, 3), 1); // F# in D major
  assert.equal(keyAccidental(2, 0), 1); // C#
  assert.equal(keyAccidental(2, 4), 0); // G natural
  assert.equal(keyAccidental(-3, 5), -1); // Ab in Eb major
});

test('chord spellings', () => {
  const c = (r, t) => ids(chordTones(N(r), t));
  assert.equal(c('C4', 'maj7'), 'C E G B');
  assert.equal(c('C4', 'dim7'), 'C Eb Gb Bbb');
  assert.equal(c('F#4', 'hdim7'), 'F# A C E');
  assert.equal(c('Bb3', 'dom7'), 'Bb D F Ab');
  assert.equal(c('Ab3', 'aug'), 'Ab C E');
  assert.equal(c('G3', 'dom13'), 'G B D F A E');
  assert.equal(c('C4', 'dom7alt'), 'C E Bb Db D# F# Ab');
  assert.equal(c('Eb4', 'dom7s9'), 'Eb G Bb Db F#');
  assert.equal(c('D4', 'min9'), 'D F A C E');
  assert.equal(c('B3', 'dim'), 'B D F');
  assert.equal(c('G#3', 'dim7'), 'G# B D F');
  assert.equal(c('E4', 'minMaj7'), 'E G B D#');
  assert.equal(c('F4', 'maj7s11'), 'F A C E B');
  assert.equal(c('Db4', 'six9'), 'Db F Ab Bb Eb');
  assert.equal(c('A3', 'dom7b13'), 'A C# E G F');
  for (const [id, t] of Object.entries(CHORD_TYPES)) {
    for (const root of ['C4', 'F#4', 'Bb3', 'Eb4', 'B3', 'Ab3', 'Db4', 'G4']) {
      const tones = chordTones(N(root), id);
      const want = t.ivls.map((iv) => parseInterval(iv).semis % 12);
      const got = tones.map((n) => (midi(n) - midi(N(root)) + 120) % 12);
      assert.deepEqual(got, want, `${root}${t.symbol}`);
      t.ivls.forEach((iv, i) => {
        const num = parseInterval(iv).num;
        assert.equal(tones[i].l, (N(root).l + num - 1) % 7, `${root}${t.symbol} letter for ${iv}`);
      });
    }
  }
});

test('chord inversions and identification', () => {
  assert.equal(voiceChord(N('C4'), 'maj', 1, 3).map((n) => noteId(n)).join(' '), 'E3 G3 C4');
  assert.equal(voiceChord(N('G4'), 'dom7', 3, 3).map((n) => noteId(n)).join(' '), 'F3 G3 B3 D4');
  assert.equal(voiceChord(N('D4'), 'min7', 2, 3).map((n) => noteId(n)).join(' '), 'A3 C4 D4 F4');
  for (const id of [...TRIAD_TYPES, ...SEVENTH_TYPES, 'minMaj7']) {
    for (const r of ['C4', 'C#4', 'Db4', 'E4', 'F4', 'Gb4', 'G#4', 'Bb4', 'B4']) {
      const root = N(r);
      for (let inv = 0; inv < CHORD_TYPES[id].ivls.length; inv++) {
        const v = voiceChord(root, id, inv, 3);
        for (let i = 1; i < v.length; i++) assert.ok(midi(v[i]) > midi(v[i - 1]), 'ascending');
        assert.equal(v[0].l, chordTones(root, id)[inv].l, 'bass is the inverted tone');
      }
      assert.equal(identifyChordType(root, chordTones(root, id)), id);
    }
  }
});

test('diatonic Roman numerals in major and minor', () => {
  const C = N('C4'), A = N('A4');
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((d) => diatonicLabel(C, 'major', d)), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((d) => diatonicLabel(C, 'major', d, { seventh: true })), ['I7', 'ii7', 'iii7', 'IV7', 'V7', 'vi7', 'viiø7']);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((d) => diatonicLabel(A, 'minor', d)), ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'vii°']);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((d) => diatonicLabel(A, 'minor', d, { seventh: true })), ['i7', 'iiø7', 'III7', 'iv7', 'V7', 'VI7', 'vii°7']);
  assert.equal(diatonicLabel(A, 'minor', 7, { natural: true }), 'VII');
  assert.equal(diatonicLabel(A, 'minor', 5, { natural: true }), 'v');
  assert.equal(diatonicLabel(C, 'major', 5, { seventh: true, inversion: 1 }), 'V6/5');
  assert.equal(diatonicLabel(C, 'major', 2, { inversion: 1 }), 'ii6');
  assert.equal(diatonicLabel(C, 'major', 1, { inversion: 2 }), 'I6/4');
  assert.equal(diatonicLabel(C, 'major', 5, { seventh: true, inversion: 3 }), 'V4/2');
  assert.equal(diatonicLabel(C, 'major', 7, { seventh: true, inversion: 2 }), 'viiø4/3');
});

test('Roman numerals resolve to the right chords, including applied dominants', () => {
  const r = (t, m, s) => { const c = rnChord(N(t), m, s); return ids(c.tones) + ' / ' + noteId(c.bass, false); };
  assert.equal(r('C4', 'major', 'V65'), 'G B D F / B');
  assert.equal(r('C4', 'major', 'ii6'), 'D F A / F');
  assert.equal(r('C4', 'major', 'I64'), 'C E G / G');
  assert.equal(r('C4', 'major', 'V42'), 'G B D F / F');
  assert.equal(r('C4', 'major', 'V7/V'), 'D F# A C / D');
  assert.equal(r('C4', 'major', 'V7/ii'), 'A C# E G / A');
  assert.equal(r('C4', 'major', 'vii°7/V'), 'F# A C Eb / F#');
  assert.equal(r('C4', 'major', 'V/vi'), 'E G# B / E');
  assert.equal(r('C4', 'major', 'V7/IV'), 'C E G Bb / C');
  assert.equal(r('Eb4', 'major', 'V7/V'), 'F A C Eb / F');
  assert.equal(r('A4', 'minor', 'V7'), 'E G# B D / E');
  assert.equal(r('A4', 'minor', 'VII'), 'G B D / G');
  assert.equal(r('A4', 'minor', 'iv'), 'D F A / D');
  assert.equal(r('A4', 'minor', 'ii°6'), 'B D F / D');
  assert.equal(r('A4', 'minor', 'III'), 'C E G / C');
  assert.equal(r('F#4', 'minor', 'V'), 'C# E# G# / C#');
  assert.equal(r('C4', 'major', 'bVII'), 'Bb D F / Bb');
  assert.equal(rnChord(N('C4'), 'major', 'V7/V').label, 'V7/V');
  assert.equal(rnChord(N('C4'), 'major', 'vii°7/V').label, 'vii°7/V');
});

test('every listed progression is diatonic in every key', () => {
  for (const p of PROGRESSIONS) {
    const keys = p.mode === 'minor' ? minorKeys() : majorKeys();
    for (const k of keys) {
      const nat = buildScale(k, p.mode === 'minor' ? 'naturalMinor' : 'major');
      const harm = p.mode === 'minor' ? buildScale(k, 'harmonicMinor') : nat;
      for (const s of p.rn) {
        const c = rnChord(k, p.mode, s);
        const allowed = [...nat, ...harm];
        for (const t of c.tones) assert.ok(allowed.some((x) => x.l === t.l && x.a === t.a), `${s} in ${noteId(k)} ${p.mode}: ${noteId(t)}`);
        assert.equal(c.label.replace('4/2', '42').replace('6/5', '65').replace('6/4', '64').replace('4/3', '43'), s.replace('o', '°'));
      }
    }
  }
});

test('note naming helpers', () => {
  assert.equal(noteName(N('F#4')), 'F♯');
  assert.equal(noteName(N('Bb3'), { octave: true }), 'B♭3');
  assert.equal(noteName(N('G4'), { naming: 'solfege-ti' }), 'Sol');
  assert.equal(noteName(N('B4'), { naming: 'solfege-si' }), 'Si');
  assert.equal(noteName(N('C#4'), { naming: 'solfege-ti' }), 'Do♯');
  assert.equal(noteId(spellMidi(61, 'sharps')), 'C#4');
  assert.equal(noteId(spellMidi(61, 'flats')), 'Db4');
  assert.equal(noteId(spellMidi(60)), 'C4');
  assert.equal(LETTERS.length, 7);
});
