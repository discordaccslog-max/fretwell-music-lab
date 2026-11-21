// Fretwell Music Lab — melody and two-voice generation for dictation.
// Melodies are built from voice-leading rules and random choices, and are rejected and regenerated
// whenever they break a rule. They never copy or imitate existing tunes: there is no stored melodic
// material, motifs are not allowed to repeat, and long scale runs and repeated-note openings are ruled out.

import { buildScale, midi, step, mod, intervalBetween, sameSpelling, pick, shuffle } from './theory.js';
import { generateRhythm, METERS } from './rhythm.js';

function scaleFor(tonic, mode) {
  return buildScale(tonic, mode === 'minor' ? 'naturalMinor' : 'major');
}

/** Note at scale position p (p = 0 is the tonic in the tonic's octave). */
function noteAt(scale, p) {
  const t = scale[mod(p, 7)];
  return { l: t.l, a: t.a, o: t.o + Math.floor(p / 7) };
}

/** Positions whose natural-scale note is inside [low, high]. */
function positionsInRange(scale, low, high) {
  const out = [];
  for (let p = -21; p <= 21; p++) {
    const m = midi(noteAt(scale, p));
    if (m >= low && m <= high) out.push(p);
  }
  return out;
}

/** Apply minor-key alterations: a 7th that rises to the tonic becomes the leading tone, and a 6th rising into it is raised too. */
function spell(scale, mode, line) {
  const notes = line.map((p) => noteAt(scale, p));
  if (mode !== 'minor') return notes;
  for (let i = line.length - 2; i >= 0; i--) {
    const d = mod(line[i], 7);
    if (d === 6 && line[i + 1] === line[i] + 1) notes[i] = { ...notes[i], a: notes[i].a + 1 };
  }
  for (let i = 0; i + 1 < line.length; i++) {
    const d = mod(line[i], 7);
    const nextRaised = mod(line[i + 1], 7) === 6 && notes[i + 1].a !== noteAt(scale, line[i + 1]).a;
    if (d === 5 && line[i + 1] === line[i] + 1 && nextRaised) notes[i] = { ...notes[i], a: notes[i].a + 1 };
  }
  return notes;
}

const STEP_WEIGHTS = [
  [1, 34], [-1, 34], [2, 9], [-2, 9], [3, 4], [-3, 4], [4, 2.5], [-4, 2.5], [5, 0.8], [-5, 0.8], [7, 0.5], [-7, 0.5], [0, 1.6],
];

function weighted(rng, items) {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of items) { r -= w; if (r <= 0) return v; }
  return items[items.length - 1][0];
}

/** A random-walk line of scale positions; final two notes approach the tonic by step. Used for the lower voice of two-voice exercises. */
function walkLine(count, allowed, rng, { startDegrees = [0, 2, 4] } = {}) {
  const set = new Set(allowed);
  const tonics = allowed.filter((p) => mod(p, 7) === 0);
  if (!tonics.length) return null;
  if (count === 1) return [pick(tonics, rng)];
  const starts = allowed.filter((p) => startDegrees.includes(mod(p, 7)));
  const line = [pick(starts, rng)];
  for (let i = 1; i < count - 2; i++) {
    const prev = line[i - 1];
    const prevMove = i >= 2 ? line[i - 1] - line[i - 2] : 0;
    let next = null;
    for (let tries = 0; tries < 30 && next === null; tries++) {
      let d = weighted(rng, STEP_WEIGHTS);
      if (Math.abs(prevMove) >= 3) d = -Math.sign(prevMove);
      const cand = prev + d;
      if (set.has(cand)) next = cand;
    }
    if (next === null) return null;
    line.push(next);
  }
  // Penultimate: the 2nd or 7th degree next to a tonic in range, close to the previous note.
  const prev = line[line.length - 1];
  const options = [];
  for (const t of tonics) {
    for (const pen of [t + 1, t - 1]) {
      if (set.has(pen) && Math.abs(pen - prev) <= 2) options.push([pen, t]);
    }
  }
  if (!options.length) return null;
  const [pen, fin] = pick(options, rng);
  if (count >= 2) { line.push(pen); line.push(fin); }
  return line.slice(0, count);
}

/** Step sizes in a random order, favouring steps over leaps (sampling without replacement). */
function stepOrder(rng) {
  const items = STEP_WEIGHTS.slice();
  const out = [];
  while (items.length) {
    const v = weighted(rng, items);
    out.push(v);
    items.splice(items.findIndex(([x]) => x === v), 1);
  }
  return out;
}

