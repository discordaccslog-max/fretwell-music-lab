// Fretwell Music Lab — audio engine.
// Every sound is synthesized in the browser (see synth.js). Notes and clicks are scheduled against the
// AudioContext clock, never with plain timers, so timing stays steady. Audio starts only after the
// visitor's first click, tap or key press, as browsers require.

import { renderPluck, renderKeys, renderClick } from './synth.js';
import { freq } from './theory.js';

const VOL_KEY = 'fretwell.volume';
const DEFAULT_VOLUME = 45; // moderate; players are encouraged to start lower with headphones

let ctx = null;
let master = null;
let buses = {};
const cache = new Map();
const CACHE_LIMIT = 72;
const active = new Set();
const listeners = new Set();

function readVolume() {
  try {
    const v = parseInt(localStorage.getItem(VOL_KEY), 10);
    return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : DEFAULT_VOLUME;
  } catch { return DEFAULT_VOLUME; }
}
let volume = readVolume();
const gainFor = (v) => Math.pow(v / 100, 1.7) * 1.1;

function makeImpulse(c, seconds = 1.7) {
  const len = Math.floor(c.sampleRate * seconds);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let s = 1234567 + ch * 999;
    let lp = 0;
    for (let i = 0; i < len; i++) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      const r = ((s >>> 0) / 4294967296) * 2 - 1;
      const t = i / c.sampleRate;
      const damp = 0.25 + 0.6 * Math.exp(-t * 2.2); // darker tail
      lp += damp * (r - lp);
      const early = t < 0.08 ? (Math.sin(t * 900 + ch) > 0.97 ? 0.6 : 0) : 0;
      d[i] = (lp + early) * Math.exp(-t * 4.1) * (t < 0.005 ? t / 0.005 : 1);
    }
  }
  return ir;
}

function buildGraph() {
  master = ctx.createGain();
  master.gain.value = gainFor(volume);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 8;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.2;
  master.connect(limiter);
  limiter.connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.18;
  reverb.connect(wet);
  wet.connect(master);

  const mk = (chain, send) => {
    const input = ctx.createGain();
    let node = input;
    for (const f of chain) { node.connect(f); node = f; }
    node.connect(master);
    const s = ctx.createGain();
    s.gain.value = send;
    node.connect(s);
    s.connect(reverb);
    return input;
  };
  const peq = (type, f, g, q = 1) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.gain.value = g; b.Q.value = q; return b; };
  buses.guitar = mk([peq('peaking', 110, 3, 1.1), peq('peaking', 230, 1.5, 1.4), peq('peaking', 2900, -2.5, 1.2), peq('highshelf', 6500, -6)], 0.9);
  buses.keys = mk([peq('lowshelf', 220, 2), peq('peaking', 3200, -1.5, 1), peq('lowpass', 7600, 0, 0.7)], 1.0);
  buses.click = mk([peq('highpass', 300, 0, 0.7)], 0.0);
}

/** Create and resume the audio context. Call from a click, tap or key handler. */
export async function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* not supported */ }
    ctx = new AC({ latencyHint: 'interactive' });
    buildGraph();
    ctx.onstatechange = () => listeners.forEach((fn) => fn(ctx.state));
  }
  if (ctx.state !== 'running') {
    try { await ctx.resume(); } catch { /* resumed on a later gesture */ }
  }
  // A silent buffer finishes the unlock on older mobile browsers.
  const b = ctx.createBuffer(1, 1, ctx.sampleRate);
  const s = ctx.createBufferSource();
  s.buffer = b; s.connect(ctx.destination); s.start(0);
  listeners.forEach((fn) => fn(ctx.state));
  return ctx.state === 'running';
}

/** Unlock automatically on the first interaction anywhere on the page. */
export function unlockOnFirstGesture() {
  const go = () => { if (!isReady()) unlock(); };
  const opts = { capture: true, passive: true };
  // iOS only counts touchend/click/keydown as activation, so listen to all of them.
  ['pointerdown', 'pointerup', 'click', 'keydown', 'touchend'].forEach((e) => window.addEventListener(e, go, opts));
}

