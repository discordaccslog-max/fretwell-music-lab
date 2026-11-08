// Fretwell Music Lab — sound synthesis (sample rendering).
// Pure functions that render mono Float32Array buffers. Nothing here is a recording or a sample library:
//   renderPluck  – plucked string (extended Karplus–Strong with exact fractional tuning)
//   renderKeys   – warm keyboard tone (additive partials with slight inharmonicity and two-stage decay)
//   renderClick  – metronome click
// audio.js wraps these in Web Audio buffers and schedules them on the audio clock.

function noise(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s / 4294967296) * 2 - 1;
  };
}

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** Phase delay (samples) of y = (1-b)x + b·y[n-1] at angular frequency w. */
function onePoleDelay(b, w) {
  return Math.atan2(b * Math.sin(w), 1 - b * Math.cos(w)) / w;
}
function onePoleGain(b, w) {
  const re = 1 - b * Math.cos(w);
  const im = b * Math.sin(w);
  return (1 - b) / Math.sqrt(re * re + im * im);
}
/** Phase delay of the first-order allpass (C + z^-1) / (1 + C z^-1). */
function allpassDelay(C, w) {
  const num = Math.atan2(-Math.sin(w), C + Math.cos(w));
  const den = Math.atan2(-C * Math.sin(w), 1 + C * Math.cos(w));
  return -(num - den) / w;
}

/**
 * Plucked string.
 * f: frequency in Hz. Options: duration (s), velocity (0–1), brightness (0–1), pluck (pluck position 0–0.5), seed.
 */
export function renderPluck(sr, f, { duration = 2.8, velocity = 0.85, brightness = 0.5, pluck = 0.17, seed = 1 } = {}) {
  const total = Math.floor(duration * sr);
  const out = new Float32Array(total);
  const w = (2 * Math.PI * f) / sr;
  const period = sr / f;
  // Loop damping: stronger for low strings, which keeps them warm instead of wiry.
  const b = clamp(0.42 - 0.11 * Math.log2(f / 82.4), 0.04, 0.42);
  const fixedDelay = 0.5 + onePoleDelay(b, w); // two-point average + one-pole
  const target = period - fixedDelay;
  const N = Math.max(2, Math.floor(target - 0.2));
  // Solve the allpass coefficient for exact tuning at f.
  let lo = 0.05, hi = 1.95, d = target - N;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const C = (1 - mid) / (1 + mid);
    if (allpassDelay(C, w) < target - N) lo = mid; else hi = mid;
    d = mid;
  }
  const C = (1 - d) / (1 + d);
  // Loop gain so the fundamental decays with a natural, pitch-dependent T60.
  const t60 = clamp(4.6 * Math.pow(82.4 / f, 0.45), 1.1, 5.2);
  const want = Math.pow(10, -3 / (t60 * f));
  const filterGain = Math.cos(w / 2) * onePoleGain(b, w);
  const g = Math.min(0.99995, want / filterGain);

  // Excitation: low-passed noise burst, shaped by pluck position.
  const rnd = noise(seed * 7919 + Math.round(f * 13));
  const exc = new Float32Array(N);
  const a = clamp(0.25 + 0.6 * brightness * velocity, 0.08, 0.95);
  let lp = 0;
  for (let i = 0; i < N; i++) { lp += a * (rnd() - lp); exc[i] = lp; }
  lp = 0;
  for (let i = N - 1; i >= 0; i--) { lp += a * (exc[i] - lp); exc[i] = lp; }
  let mean = 0;
  for (let i = 0; i < N; i++) mean += exc[i];
  mean /= N;
  const pp = Math.max(1, Math.round(pluck * N));
  const buf = new Float32Array(N);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const v = (exc[i] - mean) - (i >= pp ? exc[i - pp] - mean : 0) * 0.85;
    buf[i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
  for (let i = 0; i < N; i++) buf[i] /= peak || 1;

  let idx = 0, prev = 0, lpState = 0, apX = 0, apY = 0;
  for (let t = 0; t < total; t++) {
    const x = buf[idx];
    out[t] = x;
    const avg = 0.5 * (x + prev);
    prev = x;
    lpState = (1 - b) * avg + b * lpState;
    const ap = C * lpState + apX - C * apY;
    apX = lpState; apY = ap;
    buf[idx] = ap * g;
    idx++;
    if (idx === N) idx = 0;
  }
  // Gentle DC blocker and level.
  let x1 = 0, y1 = 0;
  peak = 0;
  for (let t = 0; t < total; t++) {
    const y = out[t] - x1 + 0.995 * y1;
    x1 = out[t]; y1 = y;
    out[t] = y;
    peak = Math.max(peak, Math.abs(y));
  }
  const level = (0.5 * (0.35 + 0.65 * velocity)) / (peak || 1);
  // Soften the very first samples so the attack is a pluck, not a click.
  const attack = Math.floor(sr * 0.0015);
  const fade = Math.floor(sr * 0.08);
  for (let t = 0; t < total; t++) {
    let e = level;
    if (t < attack) e *= t / attack;
    if (t > total - fade) e *= (total - t) / fade;
    out[t] *= e;
  }
  return out;
}

/**
 * Warm keyboard tone: additive synthesis of slightly inharmonic partials, each pair gently detuned,
 * with a fast-then-slow decay and a soft hammer transient.
 */