// Rules that can only be judged once the melody is complete, and rules the search tracks itself.
const SKIP_WHILE_BUILDING = new Set(['end', 'cadence', 'leadingToneUnresolved', 'climax', 'narrow', 'start', 'repeats', 'repeatedMotif']);
const WINDOW = 8; // enough notes for every local rule (the longest, longRun, spans 6)

/**
 * A line of scale positions of a given length (at least 3) that follows the melody rules: it starts on
 * the 1st, 3rd or 5th degree, and its final two notes approach the tonic by step. Notes are chosen one
 * at a time in a weighted random order; a note that breaks a rule is replaced, backing up when a dead
 * end is reached. The high point is chosen first and reached exactly once, so the climax rule never has
 * to be repaired at the end. Checking as it goes keeps long melodies as easy to generate as short ones.
 */
function pitchLine(count, allowed, rng, { scale, mode, tonic, low, high, budget = 300 }) {
  const set = new Set(allowed);
  const tonics = allowed.filter((p) => mod(p, 7) === 0);
  if (!tonics.length || count < 3) return null;
  const errors = (line) => checkMelody(spell(scale, mode, line).map((note) => ({ note })), { tonic, mode, low, high });
  // After adding a note, check the local rules on the last few notes only, and the whole-melody rules
  // (at most one repeated note, no repeated three-interval motif) incrementally on positions.
  const prefixOk = (line) => {
    const n = line.length;
    if (n >= 2 && line[n - 1] === line[n - 2] && line.slice(0, -1).some((p, i) => i > 0 && p === line[i - 1])) return false;
    if (n >= 4) {
      const iv = (i) => line[i + 1] - line[i];
      const k = n - 4; // the newest three intervals start here
      for (let j = 0; j + 3 <= k; j++) if (iv(j) === iv(k) && iv(j + 1) === iv(k + 1) && iv(j + 2) === iv(k + 2)) return false;
    }
    return errors(line.slice(-WINDOW)).every((e) => SKIP_WHILE_BUILDING.has(e));
  };
  let visits = 0;
  const line = [];
  let top = 0;
  let topIsFinal = false; // when the tonic is the highest note in range, the final note is the high point
  function extend() {
    if (++visits > budget) return false;
    const prev = line[line.length - 1];
    const reached = line.includes(top);
    if (line.length === count - 2) {
      // Penultimate: the 2nd or 7th degree next to a tonic in range, close to the previous note.
      const endings = [];
      for (const t of tonics) for (const pen of [t + 1, t - 1]) if (set.has(pen) && Math.abs(pen - prev) <= 2) endings.push([pen, t]);
      if (count >= 6 && !reached && !topIsFinal) return false;
      for (const [pen, fin] of shuffle(endings.filter(([pen, fin]) => pen < top && (topIsFinal ? fin === top : fin < top)), rng)) {
        line.push(pen, fin);
        if (errors(line).length === 0) return true;
        line.length -= 2;
      }
      return false;
    }
    for (const d of stepOrder(rng)) {
      if (!set.has(prev + d) || prev + d > top || ((reached || topIsFinal) && prev + d === top)) continue;
      line.push(prev + d);
      if (prefixOk(line) && extend()) return true;
      line.pop();
      if (visits > budget) return false;
    }
    return false;
  }
  for (const start of shuffle(allowed.filter((p) => [0, 2, 4].includes(mod(p, 7))), rng)) {
    // The high point (the climax rule applies from six notes): one of the three highest positions in
    // range that is above the start and a tonic and can be reached in the notes available.
    topIsFinal = false;
    if (count >= 6) {
      const highs = allowed.filter((p) => p > start && p > Math.min(...tonics) && p - start <= 2 * (count - 3)).slice(-3);
      const highest = Math.max(...allowed);
      if (highs.length) top = pick(highs, rng);
      else if (mod(highest, 7) === 0 && highest > start) { top = highest; topIsFinal = true; }
      else continue;
    } else top = Math.max(...allowed) + 1; // out of reach, so it never restricts a short melody
    line.length = 0;
    line.push(start);
    if (extend()) return line;
    if (visits > budget) return null;
  }
  return null;
}

/**
 * Rules every generated melody must follow. Returns a list of broken rules (empty when the melody is good).
 * notes: [{ note, dur }]
 */
