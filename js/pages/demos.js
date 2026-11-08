// Short interactive demos for product pages. Each uses the same notation, instrument, theory and sound
// code as the practice room tools, in a smaller form.
import { renderScore, rhythmItems } from '../core/notation.js';
import { createKeyboard, createFretboard } from '../core/instruments.js';
import { play, chord, click, now, eventTime, unlock, isReady, getVolume, setVolume } from '../core/audio.js';
import { turnSoundOn, isSoundOn } from '../core/sound-ui.js';
import { parseNote, noteName, midi, spellMidi, transpose, parseInterval, intervalLongName, buildScale, scaleDegreeLabels, SCALE_BY_ID, chordTones, voiceChord, chordSymbol, CHORD_TYPES, keySignature, withOctave, pc, tuningMidis, makeRng, keyName, fromStep, step } from '../core/theory.js';
import { patternsFor } from '../core/fretwork.js';
import { chordsFor, realize, checkSATB } from '../core/voicelead.js';
import { voiceTwoFiveOne, jazzSymbol } from '../core/jazz.js';
import { generateMelody } from '../core/melody.js';
import { generateRhythm, METERS, clickPattern } from '../core/rhythm.js';

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach((c) => c !== null && c !== undefined && e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return e;
}
async function sound() {
  if (!isSoundOn()) await turnSoundOn(); else if (!isReady()) await unlock();
  return isReady();
}
const btn = (label, onclick, cls = 'btn btn-ink') => el('button', { type: 'button', class: cls, onclick }, label);
const scoreBox = (svg, max = null) => { if (max) svg.style.maxWidth = max; return el('div', { class: 'score-box' }, svg); };
function bar(host, ...kids) {
  const vol = el('input', { type: 'range', min: '0', max: '100', 'data-volume': '', 'aria-label': 'Volume' });
  vol.value = getVolume();
  vol.addEventListener('input', () => setVolume(+vol.value));
  const b = el('div', { class: 'demo-bar' }, ...kids, el('span', { class: 'grow' }),
    el('label', { class: 'volume' }, el('span', {}, 'Volume'), vol),
    el('span', { class: 'small' }, 'Start low, especially with headphones.'));
  host.appendChild(b);
  return b;
}
const fbText = () => el('p', { class: 'demo-feedback', 'aria-live': 'polite' });

