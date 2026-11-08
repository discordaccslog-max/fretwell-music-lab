// Fretwell Music Lab — staff editor for dictation answers.
// Modes: 'full' (pitch and rhythm), 'pitch' (rhythm given as slots), 'rhythm' (durations on a one-line staff).
// Input: click the staff, use the on-screen keyboard, or type: A–G add a note, ↑/↓ move the last note,
// − / = / 0 set flat, sharp or natural, 1–5 choose a duration, . toggles the dot, Backspace deletes.

import { h, kbd } from './toolkit.js';
import { renderScore, svgEl, rhythmItems } from '../core/notation.js';
import { createKeyboard } from '../core/instruments.js';
import { fromStep, step, midi, keyAccidental, spellingsOfMidi, noteName, LETTERS, parseNote } from '../core/theory.js';

const DURS = [
  { ticks: 48, name: 'Whole note', key: '1' },
  { ticks: 24, name: 'Half note', key: '2' },
  { ticks: 12, name: 'Quarter note', key: '3' },
  { ticks: 6, name: 'Eighth note', key: '4' },
  { ticks: 3, name: 'Sixteenth note', key: '5' },
];

function durIcon(ticks) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 22 30');
  s.setAttribute('aria-hidden', 'true');
  const open = ticks >= 24;
  const stem = ticks < 48;
  s.innerHTML = `<ellipse cx="8" cy="23" rx="6" ry="4.2" transform="rotate(-20 8 23)" fill="${open ? 'none' : 'currentColor'}" stroke="currentColor" stroke-width="${open ? 2 : 0}"/>`
    + (stem ? '<line x1="13.6" y1="22" x2="13.6" y2="3" stroke="currentColor" stroke-width="1.6"/>' : '')
    + (ticks <= 6 ? '<path d="M13.6 3 C14.6 9 20 10 18.5 17" fill="none" stroke="currentColor" stroke-width="2"/>' : '')
    + (ticks <= 3 ? '<path d="M13.6 9 C14.6 14 20 15 18.5 22" fill="none" stroke="currentColor" stroke-width="2"/>' : '');
  return s;
}

/**
 * opts: { mode, clef, keySig, meter (METERS entry), slots (durations for pitch mode), total (ticks for full/rhythm),
 *         given: [{ note, dur }] prefilled from the start, low, high (MIDI), naming, label, keyboard (bool), onChange }
 */