export const isReady = () => !!ctx && ctx.state === 'running';
export const now = () => (ctx ? ctx.currentTime : 0);
export const context = () => ctx;
export function onState(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function getVolume() { return volume; }
export function setVolume(v) {
  volume = Math.min(100, Math.max(0, Math.round(v)));
  try { localStorage.setItem(VOL_KEY, String(volume)); } catch { /* storage unavailable */ }
  if (master) master.gain.setTargetAtTime(gainFor(volume), ctx.currentTime, 0.03);
  document.querySelectorAll('input[data-volume]').forEach((el) => { if (+el.value !== volume) el.value = volume; });
}

function bufferFor(instrument, m, level = 1) {
  const key = instrument + ':' + m + ':' + level;
  if (cache.has(key)) {
    const b = cache.get(key);
    cache.delete(key); cache.set(key, b);
    return b;
  }
  const sr = ctx.sampleRate;
  let data;
  if (instrument === 'guitar') data = renderPluck(sr, freq(m), { duration: m < 55 ? 3.4 : 2.6, seed: m });
  else if (instrument === 'click') data = renderClick(sr, level);
  else data = renderKeys(sr, freq(m), { duration: Math.max(1.8, Math.min(4.2, 4.6 - (m - 36) * 0.05)), seed: m });
  const buf = ctx.createBuffer(1, data.length, sr);
  buf.getChannelData(0).set(data);
  cache.set(key, buf);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return buf;
}

/** Render buffers ahead of time so the first play has no delay. */
export function prepare(midis, instrument = 'keys') {
  if (!ctx) return;
  for (const m of midis) bufferFor(instrument, m);
}

/** Render a range of notes in small idle chunks. */
export function warm(midis, instrument = 'keys') {
  if (!ctx) return;
  const list = midis.slice();
  const step = () => {
    const t0 = performance.now();
    while (list.length && performance.now() - t0 < 12) bufferFor(instrument, list.shift());
    if (list.length) setTimeout(step, 30);
  };
  setTimeout(step, 50);
}

/**
 * Play one note. Options: when (audio time), dur (seconds before release), instrument ('keys'|'guitar'), velocity (0–1).
 * Returns the scheduled start time.
 */
export function play(m, { when = 0, dur = 1.2, instrument = 'keys', velocity = 0.8, pan = 0 } = {}) {
  if (!ctx || ctx.state !== 'running') return 0;
  const buf = bufferFor(instrument, m);
  const t = Math.max(when || 0, ctx.currentTime + 0.012);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  const level = 0.35 + 0.65 * velocity;
  g.gain.setValueAtTime(level, t);
  const release = instrument === 'guitar' ? 0.18 : 0.12;
  const end = t + Math.min(dur, buf.duration);
  if (dur < buf.duration) g.gain.setTargetAtTime(0, end, release);
  let out = g;
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p);
    out = p;
  }
  src.connect(g);
  out.connect(buses[instrument] || buses.keys);
  src.start(t);
  src.stop(Math.min(t + buf.duration, end + release * 6));
  const rec = { src, g };
  active.add(rec);
  src.onended = () => { active.delete(rec); try { g.disconnect(); } catch { /* already disconnected */ } };
  return t;
}

/** Play notes together, optionally strummed (seconds between notes). */
export function chord(midis, { when = 0, dur = 1.6, instrument = 'keys', velocity = 0.72, strum = 0 } = {}) {
  if (!ctx) return 0;
  prepare(midis, instrument);
  const t = Math.max(when || 0, ctx.currentTime + 0.03);
  const sorted = midis.slice().sort((a, b) => a - b);
  const v = velocity * (sorted.length > 3 ? 0.82 : 1);
  sorted.forEach((m, i) => play(m, { when: t + i * strum, dur, instrument, velocity: v }));
  return t;
}

/**
 * Schedule a list of events: [{ midi | midis, at (seconds from start), dur, velocity }].
 * Returns the audio start time; total length can be computed from the events.
 */
export function sequence(events, { instrument = 'keys', lead = 0.08, strum = 0 } = {}) {
  if (!ctx || ctx.state !== 'running') return 0;
  const all = new Set();
  events.forEach((e) => (e.midis || [e.midi]).forEach((m) => all.add(m)));
  prepare([...all], instrument);
  const start = ctx.currentTime + lead;
  for (const e of events) {
    const list = e.midis || [e.midi];
    if (list.length > 1) chord(list, { when: start + e.at, dur: e.dur, instrument, velocity: e.velocity ?? 0.7, strum });
    else play(list[0], { when: start + e.at, dur: e.dur, instrument, velocity: e.velocity ?? 0.8 });
  }
  return start;
}

/** Metronome click at an audio time. level 2 = downbeat, 1 = beat, 0 = subdivision. */
export function click(level = 1, when = 0) {
  if (!ctx || ctx.state !== 'running') return 0;
  const buf = bufferFor('click', 0, level);
  const t = Math.max(when, ctx.currentTime + 0.005);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(buses.click);
  src.start(t);
  const rec = { src, g: null };
  active.add(rec);
  src.onended = () => active.delete(rec);
  return t;
}

/** Fade out and stop everything that is sounding or scheduled. */
export function stopAll() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const rec of active) {
    try {
      if (rec.g) { rec.g.gain.cancelScheduledValues(t); rec.g.gain.setTargetAtTime(0, t, 0.025); }
      rec.src.stop(t + 0.12);
    } catch { /* already stopped */ }
  }
  active.clear();
}

/** Audio-clock time at which a DOM event happened (for tap timing). */
export function eventTime(ev) {
  if (!ctx) return 0;
  const stamp = ev && typeof ev.timeStamp === 'number' && ev.timeStamp > 0 ? ev.timeStamp : performance.now();
  if (ctx.getOutputTimestamp) {
    const ts = ctx.getOutputTimestamp();
    if (ts && ts.performanceTime) return ts.contextTime + (stamp - ts.performanceTime) / 1000;
  }
  const lat = ctx.outputLatency || ctx.baseLatency || 0;
  return ctx.currentTime + (stamp - performance.now()) / 1000 - lat;
}

/** A short rising arpeggio (used for the key reveal and unlock animations). */
export function arpeggio(midis, { gap = 0.09, instrument = 'keys', dur = 1.6 } = {}) {
  return sequence(midis.map((m, i) => ({ midi: m, at: i * gap, dur: dur - i * gap * 0.5, velocity: 0.62 })), { instrument });
}