const DEMOS = {
  'note-reader'(host) {
    let n, done = false, score = 0, round = 0;
    const q = el('p', { class: 'demo-q' });
    const staff = el('div');
    const choices = el('div', { class: 'demo-choices', role: 'group', 'aria-label': 'Note name' });
    const fb = fbText();
    const next = () => {
      if (round >= 5) { q.textContent = `${score} of 5 — the full tool adds the bass clef, sharps and flats, the fretboard and the keyboard.`; choices.textContent = ''; staff.textContent = ''; fb.textContent = ''; host.querySelector('.demo-again').hidden = false; return; }
      done = false;
      n = fromStep(step(parseNote('C4')) + Math.floor(Math.random() * 12), 0);
      n = { l: n.l, a: 0, o: n.o };
      q.textContent = `Note ${round + 1} of 5: name this note`;
      staff.textContent = '';
      staff.appendChild(scoreBox(renderScore({ clef: 'treble', items: [{ kind: 'note', notes: [n], dur: 48 }], minWidth: 200, label: 'Treble staff with one note' }).svg, '260px'));
      choices.textContent = '';
      'CDEFGAB'.split('').forEach((L, i) => choices.appendChild(el('button', { type: 'button', class: 'choice', onclick: () => answer(i) }, L)));
      fb.textContent = '';
    };
    const answer = (l) => {
      if (done) return;
      done = true;
      round++;
      const ok = l === n.l;
      if (ok) score++;
      [...choices.children].forEach((b, i) => { b.disabled = true; if (i === n.l) b.classList.add('is-correct'); else if (i === l) b.classList.add('is-wrong'); });
      fb.textContent = ok ? `✓ Correct — ${noteName(n, { octave: true })}.` : `✗ It is ${noteName(n, { octave: true })}.`;
      if (isSoundOn() && isReady()) play(midi(n), { dur: 1 });
      setTimeout(next, 1100);
    };
    bar(host, el('span', { class: 'small' }, 'Five notes on the treble staff.'));
    host.append(q, staff, choices, fb, el('p', {}, el('button', { type: 'button', class: 'btn btn-outline demo-again', hidden: true, onclick: (e) => { e.target.hidden = true; score = 0; round = 0; next(); } }, 'Try again')));
    next();
  },

  'interval-trainer'(host) {
    const SET = ['m3', 'M3', 'P5', 'P8'];
    let iv, root, done;
    const fb = fbText();
    const view = el('div');
    const choices = el('div', { class: 'demo-choices' });
    const playIt = async () => { if (!(await sound())) return; const t = now() + 0.05; play(root, { when: t, dur: 0.9 }); play(root + parseInterval(iv).semis, { when: t + 0.8, dur: 1.3 }); };
    const nextQ = () => {
      iv = SET[Math.floor(Math.random() * SET.length)];
      root = 57 + Math.floor(Math.random() * 8);
      done = false;
      view.textContent = ''; fb.textContent = 'Press play, then choose.';
      choices.textContent = '';
      SET.forEach((x) => choices.appendChild(el('button', { type: 'button', class: 'choice', onclick: () => answer(x) }, intervalLongName(x))));
    };
    const answer = (x) => {
      if (done) return;
      done = true;
      [...choices.children].forEach((b, i) => { b.disabled = true; if (SET[i] === iv) b.classList.add('is-correct'); else if (SET[i] === x) b.classList.add('is-wrong'); });
      fb.textContent = x === iv ? `✓ Correct — a ${intervalLongName(iv)}.` : `✗ That was a ${intervalLongName(iv)}.`;
      const r = spellMidi(root);
      view.appendChild(scoreBox(renderScore({ clef: 'treble', items: [{ kind: 'note', notes: [r], dur: 48 }, { kind: 'note', notes: [transpose(r, iv)], dur: 48 }], minWidth: 220, label: intervalLongName(iv) }).svg, '300px'));
    };
    bar(host, btn('▶ Play interval', playIt), btn('New interval', nextQ, 'btn btn-outline'));
    host.append(el('p', { class: 'demo-q' }, 'Which interval is it?'), choices, fb, view);
    nextQ();
  },

  'scale-explorer'(host) {
    const scaleSel = el('select', { 'aria-label': 'Scale' }, ['major', 'naturalMinor', 'dorian', 'minorPentatonic', 'blues', 'lydian'].map((id) => el('option', { value: id }, SCALE_BY_ID[id].name)));
    const keySel = el('select', { 'aria-label': 'Key' }, ['C', 'G', 'D', 'A', 'E', 'F', 'Bb'].map((k) => el('option', { value: k }, noteName(parseNote(k)))));
    keySel.value = 'A';
    const info = el('p', { class: 'small' });
    const kbHost = el('div'), fbHost = el('div');
    const open = tuningMidis('standard');
    let notes = [];
    const draw = () => {
      const tonic = parseNote(keySel.value + '4');
      notes = buildScale(tonic, scaleSel.value);
      const degs = scaleDegreeLabels(tonic, scaleSel.value);
      info.textContent = `${noteName(tonic)} ${SCALE_BY_ID[scaleSel.value].name}: ${notes.map((n) => noteName(n)).join(' ')} · degrees ${degs.join(' ')}`;
      const pcs = notes.map(pc);
      kbHost.textContent = ''; fbHost.textContent = '';
      const kb = createKeyboard({ low: 57, high: 81, interactive: false, label: 'Keyboard showing the scale' });
      const marks = [];
      for (let m = 57; m <= 81; m++) { const d = pcs.indexOf(m % 12); if (d >= 0) marks.push({ midi: m, cls: d === 0 ? 'is-root' : 'is-target', label: noteName(notes[d]).slice(0, 2) }); }
      kb.mark(marks);
      kbHost.appendChild(kb.el);
      const pat = patternsFor(open, pcs).find((p) => p.kind === 'nps') || patternsFor(open, pcs)[1];
      const fb = createFretboard({ frets: 15, interactive: false, label: `Fretboard pattern: ${pat.name}` });
      fb.mark(pat.positions.map((p) => ({ string: p.string, fret: p.fret, cls: p.degree === 0 ? 'is-root' : '', label: degs[p.degree] })));
      fbHost.append(el('p', { class: 'small' }, pat.name), fb.el);
    };
    const playIt = async () => { if (!(await sound())) return; const t = now() + 0.05; [...notes, withOctave(notes[0], notes[0].o + 1)].forEach((n, i) => play(midi(n), { when: t + i * 0.32, dur: 0.5 })); };
    scaleSel.addEventListener('change', draw); keySel.addEventListener('change', draw);
    bar(host, el('label', {}, 'Scale ', scaleSel), el('label', {}, 'Key ', keySel), btn('▶ Play', playIt));
    host.append(info, kbHost, fbHost);
    draw();
  },

  'chord-builder'(host) {
    const chordSel = el('select', { 'aria-label': 'Chord' }, [['C', 'maj'], ['A', 'min'], ['B', 'dim'], ['G', 'dom7'], ['D', 'min7'], ['F', 'maj7'], ['B', 'hdim7']].map(([r, t]) => el('option', { value: r + ':' + t }, chordSymbol(parseNote(r), t))));
    const invSel = el('select', { 'aria-label': 'Inversion' });
    const view = el('div', { class: 'ref-grid ref-grid--2' });
    let notes = [];
    const fillInv = () => {
      const [, t] = chordSel.value.split(':');
      invSel.textContent = '';
      ['Root position', '1st inversion', '2nd inversion', '3rd inversion'].slice(0, CHORD_TYPES[t].ivls.length).forEach((n, i) => invSel.appendChild(el('option', { value: i }, n)));
    };
    const draw = () => {
      const [r, t] = chordSel.value.split(':');
      notes = voiceChord(parseNote(r + '4'), t, +invSel.value, 4);
      view.textContent = '';
      const kb = createKeyboard({ low: 60, high: 84, interactive: false, label: 'Keyboard showing the chord' });
      kb.mark(notes.map((n, i) => ({ midi: midi(n), cls: i === 0 ? 'is-root' : 'is-target', label: noteName(n).slice(0, 2) })));
      view.append(scoreBox(renderScore({ clef: 'treble', items: [{ kind: 'note', notes, dur: 48 }], minWidth: 200, label: 'Chord on the staff' }).svg, '260px'),
        el('div', {}, el('p', { class: 'demo-q' }, `${chordSymbol(parseNote(r), t)} — ${CHORD_TYPES[t].name}`), el('p', { class: 'small' }, `Lowest note: ${noteName(notes[0])}. ${chordTones(parseNote(r), t).map((x) => noteName(x)).join(' – ')}`), kb.el));
    };
    chordSel.addEventListener('change', () => { fillInv(); draw(); });
    invSel.addEventListener('change', draw);
    bar(host, el('label', {}, 'Chord ', chordSel), el('label', {}, 'Inversion ', invSel), btn('▶ Play', async () => { if (await sound()) chord(notes.map(midi), { dur: 1.8 }); }), btn('Broken', async () => { if (!(await sound())) return; const t = now() + 0.05; notes.forEach((n, i) => play(midi(n), { when: t + i * 0.28, dur: 1 })); }, 'btn btn-outline'));
    host.append(view);
    fillInv(); draw();
  },

  'rhythm-lab'(host) {
    const meter = METERS['4/4'];
    const tempo = 80;
    const ts = (60 / tempo) / 12;
    let events, expected = [], taps = [], running = false;
    const scoreHost = el('div', { class: 'score-box score-wrap' });
    const fb = fbText();
    const pad = el('button', { type: 'button', class: 'tap-pad' }, 'Tap here (or press Space) after the count-in');
    const newRhythm = () => {
      events = generateRhythm('4/4', 1, 2, Math.random, { rests: false, tuplets: false });
      scoreHost.textContent = '';
      scoreHost.appendChild(renderScore({ clef: 'percussion', time: '4/4', items: rhythmItems(events, meter, { pitch: parseNote('B4') }), minWidth: 340, label: 'Rhythm to tap' }).svg);
      fb.textContent = 'Press Start, listen to four clicks, then tap the rhythm.';
    };
    const tap = (e) => { if (!running) return; taps.push(eventTime(e)); pad.classList.add('is-hit'); setTimeout(() => pad.classList.remove('is-hit'), 90); };
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(e); });
    pad.addEventListener('keydown', (e) => { if (e.key === ' ' && !e.repeat) { e.preventDefault(); tap(e); } });
    const start = async () => {
      if (running || !(await sound())) return;
      running = true; taps = [];
      pad.focus();
      const t0 = now() + 0.2;
      const pat = clickPattern('4/4');
      for (let b = 0; b < 2; b++) for (const c of pat) click(c.level, t0 + (b * meter.bar + c.tick) * ts);
      const s0 = t0 + meter.bar * ts;
      expected = events.map((e) => s0 + e.start * ts);
      setTimeout(() => {
        running = false;
        const res = expected.map((x) => { let best = null; for (const t of taps) if (Math.abs(t - x) < 0.12 && (best === null || Math.abs(t - x) < Math.abs(best - x))) best = t; return best === null ? null : best - x; });
        const hit = res.filter((r) => r !== null);
        fb.textContent = `${hit.length} of ${res.length} notes hit. ${res.map((r, i) => `Note ${i + 1}: ${r === null ? 'missed' : (r < 0 ? '−' : '+') + Math.round(Math.abs(r) * 1000) + ' ms'}`).join(' · ')}. The full tool calibrates for your device's delay and adds more meters and levels.`;
      }, (s0 + meter.bar * ts - now() + 0.4) * 1000);
    };
    bar(host, btn('Start', start), btn('New rhythm', newRhythm, 'btn btn-outline'));
    host.append(scoreHost, pad, fb);
    newRhythm();
  },

  'progression-lab'(host) {
    const keySel = el('select', { 'aria-label': 'Key' }, ['C', 'G', 'D', 'F', 'Bb', 'Eb'].map((k) => el('option', { value: k }, keyName(parseNote(k), 'major'))));
    const view = el('div', { class: 'score-box score-wrap' });
    let voicing = null;
    const draw = () => {
      const tonic = parseNote(keySel.value + '4');
      const chords = chordsFor(tonic, 'major', ['I', 'vi', 'ii6', 'V7', 'I']);
      voicing = realize(chords, { rng: makeRng(3) });
      view.textContent = '';
      view.appendChild(renderScore({ clef: 'grand', keySig: keySignature(tonic, 'major'), items: chords.map((c, k) => ({ kind: 'satb', voices: voicing[k], label: c.label })), labels: true, slot: 62, label: 'Four-part progression with Roman numerals' }).svg);
    };
    keySel.addEventListener('change', draw);
    // A voice-leading check on a fixed example with a mistake in it.
    const C = parseNote('C4');
    const exChords = chordsFor(C, 'major', ['I', 'ii']);
    const exV = [['C3', 'G3', 'E4', 'C5'], ['D3', 'A3', 'F4', 'D5']].map((v) => v.map(parseNote));
    const report = checkSATB(exChords, exV);
    const check = el('div', { class: 'score-box score-wrap' },
      renderScore({ clef: 'grand', items: exChords.map((c, k) => ({ kind: 'satb', voices: exV[k], cls: k === 1 ? ['is-wrong', 'is-wrong', '', 'is-wrong'] : [], label: c.label })), labels: true, slot: 70, label: 'A student example with errors marked' }).svg,
      el('ul', { class: 'small' }, report.errors.map((e) => el('li', {}, '✗ ' + e.message))));
    bar(host, el('label', {}, 'Key ', keySel), btn('▶ Play', async () => { if (!(await sound())) return; const t = now() + 0.05; voicing.forEach((v, k) => chord(v.map(midi), { when: t + k * 0.85, dur: 0.8, velocity: 0.6 })); }));
    host.append(view, el('h3', {}, 'The voice-leading check'), el('p', { class: 'small' }, 'In the full tool you write the upper voices yourself. Here is what the checker reports for a short example with mistakes:'), check);
    draw();
  },

  'jazz-harmony'(host) {
    const keySel = el('select', { 'aria-label': 'Key' }, ['C', 'F', 'Bb', 'Eb', 'G', 'D'].map((k) => el('option', { value: k }, noteName(parseNote(k)))));
    const formSel = el('select', { 'aria-label': 'Voicing' }, el('option', { value: 'A' }, 'Rootless A'), el('option', { value: 'B' }, 'Rootless B'), el('option', { value: 'shell' }, 'Shell'));
    const info = el('p', { class: 'demo-q' });
    const kbHost = el('div');
    let voiced = [];
    const draw = () => {
      voiced = voiceTwoFiveOne(parseNote(keySel.value + '4'), 'major', formSel.value);
      info.textContent = voiced.map((c) => jazzSymbol(c.root, formSel.value === 'shell' ? c.sevenths : c.type)).join(' – ');
      kbHost.textContent = '';
      voiced.forEach((c) => {
        const kb = createKeyboard({ low: 36, high: 79, interactive: false, label: `Keyboard: ${jazzSymbol(c.root, c.type)}` });
        kb.mark([...(c.form === 'shell' ? [] : [{ midi: midi(c.bass), cls: 'is-root' }]), ...c.notes.map((n) => ({ midi: midi(n), cls: 'is-target', label: noteName(n).slice(0, 2) }))]);
        kbHost.append(el('p', { class: 'small' }, `${jazzSymbol(c.root, formSel.value === 'shell' ? c.sevenths : c.type)}: ${c.notes.map((n) => noteName(n)).join(' ')}`), kb.el);
      });
    };
    [keySel, formSel].forEach((s) => s.addEventListener('change', draw));
    const playIt = async () => {
      if (!(await sound())) return;
      const beat = 60 / 120;
      let t = now() + 0.05;
      voiced.forEach((c, i) => { const d = [2, 2, 4][i] * beat; if (c.form !== 'shell') play(midi(c.bass), { when: t, dur: d * 0.95, velocity: 0.7 }); chord(c.notes.map(midi), { when: t, dur: d * 0.95, velocity: 0.58 }); t += d; });
    };
    bar(host, el('label', {}, 'Key ', keySel), el('label', {}, 'Voicing ', formSel), btn('▶ Play ii–V–I', playIt));
    host.append(info, kbHost);
    draw();
  },

  'melodic-dictation'(host) {
    let mel = null;
    const view = el('div', { class: 'score-box score-wrap' });
    const fb = fbText();
    const make = () => {
      mel = generateMelody({ tonic: parseNote('C4'), mode: 'major', meter: '4/4', bars: 2, low: 55, high: 67, level: 2 });
      view.textContent = '';
      view.appendChild(el('p', { class: 'score-caption' }, 'Listen first, then reveal. In the full tool you write the melody yourself and every note is checked.'));
      fb.textContent = '';
    };
    const playIt = async () => {
      if (!(await sound())) return;
      const tick = (60 / 84) / 12;
      let t = now() + 0.05, x = 0;
      mel.notes.forEach((n) => { play(midi(n.note), { when: t + x * tick, dur: n.dur * tick * 0.95 }); x += n.dur; });
    };
    const reveal = () => {
      const meter = METERS['4/4'];
      const items = [];
      let t = 0;
      mel.notes.forEach((n, i) => {
        if (t > 0 && t % meter.bar === 0) items.push({ kind: 'bar' });
        items.push({ kind: 'note', notes: [n.note], dur: n.dur, label: noteName(n.note), beam: n.dur < 12 ? 'b' + Math.floor(t / 12) : undefined, cls: 'demo-reveal', evIndex: i });
        t += n.dur;
      });
      items.push({ kind: 'bar', final: true });
      view.textContent = '';
      const { svg } = renderScore({ clef: 'treble', time: '4/4', items, labels: true, minWidth: 420, label: 'The generated melody' });
      view.appendChild(svg);
      const groups = [...svg.querySelectorAll('.n-item')];
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) groups.forEach((g, i) => { g.style.opacity = '0'; g.style.transition = 'opacity .3s ease'; setTimeout(() => { g.style.opacity = '1'; }, 80 + i * 120); });
      fb.textContent = 'Generated from melodic rules for C major: stepwise motion, leaps followed by a step back, and a close on the tonic.';
    };
    bar(host, btn('▶ Play melody', playIt), btn('Reveal', reveal, 'btn btn-outline'), btn('New melody', make, 'btn btn-outline'));
    host.append(view, fb);
    make();
  },

  atelier(host) {
    const SET = ['m9', 'M9', 'M10', 'P12'];
    let iv, root, done;
    const choices = el('div', { class: 'demo-choices' });
    const fb = fbText();
    const playIt = async () => { if (!(await sound())) return; const t = now() + 0.05; play(root, { when: t, dur: 1 }); play(root + parseInterval(iv).semis, { when: t + 0.9, dur: 1.4 }); };
    const nextQ = () => {
      iv = SET[Math.floor(Math.random() * SET.length)];
      root = 45 + Math.floor(Math.random() * 7);
      done = false;
      choices.textContent = '';
      SET.forEach((x) => choices.appendChild(el('button', { type: 'button', class: 'choice', onclick: () => answer(x) }, intervalLongName(x))));
      fb.textContent = 'Press play, then choose.';
    };
    const answer = (x) => {
      if (done) return;
      done = true;
      [...choices.children].forEach((b, i) => { b.disabled = true; if (SET[i] === iv) b.classList.add('is-correct'); else if (SET[i] === x) b.classList.add('is-wrong'); });
      fb.textContent = x === iv ? `✓ Correct — a ${intervalLongName(iv)}.` : `✗ That was a ${intervalLongName(iv)}.`;
    };
    bar(host, btn('▶ Play', playIt), btn('New interval', nextQ, 'btn btn-outline'));
    host.append(el('p', { class: 'demo-q' }, 'Compound intervals: which one is it?'), choices, fb,
      el('p', { class: 'small' }, 'The full edition adds seventh chords in every inversion, secondary dominants, modulations, two-voice dictation and rhythmic dictation in compound and irregular meters.'));
    nextQ();
  },

  bundle(host) {
    const info = el('p', { class: 'demo-q', 'aria-live': 'polite' }, 'Click a key: see it on the staff and on the fretboard.');
    const staffHost = el('div');
    const fb = createFretboard({ frets: 12, interactive: false, label: 'Fretboard showing the chosen note' });
    const kb = createKeyboard({ low: 48, high: 72, label: 'Keyboard: click a key', onSelect: async ({ midi: m }) => {
      const n = spellMidi(m);
      info.textContent = `${noteName(n, { octave: true })} — shown on the staff and at every fret where it sounds.`;
      staffHost.textContent = '';
      staffHost.appendChild(scoreBox(renderScore({ clef: m >= 60 ? 'treble' : 'bass', items: [{ kind: 'note', notes: [n], dur: 48 }], minWidth: 200, label: noteName(n, { octave: true }) }).svg, '240px'));
      fb.mark(fb.positionsOf(m, { byPc: false }).map((p) => ({ string: p.string, fret: p.fret, cls: 'is-target', label: noteName(n).slice(0, 2) })));
      kb.mark([{ midi: m, cls: 'is-target' }]);
      if (await sound()) play(m, { dur: 1.2 });
    } });
    bar(host, el('span', { class: 'small' }, 'From Note Reader’s reference view.'));
    host.append(info, kb.el, staffHost, fb.el);
  },
};

export function mountDemo(host, id) {
  host.textContent = '';
  (DEMOS[id] || DEMOS.bundle)(host);
}
