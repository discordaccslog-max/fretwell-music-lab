// Fretwell Music Lab — meters and rhythm generation.
// Durations are in ticks: 12 ticks = one quarter note. Negative durations are rests.

export const TPQ = 12;

export const METERS = {
  '2/4': { id: '2/4', num: 2, den: 4, bar: 24, beats: [12, 12], pulse: 12 },
  '3/4': { id: '3/4', num: 3, den: 4, bar: 36, beats: [12, 12, 12], pulse: 12 },
  '4/4': { id: '4/4', num: 4, den: 4, bar: 48, beats: [12, 12, 12, 12], pulse: 12 },
  '5/4': { id: '5/4', num: 5, den: 4, bar: 60, beats: [12, 12, 12, 12, 12], pulse: 12, groups: [36, 24] },
  '5/8': { id: '5/8', num: 5, den: 8, bar: 30, beats: [12, 18], pulse: 6 },
  '6/8': { id: '6/8', num: 6, den: 8, bar: 36, beats: [18, 18], pulse: 6 },
  '7/8': { id: '7/8', num: 7, den: 8, bar: 42, beats: [12, 12, 18], pulse: 6 },
  '9/8': { id: '9/8', num: 9, den: 8, bar: 54, beats: [18, 18, 18], pulse: 6 },
  '12/8': { id: '12/8', num: 12, den: 8, bar: 72, beats: [18, 18, 18, 18], pulse: 6 },
};

export const DURATION_NAMES = {
  48: 'whole note', 36: 'dotted half note', 24: 'half note', 18: 'dotted quarter note', 12: 'quarter note',
  9: 'dotted eighth note', 6: 'eighth note', 4: 'triplet eighth note', 3: 'sixteenth note',
};

const BEAT12 = [
  { level: 1, d: [12] },
  { level: 2, d: [6, 6] },
  { level: 3, d: [-12] },
  { level: 3, d: [-6, 6] },
  { level: 4, d: [3, 3, 3, 3] },
  { level: 4, d: [6, 3, 3] },
  { level: 4, d: [3, 3, 6] },
  { level: 4, d: [9, 3] },
  { level: 5, d: [4, 4, 4], tuplet: true },
  { level: 5, d: [3, 6, 3] },
  { level: 5, d: [-3, 3, 3, 3] },
];
const PAIR12 = [
  { level: 1, d: [24] },
  { level: 3, d: [18, 6] },
  { level: 5, d: [6, 12, 6] },
];
const BEAT18 = [
  { level: 1, d: [18] },
  { level: 2, d: [12, 6] },
  { level: 2, d: [6, 6, 6] },
  { level: 3, d: [6, 12] },
  { level: 3, d: [12, -6] },
  { level: 3, d: [-18] },
  { level: 4, d: [3, 3, 6, 6] },
  { level: 4, d: [6, 3, 3, 6] },
  { level: 4, d: [6, 6, 3, 3] },
  { level: 4, d: [9, 3, 6] },
  { level: 5, d: [3, 3, 3, 3, 6] },
  { level: 5, d: [-6, 6, 6] },
];
const PAIR18 = [{ level: 1, d: [36] }];

