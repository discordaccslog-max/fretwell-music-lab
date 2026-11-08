// Scale & Mode Explorer
import { h, weightedItem } from '../app/toolkit.js';
import { renderScore } from '../core/notation.js';
import { createFretboard, createKeyboard } from '../core/instruments.js';
import { sequence } from '../core/audio.js';
import { SCALES, SCALE_BY_ID, buildScale, scaleTonics, scaleSignatureSize, scaleDegreeLabels, scaleIntervals, noteName, noteId, midi, pc, withOctave, tuningMidis, parseNote, keySignature, TUNINGS } from '../core/theory.js';
import { patternsFor, npsPattern, boxPositions, windowPattern } from '../core/fretwork.js';

const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
const allIds = SCALES.map((s) => s.id);

function tonicsFor(id, level) {
  return scaleTonics(id).filter((t) => scaleSignatureSize(t, id) <= level);
}
/** Scale notes ascending from the tonic in a given octave, plus the octave. */
function scaleLine(tonic, id, octave) {
  const t = withOctave(tonic, octave);
  const notes = buildScale(t, id);
  return [...notes, withOctave(tonic, octave + 1)];
}
function lineEvents(notes, dir, tempo) {
  const seq = dir === 'down' ? notes.slice().reverse() : dir === 'both' ? [...notes, ...notes.slice(0, -1).reverse()] : notes;
  const beat = 60 / tempo;
  return seq.map((n, i) => ({ midi: midi(n), at: i * beat, dur: i === seq.length - 1 ? beat * 2.2 : beat * 1.05 }));
}
const sigFor = (tonic, id) => {
  // Show modes and pentatonic scales without a key signature so every accidental is visible.
  if (id === 'major') return keySignature(tonic, 'major');
  if (id === 'naturalMinor') return keySignature(tonic, 'minor');
  return 0;
};
function staffFor(tonic, id, octave, { cls = [], labels = null } = {}) {
  const notes = scaleLine(tonic, id, octave);
  const clef = octave <= 2 ? 'bass' : 'treble';
  const items = notes.map((n, i) => ({ kind: 'note', notes: [n], dur: 12, stem: 'none', noteCls: [cls[i] || ''], label: labels ? labels[i] : null }));
  const { svg } = renderScore({ clef, keySig: sigFor(tonic, id), items, labels: !!labels, accMode: 'measure', label: `${noteName(tonic)} ${SCALE_BY_ID[id].name} on the staff` });
  return svg;
}