export function checkMelody(notes, { tonic, mode = 'major', low, high }) {
  const errs = [];
  const scale = scaleFor(tonic, mode);
  const ns = notes.map((n) => n.note);
  const deg = (n) => scale.findIndex((s) => s.l === n.l);
  const inScale = (n) => {
    const s = scale.find((x) => x.l === n.l);
    if (!s) return false;
    if (s.a === n.a) return true;
    return mode === 'minor' && (deg(n) === 5 || deg(n) === 6) && n.a === s.a + 1;
  };
  if (low !== undefined && ns.some((n) => midi(n) < low || midi(n) > high)) errs.push('range');
  if (!ns.every(inScale)) errs.push('notInKey');
  if (![0, 2, 4].includes(deg(ns[0]))) errs.push('start');
  if (deg(ns[ns.length - 1]) !== 0) errs.push('end');
  if (ns.length >= 2) {
    const pen = ns[ns.length - 2];
    const fin = ns[ns.length - 1];
    if (![1, 6].includes(deg(pen)) || Math.abs(step(fin) - step(pen)) !== 1) errs.push('cadence');
  }
  let repeats = 0;
  let sameDirLeaps = 0;
  let lastDir = 0;
  let runSteps = 0;
  const ivs = [];
  for (let i = 1; i < ns.length; i++) {
    const a = ns[i - 1], b = ns[i];
    const semis = midi(b) - midi(a);
    ivs.push(step(b) - step(a));
    const iv = intervalBetween(a, b);
    if (semis === 0) {
      repeats++;
      if (i >= 2 && midi(ns[i - 2]) === midi(a)) errs.push('tripleRepeat');
      lastDir = 0; sameDirLeaps = 0; runSteps = 0;
      continue;
    }
    if (!iv.name || /^(A|d|AA|dd)/.test(iv.name)) errs.push('augOrDim:' + iv.name);
    if (Math.abs(semis) > 12) errs.push('wideLeap');
    if (iv.num === 7 || iv.num === 14) errs.push('seventh');
    const dir = Math.sign(semis);
    if (iv.num >= 3) {
      sameDirLeaps = dir === lastDir ? sameDirLeaps + 1 : 1;
      if (sameDirLeaps > 2) errs.push('leapsSameDirection');
      runSteps = 0;
    } else {
      sameDirLeaps = 0;
      runSteps = dir === lastDir ? runSteps + 1 : 1;
      if (runSteps > 4) errs.push('longRun');
    }
    if (i >= 2) {
      const prevIv = intervalBetween(ns[i - 2], a);
      const prevSemis = midi(a) - midi(ns[i - 2]);
      if (prevIv.num >= 4 && prevSemis !== 0) {
        if (!(Math.sign(semis) === -Math.sign(prevSemis) && iv.num === 2)) errs.push('leapRecovery');
      }
    }
    lastDir = dir;
  }
  if (repeats > 1) errs.push('repeats');
  // Leading tone resolves to the tonic (major allows a descending 1–7–6).
  for (let i = 0; i < ns.length; i++) {
    const n = ns[i];
    const isLT = deg(n) === 6 && (mode === 'major' || n.a === scale[6].a + 1);
    if (!isLT) continue;
    const next = ns[i + 1];
    if (!next) { errs.push('leadingToneUnresolved'); continue; }
    const up = deg(next) === 0 && step(next) === step(n) + 1;
    const descending = mode === 'major' && i > 0 && deg(ns[i - 1]) === 0 && step(ns[i - 1]) === step(n) + 1 && deg(next) === 5 && step(next) === step(n) - 1;
    if (!up && !descending) errs.push('leadingTone');
  }
  // No repeated motif or sequence: the same three successive diatonic intervals may not occur twice.
  const seen = new Map();
  for (let i = 0; i + 3 <= ivs.length; i++) {
    const k = ivs.slice(i, i + 3).join(',');
    if (seen.has(k) && i - seen.get(k) >= 3) errs.push('repeatedMotif');
    if (!seen.has(k)) seen.set(k, i);
  }
  if (ns.length >= 5) {
    const ms = ns.map(midi);
    const span = Math.max(...ms) - Math.min(...ms);
    if (span < 5) errs.push('narrow');
    if (ns.length >= 6) {
      const top = Math.max(...ms);
      if (ms.filter((m) => m === top).length > 1) errs.push('climax');
    }
  }
  return errs;
}

/**
 * Generate a dictation melody.
 * opts: { tonic, mode, meter, bars, low, high, level (rhythm complexity 1–4), rng }
 * Returns { notes: [{ note, dur, start, bar }], tonic, mode, meter }.
 */
