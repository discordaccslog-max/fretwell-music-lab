// Fretwell Music Lab — fretboard patterns and chord voicings, worked out for any tuning.
import { mod } from './theory.js';

/**
 * Notes-per-string pattern: starting from scale degree `start` on the lowest string, take `per` consecutive
 * scale notes on each string, ascending. scalePcs: pitch classes in scale order from the tonic.
 * Returns [{ string, fret, midi, degree }].
 */
export function npsPattern(open, scalePcs, start, per, maxFret = 17) {
  const n = scalePcs.length;
  const firstPc = scalePcs[start % n];
  let fret = mod(firstPc - open[0], 12);
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = [];
    let midiNow = open[0] + fret;
    let deg = start % n;
    let ok = true;
    for (let s = 0; s < open.length; s++) {
      for (let k = 0; k < per; k++) {
        if (!(s === 0 && k === 0)) {
          // next scale note above midiNow
          const nextDeg = (deg + 1) % n;
          let step = mod(scalePcs[nextDeg] - scalePcs[deg], 12);
          if (step === 0) step = 12;
          midiNow += step;
          deg = nextDeg;
        }
        const f = midiNow - open[s];
        if (f < 0 || f > maxFret) { ok = false; break; }
        out.push({ string: s, fret: f, midi: midiNow, degree: deg });
      }
      if (!ok) break;
    }
    if (ok) return out;
    fret += 12;
  }
  return [];
}

/** Every scale note within a fret window [lo, hi]. */
export function windowPattern(open, scalePcs, lo, hi) {
  const out = [];
  for (let s = 0; s < open.length; s++) {
    for (let f = lo; f <= hi; f++) {
      const p = mod(open[s] + f, 12);
      const d = scalePcs.indexOf(p);
      if (d >= 0) out.push({ string: s, fret: f, midi: open[s] + f, degree: d });
    }
  }
  return out;
}

/** Five-fret positions: one window starting just below each scale note on the lowest string (frets 0–12). */
export function boxPositions(open, scalePcs) {
  const starts = [];
  for (let f = 0; f <= 12; f++) {
    if (scalePcs.includes(mod(open[0] + f, 12))) starts.push(Math.max(0, f - 1));
  }
  const uniq = [...new Set(starts)].filter((x) => x <= 11);
  return uniq.slice(0, scalePcs.length).map((lo) => ({ lo, hi: lo + 4 }));
}

/** Pattern list for the scale explorer: { id, name, positions }. */
export function patternsFor(open, scalePcs) {
  const out = [{ id: 'all', name: 'Whole neck (frets 0–15)', positions: windowPattern(open, scalePcs, 0, 15) }];
  const n = scalePcs.length;
  if (n === 7) {
    for (let k = 0; k < 7; k++) {
      const p = npsPattern(open, scalePcs, k, 3);
      if (p.length) out.push({ id: 'nps' + k, name: `3 notes per string — pattern ${k + 1}`, positions: p, kind: 'nps' });
    }
  } else if (n === 5) {
    for (let k = 0; k < 5; k++) {
      const p = npsPattern(open, scalePcs, k, 2);
      if (p.length) out.push({ id: 'nps' + k, name: `Pentatonic box ${k + 1}`, positions: p, kind: 'nps' });
    }
  }
  boxPositions(open, scalePcs).forEach((w, i) => {
    out.push({ id: 'box' + i, name: `Position ${i + 1} (frets ${w.lo}–${w.hi})`, positions: windowPattern(open, scalePcs, w.lo, w.hi), kind: 'box', lo: w.lo, hi: w.hi });
  });
  return out;
}

/**
 * Playable chord shapes: one note per string on adjacent strings, fretted notes within a 4-fret span,
 * lowest sounding note = bassPc, every required pitch class present.
 * Returns up to `limit` shapes as arrays of { string, fret, midi }.
 */
export function findVoicings(open, pcs, bassPc, { limit = 4, maxFret = 12, minStrings = null, maxStrings = 6, exactCount = null } = {}) {
  const need = new Set(pcs.map((p) => mod(p, 12)));
  const minS = minStrings || Math.min(need.size, 4);
  const results = [];
  const seen = new Set();
  for (let lo = 0; lo <= maxFret - 3; lo++) {
    const choicesFor = (s) => {
      const list = [null];
      const o = open[s];
      if (need.has(mod(o, 12))) list.push(0);
      for (let f = Math.max(1, lo); f <= lo + 3; f++) if (need.has(mod(o + f, 12))) list.push(f);
      return list;
    };
    const opts = open.map((_, s) => choicesFor(s));
    const pick = [];
    const rec = (s) => {
      if (s === open.length) {
        const sounding = pick.map((f, i) => (f === null ? null : { string: i, fret: f, midi: open[i] + f })).filter(Boolean);
        if (sounding.length < minS || sounding.length > maxStrings) return;
        if (exactCount && sounding.length !== exactCount) return;
        const first = sounding[0].string, last = sounding[sounding.length - 1].string;
        if (last - first + 1 !== sounding.length) return; // adjacent strings only
        const lowest = sounding.reduce((a, b) => (b.midi < a.midi ? b : a));
        if (mod(lowest.midi, 12) !== mod(bassPc, 12)) return;
        if (lowest !== sounding[0]) return;
        const have = new Set(sounding.map((x) => mod(x.midi, 12)));
        for (const p of need) if (!have.has(p)) return;
        const fretted = sounding.filter((x) => x.fret > 0).map((x) => x.fret);
        if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3) return;
        if (fretted.length > 4 && new Set(fretted).size > 3) return;
        const key = sounding.map((x) => `${x.string}:${x.fret}`).join(',');
        if (seen.has(key)) return;
        seen.add(key);
        const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
        const pos = fretted.length ? Math.min(...fretted) : 0;
        results.push({ shape: sounding, score: pos * 0.6 + span * 0.8 - sounding.length * 0.5 });
        return;
      }
      for (const f of opts[s]) {
        // Once strings have started sounding, a muted string ends the shape.
        if (f === null && pick.some((x) => x !== null)) {
          pick.push(null);
          rec(s + 1);
          pick.pop();
          continue;
        }
        pick.push(f);
        rec(s + 1);
        pick.pop();
      }
    };
    rec(0);
  }
  results.sort((a, b) => a.score - b.score);
  const out = [];
  const positions = new Set();
  for (const r of results) {
    const p = Math.min(...r.shape.map((x) => (x.fret === 0 ? 0 : x.fret)));
    const key = p + ':' + r.shape[0].string;
    if (positions.has(key)) continue;
    positions.add(key);
    out.push(r.shape);
    if (out.length >= limit) break;
  }
  return out;
}