export default {
  id: 'scale-explorer',
  exercises: [
    { id: 'build', name: 'Build the scale', description: 'Spell a scale note by note, with the right letters and accidentals.' },
    { id: 'ear', name: 'Scale by ear', description: 'Hear a scale and name its type.' },
    { id: 'degrees', name: 'Scale degrees', description: 'Name the note on a given degree of a scale.' },
    { id: 'fretboard', name: 'Fretboard patterns', description: 'Tap every note of a scale inside a fretboard position.' },
  ],
  defaults: { exercise: 'build', sessionLength: 10, scales: ['major', 'naturalMinor', 'harmonicMinor', 'majorPentatonic', 'minorPentatonic'], keyLevel: 4, direction: 'up', tempo: 150, tone: 'pref', patterns: 'box' },
  walkthrough: [
    { title: 'Scale & Mode Explorer', text: 'Explore any scale in any key in the Reference tab, then practise with four drills.' },
    { title: 'Build the scale', text: 'Spell the scale from the first note up. Choose ♭ or ♯ (or press − or =) before a letter. Spelling matters: F♯ major has E♯, not F.' },
    { title: 'Ear and degrees', text: 'Scale by ear plays a scale for you to name. Scale degrees asks for the note on a degree, such as the 6th of E♭ major.' },
    { title: 'Fretboard patterns', text: 'Tap every scale note in the highlighted position, then press Check (Enter). Your tuning and left-handed setting are used.' },
  ],
  shortcuts: [['A–G', 'Enter a note'], ['− / =', 'Flat / sharp'], ['Backspace', 'Remove the last note'], ['Arrows + Space', 'Choose frets']],
  describeSettings(s) {
    return `${s.scales.length} scale type${s.scales.length === 1 ? '' : 's'} · keys up to ${s.keyLevel} sharps or flats`;
  },
  settingsSchema() {
    return [
      { type: 'select', key: 'sessionLength', label: 'Session length', options: [5, 10, 20, 30].map((v) => ({ value: v, label: `${v} questions` })) },
      { type: 'checks', key: 'scales', label: 'Scale types', min: 1, options: SCALES.map((s) => ({ value: s.id, label: s.name })),
        quick: [{ label: 'Major and minor', values: ['major', 'naturalMinor', 'harmonicMinor', 'melodicMinor'] }, { label: 'Modes', values: ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'naturalMinor', 'locrian'] }, { label: 'Pentatonic and blues', values: ['majorPentatonic', 'minorPentatonic', 'blues', 'majorBlues'] }, { label: 'All', values: allIds }] },
      { type: 'segmented', key: 'keyLevel', label: 'Keys', options: [{ value: 2, label: 'Up to 2 ♯/♭' }, { value: 4, label: 'Up to 4' }, { value: 7, label: 'All keys' }] },
      { type: 'segmented', key: 'direction', label: 'Playback for ear training', options: [{ value: 'up', label: 'Up' }, { value: 'down', label: 'Down' }, { value: 'both', label: 'Up and down' }] },
      { type: 'range', key: 'tempo', label: 'Tempo (notes per minute)', min: 60, max: 220, step: 10 },
      { type: 'select', key: 'tone', label: 'Tone', options: [{ value: 'pref', label: 'Default tone' }, { value: 'keys', label: 'Keyboard' }, { value: 'guitar', label: 'Guitar' }] },
      { type: 'segmented', key: 'patterns', label: 'Fretboard drill uses', options: [{ value: 'box', label: 'Five-fret positions' }, { value: 'nps', label: '3-per-string / pentatonic boxes' }] },
      { type: 'select', pref: 'tuning', label: 'Tuning (all tools)', options: Object.entries(TUNINGS).map(([id, t]) => ({ value: id, label: t.name })) },
      { type: 'toggle', pref: 'leftHanded', label: 'Left-handed fretboard (all tools)' },
    ];
  },
  itemLabel(item) {
    const [id, rest] = item.split('@');
    const name = SCALE_BY_ID[id] ? SCALE_BY_ID[id].name : id;
    if (!rest) return name;
    if (rest.startsWith('d')) { const [deg, t] = rest.slice(1).split(':'); return `${ORD[+deg - 1]} degree of ${t.replace('#', '♯').replace('b', '♭')} ${name}`; }
    return `${rest.replace('#', '♯').replace(/b$/, '♭')} ${name}`;
  },

  createQuestion({ settings: s, prefs, exercise, accuracy }) {
    const naming = prefs.naming;
    const inst = s.tone === 'pref' ? prefs.instrument : s.tone;
    const scales = s.scales.length ? s.scales : ['major'];
    if (exercise === 'ear') {
      const id = weightedItem(scales.length > 1 ? scales : ['major', 'naturalMinor'], accuracy);
      const pool = scales.length > 1 ? scales : ['major', 'naturalMinor'];
      const tonics = tonicsFor(id, 7);
      const tonic = tonics[Math.floor(Math.random() * tonics.length)];
      const oct = pc(tonic) >= 7 ? 3 : 4;
      const notes = scaleLine(tonic, id, oct);
      const evs = lineEvents(notes, s.direction, s.tempo);
      return {
        item: id,
        report: `ear ${id} on ${noteId(tonic, false)}`,
        prompt: 'Which scale is this?',
        sub: s.direction === 'down' ? 'Played downward from the top' : s.direction === 'both' ? 'Played up and back down' : 'Played upward from the tonic',
        play: () => sequence(evs, { instrument: inst }),
        render(stage, api) {
          const c = api.choices(stage, pool.map((x) => ({ id: x, label: SCALE_BY_ID[x].name })), (ans) => {
            c.mark(id, ans);
            stage.appendChild(h('div', { class: 'score-box' }, staffFor(tonic, id, oct, { labels: scaleDegreeLabels(tonic, id).concat('8') })));
            api.submit({ correct: ans === id, item: id, answer: ans, message: `That was ${noteName(tonic, { naming })} ${SCALE_BY_ID[id].name.toLowerCase()}.${ans === id ? '' : ` You chose ${SCALE_BY_ID[ans].name.toLowerCase()}.`}`, actions: [{ label: 'Hear it again', onClick: () => sequence(evs, { instrument: inst }) }, ...(ans !== id ? [{ label: `Hear ${SCALE_BY_ID[ans].name.toLowerCase()} on ${noteName(tonic)}`, onClick: () => sequence(lineEvents(scaleLine(tonic, ans, oct), s.direction, s.tempo), { instrument: inst }) }] : [])] });
          }, { label: 'Scale type' });
          c.el.style.setProperty('--min', '180px');
        },
      };
    }
    if (exercise === 'build') {
      const id = scales[Math.floor(Math.random() * scales.length)];
      const tonics = tonicsFor(id, s.keyLevel);
      const tonic = tonics[Math.floor(Math.random() * tonics.length)];
      const target = buildScale(withOctave(tonic, 4), id);
      const doubles = target.some((n) => Math.abs(n.a) >= 2) || s.keyLevel === 7;
      const item = `${id}@${noteId(tonic, false)}`;
      return {
        item, report: `build ${item}`,
        prompt: `Spell ${noteName(tonic, { naming })} ${SCALE_BY_ID[id].name.toLowerCase()}`,
        sub: `${target.length} notes, starting on ${noteName(tonic, { naming })}. Backspace removes the last note.`,
        render(stage, api) {
          const entered = [];
          const row = h('div', { class: 'entry-row', 'aria-live': 'polite', 'aria-label': 'Notes entered' });
          const drawRow = () => {
            row.textContent = '';
            if (!entered.length) row.appendChild(h('span', { class: 'entry-empty' }, 'Your notes appear here.'));
            entered.forEach((n) => row.appendChild(h('span', { class: 'entry-chip' }, noteName(n, { naming }))));
          };
          drawRow();
          stage.appendChild(row);
          const check = () => {
            pad.disable();
            const results = target.map((t, i) => entered[i] && entered[i].l === t.l && entered[i].a === t.a);
            const ok = results.every(Boolean) && entered.length === target.length;
            row.textContent = '';
            target.forEach((t, i) => row.appendChild(h('span', { class: 'entry-chip ' + (results[i] ? 'is-correct' : 'is-wrong') }, (results[i] ? '✓ ' : '✗ ') + (entered[i] ? noteName(entered[i], { naming }) : '—'))));
            stage.appendChild(h('div', { class: 'score-box' }, staffFor(tonic, id, 4, { labels: target.map((t) => noteName(t, { naming })).concat(noteName(tonic, { naming })) })));
            const evs = lineEvents(scaleLine(tonic, id, 4), 'up', s.tempo);
            sequence(evs, { instrument: inst });
            api.submit({ correct: ok, item, answer: `${id}@${entered.map((n) => noteId(n, false)).join(' ')}`, message: ok ? `${target.map((t) => noteName(t, { naming })).join(' ')}.` : `The scale is ${target.map((t) => noteName(t, { naming })).join(' ')}.`, actions: [{ label: 'Hear the scale', onClick: () => sequence(evs, { instrument: inst }) }] });
          };
          const pad = api.notePad(stage, { accidentals: true, doubles, onPick: (n) => {
            entered.push(n);
            drawRow();
            if (entered.length === target.length) check();
          } });
          api.onKey((e) => { if (e.key === 'Backspace' && entered.length) { entered.pop(); drawRow(); return true; } return false; });
          api.addControl('Remove last', () => { entered.pop(); drawRow(); }, { key: '⌫' });
        },
      };
    }
    if (exercise === 'degrees') {
      const pool = scales.filter((x) => SCALE_BY_ID[x].ivls.length === 7);
      const id = (pool.length ? pool : ['major'])[Math.floor(Math.random() * (pool.length || 1))];
      const tonics = tonicsFor(id, s.keyLevel);
      const tonic = tonics[Math.floor(Math.random() * tonics.length)];
      const deg = 2 + Math.floor(Math.random() * 6);
      const target = buildScale(withOctave(tonic, 4), id)[deg - 1];
      const item = `${id}@d${deg}:${noteId(tonic, false)}`;
      return {
        item, report: item,
        prompt: `What is the ${ORD[deg - 1]} degree of ${noteName(tonic, { naming })} ${SCALE_BY_ID[id].name.toLowerCase()}?`,
        sub: `Degree ${deg} is a ${scaleDegreeLabels(tonic, id)[deg - 1]} above the tonic in this scale.`,
        render(stage, api) {
          const pad = api.notePad(stage, { accidentals: true, doubles: s.keyLevel === 7, onPick: (n) => {
            pad.disable();
            const ok = n.l === target.l && n.a === target.a;
            const labels = scaleDegreeLabels(tonic, id).map((d, i) => (i === deg - 1 ? `${d} = ${noteName(target, { naming })}` : d)).concat('8');
            const cls = scaleLine(tonic, id, 4).map((_, i) => (i === deg - 1 ? 'is-target' : ''));
            stage.appendChild(h('div', { class: 'score-box' }, staffFor(tonic, id, 4, { labels, cls })));
            const notes = scaleLine(tonic, id, 4);
            sequence(lineEvents(notes.slice(0, deg), 'up', s.tempo), { instrument: inst });
            api.submit({ correct: ok, item, answer: `${id}@d${deg}:${noteId(n, false)}`, message: ok ? `${noteName(target, { naming })} is the ${ORD[deg - 1]} degree.` : `The ${ORD[deg - 1]} degree is ${noteName(target, { naming })}. You chose ${noteName(n, { naming })}.` });
          } });
        },
      };
    }
    // Fretboard patterns
    const id = scales[Math.floor(Math.random() * scales.length)];
    const tonics = tonicsFor(id, s.keyLevel);
    const tonic = tonics[Math.floor(Math.random() * tonics.length)];
    const scalePcs = buildScale(withOctave(tonic, 4), id).map(pc);
    const open = tuningMidis(prefs.tuning);
    let target, lo, hi, desc;
    const n = scalePcs.length;
    if (s.patterns === 'nps' && (n === 7 || n === 5)) {
      const k = Math.floor(Math.random() * n);
      target = npsPattern(open, scalePcs, k, n === 7 ? 3 : 2);
      lo = Math.min(...target.map((x) => x.fret)); hi = Math.max(...target.map((x) => x.fret));
      desc = n === 7 ? `3 notes on every string, starting from the marked note on the lowest string` : `2 notes on every string, starting from the marked note on the lowest string`;
    } else {
      const boxes = boxPositions(open, scalePcs);
      const b = boxes[Math.floor(Math.random() * boxes.length)];
      lo = b.lo; hi = b.hi;
      target = windowPattern(open, scalePcs, lo, hi);
      desc = `every scale note between frets ${lo} and ${hi}, on all strings`;
    }
    const keyOf = (p) => `${p.string}:${p.fret}`;
    const want = new Set(target.map(keyOf));
    const start = target[0];
    const item = `${id}@${noteId(tonic, false)}`;
    return {
      item, report: `pattern ${item} ${s.patterns} ${lo}-${hi}`,
      prompt: `Tap ${noteName(tonic, { naming })} ${SCALE_BY_ID[id].name.toLowerCase()}`,
      sub: `Tap ${desc}. Then press Check.`,
      render(stage, api) {
        const sel = new Map();
        const frets = Math.max(12, hi + 1);
        let done = false;
        const fb = createFretboard({ tuning: prefs.tuning, frets, leftHanded: prefs.leftHanded, naming, label: `Fretboard: tap ${noteName(tonic)} ${SCALE_BY_ID[id].name} notes`, onSelect: (p) => {
          if (done) return;
          const k = keyOf(p);
          if (sel.has(k)) sel.delete(k); else sel.set(k, p);
          draw();
        } });
        const draw = () => {
          const marks = [];
          if (s.patterns === 'nps' && (n === 7 || n === 5)) marks.push({ string: start.string, fret: start.fret, cls: 'is-root', label: '1' });
          else for (let f = lo; f <= hi; f++) marks.push({ string: 0, fret: f, cls: 'is-ghost', shape: 'square' });
          for (const p of sel.values()) marks.push({ string: p.string, fret: p.fret, cls: 'is-selected', label: '●' });
          fb.mark(marks);
        };
        draw();
        stage.appendChild(fb.el);
        requestAnimationFrame(() => fb.scrollToFret(Math.round((lo + hi) / 2)));
        api.addControl('Check', () => {
          if (done) return;
          done = true;
          const chosen = new Set(sel.keys());
          const missing = target.filter((p) => !chosen.has(keyOf(p)));
          const extra = [...sel.values()].filter((p) => !want.has(keyOf(p)));
          const ok = !missing.length && !extra.length;
          const labels = scaleDegreeLabels(tonic, id);
          fb.mark([
            ...target.map((p) => ({ string: p.string, fret: p.fret, cls: chosen.has(keyOf(p)) ? 'is-correct' : 'is-ghost', label: labels[p.degree] })),
            ...extra.map((p) => ({ string: p.string, fret: p.fret, cls: 'is-wrong', label: '✗' })),
          ]);
          sequence(target.map((p, i) => ({ midi: p.midi, at: i * (60 / s.tempo), dur: 0.5 })), { instrument: 'guitar' });
          api.submit({ correct: ok, item, message: ok ? `All ${target.length} notes found.` : `${missing.length ? `${missing.length} note${missing.length === 1 ? '' : 's'} missed (dashed circles)` : ''}${missing.length && extra.length ? ' and ' : ''}${extra.length ? `${extra.length} wrong note${extra.length === 1 ? '' : 's'} (✗)` : ''}. Numbers show scale degrees.` });
        }, { key: 'Enter', primary: true });
      },
    };
  },

  renderReference(el, { prefs }) {
    const naming = prefs.naming;
    let id = 'major';
    let tonic = parseNote('C4');
    let pat = 'all';
    let labelMode = 'names';
    const scaleSel = h('select', { id: 'ref-scale' }, SCALES.map((s) => h('option', { value: s.id }, s.name)));
    const tonicSel = h('select', { id: 'ref-tonic' });
    const patSel = h('select', { id: 'ref-pattern' });
    const labelSel = h('select', { id: 'ref-labels' }, h('option', { value: 'names' }, 'Note names'), h('option', { value: 'degrees' }, 'Scale degrees'));
    const info = h('p', { class: 'ref-info', 'aria-live': 'polite' });
    const staffHost = h('div', { class: 'score-box score-wrap' });
    const kbHost = h('div');
    const fbHost = h('div');
    const open = tuningMidis(prefs.tuning);
    const fillTonics = () => {
      const list = scaleTonics(id);
      tonicSel.textContent = '';
      list.forEach((t) => tonicSel.appendChild(h('option', { value: noteId(t, false) }, noteName(t, { naming }))));
      const keep = list.find((t) => t.l === tonic.l && t.a === tonic.a) || list.find((t) => pc(t) === pc(tonic)) || list[0];
      tonic = withOctave(keep, 4);
      tonicSel.value = noteId(keep, false);
    };
    const draw = () => {
      const notes = buildScale(tonic, id);
      const scalePcs = notes.map(pc);
      const degs = scaleDegreeLabels(tonic, id);
      const ivs = scaleIntervals(tonic, id);
      info.innerHTML = '';
      info.append(h('strong', {}, `${noteName(tonic, { naming })} ${SCALE_BY_ID[id].name}`), h('br'), `Notes: ${notes.map((n) => noteName(n, { naming })).join(' ')}`, h('br'), `Degrees: ${degs.join(' ')}`, h('br'), `Intervals from the tonic: ${ivs.join(' ')}`);
      staffHost.textContent = '';
      staffHost.appendChild(staffFor(tonic, id, 4, { labels: (labelMode === 'names' ? notes.map((n) => noteName(n, { naming })) : degs).concat(labelMode === 'names' ? noteName(tonic, { naming }) : '8') }));
      kbHost.textContent = '';
      const kb = createKeyboard({ low: 48, high: 83, interactive: false, label: 'Keyboard showing the scale' });
      const marks = [];
      for (let m = 48; m <= 83; m++) {
        const d = scalePcs.indexOf(m % 12);
        if (d >= 0) marks.push({ midi: m, cls: d === 0 ? 'is-root' : 'is-target', label: labelMode === 'names' ? noteName(notes[d], { naming }).slice(0, 3) : degs[d] });
      }
      kb.mark(marks);
      kbHost.appendChild(kb.el);
      const pats = patternsFor(open, scalePcs);
      patSel.textContent = '';
      pats.forEach((p) => patSel.appendChild(h('option', { value: p.id }, p.name)));
      if (!pats.some((p) => p.id === pat)) pat = 'all';
      patSel.value = pat;
      const cur = pats.find((p) => p.id === pat);
      fbHost.textContent = '';
      const fb = createFretboard({ tuning: prefs.tuning, frets: 15, leftHanded: prefs.leftHanded, interactive: false, label: `Fretboard: ${cur.name}` });
      fb.mark(cur.positions.map((p) => ({ string: p.string, fret: p.fret, cls: p.degree === 0 ? 'is-root' : '', label: labelMode === 'names' ? noteName(notes[p.degree], { naming }).slice(0, 3) : degs[p.degree] })));
      fbHost.appendChild(fb.el);
      fbHost._pattern = cur;
    };
    scaleSel.addEventListener('change', () => { id = scaleSel.value; fillTonics(); draw(); });
    tonicSel.addEventListener('change', () => { tonic = withOctave(parseNote(tonicSel.value), 4); draw(); });
    patSel.addEventListener('change', () => { pat = patSel.value; draw(); });
    labelSel.addEventListener('change', () => { labelMode = labelSel.value; draw(); });
    const inst = () => prefs.instrument;
    const playLine = (dir) => sequence(lineEvents(scaleLine(tonic, id, 4), dir, 160), { instrument: inst() });
    const playPattern = () => {
      const p = fbHost._pattern;
      if (!p) return;
      const sorted = p.positions.slice().sort((a, b) => a.midi - b.midi);
      sequence(sorted.map((x, i) => ({ midi: x.midi, at: i * 0.32, dur: 0.6 })), { instrument: 'guitar' });
    };
    el.append(h('h2', { class: 'panel-title' }, 'Scale explorer'),
      h('div', { class: 'ref-controls' },
        h('label', { for: 'ref-scale' }, 'Scale', scaleSel), h('label', { for: 'ref-tonic' }, 'Key', tonicSel),
        h('label', { for: 'ref-pattern' }, 'Fretboard pattern', patSel), h('label', { for: 'ref-labels' }, 'Labels', labelSel)),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn btn-ink', onclick: () => playLine('up') }, 'Play up'),
        h('button', { type: 'button', class: 'btn btn-outline', onclick: () => playLine('down') }, 'Play down'),
        h('button', { type: 'button', class: 'btn btn-outline', onclick: playPattern }, 'Play this fretboard pattern')),
      info, staffHost, h('h3', {}, 'Keyboard'), kbHost, h('h3', {}, 'Fretboard'), fbHost);
    fillTonics();
    draw();
  },
};