function choose(cells, maxLevel, rng, { rests = true, tuplets = true } = {}) {
  const pool = cells.filter((c) => c.level <= maxLevel && (rests || !c.d.some((x) => x < 0)) && (tuplets || !c.tuplet));
  const weights = pool.map((c) => (c.level === maxLevel ? 2.2 : c.level === maxLevel - 1 ? 1.4 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

/**
 * One bar of rhythm. Returns events: { dur, rest, tuplet, beat }.
 * level 1–5; options.rests / options.tuplets switch those features.
 */
export function generateBar(meterId, level, rng, options = {}) {
  const meter = METERS[meterId];
  const out = [];
  const beats = meter.beats;
  let i = 0;
  while (i < beats.length) {
    const size = beats[i];
    const canPair = i % 2 === 0 && i + 1 < beats.length && beats[i + 1] === size && options.pairs !== false
      && (meter.den === 4 || size === 18);
    let cell;
    if (canPair && rng() < 0.28) cell = choose(size === 12 ? PAIR12 : PAIR18, level, rng, options);
    if (cell && cell.d.reduce((a, b) => a + Math.abs(b), 0) === size * 2) {
      cell.d.forEach((d) => out.push({ dur: Math.abs(d), rest: d < 0, tuplet: !!cell.tuplet, beat: i }));
      i += 2;
      continue;
    }
    cell = choose(size === 12 ? BEAT12 : BEAT18, level, rng, options);
    cell.d.forEach((d) => out.push({ dur: Math.abs(d), rest: d < 0, tuplet: !!cell.tuplet, beat: i }));
    i += 1;
  }
  return out;
}

/**
 * A rhythm of several bars. The first event is always a note. The final bar can end on a long note.
 */
export function generateRhythm(meterId, bars, level, rng, { rests = true, tuplets = true, longEnding = false } = {}) {
  const meter = METERS[meterId];
  const all = [];
  for (let b = 0; b < bars; b++) {
    let bar;
    let tries = 0;
    do {
      bar = generateBar(meterId, level, rng, { rests, tuplets });
      tries++;
    } while (b === 0 && bar[0].rest && tries < 50);
    if (b === 0 && bar[0].rest) bar[0].rest = false;
    if (longEnding && b === bars - 1) bar = endingBar(meter, level, rng, { rests, tuplets });
    bar.forEach((e) => all.push({ ...e, bar: b }));
  }
  let t = 0;
  for (const e of all) { e.start = t; t += e.dur; }
  return all;
}

/** A closing bar that finishes on a long note. */
function endingBar(meter, level, rng, options) {
  const beats = meter.beats;
  const out = [];
  if (meter.bar === 24) return [{ dur: 24, rest: false, beat: 0 }];
  let finalLen;
  if (meter.id === '4/4') finalLen = rng() < 0.5 ? 24 : 48;
  else if (meter.id === '3/4') finalLen = rng() < 0.5 ? 24 : 36;
  else finalLen = beats[beats.length - 1];
  if (meter.id === '6/8' && rng() < 0.4) finalLen = 36;
  let used = 0;
  let i = 0;
  while (used + finalLen < meter.bar) {
    const size = beats[i];
    const cell = choose(size === 12 ? BEAT12 : BEAT18, Math.min(level, 4), rng, { ...options, rests: false, tuplets: false });
    cell.d.forEach((d) => out.push({ dur: Math.abs(d), rest: false, tuplet: false, beat: i }));
    used += size;
    i++;
  }
  out.push({ dur: finalLen, rest: false, tuplet: false, beat: i });
  return out;
}

/** Total ticks; used by tests to confirm every bar is full. */
export function barTotals(events, meterId) {
  const meter = METERS[meterId];
  const totals = [];
  let t = 0;
  for (const e of events) {
    const b = Math.floor(t / meter.bar);
    totals[b] = (totals[b] || 0) + e.dur;
    t += e.dur;
  }
  return totals;
}

/** Click pattern for a bar: [{ tick, level }] where level 2 = downbeat, 1 = beat-group start, 0 = pulse. */
export function clickPattern(meterId, subdivide = false) {
  const m = METERS[meterId];
  const clicks = [];
  const groupStarts = new Set();
  let acc = 0;
  for (const b of m.beats) { groupStarts.add(acc); acc += b; }
  const step = m.den === 8 ? 6 : (subdivide ? 6 : 12);
  for (let t = 0; t < m.bar; t += step) {
    const level = t === 0 ? 2 : groupStarts.has(t) ? 1 : 0;
    if (m.den === 4 && !subdivide) clicks.push({ tick: t, level: t === 0 ? 2 : 1 });
    else clicks.push({ tick: t, level });
  }
  return clicks;
}

/** Counting syllables: "1 e & a" in x/4 (with "trip let" for triplets); eighth-note numbers in x/8 ("1 2 3 4 5 6 7"). */
export function countLabel(meterId, tick) {
  const m = METERS[meterId];
  const inBar = ((tick % m.bar) + m.bar) % m.bar;
  if (m.den === 8) {
    const eighth = Math.floor(inBar / 6);
    return inBar % 6 === 0 ? String(eighth + 1) : '+';
  }
  const beat = Math.floor(inBar / 12);
  const off = inBar % 12;
  return { 0: String(beat + 1), 3: 'e', 6: '&', 9: 'a', 4: 'trip', 8: 'let' }[off] || '';
}