export function generateMelody({ tonic, mode = 'major', meter = '4/4', bars = 2, low = 60, high = 74, level = 1, rng = Math.random }) {
  const scale = scaleFor(tonic, mode);
  const allowed = positionsInRange(scale, low, high);
  // Short meters need at least two bars to hold a phrase.
  bars = Math.max(bars, Math.ceil(4 / METERS[meter].beats.length));
  for (let attempt = 0; attempt < 1000; attempt++) {
    const rhythm = generateRhythm(meter, bars, Math.min(level, 4), rng, { rests: false, tuplets: false, longEnding: bars > 1 });
    if (rhythm.length < 3) continue;
    const line = pitchLine(rhythm.length, allowed, rng, { scale, mode, tonic, low, high });
    if (!line) continue;
    const spelled = spell(scale, mode, line);
    const notes = rhythm.map((r, i) => ({ ...r, note: spelled[i] }));
    if (checkMelody(notes, { tonic, mode, low, high }).length === 0) return { notes, tonic, mode, meter, bars };
  }
  throw new Error('Could not generate a melody with these settings');
}

/* ------------------------------------------------------------ two voices */

const CONSONANT = new Set([0, 3, 4, 7, 8, 9]);
const perfect = (s) => mod(s, 12) === 0 || mod(s, 12) === 7;

/** Rules for note-against-note two-voice writing. lower/upper are note arrays. Returns broken rules. */
export function checkTwoVoice(lower, upper, { tonic, mode = 'major' }) {
  const errs = [];
  const n = lower.length;
  if (upper.length !== n) return ['length'];
  const scale = scaleFor(tonic, mode);
  const isTonic = (x) => sameSpelling(x, scale[0]);
  for (let i = 0; i < n; i++) {
    const s = midi(upper[i]) - midi(lower[i]);
    if (s < 0) errs.push('crossing@' + i);
    if (!CONSONANT.has(mod(s, 12))) errs.push('dissonance@' + i);
    if (mod(s, 12) === 0 && s === 0 && i !== 0 && i !== n - 1) errs.push('unison@' + i);
    if (s > 24) errs.push('tooWide@' + i);
  }
  if (!perfect(midi(upper[0]) - midi(lower[0]))) errs.push('startImperfect');
  if (!isTonic(lower[0])) errs.push('startLower');
  if (!isTonic(lower[n - 1]) || !isTonic(upper[n - 1])) errs.push('endNotTonic');
  for (let i = 1; i < n; i++) {
    const s1 = midi(upper[i - 1]) - midi(lower[i - 1]);
    const s2 = midi(upper[i]) - midi(lower[i]);
    const mu = midi(upper[i]) - midi(upper[i - 1]);
    const ml = midi(lower[i]) - midi(lower[i - 1]);
    if (perfect(s2) && Math.sign(mu) === Math.sign(ml) && mu !== 0) {
      if (perfect(s1) && mod(s1, 12) === mod(s2, 12)) errs.push('parallel@' + i);
      else errs.push('direct@' + i);
    }
    for (const [voice, a, b] of [['upper', upper[i - 1], upper[i]], ['lower', lower[i - 1], lower[i]]]) {
      const iv = intervalBetween(a, b);
      if (midi(a) === midi(b)) continue;
      if (!iv.name || /^(A|d)/.test(iv.name)) errs.push(voice + 'AugDim@' + i);
      if (iv.num === 7 || Math.abs(midi(b) - midi(a)) > 12) errs.push(voice + 'Leap@' + i);
    }
  }
  // No more than three parallel 3rds or 6ths in a row.
  let run = 1;
  for (let i = 1; i < n; i++) {
    const a = mod(midi(upper[i - 1]) - midi(lower[i - 1]), 12);
    const b = mod(midi(upper[i]) - midi(lower[i]), 12);
    const similar = Math.sign(midi(upper[i]) - midi(upper[i - 1])) === Math.sign(midi(lower[i]) - midi(lower[i - 1]));
    const sameClass = (x, y) => (x === 3 || x === 4) === (y === 3 || y === 4) && (x === 8 || x === 9) === (y === 8 || y === 9) && !perfect(x);
    if (similar && sameClass(a, b)) { run++; if (run > 3) errs.push('parallelRun@' + i); } else run = 1;
  }
  return errs;
}

/**
 * Generate a note-against-note two-voice exercise.
 * opts: { tonic, mode, length (notes), lowRange [lo, hi], highRange [lo, hi], rng }
 * Returns { lower, upper } as note arrays.
 */
