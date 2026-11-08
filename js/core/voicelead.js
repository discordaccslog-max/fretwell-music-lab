// Fretwell Music Lab — four-part (SATB) voice leading.
// checkSATB() grades a realization against standard common-practice rules.
// realize() writes a correct realization with a beam search, used for model answers,
// analysis examples and ear-training progressions.

import {
  midi, step, pc, mod, sameSpelling, transpose, intervalBetween, noteName, rnChord, withOctave, makeRng,
} from './theory.js';

export const VOICES = ['Bass', 'Tenor', 'Alto', 'Soprano'];
// Allowed ranges (MIDI): Bass E2–D4, Tenor C3–A4, Alto G3–D5, Soprano C4–A5.
export const RANGES = [[40, 62], [48, 69], [55, 74], [60, 81]];
// Comfortable ranges used when the generator writes its own answers.
const COMFORT = [[40, 60], [48, 67], [55, 72], [62, 79]];

/** A chord in context: Roman numeral resolved in a key, with its leading tone and seventh marked. */
export function chordInfo(tonic, mode, rn) {
  const c = rnChord(tonic, mode, rn);
  let lt = null;
  if (c.degree === 5 && (c.typeId === 'maj' || c.typeId === 'dom7')) lt = c.tones[1];
  if (c.degree === 7 && ['dim', 'dim7', 'hdim7'].includes(c.typeId)) lt = c.tones[0];
  const seventh = c.tones.length >= 4 ? c.tones[3] : null;
  return { ...c, lt, seventh, rn, key: { tonic, mode } };
}

const toneIndex = (chord, n) => chord.tones.findIndex((t) => sameSpelling(t, n));
const sameHarmony = (a, b) => sameSpelling(a.root, b.root) && a.typeId === b.typeId;
const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

function perfectKind(a, b) {
  const lo = midi(a) <= midi(b) ? a : b;
  const hi = lo === a ? b : a;
  const s = mod(midi(hi) - midi(lo), 12);
  const g = mod(step(hi) - step(lo), 7);
  if (s === 7 && g === 4) return 5;
  if (s === 0 && g === 0) return 8;
  return 0;
}

const nm = (n) => noteName(n, { octave: true });

/* ---------------------------------------------------------- single chord */

export function checkChord(chord, v, k = 0) {
  const errors = [];
  const warnings = [];
  const label = chord.label;
  for (let i = 0; i < 4; i++) {
    if (!v[i]) { errors.push({ rule: 'missing', chord: k, voices: [i], message: `${VOICES[i]} note missing in chord ${k + 1} (${label}).` }); }
  }
  if (errors.length) return { errors, warnings };

  for (let i = 0; i < 4; i++) {
    const n = v[i];
    if (toneIndex(chord, n) < 0) {
      const enh = chord.tones.find((t) => pc(t) === pc(n));
      if (enh) errors.push({ rule: 'spelling', chord: k, voices: [i], message: `${VOICES[i]} in chord ${k + 1}: ${noteName(n)} should be spelled ${noteName(enh)} in ${label}.` });
      else errors.push({ rule: 'notChordTone', chord: k, voices: [i], message: `${VOICES[i]} in chord ${k + 1}: ${noteName(n)} is not in ${label} (${chord.tones.map((t) => noteName(t)).join(' ')}).` });
    }
    const [lo, hi] = RANGES[i];
    if (midi(n) < lo || midi(n) > hi) errors.push({ rule: 'range', chord: k, voices: [i], message: `${VOICES[i]} in chord ${k + 1} (${nm(n)}) is outside the ${VOICES[i].toLowerCase()} range.` });
  }
  if (!sameSpelling(v[0], chord.bass)) {
    errors.push({ rule: 'bass', chord: k, voices: [0], message: `Chord ${k + 1} (${label}) needs ${noteName(chord.bass)} in the bass.` });
  }
  for (let i = 0; i < 3; i++) {
    if (midi(v[i]) > midi(v[i + 1])) errors.push({ rule: 'crossing', chord: k, voices: [i, i + 1], message: `Voice crossing in chord ${k + 1}: the ${VOICES[i].toLowerCase()} is above the ${VOICES[i + 1].toLowerCase()}.` });
  }
  if (midi(v[3]) - midi(v[2]) > 12) errors.push({ rule: 'spacing', chord: k, voices: [2, 3], message: `Spacing in chord ${k + 1}: more than an octave between soprano and alto.` });
  if (midi(v[2]) - midi(v[1]) > 12) errors.push({ rule: 'spacing', chord: k, voices: [1, 2], message: `Spacing in chord ${k + 1}: more than an octave between alto and tenor.` });

  const counts = chord.tones.map(() => 0);
  const where = chord.tones.map(() => []);
  v.forEach((n, i) => { const t = toneIndex(chord, n); if (t >= 0) { counts[t]++; where[t].push(i); } });
  if (counts[0] === 0) errors.push({ rule: 'missingRoot', chord: k, voices: [], message: `Chord ${k + 1} (${label}) is missing its root (${noteName(chord.tones[0])}).` });
  if (counts[1] === 0) errors.push({ rule: 'missingThird', chord: k, voices: [], message: `Chord ${k + 1} (${label}) is missing its 3rd (${noteName(chord.tones[1])}).` });
  if (chord.tones.length >= 4 && counts[3] === 0) errors.push({ rule: 'missingSeventh', chord: k, voices: [], message: `Chord ${k + 1} (${label}) is missing its 7th (${noteName(chord.tones[3])}).` });
  if (counts[2] === 0) {
    if (chord.inversion !== 0) errors.push({ rule: 'missingFifth', chord: k, voices: [], message: `Chord ${k + 1} (${label}) is inverted, so keep all chord tones; the 5th (${noteName(chord.tones[2])}) is missing.` });
    else if (counts[0] < 2) errors.push({ rule: 'missingFifth', chord: k, voices: [], message: `Chord ${k + 1} (${label}) leaves out the 5th, so the root should be doubled.` });
  }
  if (chord.lt) {
    const t = toneIndex(chord, chord.lt);
    if (t >= 0 && counts[t] > 1) errors.push({ rule: 'doubledLeadingTone', chord: k, voices: where[t], message: `Chord ${k + 1} (${label}) doubles the leading tone (${noteName(chord.lt)}).` });
  }
  if (chord.seventh && counts[3] > 1) errors.push({ rule: 'doubledSeventh', chord: k, voices: where[3], message: `Chord ${k + 1} (${label}) doubles the 7th (${noteName(chord.seventh)}).` });
  return { errors, warnings };
}

