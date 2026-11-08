// Fretwell Music Lab — music theory core.
// Pure functions with no DOM access, shared by the site, the practice room and the Node test suite.
// A spelled note is { l, a, o }: letter index 0–6 (C–B), accidental (−2 … +2) and octave.
// Middle C is C4 (MIDI 60). Intervals are { num, semis } where num is the generic size (3 for any third).

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

export const mod = (n, m) => ((n % m) + m) % m;

/* ------------------------------------------------------------------ notes */

export function note(letter, a = 0, o = 4) {
  const l = typeof letter === 'number' ? letter : LETTERS.indexOf(String(letter).toUpperCase());
  if (l < 0 || l > 6) throw new Error('Bad letter: ' + letter);
  return { l, a, o };
}

const ACC_TEXT = { '#': 1, '♯': 1, '##': 2, 'x': 2, '𝄪': 2, 'b': -1, '♭': -1, 'bb': -2, '♭♭': -2, '𝄫': -2, '': 0, 'n': 0, '♮': 0 };

/** Parse "C#4", "Bb3", "F##5", "Ebb2", "G" (octave defaults to 4). */
export function parseNote(str) {
  const m = /^([A-Ga-g])(##|#|x|bb|b|♯♯|♯|♭♭|♭|𝄪|𝄫|n|♮)?(-?\d+)?$/u.exec(String(str).trim());
  if (!m) throw new Error('Bad note: ' + str);
  const acc = m[2] === '♯♯' ? 2 : ACC_TEXT[m[2] || ''];
  return note(m[1], acc, m[3] === undefined ? 4 : parseInt(m[3], 10));
}

export const midi = (n) => 12 * (n.o + 1) + LETTER_PC[n.l] + n.a;
export const pc = (n) => mod(LETTER_PC[n.l] + n.a, 12);
/** Diatonic step number: one per staff position (line or space). */
export const step = (n) => n.o * 7 + n.l;
export const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** The note at a staff step that sounds the given MIDI pitch. */
export function fromStep(st, targetMidi) {
  const l = mod(st, 7);
  const o = Math.floor(st / 7);
  const natural = 12 * (o + 1) + LETTER_PC[l];
  return { l, a: targetMidi - natural, o };
}

export const sameNote = (x, y) => x.l === y.l && x.a === y.a && x.o === y.o;
export const sameSpelling = (x, y) => x.l === y.l && x.a === y.a;
export const withOctave = (n, o) => ({ l: n.l, a: n.a, o });

/** Stable id such as "C#4" or "Bb3" (ASCII). */
export function noteId(n, withOct = true) {
  const acc = { '-2': 'bb', '-1': 'b', '0': '', '1': '#', '2': '##' }[n.a];
  return LETTERS[n.l] + acc + (withOct ? n.o : '');
}

export function accidentalText(a) {
  return { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' }[a] ?? '';
}

export const SOLFEGE_TI = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'];
export const SOLFEGE_SI = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];

/**
 * Display name. naming: 'letters' | 'solfege-ti' | 'solfege-si' (fixed do).
 */
export function noteName(n, { octave = false, naming = 'letters' } = {}) {
  let base = LETTERS[n.l];
  if (naming === 'solfege-ti') base = SOLFEGE_TI[n.l];
  else if (naming === 'solfege-si') base = SOLFEGE_SI[n.l];
  return base + accidentalText(n.a) + (octave ? String(n.o) : '');
}

export function letterName(l, naming = 'letters') {
  if (naming === 'solfege-ti') return SOLFEGE_TI[l];
  if (naming === 'solfege-si') return SOLFEGE_SI[l];
  return LETTERS[l];
}

/** Spell a MIDI number with naturals where possible, otherwise sharps or flats. */
export function spellMidi(m, prefer = 'sharps') {
  const p = mod(m, 12);
  const o = Math.floor(m / 12) - 1;
  const nat = LETTER_PC.indexOf(p);
  if (nat >= 0) return { l: nat, a: 0, o };
  if (prefer === 'flats') {
    const l = LETTER_PC.indexOf(p + 1);
    return { l, a: -1, o };
  }
  const l = LETTER_PC.indexOf(p - 1);
  return { l, a: 1, o };
}

/** Both common spellings of a MIDI pitch (one for naturals, two for black keys). */
export function spellingsOfMidi(m) {
  const s = spellMidi(m, 'sharps');
  const f = spellMidi(m, 'flats');
  return sameNote(s, f) ? [s] : [s, f];
}

/* -------------------------------------------------------------- intervals */

const PERFECT_TYPE = new Set([0, 3, 4]);
const PERFECT_OFF = { dd: -2, d: -1, P: 0, A: 1, AA: 2 };
const IMPERFECT_OFF = { dd: -3, d: -2, m: -1, M: 0, A: 1, AA: 2 };

export function parseInterval(name) {
  if (typeof name === 'object') return name;
  const m = /^(dd|d|m|M|P|AA|A)(\d+)$/.exec(name);
  if (!m) throw new Error('Bad interval: ' + name);
  const q = m[1];
  const num = parseInt(m[2], 10);
  const s = (num - 1) % 7;
  const oct = Math.floor((num - 1) / 7);
  const table = PERFECT_TYPE.has(s) ? PERFECT_OFF : IMPERFECT_OFF;
  if (!(q in table)) throw new Error('Bad interval quality: ' + name);
  return { num, semis: MAJOR_STEPS[s] + 12 * oct + table[q], name };
}

export function intervalName(num, semis) {
  const s = (num - 1) % 7;
  const oct = Math.floor((num - 1) / 7);
  const off = semis - (MAJOR_STEPS[s] + 12 * oct);
  const table = PERFECT_TYPE.has(s) ? PERFECT_OFF : IMPERFECT_OFF;
  const q = Object.keys(table).find((k) => table[k] === off);
  if (!q) return null;
  return q + num;
}

/** Interval from a up to b. If b is below a, the result has dir = -1 and describes the size. */
export function intervalBetween(a, b) {
  let lo = a, hi = b, dir = 1;
  if (step(b) < step(a) || (step(b) === step(a) && midi(b) < midi(a))) { lo = b; hi = a; dir = -1; }
  const num = step(hi) - step(lo) + 1;
  const semis = midi(hi) - midi(lo);
  return { num, semis, name: intervalName(num, semis), dir };
}

export function transpose(n, ivl, dir = 1) {
  const iv = parseInterval(ivl);
  return fromStep(step(n) + dir * (iv.num - 1), midi(n) + dir * iv.semis);
}

const ORD = { 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 9: '9th', 10: '10th', 11: '11th', 12: '12th', 13: '13th', 14: '14th' };
const QUAL_WORD = { P: 'perfect', M: 'major', m: 'minor', A: 'augmented', d: 'diminished', AA: 'doubly augmented', dd: 'doubly diminished' };

/** "minor 3rd", "perfect 5th", "octave", "tritone (augmented 4th)". */
export function intervalLongName(name) {
  const m = /^(dd|d|m|M|P|AA|A)(\d+)$/.exec(name);
  if (!m) return name;
  const [, q, numStr] = m;
  const num = +numStr;
  if (name === 'P1') return 'unison';
  if (name === 'P8') return 'octave';
  if (name === 'P15') return 'two octaves';
  if (name === 'A4') return 'augmented 4th';
  if (name === 'd5') return 'diminished 5th';
  return `${QUAL_WORD[q]} ${ORD[num] || num + 'th'}`;
}

export const INTERVALS_SIMPLE = ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
export const INTERVALS_COMPOUND = ['m9', 'M9', 'm10', 'M10', 'P11', 'A11', 'P12', 'm13', 'M13', 'm14', 'M14', 'P15'];

/** Short label used on answer buttons. The tritone uses A4/d5 depending on spelling. */
export function intervalShort(name) {
  return name;
}

/* ----------------------------------------------------------------- scales */

export const SCALES = [
  { id: 'major', name: 'Major (Ionian)', group: 'Major & minor', ivls: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'] },
  { id: 'naturalMinor', name: 'Natural minor (Aeolian)', group: 'Major & minor', ivls: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'] },
  { id: 'harmonicMinor', name: 'Harmonic minor', group: 'Major & minor', ivls: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'M7'] },
  { id: 'melodicMinor', name: 'Melodic minor (ascending)', group: 'Major & minor', ivls: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'M7'] },
  { id: 'dorian', name: 'Dorian', group: 'Modes', ivls: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'] },
  { id: 'phrygian', name: 'Phrygian', group: 'Modes', ivls: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'] },
  { id: 'lydian', name: 'Lydian', group: 'Modes', ivls: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'] },
  { id: 'mixolydian', name: 'Mixolydian', group: 'Modes', ivls: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'] },
  { id: 'locrian', name: 'Locrian', group: 'Modes', ivls: ['P1', 'm2', 'm3', 'P4', 'd5', 'm6', 'm7'] },
  { id: 'majorPentatonic', name: 'Major pentatonic', group: 'Pentatonic & blues', ivls: ['P1', 'M2', 'M3', 'P5', 'M6'] },
  { id: 'minorPentatonic', name: 'Minor pentatonic', group: 'Pentatonic & blues', ivls: ['P1', 'm3', 'P4', 'P5', 'm7'] },
  { id: 'blues', name: 'Blues (minor blues)', group: 'Pentatonic & blues', ivls: ['P1', 'm3', 'P4', 'd5', 'P5', 'm7'] },
  { id: 'majorBlues', name: 'Major blues', group: 'Pentatonic & blues', ivls: ['P1', 'M2', 'm3', 'M3', 'P5', 'M6'] },
];
export const SCALE_BY_ID = Object.fromEntries(SCALES.map((s) => [s.id, s]));

// Which key signature a scale borrows its spelling from, relative to the tonic.
const SCALE_PARENT = {
  major: null, naturalMinor: null, dorian: null, phrygian: null, lydian: null, mixolydian: null, locrian: null,
  harmonicMinor: 'naturalMinor', melodicMinor: 'naturalMinor',
  majorPentatonic: 'major', majorBlues: 'major', minorPentatonic: 'naturalMinor', blues: 'naturalMinor',
};

/**
 * The scale's interval list for a tonic. In the blues scale the blue note is written as ♭5,
 * or as ♯4 where ♭5 would need a double flat; the major blues ♭3 becomes ♯2 in the same situation.
 */
export function scaleIntervals(tonic, scaleId) {
  const sc = SCALE_BY_ID[scaleId];
  if (!sc) throw new Error('Unknown scale ' + scaleId);
  if (scaleId === 'blues') {
    const d5 = transpose(tonic, 'd5');
    if (Math.abs(d5.a) >= 2) return ['P1', 'm3', 'P4', 'A4', 'P5', 'm7'];
  }
  if (scaleId === 'majorBlues') {
    const m3 = transpose(tonic, 'm3');
    if (Math.abs(m3.a) >= 2) return ['P1', 'M2', 'A2', 'M3', 'P5', 'M6'];
  }
  return sc.ivls;
}

export function buildScale(tonic, scaleId) {
  return scaleIntervals(tonic, scaleId).map((iv) => transpose(tonic, iv));
}

/** Degree label relative to the major scale: "1", "♭3", "♯4". */
export function degreeLabel(ivlName) {
  const iv = parseInterval(ivlName);
  const s = (iv.num - 1) % 7;
  const off = iv.semis - MAJOR_STEPS[s] - 12 * Math.floor((iv.num - 1) / 7);
  const accs = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };
  return accs[off] + iv.num;
}

export function scaleDegreeLabels(tonic, scaleId) {
  return scaleIntervals(tonic, scaleId).map(degreeLabel);
}

const accidentalCount = (notes) => notes.reduce((t, n) => t + (n.a !== 0 ? 1 : 0), 0);
const hasDouble = (notes) => notes.some((n) => Math.abs(n.a) >= 2);

/** All tonic spellings (octave 4) that give a standard key signature for this scale (≤ 7 accidentals, no doubles). */
export function scaleTonics(scaleId) {
  const parent = SCALE_PARENT[scaleId] || scaleId;
  const out = [];
  for (let l = 0; l < 7; l++) {
    for (const a of [-1, 0, 1]) {
      const t = { l, a, o: 4 };
      const notes = buildScale(t, parent);
      if (!hasDouble(notes) && accidentalCount(notes) <= 7) out.push(t);
    }
  }
  return out.sort((x, y) => pc(x) - pc(y) || x.a - y.a);
}

/** Number of sharps (positive) or flats (negative) in the key signature of a major or natural-minor key. */
export function keySignature(tonic, mode = 'major') {
  const notes = buildScale(tonic, mode === 'minor' ? 'naturalMinor' : 'major');
  let sharps = 0, flats = 0;
  for (const n of notes) { if (n.a > 0) sharps++; if (n.a < 0) flats++; }
  if (sharps) return sharps;
  return flats ? -flats : 0;
}

/** Signature size for any scale (uses its parent key). */
export function scaleSignatureSize(tonic, scaleId) {
  const parent = SCALE_PARENT[scaleId] || scaleId;
  return accidentalCount(buildScale(tonic, parent));
}

/** Letters that carry an accidental in a key signature, in the standard order. */
export const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B
export const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];  // B E A D G C F

/** Accidental the key signature applies to a letter. */
export function keyAccidental(sig, l) {
  if (sig > 0) return SHARP_ORDER.slice(0, sig).includes(l) ? 1 : 0;
  if (sig < 0) return FLAT_ORDER.slice(0, -sig).includes(l) ? -1 : 0;
  return 0;
}

export function majorKeys() { return scaleTonics('major'); }
export function minorKeys() { return scaleTonics('naturalMinor'); }

export function keyName(tonic, mode) {
  return noteName(tonic) + (mode === 'minor' ? ' minor' : ' major');
}

/* ----------------------------------------------------------------- chords */

export const CHORD_TYPES = {
  maj: { symbol: '', name: 'major triad', short: 'Major', ivls: ['P1', 'M3', 'P5'] },
  min: { symbol: 'm', name: 'minor triad', short: 'Minor', ivls: ['P1', 'm3', 'P5'] },
  dim: { symbol: '°', name: 'diminished triad', short: 'Diminished', ivls: ['P1', 'm3', 'd5'] },
  aug: { symbol: '+', name: 'augmented triad', short: 'Augmented', ivls: ['P1', 'M3', 'A5'] },
  sus2: { symbol: 'sus2', name: 'suspended 2nd', short: 'Sus2', ivls: ['P1', 'M2', 'P5'] },
  sus4: { symbol: 'sus4', name: 'suspended 4th', short: 'Sus4', ivls: ['P1', 'P4', 'P5'] },
  maj7: { symbol: 'maj7', name: 'major seventh', short: 'Major 7th', ivls: ['P1', 'M3', 'P5', 'M7'] },
  dom7: { symbol: '7', name: 'dominant seventh', short: 'Dominant 7th', ivls: ['P1', 'M3', 'P5', 'm7'] },
  min7: { symbol: 'm7', name: 'minor seventh', short: 'Minor 7th', ivls: ['P1', 'm3', 'P5', 'm7'] },
  hdim7: { symbol: 'ø7', name: 'half-diminished seventh', short: 'Half-diminished 7th', ivls: ['P1', 'm3', 'd5', 'm7'] },
  dim7: { symbol: '°7', name: 'diminished seventh', short: 'Diminished 7th', ivls: ['P1', 'm3', 'd5', 'd7'] },
  minMaj7: { symbol: 'm(maj7)', name: 'minor-major seventh', short: 'Minor-major 7th', ivls: ['P1', 'm3', 'P5', 'M7'] },
  augMaj7: { symbol: 'maj7♯5', name: 'augmented major seventh', short: 'Augmented major 7th', ivls: ['P1', 'M3', 'A5', 'M7'] },
  // Extended and altered chords (Jazz Harmony Studio)
  maj6: { symbol: '6', name: 'major sixth', short: '6', ivls: ['P1', 'M3', 'P5', 'M6'] },
  min6: { symbol: 'm6', name: 'minor sixth', short: 'm6', ivls: ['P1', 'm3', 'P5', 'M6'] },
  six9: { symbol: '6/9', name: 'six-nine', short: '6/9', ivls: ['P1', 'M3', 'P5', 'M6', 'M9'] },
  maj9: { symbol: 'maj9', name: 'major ninth', short: 'maj9', ivls: ['P1', 'M3', 'P5', 'M7', 'M9'] },
  dom9: { symbol: '9', name: 'dominant ninth', short: '9', ivls: ['P1', 'M3', 'P5', 'm7', 'M9'] },
  min9: { symbol: 'm9', name: 'minor ninth', short: 'm9', ivls: ['P1', 'm3', 'P5', 'm7', 'M9'] },
  min11: { symbol: 'm11', name: 'minor eleventh', short: 'm11', ivls: ['P1', 'm3', 'P5', 'm7', 'M9', 'P11'] },
  dom9sus4: { symbol: '9sus4', name: 'dominant ninth suspended 4th', short: '9sus4', ivls: ['P1', 'P4', 'P5', 'm7', 'M9'] },
  maj7s11: { symbol: 'maj7♯11', name: 'major seventh sharp eleven', short: 'maj7♯11', ivls: ['P1', 'M3', 'P5', 'M7', 'A11'] },
  dom13: { symbol: '13', name: 'dominant thirteenth', short: '13', ivls: ['P1', 'M3', 'P5', 'm7', 'M9', 'M13'] },
  dom7b9: { symbol: '7♭9', name: 'dominant seventh flat nine', short: '7♭9', ivls: ['P1', 'M3', 'P5', 'm7', 'm9'] },
  dom7s9: { symbol: '7♯9', name: 'dominant seventh sharp nine', short: '7♯9', ivls: ['P1', 'M3', 'P5', 'm7', 'A9'] },
  dom7s11: { symbol: '7♯11', name: 'dominant seventh sharp eleven', short: '7♯11', ivls: ['P1', 'M3', 'P5', 'm7', 'A11'] },
  dom7b13: { symbol: '7♭13', name: 'dominant seventh flat thirteen', short: '7♭13', ivls: ['P1', 'M3', 'P5', 'm7', 'm13'] },
  dom7s5: { symbol: '7♯5', name: 'dominant seventh sharp five', short: '7♯5', ivls: ['P1', 'M3', 'A5', 'm7'] },
  dom13s11: { symbol: '13♯11', name: 'dominant thirteenth sharp eleven', short: '13♯11', ivls: ['P1', 'M3', 'P5', 'm7', 'M9', 'A11', 'M13'] },
  dom7alt: { symbol: '7alt', name: 'altered dominant', short: '7alt', ivls: ['P1', 'M3', 'm7', 'm9', 'A9', 'A11', 'm13'] },
  min9b5: { symbol: 'm9♭5', name: 'half-diminished ninth', short: 'm9♭5', ivls: ['P1', 'm3', 'd5', 'm7', 'M9'] },
  minMaj9: { symbol: 'm(maj9)', name: 'minor-major ninth', short: 'm(maj9)', ivls: ['P1', 'm3', 'P5', 'M7', 'M9'] },
};

export const TRIAD_TYPES = ['maj', 'min', 'dim', 'aug'];
export const SEVENTH_TYPES = ['maj7', 'dom7', 'min7', 'hdim7', 'dim7'];

export function chordTones(root, typeId) {
  const t = CHORD_TYPES[typeId];
  if (!t) throw new Error('Unknown chord ' + typeId);
  return t.ivls.map((iv) => transpose(root, iv));
}

export function chordSymbol(root, typeId, bass = null) {
  const s = noteName(root) + CHORD_TYPES[typeId].symbol;
  return bass && !sameSpelling(bass, root) ? s + '/' + noteName(bass) : s;
}

/** Degree labels for chord tones: "1", "♭3", "♭5", "𝄫7", "♯9" … */
export function chordDegreeLabels(typeId) {
  return CHORD_TYPES[typeId].ivls.map(degreeLabel);
}

/**
 * Close-position voicing of a triad or seventh chord in an inversion.
 * The bass note is placed in bassOctave; every other note is stacked above.
 */
export function voiceChord(root, typeId, inversion = 0, bassOctave = 3) {
  const tones = CHORD_TYPES[typeId].ivls.slice(0, 4).map((iv) => transpose(root, iv));
  const order = tones.slice(inversion).concat(tones.slice(0, inversion));
  const out = [];
  let prev = null;
  for (const t of order) {
    let n = withOctave(t, bassOctave);
    if (prev) {
      n = withOctave(t, prev.o - 1);
      while (midi(n) <= midi(prev)) n = withOctave(t, n.o + 1);
    }
    out.push(n);
    prev = n;
  }
  return out;
}

export const INVERSION_NAMES = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];

/** Identify a triad or seventh-chord type from tones stacked in thirds above a root. */
export function identifyChordType(root, tones) {
  const ivs = tones.filter((t) => !sameSpelling(t, root)).map((t) => {
    const n = withOctave(t, root.o);
    const up = step(n) < step(root) || (step(n) === step(root) && midi(n) < midi(root)) ? withOctave(t, root.o + 1) : n;
    return intervalBetween(root, up).name;
  }).sort();
  const key = ivs.join(',');
  for (const [id, t] of Object.entries(CHORD_TYPES)) {
    if (t.ivls.slice(1).slice().sort().join(',') === key) return id;
  }
  return null;
}

/* -------------------------------------------------------- roman numerals */

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const LOWER_TYPES = new Set(['min', 'dim', 'min7', 'hdim7', 'dim7', 'minMaj7']);

/** Scale used to build diatonic chords. Minor keys raise the 7th for V and vii° unless natural is asked for. */
function chordScale(tonic, mode, degree, natural) {
  if (mode !== 'minor') return buildScale(tonic, 'major');
  if (!natural && (degree === 5 || degree === 7)) return buildScale(tonic, 'harmonicMinor');
  return buildScale(tonic, 'naturalMinor');
}

/**
 * Diatonic chord on a scale degree (1–7). Returns { root, typeId, tones }.
 * In minor, V and vii° use the raised leading tone unless natural is true (giving v and VII).
 */
export function diatonicChord(tonic, mode, degree, { seventh = false, natural = false } = {}) {
  const sc = chordScale(tonic, mode, degree, natural);
  const idx = degree - 1;
  const pick = (k) => sc[(idx + k) % 7];
  const tones = [pick(0), pick(2), pick(4)];
  if (seventh) tones.push(pick(6));
  const root = tones[0];
  const typeId = identifyChordType(root, tones);
  return { root, typeId, tones, degree };
}

const FIG_TEXT = { '': '', '6': '6', '64': '6/4', '7': '7', '65': '6/5', '43': '4/3', '42': '4/2' };

export function figureFor(isSeventh, inversion) {
  if (isSeventh) return ['7', '65', '43', '42'][inversion];
  return ['', '6', '64'][inversion];
}

/** Roman numeral pieces for a chord type on a degree. */
export function romanParts(degree, typeId, inversion = 0, secondaryOf = null) {
  let numeral = NUMERALS[degree - 1];
  if (LOWER_TYPES.has(typeId)) numeral = numeral.toLowerCase();
  let quality = '';
  if (typeId === 'dim' || typeId === 'dim7') quality = '°';
  else if (typeId === 'hdim7') quality = 'ø';
  else if (typeId === 'aug') quality = '+';
  const isSeventh = CHORD_TYPES[typeId].ivls.length >= 4;
  return { numeral, quality, figure: figureFor(isSeventh, inversion), secondaryOf };
}

/** Plain text such as "V6/5", "vii°7", "ii6", "V7/V". */
export function romanText(p) {
  return p.numeral + p.quality + FIG_TEXT[p.figure] + (p.secondaryOf ? '/' + p.secondaryOf : '');
}

/** HTML with stacked figured-bass numbers. */
export function romanHTML(p) {
  let fig = '';
  if (p.figure.length === 2) fig = `<span class="rn-fig"><span>${p.figure[0]}</span><span>${p.figure[1]}</span></span>`;
  else if (p.figure) fig = `<sup class="rn-sup">${p.figure}</sup>`;
  return `<span class="rn">${p.numeral}${p.quality ? `<span class="rn-q">${p.quality}</span>` : ''}${fig}${p.secondaryOf ? '/' + p.secondaryOf : ''}</span>`;
}

const RN_RE = /^(b|♭|#|♯)?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|o|ø|\+)?(7|65|64|6|43|42|2)?(?:\/(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i))?$/;

/**
 * Turn a Roman numeral string into a concrete chord in a key.
 * Supports diatonic chords, inversions, sevenths, the natural VII / v in minor, and applied dominants
 * (V/x, V7/x, vii°/x, vii°7/x).
 * Returns { root, typeId, inversion, tones, degree, label }.
 */
export function rnChord(tonic, mode, str) {
  const m = RN_RE.exec(str);
  if (!m) throw new Error('Bad numeral: ' + str);
  const [, accRaw, num, qual, fig = '', target] = m;
  const degree = NUMERALS.indexOf(num.toUpperCase()) + 1;
  const isSeventh = ['7', '65', '43', '42', '2'].includes(fig);
  const inversion = { '': 0, '7': 0, '6': 1, '65': 1, '64': 2, '43': 2, '42': 3, '2': 3 }[fig];
  const lower = num === num.toLowerCase();
  let root, typeId;
  if (target) {
    // Applied chord: the dominant (or leading-tone chord) of the target degree.
    const tDeg = NUMERALS.indexOf(target.toUpperCase()) + 1;
    const tChord = diatonicChord(tonic, mode, tDeg);
    const tRoot = tChord.root;
    if (degree === 5) {
      root = transpose(tRoot, 'P5');
      typeId = isSeventh ? 'dom7' : 'maj';
    } else if (degree === 7) {
      root = transpose(tRoot, 'm2', -1);
      if (isSeventh) typeId = qual === 'ø' ? 'hdim7' : 'dim7';
      else typeId = 'dim';
    } else {
      throw new Error('Unsupported applied chord ' + str);
    }
  } else if (accRaw) {
    // Chromatic root such as ♭VII or ♭VI in major (borrowed from the parallel minor).
    const flat = accRaw === 'b' || accRaw === '♭';
    const base = buildScale(tonic, 'major')[degree - 1];
    root = { l: base.l, a: base.a + (flat ? -1 : 1), o: base.o };
    if (qual === '°' || qual === 'o') typeId = isSeventh ? 'dim7' : 'dim';
    else if (qual === '+') typeId = 'aug';
    else if (lower) typeId = isSeventh ? 'min7' : 'min';
    else typeId = isSeventh ? 'dom7' : 'maj';
  } else {
    const natural = mode === 'minor' && ((degree === 7 && !lower) || (degree === 5 && lower));
    const d = diatonicChord(tonic, mode, degree, { seventh: isSeventh, natural });
    root = d.root;
    typeId = d.typeId;
  }
  const tones = chordTones(root, typeId);
  const parts = romanParts(degree, typeId, inversion, target || null);
  if (accRaw) parts.numeral = (accRaw === 'b' || accRaw === '♭' ? '♭' : '♯') + parts.numeral;
  return { root, typeId, inversion, tones, degree, parts, label: romanText(parts), bass: tones[inversion] };
}

/** The Roman numeral label a key would give a diatonic chord (used to check analysis answers). */
export function diatonicLabel(tonic, mode, degree, { seventh = false, inversion = 0, natural = false } = {}) {
  const d = diatonicChord(tonic, mode, degree, { seventh, natural });
  return romanText(romanParts(degree, d.typeId, inversion));
}

/* ------------------------------------------------------------ progressions */

export const PROGRESSIONS = [
  { id: 'p1', mode: 'major', name: 'Basic cadence', rn: ['I', 'IV', 'V', 'I'] },
  { id: 'p2', mode: 'major', name: 'Predominant to dominant', rn: ['I', 'ii', 'V', 'I'] },
  { id: 'p3', mode: 'major', name: 'Fifties-style turnaround', rn: ['I', 'vi', 'IV', 'V'] },
  { id: 'p4', mode: 'major', name: 'Circle turnaround', rn: ['I', 'vi', 'ii', 'V'] },
  { id: 'p5', mode: 'major', name: 'Pop loop', rn: ['I', 'V', 'vi', 'IV'] },
  { id: 'p6', mode: 'major', name: 'Minor-start loop', rn: ['vi', 'IV', 'I', 'V'] },
  { id: 'p7', mode: 'major', name: 'Circle of fifths', rn: ['I', 'IV', 'vii°', 'iii', 'vi', 'ii', 'V', 'I'] },
  { id: 'p8', mode: 'major', name: 'Cadential six-four', rn: ['I', 'IV', 'I64', 'V', 'I'] },
  { id: 'p9', mode: 'major', name: 'Seventh-chord cadence', rn: ['I', 'ii65', 'V7', 'I'] },
  { id: 'p10', mode: 'major', name: 'Plagal close', rn: ['I', 'V', 'IV', 'I'] },
  { id: 'p11', mode: 'major', name: 'Deceptive cadence', rn: ['I', 'IV', 'V7', 'vi'] },
  { id: 'p12', mode: 'major', name: 'Neighbour-note bass', rn: ['I', 'V6', 'I', 'ii6', 'V7', 'I'] },
  { id: 'p13', mode: 'major', name: 'Twelve-bar blues', rn: ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'] },
  { id: 'p14', mode: 'major', name: 'Rising bass', rn: ['I', 'I6', 'IV', 'V7', 'I'] },
  { id: 'p15', mode: 'major', name: 'Predominant seventh', rn: ['I', 'vi', 'ii7', 'V7', 'I'] },
  { id: 'm1', mode: 'minor', name: 'Minor cadence', rn: ['i', 'iv', 'V', 'i'] },
  { id: 'm2', mode: 'minor', name: 'Minor predominant', rn: ['i', 'ii°6', 'V', 'i'] },
  { id: 'm3', mode: 'minor', name: 'Minor loop', rn: ['i', 'VI', 'III', 'VII'] },
  { id: 'm4', mode: 'minor', name: 'Descending minor', rn: ['i', 'VII', 'VI', 'V'] },
  { id: 'm5', mode: 'minor', name: 'Minor seventh cadence', rn: ['i', 'iv7', 'V7', 'i'] },
  { id: 'm6', mode: 'minor', name: 'Minor circle', rn: ['i', 'iv', 'VII', 'III', 'VI', 'ii°', 'V', 'i'] },
];

/* --------------------------------------------------------------- guitar */

export const TUNINGS = {
  standard: { name: 'Standard (E A D G B E)', strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  dropD: { name: 'Drop D (D A D G B E)', strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  halfDown: { name: 'Half step down (E♭ A♭ D♭ G♭ B♭ E♭)', strings: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'] },
  dadgad: { name: 'DADGAD (D A D G A D)', strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  openG: { name: 'Open G (D G D G B D)', strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
  openD: { name: 'Open D (D A D F♯ A D)', strings: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'] },
};

export function tuningMidis(tuningId) {
  return (TUNINGS[tuningId] || TUNINGS.standard).strings.map((s) => midi(parseNote(s)));
}

/* ----------------------------------------------------------- randomness */

export function makeRng(seed = Date.now()) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const defaultRng = () => Math.random();
export const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function weightedPick(items, weights, rng = Math.random) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
