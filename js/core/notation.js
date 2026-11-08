// Fretwell Music Lab — music notation drawn as original inline SVG.
// All glyphs (clefs, accidentals, rests, noteheads, flags) are geometric monoline drawings made for
// this project; no notation font is used.

import { step, midi, keyAccidental, SHARP_ORDER, FLAT_ORDER, accidentalText, noteName } from './theory.js';

const NS = 'http://www.w3.org/2000/svg';
const SP = 10;               // one staff space
const TOP = 62;              // y of the top line of the first staff
const GRAND_GAP = 72;        // distance between treble bottom line and bass top line
const REF = { treble: 30, bass: 18, percussion: 30 }; // step of the bottom line (E4, G2)

export function svgEl(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

const TREBLE = 'M11 31 C10 26 12 21.5 15.5 21.5 C20.5 21.5 23.5 26 22.5 31.5 C21.5 38 15.5 41 11 40.2 C5 39.2 1.8 33.5 3.8 26.5 C6 19 13.8 13.6 17 6.5 C19.2 1.5 19 -8.6 15.2 -11.6 C11.4 -14 9 -6 10 0 L14.2 46.5 C15 52.5 10.4 55.8 7.2 53';
const BASS = 'M5 10 C4.6 3.5 10 0.2 15 0.8 C22 1.8 25.2 7.8 24.2 15 C23 24.5 14.5 33 3 39.5';

function drawClef(g, clef, x, top) {
  if (clef === 'treble') {
    svgEl('path', { d: TREBLE, transform: `translate(${x},${top})`, class: 'n-stroke', 'stroke-width': 2.5, fill: 'none' }, g);
    svgEl('circle', { cx: x + 7.6, cy: top + 50.2, r: 3.3, class: 'n-fill' }, g);
  } else if (clef === 'bass') {
    svgEl('path', { d: BASS, transform: `translate(${x},${top})`, class: 'n-stroke', 'stroke-width': 2.7, fill: 'none' }, g);
    svgEl('circle', { cx: x + 5.4, cy: top + 10, r: 3.8, class: 'n-fill' }, g);
    svgEl('circle', { cx: x + 30, cy: top + 5, r: 2.1, class: 'n-fill' }, g);
    svgEl('circle', { cx: x + 30, cy: top + 15, r: 2.1, class: 'n-fill' }, g);
  } else {
    svgEl('rect', { x: x + 4, y: top + 10, width: 4, height: 20, class: 'n-fill' }, g);
    svgEl('rect', { x: x + 12, y: top + 10, width: 4, height: 20, class: 'n-fill' }, g);
  }
}

/** Accidental glyph centred vertically on y. a: -2, -1, 0 (natural), 1, 2. */
export function drawAccidental(g, a, x, y, cls = '') {
  const grp = svgEl('g', { transform: `translate(${x},${y})`, class: 'n-acc ' + cls }, g);
  const line = (d, w) => svgEl('path', { d, 'stroke-width': w, class: 'n-stroke', fill: 'none', 'stroke-linecap': 'butt' }, grp);
  if (a === 1) {
    line('M-2.4 -11 V11 M2.6 -12.5 V9.5', 1.3);
    line('M-5.6 -2.6 L5.6 -5.6 M-5.6 5.6 L5.6 2.6', 3);
  } else if (a === -1 || a === -2) {
    const flat = (dx) => {
      line(`M${dx - 3} -15 V5`, 1.6);
      line(`M${dx - 3} 5 C${dx + 2} 2 ${dx + 6} -2 ${dx + 4.5} -4.8 C${dx + 3} -7.3 ${dx - 0.5} -5.6 ${dx - 3} -2.4`, 1.9);
    };
    if (a === -1) flat(0); else { flat(-3.5); flat(4); }
  } else if (a === 0) {
    line('M-3 -12 V5.5 M3 -5.5 V12', 1.4);
    line('M-3 -1.8 L3 -4.4 M-3 5.4 L3 2.8', 3);
  } else if (a === 2) {
    line('M-4 -4 L4 4 M-4 4 L4 -4', 2.2);
    for (const [cx, cy] of [[-4, -4], [4, 4], [-4, 4], [4, -4]]) svgEl('rect', { x: cx - 1.8, y: cy - 1.8, width: 3.6, height: 3.6, class: 'n-fill' }, grp);
  }
  return grp;
}

function drawRest(g, dur, x, top, cls = '') {
  const grp = svgEl('g', { transform: `translate(${x},${top})`, class: 'n-rest ' + cls }, g);
  const base = dur === 36 || dur === 18 || dur === 9 ? (dur / 3) * 2 : dur;
  if (base === 48) svgEl('rect', { x: -6.5, y: 10, width: 13, height: 5, class: 'n-fill' }, grp);
  else if (base === 24) svgEl('rect', { x: -6.5, y: 15, width: 13, height: 5, class: 'n-fill' }, grp);
  else if (base === 12) svgEl('path', { d: 'M-2.5 5.5 L3.8 12.5 L-1.2 18.5 L4.5 25.5 C-1.5 23.2 -3.4 28.2 0.8 33', 'stroke-width': 2.7, fill: 'none', class: 'n-stroke', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, grp);
  else {
    const flags = base === 6 || base === 4 ? 1 : 2;
    svgEl('path', { d: `M5.5 12 L-0.5 ${flags === 1 ? 31 : 39}`, 'stroke-width': 1.8, class: 'n-stroke', fill: 'none' }, grp);
    for (let i = 0; i < flags; i++) {
      const yy = 13 + i * 8;
      svgEl('circle', { cx: -2.5 - i * 1.6, cy: yy, r: 2.6, class: 'n-fill' }, grp);
      svgEl('path', { d: `M-2.5 ${yy + 2} C0.5 ${yy + 3} 3.5 ${yy + 1.5} ${5.5 - i * 1.6} ${yy - 1}`, 'stroke-width': 1.6, class: 'n-stroke', fill: 'none' }, grp);
    }
  }
  if (dur === 36 || dur === 18 || dur === 9) svgEl('circle', { cx: 10, cy: 15, r: 1.8, class: 'n-fill' }, grp);
  return grp;
}

const headKind = (dur) => (dur >= 48 ? 'whole' : dur >= 24 ? 'half' : 'filled');
const isDotted = (dur) => [36, 18, 9].includes(dur);
const flagCount = (dur) => (dur === undefined || dur >= 12 ? 0 : dur === 3 ? 2 : 1);

function drawHead(g, kind, x, y, cls) {
  if (kind === 'whole') return svgEl('ellipse', { cx: x, cy: y, rx: 6.6, ry: 4.1, 'stroke-width': 2.6, fill: 'none', class: 'n-stroke n-head ' + cls }, g);
  if (kind === 'half') return svgEl('ellipse', { cx: x, cy: y, rx: 5.7, ry: 3.9, transform: `rotate(-20 ${x} ${y})`, 'stroke-width': 1.9, fill: 'none', class: 'n-stroke n-head ' + cls }, g);
  return svgEl('ellipse', { cx: x, cy: y, rx: 6, ry: 4.2, transform: `rotate(-20 ${x} ${y})`, class: 'n-fill n-head ' + cls }, g);
}

function ledgers(g, st, ref, x, yOf) {
  const top = ref + 8;
  if (st >= top + 2) for (let s = top + 2; s <= st; s += 2) svgEl('line', { x1: x - 9.5, x2: x + 9.5, y1: yOf(s), y2: yOf(s), class: 'n-stroke n-ledger', 'stroke-width': 1.3 }, g);
  if (st <= ref - 2) for (let s = ref - 2; s >= st; s -= 2) svgEl('line', { x1: x - 9.5, x2: x + 9.5, y1: yOf(s), y2: yOf(s), class: 'n-stroke n-ledger', 'stroke-width': 1.3 }, g);
}

function keySigPositions(clef, sig) {
  // Staff steps for each accidental of the signature.
  const sharpsTreble = [38, 35, 39, 36, 33, 37, 34];
  const flatsTreble = [34, 37, 33, 36, 32, 35, 31];
  const shift = clef === 'bass' ? -14 : 0;
  if (sig > 0) return sharpsTreble.slice(0, sig).map((s) => s + shift);
  if (sig < 0) return flatsTreble.slice(0, -sig).map((s) => s + shift);
  return [];
}

/**
 * Draw a score.
 * opts: clef ('treble'|'bass'|'grand'|'percussion'), keySig, time ('4/4'), items, minWidth, slot (fixed item width),
 *       accMode ('measure'|'each'), showClef, label (aria-label), labels (extra room below for text labels)
 * items: { kind: 'note', notes, dur, staff, stem, cls, noteCls[], label, beam, tuplet, id }
 *        { kind: 'rest', dur, staff, cls } | { kind: 'bar', final } | { kind: 'satb', voices: [B,T,A,S], cls[], label }
 *        { kind: 'gap', w }
 * Returns { svg, layout } where layout has columns (x per item), yOf(step, staff) and stepAt(y, staff).
 */
export function renderScore(opts = {}) {
  const {
    clef = 'treble', keySig = 0, time = null, items = [], minWidth = 0, slot = null, accMode = 'measure',
    showClef = true, label = 'Music notation', labels = false, padRight = 18,
  } = opts;
  const grand = clef === 'grand';
  const staves = grand ? ['treble', 'bass'] : [clef];
  const staffTop = staves.map((_, i) => TOP + i * (40 + GRAND_GAP));
  const bottomOf = (i) => staffTop[i] + 40;
  const yOf = (st, i = 0) => {
    const c = staves[i];
    if (c === 'percussion') return staffTop[i] + 20;
    return bottomOf(i) - (st - REF[c]) * (SP / 2);
  };
  const stepAt = (y, i = 0) => REF[staves[i]] + Math.round((bottomOf(i) - y) / (SP / 2));
  const lastBottom = bottomOf(staves.length - 1);
  const height = lastBottom + (labels ? 92 : 62);

  const svg = svgEl('svg', { xmlns: NS, class: 'score', role: 'img', 'aria-label': label });
  const g = svgEl('g', {}, svg);
  const linesG = svgEl('g', { class: 'n-lines' }, g);

  let x = 8;
  const header = svgEl('g', { class: 'n-header' }, g);
  if (showClef) {
    staves.forEach((c, i) => drawClef(header, c, x, staffTop[i]));
    x += clef === 'percussion' ? 24 : 36;
  }
  if (keySig && clef !== 'percussion') {
    const pos = staves.map((c) => keySigPositions(c, keySig));
    pos[0].forEach((_, k) => {
      staves.forEach((c, i) => drawAccidental(header, keySig > 0 ? 1 : -1, x + 6 + k * 9, yOf(pos[i][k], i)));
    });
    x += Math.abs(keySig) * 9 + 8;
  }
  if (time) {
    const [num, den] = time.split('/');
    staves.forEach((c, i) => {
      const t = staffTop[i];
      const mid = c === 'percussion' ? t + 20 : t + 20;
      svgEl('text', { x: x + 11, y: mid - 2.5, class: 'n-time', 'text-anchor': 'middle' }, header).textContent = num;
      svgEl('text', { x: x + 11, y: mid + 17.5, class: 'n-time', 'text-anchor': 'middle' }, header).textContent = den;
    });
    x += 28;
  }
  x += 10;

  // Accidental bookkeeping.
  const accState = new Map();
  const shownAcc = (n, staff) => {
    const keyAcc = keyAccidental(keySig, n.l);
    if (accMode === 'each') return n.a === keyAcc ? null : n.a;
    const k = staff + ':' + n.l + ':' + n.o;
    const cur = accState.has(k) ? accState.get(k) : keyAcc;
    if (n.a === cur) return null;
    accState.set(k, n.a);
    return n.a;
  };

  const columns = [];
  const groups = [];
  let lastNoteX = null;
  const beamNotes = new Map();
  const tuplets = new Map();
  const autoStaff = (n) => (grand ? (midi(n) >= 60 ? 0 : 1) : 0);

  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    const grp = svgEl('g', { class: 'n-item ' + (it.cls && typeof it.cls === 'string' ? it.cls : ''), 'data-index': idx }, g);
    groups.push(grp);
    if (it.kind === 'gap') { columns.push({ x, item: it }); x += it.w || 20; continue; }
    if (it.kind === 'bar') {
      x += 2;
      const top = staffTop[0], bot = lastBottom;
      if (clef === 'percussion') {
        svgEl('line', { x1: x, x2: x, y1: staffTop[0] + 6, y2: staffTop[0] + 34, class: 'n-stroke', 'stroke-width': 1.4 }, grp);
      } else if (it.final) {
        svgEl('line', { x1: x, x2: x, y1: top, y2: bot, class: 'n-stroke', 'stroke-width': 1.3 }, grp);
        svgEl('rect', { x: x + 4, y: top, width: 4.5, height: bot - top, class: 'n-fill' }, grp);
      } else {
        staves.forEach((_, i) => svgEl('line', { x1: x, x2: x, y1: staffTop[i], y2: bottomOf(i), class: 'n-stroke', 'stroke-width': 1.3 }, grp));
        if (grand) svgEl('line', { x1: x, x2: x, y1: bottomOf(0), y2: staffTop[1], class: 'n-stroke', 'stroke-width': 1.3 }, grp);
      }
      columns.push({ x, item: it });
      x += it.final ? 14 : 16;
      accState.clear();
      continue;
    }
    const width = slot || Math.max(30, 26 + (it.dur || 18) * 1.45);
    if (it.kind === 'rest') {
      const staff = it.staff || 0;
      const cx = x + 10;
      drawRest(grp, it.dur || 12, cx, staffTop[staff], it.cls || '');
      columns.push({ x: cx, item: it, width });
      x += width;
      continue;
    }
    if (it.kind === 'satb') {
      const cx = x + 18;
      const v = it.voices;
      const cls = it.cls || [];
      const parts = [
        { n: v[3], staff: 0, up: true, c: cls[3] }, { n: v[2], staff: 0, up: false, c: cls[2] },
        { n: v[1], staff: 1, up: true, c: cls[1] }, { n: v[0], staff: 1, up: false, c: cls[0] },
      ];
      let accCol = 0;
      for (const [hi, lo] of [[parts[0], parts[1]], [parts[2], parts[3]]]) {
        for (const p of [hi, lo]) {
          if (!p.n) continue;
          const st = step(p.n);
          const y = yOf(st, p.staff);
          // Voices a 2nd apart sit side by side; a unison shares one notehead with two stems.
          const shift = hi.n && lo.n && p === hi && Math.abs(step(hi.n) - step(lo.n)) === 1 ? 11 : 0;
          const hx = cx + shift;
          ledgers(grp, st, REF[staves[p.staff]], hx, (s) => yOf(s, p.staff));
          const a = shownAcc(p.n, p.staff);
          if (a !== null) { drawAccidental(grp, a, cx - 15 - (accCol % 2) * 10, y, p.c || ''); accCol++; }
          drawHead(grp, 'filled', hx, y, p.c || '');
          const sx = p.up ? hx + 5.4 : hx - 5.4;
          svgEl('line', { x1: sx, x2: sx, y1: y + (p.up ? -1 : 1), y2: y + (p.up ? -33 : 33), class: 'n-stroke n-stem ' + (p.c || ''), 'stroke-width': 1.4 }, grp);
        }
      }
      if (it.label) {
        const t = svgEl('text', { x: cx, y: lastBottom + 48, class: 'n-label ' + (it.labelCls || ''), 'text-anchor': 'middle' }, grp);
        t.textContent = it.label;
      }
      columns.push({ x: cx, item: it, width });
      x += width;
      continue;
    }
    // Notes and chords. `together` places this item in the same column as the previous one (other staff).
    if (it.together && lastNoteX !== null) x = lastNoteX;
    lastNoteX = x;
    const notes = (it.notes || []).slice().sort((a, b) => step(a) - step(b));
    const staff = it.staff !== undefined ? it.staff : notes.length ? autoStaff(notes[0]) : 0;
    const accs = notes.map((n) => (clef === 'percussion' ? null : shownAcc(n, staff)));
    const accCount = accs.filter((a) => a !== null).length;
    const cx = x + 10 + accCount * 9;
    const kind = headKind(it.dur || 12);
    const avg = notes.length ? notes.reduce((s, n) => s + step(n), 0) / notes.length : REF[staves[staff]] + 4;
    const up = it.stem ? it.stem === 'up' : clef === 'percussion' ? true : avg < REF[staves[staff]] + 4;
    let accCol = 0;
    const ys = [];
    notes.forEach((n, i) => {
      const st = step(n);
      const y = yOf(st, staff);
      ys.push(y);
      const second = i > 0 && step(notes[i - 1]) === st - 1 && !(notes[i - 1]._shifted);
      const hx = second ? (up ? cx + 11.5 : cx - 11.5) : cx;
      if (second) n._shifted = true;
      if (clef !== 'percussion') ledgers(grp, st, REF[staves[staff]], hx, (s) => yOf(s, staff));
      const ncls = (it.noteCls && it.noteCls[i]) || '';
      if (accs[i] !== null) { drawAccidental(grp, accs[i], cx - 15 - (accCol % 3) * 9, y, ncls); accCol++; }
      drawHead(grp, kind, hx, y, ncls);
      if (isDotted(it.dur)) {
        const onLine = clef !== 'percussion' && (st - REF[staves[staff]]) % 2 === 0;
        svgEl('circle', { cx: cx + 11, cy: onLine ? y - 4.5 : y, r: 1.9, class: 'n-fill ' + ncls }, grp);
      }
    });
    notes.forEach((n) => { delete n._shifted; });
    const col = { x: cx, item: it, width, ys, up, staff };
    if (notes.length && kind !== 'whole' && it.stem !== 'none') {
      const sx = up ? cx + 5.4 : cx - 5.4;
      const yStart = up ? Math.max(...ys) - 1 : Math.min(...ys) + 1;
      const yEnd = up ? Math.min(...ys) - 34 : Math.max(...ys) + 34;
      col.stem = svgEl('line', { x1: sx, x2: sx, y1: yStart, y2: yEnd, class: 'n-stroke n-stem', 'stroke-width': 1.4 }, grp);
      col.sx = sx; col.sy = yEnd;
      const flags = flagCount(it.dur);
      if (flags && it.beam === undefined) {
        for (let f = 0; f < flags; f++) {
          const fy = up ? yEnd + f * 7 : yEnd - f * 7;
          const d = up
            ? `M${sx} ${fy} C${sx + 1} ${fy + 7} ${sx + 11} ${fy + 9} ${sx + 8.5} ${fy + 21}`
            : `M${sx} ${fy} C${sx + 1} ${fy - 7} ${sx + 11} ${fy - 9} ${sx + 8.5} ${fy - 21}`;
          svgEl('path', { d, 'stroke-width': 2.2, fill: 'none', class: 'n-stroke' }, grp);
        }
      }
      if (it.beam !== undefined) {
        if (!beamNotes.has(it.beam)) beamNotes.set(it.beam, []);
        beamNotes.get(it.beam).push(col);
      }
      if (it.tuplet !== undefined) {
        if (!tuplets.has(it.tuplet)) tuplets.set(it.tuplet, []);
        tuplets.get(it.tuplet).push(col);
      }
    }
    if (it.label) {
      const t = svgEl('text', { x: cx, y: lastBottom + 46, class: 'n-label ' + (it.labelCls || ''), 'text-anchor': 'middle' }, grp);
      t.textContent = it.label;
    }
    columns.push(col);
    x += width + accCount * 9;
  }

  // Beams: one direction per group, a gentle slope, and secondary beams for sixteenths.
  for (const cols of beamNotes.values()) {
    if (cols.length < 2) {
      // A single short note in its beat group gets ordinary flags.
      cols.forEach((c) => {
        const flags = flagCount(c.item.dur);
        const grp = groups[items.indexOf(c.item)];
        for (let f = 0; f < flags; f++) {
          const fy = c.up ? c.sy + f * 7 : c.sy - f * 7;
          const sx = c.sx;
          const d = c.up
            ? `M${sx} ${fy} C${sx + 1} ${fy + 7} ${sx + 11} ${fy + 9} ${sx + 8.5} ${fy + 21}`
            : `M${sx} ${fy} C${sx + 1} ${fy - 7} ${sx + 11} ${fy - 9} ${sx + 8.5} ${fy - 21}`;
          svgEl('path', { d, 'stroke-width': 2.2, fill: 'none', class: 'n-stroke' }, grp);
        }
      });
      continue;
    }
    const allYs = cols.flatMap((c) => c.ys);
    const ref = REF[staves[cols[0].staff]] + 4;
    const avgY = allYs.reduce((a, b) => a + b, 0) / allYs.length;
    const up = avgY > yOf(ref, cols[0].staff);
    const first = cols[0], last = cols[cols.length - 1];
    const fx = up ? first.x + 5.4 : first.x - 5.4;
    const lx = up ? last.x + 5.4 : last.x - 5.4;
    const fy0 = up ? Math.min(...first.ys) : Math.max(...first.ys);
    const ly0 = up ? Math.min(...last.ys) : Math.max(...last.ys);
    let slope = (ly0 - fy0) / Math.max(1, lx - fx);
    slope = Math.max(-0.14, Math.min(0.14, slope));
    let offset = up ? -31 : 31;
    let base = fy0 + offset;
    for (const c of cols) {
      const cxs = up ? c.x + 5.4 : c.x - 5.4;
      const lineY = base + slope * (cxs - fx);
      const extreme = up ? Math.min(...c.ys) : Math.max(...c.ys);
      if (up && lineY > extreme - 27) base -= lineY - (extreme - 27);
      if (!up && lineY < extreme + 27) base += (extreme + 27) - lineY;
    }
    const beamY = (sx) => base + slope * (sx - fx);
    for (const c of cols) {
      const sx = up ? c.x + 5.4 : c.x - 5.4;
      const yStart = up ? Math.max(...c.ys) - 1 : Math.min(...c.ys) + 1;
      c.stem.setAttribute('x1', sx); c.stem.setAttribute('x2', sx);
      c.stem.setAttribute('y1', yStart); c.stem.setAttribute('y2', beamY(sx));
      c.sx = sx; c.up = up;
    }
    const grp = groups[items.indexOf(first.item)];
    const th = 4.6;
    const beam = (x1, x2, level) => {
      const dy = up ? level * 7.5 : -level * 7.5;
      const y1 = beamY(x1) + dy, y2 = beamY(x2) + dy;
      const t = up ? th : -th;
      svgEl('path', { d: `M${x1} ${y1} L${x2} ${y2} L${x2} ${y2 + t} L${x1} ${y1 + t} Z`, class: 'n-fill n-beam' }, grp);
    };
    beam(cols[0].sx, cols[cols.length - 1].sx, 0);
    for (let i = 0; i < cols.length; i++) {
      if (flagCount(cols[i].item.dur) < 2) continue;
      const next = cols[i + 1] && flagCount(cols[i + 1].item.dur) >= 2;
      const prev = cols[i - 1] && flagCount(cols[i - 1].item.dur) >= 2;
      if (next) beam(cols[i].sx, cols[i + 1].sx, 1);
      else if (!prev) {
        const dir = i === cols.length - 1 ? -1 : 1;
        beam(cols[i].sx, cols[i].sx + dir * 9, 1);
      }
    }
  }
  for (const cols of tuplets.values()) {
    const first = cols[0], last = cols[cols.length - 1];
    const up = first.up;
    const midX = (first.x + last.x) / 2;
    const yy = up ? Math.min(...cols.map((c) => c.sy ?? Math.min(...c.ys) - 30)) - 7 : Math.max(...cols.map((c) => c.sy ?? Math.max(...c.ys) + 30)) + 16;
    const t = svgEl('text', { x: midX, y: yy, class: 'n-tuplet', 'text-anchor': 'middle' }, groups[items.indexOf(first.item)]);
    t.textContent = '3';
  }

  // Stretch to the requested width.
  let total = x + padRight;
  if (minWidth && total < minWidth) total = minWidth;
  staves.forEach((c, i) => {
    if (c === 'percussion') {
      svgEl('line', { x1: 4, x2: total - 4, y1: staffTop[i] + 20, y2: staffTop[i] + 20, class: 'n-stroke n-staffline', 'stroke-width': 1.2 }, linesG);
    } else {
      for (let l = 0; l < 5; l++) svgEl('line', { x1: 4, x2: total - 4, y1: staffTop[i] + l * SP, y2: staffTop[i] + l * SP, class: 'n-stroke n-staffline', 'stroke-width': 1.1 }, linesG);
    }
  });
  if (grand) {
    svgEl('line', { x1: 4, x2: 4, y1: staffTop[0], y2: lastBottom, class: 'n-stroke', 'stroke-width': 1.6 }, linesG);
    svgEl('rect', { x: 0, y: staffTop[0], width: 2.6, height: lastBottom - staffTop[0], class: 'n-fill' }, linesG);
  }
  svg.setAttribute('viewBox', `0 0 ${total} ${height}`);
  svg.setAttribute('width', total);
  svg.setAttribute('height', height);
  svg.style.setProperty('--score-ratio', String(total / height));
  // Never scale notation up more than 1.6 times its drawn size.
  svg.style.setProperty('--score-max', `${Math.round(total * 1.6)}px`);
  return { svg, layout: { columns, groups, yOf, stepAt, staffTop, staves, width: total, height, contentEnd: x } };
}

/** Accessible description of a note for screen readers ("F sharp 4"). */
export function spokenNote(n) {
  const acc = { '-2': ' double flat', '-1': ' flat', '0': '', '1': ' sharp', '2': ' double sharp' }[n.a];
  return noteName({ ...n, a: 0 }) + acc + ' ' + n.o;
}

/** Convert rhythm events into notation items with beaming per beat group. */
export function rhythmItems(events, meter, { pitch = null, bars = true, cls = () => '' } = {}) {
  const items = [];
  let t = 0;
  let beamId = 0;
  const groupStarts = [];
  let acc = 0;
  for (const b of meter.beats) { groupStarts.push(acc); acc += b; }
  const groupOf = (tick) => {
    const inBar = tick % meter.bar;
    let gIdx = 0;
    for (let i = 0; i < groupStarts.length; i++) if (inBar >= groupStarts[i]) gIdx = i;
    return Math.floor(tick / meter.bar) * 100 + gIdx;
  };
  let tupletId = 0;
  events.forEach((e, i) => {
    if (bars && t > 0 && t % meter.bar === 0) items.push({ kind: 'bar' });
    if (e.rest) items.push({ kind: 'rest', dur: e.dur, cls: cls(e, i), evIndex: i });
    else {
      const it = { kind: 'note', notes: [e.note || pitch], dur: e.dur, cls: cls(e, i), evIndex: i, stem: pitch ? 'up' : undefined };
      if (e.dur < 12) it.beam = 'b' + groupOf(t) + '-' + beamId;
      if (e.tuplet) it.tuplet = 't' + groupOf(t);
      items.push(it);
    }
    // Break beams across rests.
    if (e.rest) beamId++;
    t += e.dur;
    if (e.tuplet && (t % 12 === 0)) tupletId++;
  });
  if (bars) items.push({ kind: 'bar', final: true });
  return items;
}

/** Text for an accidental-aware note name, used in feedback. */
export function noteText(n, naming) {
  return noteName(n, { naming }) + '';
}

export { accidentalText };