export function createSeqEditor(opts) {
  const { mode = 'full', clef = 'treble', keySig = 0, meter = null, slots = null, total = null, given = [], low = 55, high = 84, naming = 'letters', label = 'Your answer', keyboard = true, onChange = () => {} } = opts;
  const notes = given.map((g) => ({ ...g, given: true }));
  let dur = 12;
  let dot = false;
  let accOverride = null;
  let locked = false;
  let results = null;
  const root = h('div', { class: 'seq-editor' });
  const status = h('p', { class: 'score-caption', 'aria-live': 'polite' });
  const host = h('div', { class: 'staff-input' });

  // Palette
  const palette = h('div', { class: 'palette', role: 'toolbar', 'aria-label': 'Note entry tools' });
  const durBtns = [];
  if (mode !== 'pitch') {
    DURS.forEach((d) => {
      const b = h('button', { type: 'button', class: 'choice', 'aria-pressed': String(d.ticks === dur), 'aria-label': d.name, title: d.name }, durIcon(d.ticks), kbd(d.key));
      b.addEventListener('click', () => setDur(d.ticks));
      durBtns.push([d.ticks, b]);
      palette.appendChild(b);
    });
    const dotBtn = h('button', { type: 'button', class: 'choice', 'aria-pressed': 'false', 'aria-label': 'Dotted', title: 'Dotted' }, h('span', { class: 'choice-label' }, '•'), kbd('.'));
    dotBtn.addEventListener('click', () => setDot(!dot));
    durBtns.push(['dot', dotBtn]);
    palette.appendChild(dotBtn);
  }
  const accBtns = [];
  if (mode !== 'rhythm') {
    if (mode !== 'pitch') palette.appendChild(h('span', { class: 'palette-sep', 'aria-hidden': 'true' }));
    [[-1, '♭', '−', 'Flat'], [0, '♮', '0', 'Natural'], [1, '♯', '=', 'Sharp']].forEach(([a, sym, key, name]) => {
      const b = h('button', { type: 'button', class: 'choice', 'aria-pressed': 'false', 'aria-label': `${name} (applies to the next note, or changes the last note)`, title: name }, h('span', { class: 'choice-label' }, sym), kbd(key));
      b.addEventListener('click', () => applyAcc(a));
      accBtns.push([a, b]);
      palette.appendChild(b);
    });
  }
  palette.appendChild(h('span', { class: 'palette-sep', 'aria-hidden': 'true' }));
  const delBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline' }, 'Delete last ', kbd('⌫'));
  delBtn.addEventListener('click', () => removeLast());
  const clearBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline' }, 'Clear');
  clearBtn.addEventListener('click', () => { notes.splice(given.length); draw(); });
  palette.append(delBtn, clearBtn);

  root.append(palette, host, status);
  let kb = null;
  if (keyboard && mode !== 'rhythm') {
    kb = createKeyboard({ low: Math.max(36, low - (low % 12)), high: Math.min(96, high + (11 - (high % 12))), naming, label: 'Keyboard for entering notes', onSelect: ({ midi: m }) => addMidi(m) });
    root.appendChild(kb.el);
  }

  function setDur(t) { dur = t; durBtns.forEach(([v, b]) => { if (v !== 'dot') b.setAttribute('aria-pressed', String(v === t)); }); }
  function setDot(v) { dot = v; const b = durBtns.find(([x]) => x === 'dot'); if (b) b[1].setAttribute('aria-pressed', String(v)); }
  const curDur = () => (dot && dur > 3 ? dur * 1.5 : dur);
  const used = () => notes.reduce((s, n) => s + n.dur, 0);
  const capacity = () => (mode === 'pitch' ? slots.length : total);
  const full = () => (mode === 'pitch' ? notes.length >= slots.length : used() >= total);

  function applyAcc(a) {
    if (locked) return;
    const last = notes[notes.length - 1];
    if (last && !last.given && last.note && mode !== 'rhythm') {
      last.note = { ...last.note, a };
      draw();
      return;
    }
    accOverride = a;
    accBtns.forEach(([v, b]) => b.setAttribute('aria-pressed', String(v === a)));
  }
  function nextDur() {
    if (mode === 'pitch') return slots[notes.length];
    const remain = total - used();
    return Math.min(curDur(), remain);
  }
  function addNote(n) {
    if (locked || full()) return;
    const d = nextDur();
    if (!d) return;
    notes.push({ note: n, dur: d });
    accOverride = null;
    accBtns.forEach(([, b]) => b.setAttribute('aria-pressed', 'false'));
    draw();
  }
  function addStep(st) {
    const l = ((st % 7) + 7) % 7;
    const o = Math.floor(st / 7);
    const a = accOverride !== null ? accOverride : keyAccidental(keySig, l);
    addNote({ l, a, o });
  }
  function addMidi(m) {
    const opts2 = spellingsOfMidi(m);
    const diatonic = opts2.find((x) => x.a === keyAccidental(keySig, x.l));
    const pick = diatonic || (keySig < 0 ? opts2[opts2.length - 1] : opts2[0]);
    addNote(pick);
  }
  function removeLast() {
    if (locked) return;
    if (notes.length > given.length) notes.pop();
    draw();
  }
  function moveLast(dir) {
    const last = notes[notes.length - 1];
    if (!last || last.given || !last.note || mode === 'rhythm') return;
    const st = step(last.note) + dir;
    const l = ((st % 7) + 7) % 7;
    const cand = { l, a: keyAccidental(keySig, l), o: Math.floor(st / 7) };
    if (midi(cand) < low - 5 || midi(cand) > high + 5) return;
    last.note = cand;
    draw();
  }
  function addLetter(L) {
    const l = LETTERS.indexOf(L);
    const ref = [...notes].reverse().find((n) => n.note);
    const refStep = ref ? step(ref.note) : step(fromStep(Math.round((step(parseNote('C4')) + step(parseNote(clef === 'bass' ? 'C3' : 'C5'))) / 2), 0)) - 3;
    let best = null;
    for (let o = 1; o <= 7; o++) {
      const st = o * 7 + l;
      if (best === null || Math.abs(st - refStep) < Math.abs(best - refStep)) best = st;
    }
    addStep(best);
  }

  let layout = null;
  let svg = null;
  function items() {
    if (mode === 'rhythm') {
      const ev = notes.map((n) => ({ dur: n.dur, rest: false }));
      const its = rhythmItems(ev, meter, { pitch: parseNote('B4'), bars: true });
      if (!full()) its.pop();
      if (results) {
        let k = 0;
        its.forEach((it) => { if (it.kind === 'note') { const r = results[k++]; if (r) { it.noteCls = [r.ok ? 'is-correct' : 'is-wrong']; it.label = r.ok ? '✓' : '✗'; it.labelCls = r.ok ? 'is-correct' : 'is-wrong'; } } });
      }
      return its;
    }
    const out = [];
    let t = 0;
    notes.forEach((n, i) => {
      if (meter && t > 0 && t % meter.bar === 0) out.push({ kind: 'bar' });
      const it = { kind: 'note', notes: [n.note], dur: mode === 'pitch' ? slots[i] : n.dur, noteCls: [n.given ? 'is-given' : ''] };
      if (results && results[i]) {
        const r = results[i];
        it.noteCls = [r.ok ? 'is-correct' : 'is-wrong'];
        it.label = r.ok ? '✓' : r.label || '✗';
        it.labelCls = r.ok ? 'is-correct' : 'is-wrong';
      }
      if (it.dur < 12 && meter) it.beam = 'g' + Math.floor(t / (meter.beats[0] || 12)) + '-' + Math.floor(t / meter.bar);
      out.push(it);
      t += n.dur;
    });
    if (meter && full() && notes.length) out.push({ kind: 'bar', final: true });
    return out;
  }
  function draw() {
    host.textContent = '';
    const r = renderScore({ clef: mode === 'rhythm' ? 'percussion' : clef, keySig: mode === 'rhythm' ? 0 : keySig, time: meter ? meter.id : null, items: items(), minWidth: 560, labels: !!results, label: `${label}: ${notes.length} note${notes.length === 1 ? '' : 's'} written` });
    svg = r.svg;
    layout = r.layout;
    svg.setAttribute('tabindex', locked ? '-1' : '0');
    svg.setAttribute('aria-describedby', '');
    host.appendChild(svg);
    if (!locked && !full()) {
      const x = layout.contentEnd + 6;
      svgEl('line', { x1: x, x2: x, y1: layout.staffTop[0] - 18, y2: layout.staffTop[0] + 58, class: 'si-cursor' }, svg);
    }
    svg.addEventListener('click', (e) => {
      if (locked) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      if (mode === 'rhythm') { addNote(null); return; }
      addStep(layout.stepAt(p.y, 0));
    });
    const cap = capacity();
    if (mode === 'pitch') {
      const last = notes[notes.length - 1];
      status.textContent = `${notes.length} of ${cap} notes written${last && last.note ? ` · last note ${noteName(last.note, { naming, octave: true })}` : ''}.`;
    }
    else {
      const bars = meter ? `${(used() / meter.bar).toFixed(used() % meter.bar ? 1 : 0)} of ${cap / meter.bar} bars filled` : '';
      const last = notes[notes.length - 1];
      status.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'} · ${bars}${last && last.note ? ` · last note ${noteName(last.note, { naming, octave: true })}` : ''}.`;
    }
    onChange(getNotes());
  }
  function getNotes() { return notes.map((n) => ({ note: n.note, dur: n.dur, given: !!n.given })); }

  draw();
  return {
    el: root,
    getNotes,
    isComplete: full,
    lock() { locked = true; palette.querySelectorAll('button').forEach((b) => { b.disabled = true; }); if (kb) kb.el.hidden = true; draw(); },
    showResults(res) {
      results = res;
      locked = true;
      root.appendChild(h('p', { class: 'score-caption' }, 'Marks under your notes: ✓ correct · ✗p wrong pitch · ✗r wrong rhythm · ✗pr both · ✗+ extra note.')); palette.querySelectorAll('button').forEach((b) => { b.disabled = true; }); if (kb) kb.el.hidden = true; draw(); },
    handleKey(e) {
      if (locked) return false;
      const k = e.key;
      if (mode !== 'rhythm' && /^[a-gA-G]$/.test(k)) { addLetter(k.toUpperCase()); return true; }
      if (k === 'Backspace' || k === 'Delete') { removeLast(); return true; }
      if (mode !== 'rhythm' && k === 'ArrowUp') { moveLast(1); return true; }
      if (mode !== 'rhythm' && k === 'ArrowDown') { moveLast(-1); return true; }
      if (mode !== 'rhythm' && (k === '-' || k === '_')) { applyAcc(-1); return true; }
      if (mode !== 'rhythm' && (k === '=' || k === '+')) { applyAcc(1); return true; }
      if (mode !== 'rhythm' && k === '0') { applyAcc(0); return true; }
      if (mode !== 'pitch' && /^[1-5]$/.test(k)) { setDur(DURS[+k - 1].ticks); return true; }
      if (mode !== 'pitch' && k === '.') { setDot(!dot); return true; }
      if (mode === 'rhythm' && (k === ' ' || k === 'n' || k === 'N')) { addNote(null); return true; }
      return false;
    },
  };
}

/** Compare an answer with the target, note by note. Returns { results, correct, wrongPitch, wrongRhythm }. */
export function compareSequences(answer, target, { checkPitch = true, checkRhythm = true } = {}) {
  const results = [];
  let allOk = answer.length === target.length;
  const n = Math.max(answer.length, target.length);
  for (let i = 0; i < n; i++) {
    const a = answer[i], t = target[i];
    if (!a || !t) { allOk = false; if (a) results.push({ ok: false, label: '✗+' }); continue; }
    const pOk = !checkPitch || (a.note && t.note && a.note.l === t.note.l && a.note.a === t.note.a && a.note.o === t.note.o);
    const rOk = !checkRhythm || a.dur === t.dur;
    const ok = pOk && rOk;
    if (!ok) allOk = false;
    results.push({ ok, pitch: pOk, rhythm: rOk, label: ok ? '✓' : !pOk && !rOk ? '✗pr' : !pOk ? '✗p' : '✗r' });
  }
  return { results, correct: allOk };
}