/* ------------------------------------------------------- chord to chord */

export function checkMotion(c1, c2, v1, v2, k = 0) {
  const errors = [];
  const warnings = [];
  const at = `from chord ${k + 1} to ${k + 2}`;
  // Parallel and contrary perfect intervals between every pair of voices.
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const mi = midi(v2[i]) - midi(v1[i]);
      const mj = midi(v2[j]) - midi(v1[j]);
      if (mi === 0 && mj === 0) continue;
      const p1 = perfectKind(v1[i], v1[j]);
      const p2 = perfectKind(v2[i], v2[j]);
      if (p1 && p1 === p2) {
        const what = p1 === 5 ? '5ths' : 'octaves';
        if (sign(mi) === sign(mj)) errors.push({ rule: 'parallel', chord: k + 1, voices: [i, j], message: `Parallel ${what} between ${VOICES[i].toLowerCase()} and ${VOICES[j].toLowerCase()} ${at}.` });
        else if (mi !== 0 && mj !== 0) warnings.push({ rule: 'contrary', chord: k + 1, voices: [i, j], message: `Contrary ${what} between ${VOICES[i].toLowerCase()} and ${VOICES[j].toLowerCase()} ${at}.` });
      }
    }
  }
  // Direct (hidden) 5ths or octaves in the outer voices with a leap in the soprano.
  {
    const mb = midi(v2[0]) - midi(v1[0]);
    const ms = midi(v2[3]) - midi(v1[3]);
    const p2 = perfectKind(v2[0], v2[3]);
    const p1 = perfectKind(v1[0], v1[3]);
    if (p2 && p1 !== p2 && mb !== 0 && sign(mb) === sign(ms) && Math.abs(ms) > 2) {
      warnings.push({ rule: 'direct', chord: k + 1, voices: [0, 3], message: `Direct ${p2 === 5 ? '5th' : 'octave'} in the outer voices ${at}: the soprano leaps into it in similar motion.` });
    }
  }
  // Overlapping voices.
  for (let i = 0; i < 3; i++) {
    if (midi(v2[i]) > midi(v1[i + 1])) warnings.push({ rule: 'overlap', chord: k + 1, voices: [i, i + 1], message: `Overlap ${at}: the ${VOICES[i].toLowerCase()} moves above where the ${VOICES[i + 1].toLowerCase()} just was.` });
    else if (midi(v2[i + 1]) < midi(v1[i])) warnings.push({ rule: 'overlap', chord: k + 1, voices: [i, i + 1], message: `Overlap ${at}: the ${VOICES[i + 1].toLowerCase()} moves below where the ${VOICES[i].toLowerCase()} just was.` });
  }
  // Melodic intervals.
  for (let i = 0; i < 4; i++) {
    const iv = intervalBetween(v1[i], v2[i]);
    const size = Math.abs(midi(v2[i]) - midi(v1[i]));
    if (size === 0) continue;
    if (iv.name && iv.name.startsWith('A')) errors.push({ rule: 'augmented', chord: k + 1, voices: [i], message: `The ${VOICES[i].toLowerCase()} moves by an augmented interval (${noteName(v1[i])} to ${noteName(v2[i])}) ${at}.` });
    else if (size > 12) errors.push({ rule: 'leap', chord: k + 1, voices: [i], message: `The ${VOICES[i].toLowerCase()} leaps more than an octave ${at}.` });
    else if (iv.num === 7) errors.push({ rule: 'leap', chord: k + 1, voices: [i], message: `The ${VOICES[i].toLowerCase()} leaps a 7th ${at}.` });
    else if ((i === 1 || i === 2) && size > 7) warnings.push({ rule: 'innerLeap', chord: k + 1, voices: [i], message: `Large leap in the ${VOICES[i].toLowerCase()} ${at}; inner voices usually move by step or small leap.` });
  }
  if (sameHarmony(c1, c2)) return { errors, warnings };

  // Leading tone.
  if (c1.lt) {
    const res = transpose(c1.lt, 'm2');
    const resolves = c2.tones.some((t) => sameSpelling(t, res));
    if (resolves) {
      for (let i = 0; i < 4; i++) {
        if (!sameSpelling(v1[i], c1.lt)) continue;
        const ok = sameSpelling(v2[i], res) && midi(v2[i]) - midi(v1[i]) === 1;
        if (ok) continue;
        if (i === 3 || i === 0) {
          errors.push({ rule: 'leadingTone', chord: k + 1, voices: [i], message: `The leading tone ${noteName(c1.lt)} in the ${VOICES[i].toLowerCase()} should rise to ${noteName(res)} ${at}.` });
        } else {
          const toFifth = c2.tones.length >= 3 && sameSpelling(v2[i], c2.tones[2]) && midi(v2[i]) < midi(v1[i]) && sameSpelling(c2.root, res);
          if (!toFifth) warnings.push({ rule: 'leadingTone', chord: k + 1, voices: [i], message: `The leading tone ${noteName(c1.lt)} in the ${VOICES[i].toLowerCase()} doesn’t resolve to ${noteName(res)} ${at}.` });
        }
      }
    }
  }
  // Chordal seventh resolves down by step.
  if (c1.seventh) {
    for (let i = 0; i < 4; i++) {
      if (!sameSpelling(v1[i], c1.seventh)) continue;
      const d = midi(v2[i]) - midi(v1[i]);
      const g = step(v2[i]) - step(v1[i]);
      if (!(g === -1 && (d === -1 || d === -2))) {
        errors.push({ rule: 'seventh', chord: k + 1, voices: [i], message: `The 7th of chord ${k + 1} (${noteName(c1.seventh)} in the ${VOICES[i].toLowerCase()}) should resolve down by step ${at}.` });
      }
    }
  }
  return { errors, warnings };
}