export function renderKeys(sr, f, { duration = 3.4, velocity = 0.75, seed = 3 } = {}) {
  const total = Math.floor(duration * sr);
  const out = new Float32Array(total);
  const B = clamp(0.00003 * Math.pow(f / 65, 1.2), 0.00002, 0.0006);
  const tSlow = clamp(10 * Math.pow(98 / f, 0.62), 1.4, 10);
  const tFast = tSlow * 0.16;
  const warmth = 1500 + 2600 * velocity;
  const maxPartials = Math.min(16, Math.floor(9000 / f));
  const partialAmp = (k) => Math.pow(k, -1.1) * Math.exp(-((k - 1) * f) / warmth) * (0.35 + 0.65 * Math.abs(Math.sin((Math.PI * k) / 7.3))) * (k === 1 ? 1.15 : 1);
  // Stretched partials make the tone sound slightly sharp; tune down by their weighted average stretch.
  let wSum = 0, sSum = 0;
  for (let k = 1; k <= Math.max(1, maxPartials); k++) {
    if (k * f > sr * 0.42) break;
    const w = partialAmp(k) ** 2 * k;
    wSum += w; sSum += w * Math.sqrt(1 + B * k * k);
  }
  const tuning = wSum ? wSum / sSum : 1;
  for (let k = 1; k <= Math.max(1, maxPartials); k++) {
    const fk = k * f * tuning * Math.sqrt(1 + B * k * k);
    if (fk > sr * 0.42) break;
    const amp = partialAmp(k); // includes the hammer strike-position comb
    const tauS = tSlow / (1 + 0.38 * (k - 1));
    const tauF = tFast / (1 + 0.55 * (k - 1));
    const rS = Math.exp(-1 / (tauS * sr));
    const rF = Math.exp(-1 / (tauF * sr));
    const detunes = k <= 6 ? [-0.00045, 0.00045] : [0];
    for (const dt of detunes) {
      const wk = (2 * Math.PI * fk * (1 + dt)) / sr;
      const c2 = 2 * Math.cos(wk);
      const phase = (k * 0.7 + dt * 900) % (2 * Math.PI);
      let s1 = Math.sin(phase - wk);
      let s0 = Math.sin(phase - 2 * wk);
      let eS = 0.38 * amp / detunes.length;
      let eF = 0.62 * amp / detunes.length;
      for (let t = 0; t < total; t++) {
        const s = c2 * s1 - s0;
        s0 = s1; s1 = s;
        out[t] += s * (eS + eF);
        eS *= rS; eF *= rF;
      }
    }
  }
  // Hammer: a very short, soft thump of filtered noise.
  const rnd = noise(seed * 104729 + Math.round(f));
  const hLen = Math.floor(sr * 0.02);
  let lp = 0;
  const hc = clamp(f / 4000, 0.05, 0.5);
  for (let t = 0; t < hLen; t++) {
    lp += hc * (rnd() - lp);
    out[t] += lp * 0.06 * velocity * Math.exp(-t / (sr * 0.004));
  }
  let peak = 0;
  for (let t = 0; t < total; t++) peak = Math.max(peak, Math.abs(out[t]));
  const level = (0.42 * (0.4 + 0.6 * velocity)) / (peak || 1);
  const attack = Math.floor(sr * 0.003);
  const fade = Math.floor(sr * 0.1);
  for (let t = 0; t < total; t++) {
    let e = level;
    if (t < attack) e *= 0.5 - 0.5 * Math.cos((Math.PI * t) / attack);
    if (t > total - fade) e *= (total - t) / fade;
    out[t] *= e;
  }
  return out;
}

/** Metronome click. level 2 = downbeat, 1 = beat, 0 = subdivision. */
export function renderClick(sr, level = 1) {
  const len = Math.floor(sr * 0.06);
  const out = new Float32Array(len);
  const f = level === 2 ? 1760 : level === 1 ? 1320 : 990;
  const gain = level === 2 ? 0.55 : level === 1 ? 0.42 : 0.26;
  const w1 = (2 * Math.PI * f) / sr;
  const w2 = (2 * Math.PI * f * 2.76) / sr;
  const rnd = noise(17 + level);
  for (let t = 0; t < len; t++) {
    const env = Math.exp(-t / (sr * 0.012));
    const env2 = Math.exp(-t / (sr * 0.004));
    const tick = t < sr * 0.0012 ? rnd() * 0.25 * (1 - t / (sr * 0.0012)) : 0;
    out[t] = gain * (env * Math.sin(w1 * t) + 0.35 * env2 * Math.sin(w2 * t) + tick);
  }
  const attack = Math.floor(sr * 0.0004);
  for (let t = 0; t < attack; t++) out[t] *= t / attack;
  return out;
}

/** Estimate the fundamental of a buffer segment (used by the test suite). */
export function estimatePitch(buf, sr, fGuess) {
  const start = Math.floor(sr * 0.25);
  const len = Math.floor(sr * 0.5);
  const seg = buf.subarray(start, start + len);
  const lagGuess = sr / fGuess;
  const lo = Math.floor(lagGuess * 0.8), hi = Math.ceil(lagGuess * 1.25);
  let best = -Infinity, bestLag = lo;
  const corr = (lag) => {
    let s = 0;
    for (let i = 0; i + lag < seg.length; i++) s += seg[i] * seg[i + lag];
    return s;
  };
  const vals = {};
  for (let lag = lo; lag <= hi; lag++) {
    const c = corr(lag);
    vals[lag] = c;
    if (c > best) { best = c; bestLag = lag; }
  }
  const y0 = vals[bestLag - 1] ?? corr(bestLag - 1);
  const y1 = best;
  const y2 = vals[bestLag + 1] ?? corr(bestLag + 1);
  const shift = (y0 - y2) / (2 * (y0 - 2 * y1 + y2));
  return sr / (bestLag + shift);
}
