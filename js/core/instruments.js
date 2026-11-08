// Fretwell Music Lab — fretboard and piano keyboard, drawn as SVG.
// Both are keyboard operable: focus the instrument, move with the arrow keys, press Enter or Space to choose.

import { svgEl } from './notation.js';
import { tuningMidis, TUNINGS, spellMidi, noteName, parseNote } from './theory.js';

const BLACK = new Set([1, 3, 6, 8, 10]);

function liveRegion(host) {
  const live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  host.appendChild(live);
  return live;
}

/* --------------------------------------------------------------- fretboard */

/**
 * opts: tuning, frets, startFret, leftHanded, interactive, onSelect({ string, fret, midi }), label, naming
 * Strings are numbered 0 (lowest) to 5 (highest); the highest string is drawn at the top.
 */
export function createFretboard(opts = {}) {
  const {
    tuning = 'standard', frets = 12, startFret = 0, leftHanded = false, interactive = true,
    onSelect = null, label = 'Guitar fretboard', naming = 'letters',
  } = opts;
  const open = tuningMidis(tuning);
  const nStrings = open.length;
  const host = document.createElement('div');
  host.className = 'instrument-scroll';
  const gap = 22;
  const top = 26;
  const nutX = 44;
  const widths = [];
  let w = 62;
  for (let f = startFret + 1; f <= frets; f++) { widths.push(w); w *= 0.955; }
  const fretX = [nutX];
  widths.forEach((wd) => fretX.push(fretX[fretX.length - 1] + wd));
  const totalW = fretX[fretX.length - 1] + 16;
  const totalH = top + gap * (nStrings - 1) + 34;
  const svg = svgEl('svg', { viewBox: `0 0 ${totalW} ${totalH}`, class: 'fretboard' + (leftHanded ? ' is-lefty' : ''), role: interactive ? 'application' : 'img', 'aria-label': label, width: totalW, height: totalH });
  svg.style.minWidth = Math.min(totalW, 720) + 'px';
  const root = svgEl('g', leftHanded ? { transform: `translate(${totalW},0) scale(-1,1)` } : {}, svg);
  const yOf = (s) => top + (nStrings - 1 - s) * gap;
  const xOf = (fret) => {
    if (fret === 0 && startFret === 0) return nutX - 20;
    const i = fret - startFret;
    if (i <= 0) return nutX - 20;
    return (fretX[i - 1] + fretX[i]) / 2;
  };
  svgEl('rect', { x: nutX, y: top - 8, width: fretX[fretX.length - 1] - nutX, height: gap * (nStrings - 1) + 16, class: 'fb-wood' }, root);
  // Inlays
  for (const f of [3, 5, 7, 9, 15, 17, 19, 21]) {
    if (f > startFret && f <= frets) svgEl('circle', { cx: xOf(f), cy: top + gap * (nStrings - 1) / 2, r: 5, class: 'fb-inlay' }, root);
  }
  for (const f of [12, 24]) {
    if (f > startFret && f <= frets) {
      svgEl('circle', { cx: xOf(f), cy: top + gap * 1.5, r: 5, class: 'fb-inlay' }, root);
      svgEl('circle', { cx: xOf(f), cy: top + gap * 3.5, r: 5, class: 'fb-inlay' }, root);
    }
  }
  fretX.forEach((fx, i) => {
    const isNut = i === 0 && startFret === 0;
    svgEl('line', { x1: fx, x2: fx, y1: top - 8, y2: top + gap * (nStrings - 1) + 8, class: isNut ? 'fb-nut' : 'fb-fret', 'stroke-width': isNut ? 6 : 2 }, root);
  });
  for (let s = 0; s < nStrings; s++) {
    svgEl('line', { x1: nutX - 30, x2: fretX[fretX.length - 1], y1: yOf(s), y2: yOf(s), class: 'fb-string', 'stroke-width': 1 + (nStrings - 1 - (nStrings - 1 - s)) * 0 + (5 - s) * 0.32 + 0.8 }, root);
  }
  // Fret numbers (kept readable when mirrored)
  const nums = svgEl('g', { class: 'fb-nums' }, svg);
  for (let f = Math.max(1, startFret + 1); f <= frets; f++) {
    if (![1, 3, 5, 7, 9, 12, 15, 17, 19, 21, 24].includes(f)) continue;
    const x = leftHanded ? totalW - xOf(f) : xOf(f);
    svgEl('text', { x, y: totalH - 6, 'text-anchor': 'middle', class: 'fb-num' }, nums).textContent = String(f);
  }
  const marks = svgEl('g', { class: 'fb-marks' }, svg);
  const focusRing = svgEl('circle', { r: 12.5, class: 'fb-focus', visibility: 'hidden' }, svg);
  host.appendChild(svg);
  const live = liveRegion(host);

  const posX = (fret) => (leftHanded ? totalW - xOf(fret) : xOf(fret));
  const midiAt = (s, f) => open[s] + f;
  const minFret = startFret === 0 ? 0 : startFret + 1;
  let cursor = { s: Math.floor(nStrings / 2), f: Math.max(minFret, Math.min(frets, startFret + 3)) };

  function describe(s, f) {
    const n = spellMidi(midiAt(s, f), 'sharps');
    const openName = noteName(spellMidi(open[s], 'sharps'), { naming });
    return `String ${nStrings - s} (${openName}), ${f === 0 ? 'open' : 'fret ' + f}`;
  }
  function showCursor() {
    focusRing.setAttribute('cx', posX(cursor.f));
    focusRing.setAttribute('cy', yOf(cursor.s));
    focusRing.setAttribute('visibility', 'visible');
    live.textContent = describe(cursor.s, cursor.f);
  }
  if (interactive) {
    svg.setAttribute('tabindex', '0');
    svg.addEventListener('focus', showCursor);
    svg.addEventListener('blur', () => focusRing.setAttribute('visibility', 'hidden'));
    svg.addEventListener('keydown', (e) => {
      const dir = leftHanded ? -1 : 1;
      const k = e.key;
      if (k === 'ArrowUp') cursor.s = Math.min(nStrings - 1, cursor.s + 1);
      else if (k === 'ArrowDown') cursor.s = Math.max(0, cursor.s - 1);
      else if (k === 'ArrowRight') cursor.f = Math.max(minFret, Math.min(frets, cursor.f + dir));
      else if (k === 'ArrowLeft') cursor.f = Math.max(minFret, Math.min(frets, cursor.f - dir));
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); e.stopPropagation(); select(cursor.s, cursor.f); return; }
      else return;
      e.preventDefault();
      showCursor();
    });
    svg.addEventListener('click', (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const s = Math.round((nStrings - 1) - (p.y - top) / gap);
      if (s < 0 || s >= nStrings || Math.abs(p.y - yOf(s)) > gap * 0.6) return;
      const xr = leftHanded ? totalW - p.x : p.x;
      let f;
      if (xr < nutX) f = startFret === 0 ? 0 : null;
      else { f = null; for (let i = 1; i < fretX.length; i++) if (xr >= fretX[i - 1] && xr <= fretX[i]) f = startFret + i; }
      if (f === null || f === undefined) return;
      cursor = { s, f };
      select(s, f);
    });
  }
  function select(s, f) {
    if (onSelect) onSelect({ string: s, fret: f, midi: midiAt(s, f) });
  }

  function mark(list) {
    marks.textContent = '';
    for (const m of list) {
      const cx = posX(m.fret);
      const cy = yOf(m.string);
      const g = svgEl('g', { class: 'fb-mark ' + (m.cls || '') }, marks);
      if (m.shape === 'square') svgEl('rect', { x: cx - 9.5, y: cy - 9.5, width: 19, height: 19, rx: 2 }, g);
      else svgEl('circle', { cx, cy, r: 10 }, g);
      if (m.label) svgEl('text', { x: cx, y: cy + 4, 'text-anchor': 'middle' }, g).textContent = m.label;
    }
  }
  return {
    el: host, svg, mark, clear: () => mark([]), open, frets, startFret, nStrings, midiAt, describe,
    positionsOf(pcOrMidi, { byPc = true } = {}) {
      const out = [];
      for (let s = 0; s < nStrings; s++) {
        for (let f = minFret; f <= frets; f++) {
          const m = midiAt(s, f);
          if (byPc ? (m % 12) === (pcOrMidi % 12) : m === pcOrMidi) out.push({ string: s, fret: f, midi: m });
        }
      }
      return out;
    },
    scrollToFret(f) {
      const x = posX(f);
      const r = svg.getBoundingClientRect();
      const scale = r.width / totalW;
      host.scrollLeft = Math.max(0, x * scale - host.clientWidth / 2);
    },
  };
}