/** Grade a full realization. voicings[k] = [bass, tenor, alto, soprano] (null for an empty slot). */
export function checkSATB(chords, voicings) {
  const errors = [];
  const warnings = [];
  chords.forEach((c, k) => {
    const r = checkChord(c, voicings[k] || [], k);
    errors.push(...r.errors); warnings.push(...r.warnings);
  });
  for (let k = 0; k + 1 < chords.length; k++) {
    const a = voicings[k], b = voicings[k + 1];
    if (!a || !b || a.some((n) => !n) || b.some((n) => !n)) continue;
    const r = checkMotion(chords[k], chords[k + 1], a, b, k);
    errors.push(...r.errors); warnings.push(...r.warnings);
  }
  return { errors, warnings };
}

/* --------------------------------------------------------------- writer */

function notesInRange(tone, lo, hi) {
  const out = [];
  for (let o = 1; o <= 6; o++) {
    const n = withOctave(tone, o);
    const m = midi(n);
    if (m >= lo && m <= hi) out.push(n);
  }
  return out;
}

function candidates(chord, fixedBass) {
  const basses = fixedBass ? [fixedBass] : notesInRange(chord.bass, COMFORT[0][0], COMFORT[0][1]);
  const pools = [1, 2, 3].map((i) => chord.tones.flatMap((t) => notesInRange(t, COMFORT[i][0], COMFORT[i][1])));
  const out = [];
  for (const b of basses) {
    for (const t of pools[0]) {
      if (midi(t) < midi(b)) continue;
      for (const a of pools[1]) {
        if (midi(a) < midi(t) || midi(a) - midi(t) > 12) continue;
        for (const s of pools[2]) {
          if (midi(s) < midi(a) || midi(s) - midi(a) > 12) continue;
          const v = [b, t, a, s];
          if (checkChord(chord, v).errors.length === 0) out.push({ v, cost: staticCost(chord, v) });
        }
      }
    }
  }
  return out;
}