export function generateTwoVoice({ tonic, mode = 'major', length = 8, lowRange = [45, 62], highRange = [60, 79], rng = Math.random }) {
  const scale = scaleFor(tonic, mode);
  const lowAllowed = positionsInRange(scale, lowRange[0], lowRange[1]);
  const highAllowed = positionsInRange(scale, highRange[0], highRange[1]);
  for (let attempt = 0; attempt < 400; attempt++) {
    // Lower voice: starts on the tonic and closes 2–1.
    let line = walkLine(length, lowAllowed, rng, { startDegrees: [0] });
    if (!line || mod(line[length - 2], 7) !== 1) continue;
    const lower = spell(scale, 'major', line);
    const lowerNotes = lower.map((note) => ({ note, dur: 24 }));
    if (checkMelody(lowerNotes, { tonic, mode: mode === 'minor' ? 'minor' : 'major' }).filter((e) => e !== 'climax').length) continue;
    const upper = counterpoint(lower, line, scale, mode, highAllowed, rng);
    if (upper && checkTwoVoice(lower, upper, { tonic, mode }).length === 0) return { lower, upper };
  }
  throw new Error('Could not generate a two-voice exercise');
}

function counterpoint(lower, lowerLine, scale, mode, allowed, rng) {
  const n = lower.length;
  const out = [];
  const cand = (i) => {
    let ps = allowed.slice();
    if (i === 0) ps = ps.filter((p) => [0, 4].includes(mod(p, 7)));
    if (i === n - 1) ps = ps.filter((p) => mod(p, 7) === 0);
    if (i === n - 2) ps = ps.filter((p) => mod(p, 7) === 6);
    return ps.map((p) => {
      let note = noteAt(scale, p);
      if (i === n - 2 && mode === 'minor') note = { ...note, a: note.a + 1 };
      return { p, note };
    });
  };
  const okWith = (i, c) => {
    const s = midi(c.note) - midi(lower[i]);
    if (s < 0 || !CONSONANT.has(mod(s, 12)) || s > 24) return false;
    if (s === 0 && i !== 0 && i !== n - 1) return false;
    if (i === 0 && !perfect(s)) return false;
    if (i === n - 1 && !perfect(s)) return false;
    if (i > 0) {
      const prev = out[i - 1];
      const s1 = midi(prev.note) - midi(lower[i - 1]);
      const mu = midi(c.note) - midi(prev.note);
      const ml = midi(lower[i]) - midi(lower[i - 1]);
      if (perfect(s) && mu !== 0 && Math.sign(mu) === Math.sign(ml)) return false;
      if (mu === 0 && i >= 2 && midi(out[i - 2].note) === midi(prev.note)) return false;
      const iv = intervalBetween(prev.note, c.note);
      if (mu !== 0 && (!iv.name || /^(A|d)/.test(iv.name))) return false;
      if (Math.abs(mu) > 8 && Math.abs(mu) !== 12) return false;
      if (iv.num === 7) return false;
      if (i >= 2) {
        const pm = midi(prev.note) - midi(out[i - 2].note);
        if (Math.abs(pm) >= 5 && !(Math.sign(mu) === -Math.sign(pm) && Math.abs(mu) <= 2 && mu !== 0)) return false;
      }
      // Leading tone in the upper voice must rise to the tonic.
      const prevDeg = mod(prev.p, 7);
      if (prevDeg === 6 && (mode === 'major' || prev.note.a !== noteAt(scale, prev.p).a) && !(mod(c.p, 7) === 0 && c.p === prev.p + 1)) return false;
    }
    return true;
  };
  const score = (i, c) => {
    if (i === 0) return rng();
    const prev = out[i - 1];
    const mu = midi(c.note) - midi(prev.note);
    const ml = midi(lower[i]) - midi(lower[i - 1]);
    let w = rng() * 2;
    if (Math.sign(mu) !== Math.sign(ml) && mu !== 0 && ml !== 0) w += 2.5; // contrary motion
    if (Math.abs(mu) <= 2 && mu !== 0) w += 2; // stepwise
    if (mu === 0) w -= 1.5;
    if (Math.abs(mu) > 4) w -= 1;
    return w;
  };
  const go = (i) => {
    if (i === n) return true;
    const list = cand(i).filter((c) => okWith(i, c)).map((c) => ({ c, s: score(i, c) })).sort((a, b) => b.s - a.s);
    for (const { c } of list.slice(0, 5)) {
      out.push(c);
      if (go(i + 1)) return true;
      out.pop();
    }
    return false;
  };
  return go(0) ? out.map((x) => x.note) : null;
}