/* ---------------------------------------------------------------- keyboard */

/**
 * opts: low, high (MIDI), interactive, onSelect({ midi }), label, naming
 */
export function createKeyboard(opts = {}) {
  const { low = 48, high = 72, interactive = true, onSelect = null, label = 'Piano keyboard', naming = 'letters' } = opts;
  const host = document.createElement('div');
  host.className = 'instrument-scroll';
  const WW = 26, WH = 128, BW = 16, BH = 80;
  const whites = [];
  for (let m = low; m <= high; m++) if (!BLACK.has(m % 12)) whites.push(m);
  const totalW = whites.length * WW + 2;
  const svg = svgEl('svg', { viewBox: `0 0 ${totalW} ${WH + 4}`, class: 'keyboard', role: interactive ? 'application' : 'img', 'aria-label': label, width: totalW, height: WH + 4 });
  svg.style.minWidth = Math.min(totalW, 30 * WW) + 'px';
  svg.style.maxWidth = Math.round(totalW * 1.5) + 'px';
  const keyX = {};
  const keyEls = {};
  whites.forEach((m, i) => {
    keyX[m] = 1 + i * WW;
    keyEls[m] = svgEl('rect', { x: keyX[m], y: 1, width: WW, height: WH, rx: 2, class: 'kb-white', 'data-midi': m }, svg);
  });
  for (let m = low; m <= high; m++) {
    if (!BLACK.has(m % 12)) continue;
    const leftWhite = m - 1;
    if (keyX[leftWhite] === undefined) continue;
    keyX[m] = keyX[leftWhite] + WW - BW / 2;
    keyEls[m] = svgEl('rect', { x: keyX[m], y: 1, width: BW, height: BH, rx: 1.5, class: 'kb-black', 'data-midi': m }, svg);
  }
  // C labels for orientation
  for (const m of whites) {
    if (m % 12 === 0) svgEl('text', { x: keyX[m] + WW / 2, y: WH - 8, 'text-anchor': 'middle', class: 'kb-c' }, svg).textContent = 'C' + (Math.floor(m / 12) - 1);
  }
  const marks = svgEl('g', { class: 'kb-marks' }, svg);
  const focusRing = svgEl('rect', { class: 'kb-focus', visibility: 'hidden', rx: 3 }, svg);
  host.appendChild(svg);
  const live = liveRegion(host);
  let cursor = whites[Math.floor(whites.length / 2)];
  const center = (m) => keyX[m] + (BLACK.has(m % 12) ? BW / 2 : WW / 2);

  function showCursor() {
    const black = BLACK.has(cursor % 12);
    focusRing.setAttribute('x', keyX[cursor] - 2);
    focusRing.setAttribute('y', -1);
    focusRing.setAttribute('width', (black ? BW : WW) + 4);
    focusRing.setAttribute('height', (black ? BH : WH) + 4);
    focusRing.setAttribute('visibility', 'visible');
    const sp = spellMidi(cursor, 'sharps');
    const fl = spellMidi(cursor, 'flats');
    live.textContent = noteName(sp, { naming, octave: true }) + (sp.l !== fl.l ? ' / ' + noteName(fl, { naming, octave: true }) : '');
  }
  if (interactive) {
    svg.setAttribute('tabindex', '0');
    svg.addEventListener('focus', showCursor);
    svg.addEventListener('blur', () => focusRing.setAttribute('visibility', 'hidden'));
    svg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') cursor = Math.min(high, cursor + 1);
      else if (e.key === 'ArrowLeft') cursor = Math.max(low, cursor - 1);
      else if (e.key === 'ArrowUp') cursor = Math.min(high, cursor + 12);
      else if (e.key === 'ArrowDown') cursor = Math.max(low, cursor - 12);
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select(cursor); return; }
      else return;
      if (keyX[cursor] === undefined) cursor = Math.min(high, cursor + 1);
      e.preventDefault();
      showCursor();
      scrollTo(cursor);
    });
    svg.addEventListener('click', (e) => {
      const m = e.target && e.target.getAttribute && e.target.getAttribute('data-midi');
      if (m === null || m === undefined) return;
      cursor = +m;
      select(+m);
    });
  }
  function select(m) {
    flash(m);
    if (onSelect) onSelect({ midi: m });
  }
  function flash(m) {
    const k = keyEls[m];
    if (!k) return;
    k.classList.add('is-down');
    setTimeout(() => k.classList.remove('is-down'), 180);
  }
  function mark(list) {
    marks.textContent = '';
    Object.values(keyEls).forEach((k) => k.removeAttribute('data-state'));
    for (const it of list) {
      const k = keyEls[it.midi];
      if (!k) continue;
      if (it.cls) k.setAttribute('data-state', it.cls);
      const black = BLACK.has(it.midi % 12);
      const cx = center(it.midi);
      const cy = black ? BH - 14 : WH - 26;
      const g = svgEl('g', { class: 'kb-mark ' + (it.cls || '') }, marks);
      svgEl('circle', { cx, cy, r: black ? 7 : 9.5 }, g);
      if (it.label) svgEl('text', { x: cx, y: cy + (black ? 3 : 4), 'text-anchor': 'middle', class: black ? 'small' : '' }, g).textContent = it.label;
    }
  }
  function scrollTo(m) {
    if (keyX[m] === undefined) return;
    const r = svg.getBoundingClientRect();
    const scale = r.width / totalW || 1;
    const x = center(m) * scale;
    if (x < host.scrollLeft + 20 || x > host.scrollLeft + host.clientWidth - 20) host.scrollLeft = Math.max(0, x - host.clientWidth / 2);
  }
  return { el: host, svg, mark, clear: () => mark([]), flash, scrollTo, low, high, has: (m) => keyEls[m] !== undefined };
}

export const TUNING_OPTIONS = Object.entries(TUNINGS).map(([id, t]) => ({ id, name: t.name }));
export const openStringNotes = (tuning) => (TUNINGS[tuning] || TUNINGS.standard).strings.map(parseNote);