function staticCost(chord, v) {
  const counts = chord.tones.map(() => 0);
  v.forEach((n) => { const t = toneIndex(chord, n); if (t >= 0) counts[t]++; });
  let c = 0;
  const triad = chord.tones.length === 3;
  if (triad) {
    if (chord.typeId === 'dim') {
      if (counts[1] < 2) c += 1.5;
    } else if (chord.inversion === 0) {
      if (counts[2] === 0) c += 1.2;
      if (counts[1] > 1) c += chord.degree === 6 ? 0.8 : 2.5;
      if (counts[2] > 1) c += 1.5;
    } else if (chord.inversion === 2) {
      if (counts[2] < 2) c += 2.5;
    } else if (counts[1] > 1 && chord.typeId === 'maj') c += 1;
  } else if (counts[2] === 0) c += 0.8;
  if (midi(v[1]) - midi(v[0]) > 19) c += 1;
  // Favour a soprano around the middle of its range.
  c += Math.abs(midi(v[3]) - 70) * 0.04;
  return c;
}

function transitionCost(c1, c2, v1, v2) {
  const r = checkMotion(c1, c2, v1, v2);
  if (r.errors.length) return Infinity;
  let cost = 0;
  for (let i = 1; i < 4; i++) {
    const d = Math.abs(midi(v2[i]) - midi(v1[i]));
    cost += d;
    if (i === 3 && d > 4) cost += 3;
    if (i < 3 && d > 5) cost += 4;
  }
  cost += Math.abs(midi(v2[0]) - midi(v1[0])) * 0.25;
  for (const w of r.warnings) cost += { contrary: 6, direct: 4, overlap: 5, innerLeap: 3, leadingTone: 3 }[w.rule] || 2;
  const moves = [0, 1, 2, 3].map((i) => sign(midi(v2[i]) - midi(v1[i])));
  if (moves.every((m) => m === moves[0]) && moves[0] !== 0) cost += 3;
  return cost;
}

/**
 * Write a four-part realization. Options:
 *   bassLine: array of fixed bass notes (used when the bass is given)
 *   rng: random source for variety
 * Returns an array of [B, T, A, S] or null if no correct realization exists in range.
 */
export function realize(chords, { bassLine = null, rng = makeRng(Date.now()), beam = 60 } = {}) {
  const cands = chords.map((c, k) => candidates(c, bassLine ? bassLine[k] : null));
  if (cands.some((c) => c.length === 0)) return null;
  let states = cands[0].map((c) => ({ v: c.v, cost: c.cost + rng() * 1.5, prev: null }));
  states.sort((a, b) => a.cost - b.cost);
  states = states.slice(0, beam);
  for (let k = 1; k < chords.length; k++) {
    const next = [];
    for (const cand of cands[k]) {
      let best = null;
      for (const s of states) {
        const t = transitionCost(chords[k - 1], chords[k], s.v, cand.v);
        if (t === Infinity) continue;
        const total = s.cost + t + cand.cost;
        if (!best || total < best.cost) best = { v: cand.v, cost: total, prev: s };
      }
      if (best) { best.cost += rng() * 1.5; next.push(best); }
    }
    if (!next.length) return null;
    next.sort((a, b) => a.cost - b.cost);
    states = next.slice(0, beam);
  }
  const out = [];
  for (let s = states[0]; s; s = s.prev) out.unshift(s.v);
  return out;
}

/** Chords for a list of Roman numerals in one key. */
export function chordsFor(tonic, mode, rns) {
  return rns.map((rn) => chordInfo(tonic, mode, rn));
}

/** Chords where each entry carries its own key: [{ tonic, mode, rn }]. */
export function chordsInKeys(list) {
  return list.map(({ tonic, mode, rn }) => chordInfo(tonic, mode, rn));
}
