// Chord Builder & Ear Trainer
import { h, weightedItem } from '../app/toolkit.js';
import { renderScore } from '../core/notation.js';
import { createFretboard, createKeyboard } from '../core/instruments.js';
import { chord, now, play } from '../core/audio.js';
import { CHORD_TYPES, TRIAD_TYPES, SEVENTH_TYPES, chordTones, voiceChord, chordSymbol, noteName, noteId, midi, pc, parseNote, tuningMidis, INVERSION_NAMES, TUNINGS, chordDegreeLabels } from '../core/theory.js';
import { findVoicings } from '../core/fretwork.js';

const TYPES = [...TRIAD_TYPES, ...SEVENTH_TYPES];
const NATURAL_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ALL_ROOTS = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const INV_SHORT = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];
const invCount = (type) => CHORD_TYPES[type].ivls.length;

function pickRoot(s, octave = 4) {
  const list = s.roots === 'natural' ? NATURAL_ROOTS : ALL_ROOTS;
  return parseNote(list[Math.floor(Math.random() * list.length)] + octave);
}
function pickTypeInv(s, accuracy, exercise) {
  const types = s.types.length ? s.types : ['maj', 'min'];
  const combos = [];
  for (const t of types) for (const inv of s.inversions) if (inv < invCount(t)) combos.push(`${t}:${inv}`);
  if (!combos.length) combos.push(`${types[0]}:0`);
  const key = exercise === 'quality' ? (x) => x.split(':')[0] : exercise === 'inversion' ? (x) => 'inv' + x.split(':')[1] : (x) => x;
  const c = weightedItem(combos, accuracy, Math.random, key);
  const [type, inv] = c.split(':');
  return { type, inv: +inv };
}
function chordStaff(notes, label) {
  const treble = notes.filter((n) => midi(n) >= 60);
  const bass = notes.filter((n) => midi(n) < 60);
  const items = [];
  if (treble.length) items.push({ kind: 'note', notes: treble, dur: 48, staff: 0 });
  if (bass.length) items.push({ kind: 'note', notes: bass, dur: 48, staff: 1, together: treble.length > 0 });
  const { svg } = renderScore({ clef: 'grand', items, minWidth: 200, accMode: 'measure', label });
  svg.style.maxWidth = '300px';
  return svg;
}
function playChord(notes, mode, inst) {
  const ms = notes.map(midi);
  const t = now() + 0.05;
  if (mode === 'broken' || mode === 'both') {
    ms.forEach((m, i) => play(m, { when: t + i * 0.32, dur: 1.2, instrument: inst, velocity: 0.75 }));
    if (mode === 'both') chord(ms, { when: t + ms.length * 0.32 + 0.35, dur: 1.9, instrument: inst });
    return;
  }
  chord(ms, { when: t, dur: 2, instrument: inst });
}
const voicingFor = (root, type, inv) => voiceChord(root, type, inv, 3);

export default {
  id: 'chord-builder',
  exercises: [
    { id: 'build-kb', name: 'Build on the keyboard', description: 'Press the keys of the chord in the inversion shown.' },
    { id: 'build-fb', name: 'Build on the fretboard', description: 'Tap one note per string to make the chord.' },
    { id: 'spell', name: 'Spell the chord', description: 'Enter the chord tones from the root up.' },
    { id: 'quality', name: 'Quality by ear', description: 'Hear a chord and name its quality.' },
    { id: 'inversion', name: 'Inversion by ear', description: 'Hear a chord and name its inversion.' },
  ],
  defaults: { exercise: 'build-kb', sessionLength: 10, types: ['maj', 'min', 'dim', 'aug'], inversions: [0, 1, 2], roots: 'natural', earPlay: 'both', tone: 'pref' },
  walkthrough: [
    { title: 'Chord Builder', text: 'Build triads and seventh chords on the keyboard and fretboard, spell them, and learn to hear their quality and inversion.' },
    { title: 'Building', text: 'Press or tap the notes, then press Check (Enter). The lowest note decides the inversion, so put the right chord tone in the bass. Notes can be doubled.' },
    { title: 'Spelling', text: 'Spell from the root up: root, 3rd, 5th and 7th. A diminished 7th on C is C E♭ G♭ B𝄫 — the double flat is on the accidental row.' },
    { title: 'By ear', text: 'Quality by ear and inversion by ear play a chord for you to identify. Settings let you hear it broken first.' },
  ],
  shortcuts: [['A–G', 'Spell a note'], ['− / =', 'Flat / sharp (press twice for double)'], ['Arrows + Space', 'Choose keys or frets'], ['Enter', 'Check']],
  describeSettings(s) {
    return `${s.types.map((t) => CHORD_TYPES[t].short).join(', ')} · ${s.inversions.length === 1 && s.inversions[0] === 0 ? 'root position' : 'inversions ' + s.inversions.map((i) => (i === 0 ? 'root' : i)).join(', ')}`;
  },
  settingsSchema() {
    return [
      { type: 'select', key: 'sessionLength', label: 'Session length', options: [5, 10, 20, 30].map((v) => ({ value: v, label: `${v} questions` })) },
      { type: 'checks', key: 'types', label: 'Chord types', min: 1, options: TYPES.map((t) => ({ value: t, label: CHORD_TYPES[t].short })),
        quick: [{ label: 'Triads', values: TRIAD_TYPES }, { label: 'Seventh chords', values: SEVENTH_TYPES }, { label: 'All', values: TYPES }] },
      { type: 'checks', key: 'inversions', label: 'Inversions', min: 1, options: [0, 1, 2, 3].map((i) => ({ value: i, label: INV_SHORT[i] + (i === 3 ? ' (7th chords)' : '') })) },
      { type: 'segmented', key: 'roots', label: 'Roots', options: [{ value: 'natural', label: 'Natural notes' }, { value: 'all', label: 'With sharps and flats' }] },
      { type: 'segmented', key: 'earPlay', label: 'Ear training playback', options: [{ value: 'block', label: 'Block chord' }, { value: 'broken', label: 'Broken' }, { value: 'both', label: 'Broken, then block' }] },
      { type: 'select', key: 'tone', label: 'Tone', options: [{ value: 'pref', label: 'Default tone' }, { value: 'keys', label: 'Keyboard' }, { value: 'guitar', label: 'Guitar' }] },
      { type: 'select', pref: 'tuning', label: 'Tuning (all tools)', options: Object.entries(TUNINGS).map(([id, t]) => ({ value: id, label: t.name })) },
      { type: 'toggle', pref: 'leftHanded', label: 'Left-handed fretboard (all tools)' },
    ];
  },
  itemLabel(item) {
    if (item.startsWith('inv')) return INV_SHORT[+item.slice(3)];
    const [t, inv] = item.split(':');
    if (!CHORD_TYPES[t]) return item;
    return inv === undefined ? CHORD_TYPES[t].short : `${CHORD_TYPES[t].short}, ${INV_SHORT[+inv].toLowerCase()}`;
  },

  createQuestion({ settings: s, prefs, exercise, accuracy }) {
    const naming = prefs.naming;
    const inst = s.tone === 'pref' ? prefs.instrument : s.tone;
    const { type, inv } = pickTypeInv(s, accuracy, exercise);
    const root = pickRoot(s, 4);
    const tones = chordTones(root, type);
    const pcs = tones.map(pc);
    const bassPc = pcs[inv];
    const sym = chordSymbol(root, type);
    const name = `${noteName(root, { naming })} ${CHORD_TYPES[type].name}`;
    const notes = voicingFor(parseNote(noteId(root, false) + '3'), type, inv);

    if (exercise === 'quality' || exercise === 'inversion') {
      const earRoot = parseNote(['C', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'A', 'Bb'][Math.floor(Math.random() * 9)] + '3');
      const earNotes = voiceChord(earRoot, type, inv, 3);
      const item = exercise === 'quality' ? type : 'inv' + inv;
      const typeList = s.types.length ? s.types : ['maj', 'min'];
      const maxInv = Math.max(...typeList.map(invCount));
      const options = exercise === 'quality'
        ? typeList.map((t) => ({ id: t, label: CHORD_TYPES[t].short }))
        : s.inversions.filter((i) => i < maxInv).map((i) => ({ id: 'inv' + i, label: INV_SHORT[i], sub: i === 0 ? 'root in the bass' : ['', '3rd in the bass', '5th in the bass', '7th in the bass'][i] }));
      return {
        item, report: `${exercise} ${noteId(earRoot)} ${type} inv${inv}`,
        prompt: exercise === 'quality' ? 'What quality is this chord?' : 'Which inversion is this?',
        sub: exercise === 'quality' ? 'Listen to the colour of the whole chord.' : 'Listen for the lowest note.',
        play: () => playChord(earNotes, s.earPlay, inst),
        render(stage, api) {
          const c = api.choices(stage, options, (ans) => {
            c.mark(item, ans);
            const sym2 = chordSymbol(earRoot, type);
            stage.appendChild(h('div', { class: 'ref-grid ref-grid--2' }, h('div', { class: 'score-box' }, chordStaff(earNotes, `${sym2}, ${INV_SHORT[inv]}`)),
              h('p', { class: 'ref-info' }, h('strong', { class: 'big-name' }, sym2), h('br'), `${CHORD_TYPES[type].short}, ${INV_SHORT[inv].toLowerCase()}: ${earNotes.map((n) => noteName(n, { naming })).join(' ')} (lowest first).`)));
            const ok = ans === item;
            const actions = [{ label: 'Hear it again', onClick: () => playChord(earNotes, s.earPlay, inst) }];
            if (!ok && exercise === 'quality') actions.push({ label: `Hear ${CHORD_TYPES[ans].short.toLowerCase()} on the same root`, onClick: () => playChord(voiceChord(earRoot, ans, Math.min(inv, invCount(ans) - 1), 3), s.earPlay, inst) });
            if (!ok && exercise === 'inversion') actions.push({ label: `Hear ${INV_SHORT[+ans.slice(3)].toLowerCase()}`, onClick: () => playChord(voiceChord(earRoot, type, Math.min(+ans.slice(3), invCount(type) - 1), 3), s.earPlay, inst) });
            api.submit({ correct: ok, item, answer: ans, message: ok ? `${CHORD_TYPES[type].short}, ${INV_SHORT[inv].toLowerCase()}.` : `It was ${exercise === 'quality' ? CHORD_TYPES[type].short.toLowerCase() : INV_SHORT[inv].toLowerCase()}.`, actions });
          }, { label: exercise === 'quality' ? 'Chord quality' : 'Inversion' });
          c.el.style.setProperty('--min', '150px');
        },
      };
    }

    const item = `${type}:${inv}`;
    const target = `${sym}, ${INV_SHORT[inv].toLowerCase()}`;
    if (exercise === 'spell') {
      return {
        item: type, report: `spell ${sym}`,
        prompt: `Spell ${sym}`,
        sub: `${name}: enter ${tones.length} notes from the root up. Backspace removes the last note.`,
        render(stage, api) {
          const entered = [];
          const row = h('div', { class: 'entry-row', 'aria-live': 'polite', 'aria-label': 'Notes entered' });
          const draw = () => { row.textContent = ''; if (!entered.length) row.appendChild(h('span', { class: 'entry-empty' }, 'Your notes appear here.')); entered.forEach((n) => row.appendChild(h('span', { class: 'entry-chip' }, noteName(n, { naming })))); };
          draw();
          stage.appendChild(row);
          const pad = api.notePad(stage, { accidentals: true, doubles: true, onPick: (n) => {
            entered.push(n); draw();
            if (entered.length < tones.length) return;
            pad.disable();
            const res = tones.map((t, i) => entered[i].l === t.l && entered[i].a === t.a);
            row.textContent = '';
            tones.forEach((t, i) => row.appendChild(h('span', { class: 'entry-chip ' + (res[i] ? 'is-correct' : 'is-wrong') }, (res[i] ? '✓ ' : '✗ ') + noteName(entered[i], { naming }))));
            const root3 = voiceChord(parseNote(noteId(root, false) + '3'), type, 0, 3);
            stage.appendChild(h('div', { class: 'score-box' }, chordStaff(root3, sym)));
            playChord(root3, 'both', inst);
            const ok = res.every(Boolean);
            api.submit({ correct: ok, item: type, answer: entered.map((x) => noteId(x, false)).join(' '), message: `${sym} is ${tones.map((t) => noteName(t, { naming })).join(' – ')} (${chordDegreeLabels(type).join(' – ')}).` });
          } });
          api.onKey((e) => { if (e.key === 'Backspace' && entered.length) { entered.pop(); draw(); return true; } return false; });
          api.addControl('Remove last', () => { entered.pop(); draw(); }, { key: '⌫' });
        },
      };
    }

    if (exercise === 'build-kb') {
      return {
        item, report: `build keyboard ${sym} inv${inv}`,
        prompt: `Build ${sym} — ${INV_SHORT[inv].toLowerCase()}`,
        sub: `${name}. Press the keys, then Check. The lowest key must be the ${['root', '3rd', '5th', '7th'][inv]}.`,
        render(stage, api) {
          const sel = new Set();
          let done = false;
          const kb = createKeyboard({ low: 48, high: 83, naming, label: `Keyboard: build ${sym} in ${INV_SHORT[inv].toLowerCase()}`, onSelect: ({ midi: m }) => {
            if (done) return;
            if (sel.has(m)) sel.delete(m); else { sel.add(m); play(m, { instrument: 'keys', dur: 0.6, velocity: 0.55 }); }
            kb.mark([...sel].map((x) => ({ midi: x, cls: 'is-selected' })));
          } });
          stage.appendChild(kb.el);
          requestAnimationFrame(() => kb.scrollTo(60));
          api.addControl('Check', () => {
            if (done) return;
            if (!sel.size) { api.setPrompt(`Build ${sym} — ${INV_SHORT[inv].toLowerCase()}`, 'Press at least one key first.'); return; }
            done = true;
            const ms = [...sel].sort((a, b) => a - b);
            const have = new Set(ms.map((m) => m % 12));
            const missing = pcs.filter((p) => !have.has(p));
            const extra = ms.filter((m) => !pcs.includes(m % 12));
            const bassOk = ms[0] % 12 === bassPc;
            const ok = !missing.length && !extra.length && bassOk;
            kb.mark(ms.map((m) => ({ midi: m, cls: pcs.includes(m % 12) ? 'is-correct' : 'is-wrong', label: pcs.includes(m % 12) ? '✓' : '✗' })));
            chord(ms, { dur: 1.8, instrument: 'keys' });
            stage.appendChild(h('div', { class: 'score-box' }, chordStaff(notes, target)));
            const why = [];
            if (missing.length) why.push(`missing ${missing.map((p) => noteName(tones[pcs.indexOf(p)], { naming })).join(', ')}`);
            if (extra.length) why.push(`${extra.length} note${extra.length === 1 ? '' : 's'} not in the chord`);
            if (!bassOk) why.push(`the lowest note should be ${noteName(tones[inv], { naming })}`);
            api.submit({ correct: ok, item, message: ok ? `${target}: ${tones.map((t) => noteName(t, { naming })).join(' ')} with ${noteName(tones[inv], { naming })} in the bass.` : `Not yet: ${why.join('; ')}. One correct voicing is shown on the staff.`, actions: [{ label: 'Hear the answer', onClick: () => playChord(notes, 'block', 'keys') }] });
          }, { key: 'Enter', primary: true });
          api.addControl('Clear', () => { if (done) return; sel.clear(); kb.mark([]); });
        },
      };
    }

    // Build on the fretboard
    const open = tuningMidis(prefs.tuning);
    return {
      item, report: `build fretboard ${sym} inv${inv}`,
      prompt: `Build ${sym} on the fretboard — ${INV_SHORT[inv].toLowerCase()}`,
      sub: `${name}. One note per string; tap again to remove. The lowest note must be the ${['root', '3rd', '5th', '7th'][inv]}.`,
      render(stage, api) {
        const sel = new Map();
        let done = false;
        const fb = createFretboard({ tuning: prefs.tuning, frets: 12, leftHanded: prefs.leftHanded, naming, label: `Fretboard: build ${sym}`, onSelect: (p) => {
          if (done) return;
          const cur = sel.get(p.string);
          if (cur && cur.fret === p.fret) sel.delete(p.string);
          else { sel.set(p.string, p); play(p.midi, { instrument: 'guitar', dur: 0.9, velocity: 0.6 }); }
          fb.mark([...sel.values()].map((x) => ({ string: x.string, fret: x.fret, cls: 'is-selected', label: '●' })));
        } });
        stage.appendChild(fb.el);
        api.addControl('Check', () => {
          if (done) return;
          if (!sel.size) { api.setPrompt(`Build ${sym} on the fretboard — ${INV_SHORT[inv].toLowerCase()}`, 'Tap at least one fret first.'); return; }
          done = true;
          const ps = [...sel.values()].sort((a, b) => a.midi - b.midi);
          const have = new Set(ps.map((x) => x.midi % 12));
          const missing = pcs.filter((p) => !have.has(p));
          const extra = ps.filter((x) => !pcs.includes(x.midi % 12));
          const bassOk = ps[0].midi % 12 === bassPc;
          const ok = !missing.length && !extra.length && bassOk;
          const marks = ps.map((x) => ({ string: x.string, fret: x.fret, cls: pcs.includes(x.midi % 12) ? 'is-correct' : 'is-wrong', label: pcs.includes(x.midi % 12) ? chordDegreeLabels(type)[pcs.indexOf(x.midi % 12)] : '✗' }));
          let example = null;
          if (!ok) {
            example = findVoicings(open, pcs, bassPc, { limit: 1 })[0];
            if (example) marks.push(...example.filter((x) => !ps.some((y) => y.string === x.string && y.fret === x.fret)).map((x) => ({ string: x.string, fret: x.fret, cls: 'is-ghost', label: chordDegreeLabels(type)[pcs.indexOf(x.midi % 12)] })));
          }
          fb.mark(marks);
          const strum = ps.map((x) => x.midi);
          chord(strum, { dur: 2, instrument: 'guitar', strum: 0.035 });
          const why = [];
          if (missing.length) why.push(`missing ${missing.map((p) => noteName(tones[pcs.indexOf(p)], { naming })).join(', ')}`);
          if (extra.length) why.push(`${extra.length} note${extra.length === 1 ? '' : 's'} not in the chord`);
          if (!bassOk) why.push(`the lowest note should be ${noteName(tones[inv], { naming })}`);
          api.submit({ correct: ok, item, message: ok ? `${target}. Numbers show each note's chord degree.` : `Not yet: ${why.join('; ')}.${example ? ' Dashed circles show one shape that works.' : ''}`, actions: example ? [{ label: 'Hear the example shape', onClick: () => chord(example.map((x) => x.midi), { dur: 2, instrument: 'guitar', strum: 0.035 }) }] : [] });
        }, { key: 'Enter', primary: true });
        api.addControl('Clear', () => { if (done) return; sel.clear(); fb.mark([]); });
      },
    };
  },

  renderReference(el, { prefs }) {
    const naming = prefs.naming;
    const rootSel = h('select', { id: 'cd-root' }, ALL_ROOTS.map((r) => h('option', { value: r }, noteName(parseNote(r)))));
    const typeSel = h('select', { id: 'cd-type' }, TYPES.map((t) => h('option', { value: t }, CHORD_TYPES[t].short)));
    const invSel = h('select', { id: 'cd-inv' });
    const out = h('div');
    const open = tuningMidis(prefs.tuning);
    let current = [];
    const fillInv = () => {
      const n = invCount(typeSel.value);
      const keep = Math.min(+invSel.value || 0, n - 1);
      invSel.textContent = '';
      for (let i = 0; i < n; i++) invSel.appendChild(h('option', { value: i }, INV_SHORT[i]));
      invSel.value = String(keep);
    };
    const draw = () => {
      const root = parseNote(rootSel.value + '3');
      const type = typeSel.value;
      const inv = +invSel.value;
      const tones = chordTones(root, type);
      const pcs = tones.map(pc);
      current = voiceChord(root, type, inv, 3);
      out.textContent = '';
      const kb = createKeyboard({ low: 48, high: 83, interactive: false, label: 'Keyboard showing the chord' });
      kb.mark(current.map((n, i) => ({ midi: midi(n), cls: i === 0 ? 'is-root' : 'is-target', label: noteName(n, { naming }).slice(0, 3) })));
      const shapes = findVoicings(open, pcs, pcs[inv], { limit: 3 });
      const fbs = shapes.map((sh, i) => {
        const fb = createFretboard({ tuning: prefs.tuning, frets: 12, leftHanded: prefs.leftHanded, interactive: false, label: `Guitar shape ${i + 1}` });
        fb.mark(sh.map((x) => ({ string: x.string, fret: x.fret, cls: x.midi % 12 === pcs[0] ? 'is-root' : '', label: chordDegreeLabels(type)[pcs.indexOf(x.midi % 12)] })));
        return h('div', {}, h('h4', {}, `Shape ${i + 1}`), h('button', { type: 'button', class: 'btn btn-sm btn-outline', onclick: () => chord(sh.map((x) => x.midi), { dur: 2, instrument: 'guitar', strum: 0.035 }) }, 'Strum'), fb.el);
      });
      out.append(
        h('div', { class: 'ref-grid ref-grid--2' }, h('div', { class: 'score-box' }, chordStaff(current, `${chordSymbol(root, type)} ${INV_SHORT[inv]}`)),
          h('div', { class: 'ref-info' }, h('p', { class: 'big-name' }, chordSymbol(root, type, inv ? tones[inv] : null)), h('p', {}, CHORD_TYPES[type].name, h('br'), `Notes: ${tones.map((t) => noteName(t, { naming })).join(' – ')}`, h('br'), `Degrees: ${chordDegreeLabels(type).join(' – ')}`, h('br'), `Bass note: ${noteName(tones[inv], { naming })}`))),
        h('h3', {}, 'Keyboard'), kb.el,
        h('h3', {}, 'Guitar shapes'), fbs.length ? h('div', { class: 'ref-grid' }, fbs) : h('p', { class: 'muted' }, 'No compact shape fits within four frets for this chord in this tuning.'));
    };
    [rootSel, typeSel, invSel].forEach((s) => s.addEventListener('change', () => { if (s === typeSel) fillInv(); draw(); }));
    const inst = () => prefs.instrument;
    el.append(h('h2', { class: 'panel-title' }, 'Chord dictionary'),
      h('div', { class: 'ref-controls' }, h('label', { for: 'cd-root' }, 'Root', rootSel), h('label', { for: 'cd-type' }, 'Type', typeSel), h('label', { for: 'cd-inv' }, 'Inversion', invSel)),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn btn-ink', onclick: () => playChord(current, 'block', inst()) }, 'Play block chord'),
        h('button', { type: 'button', class: 'btn btn-outline', onclick: () => playChord(current, 'broken', inst()) }, 'Play broken chord')),
      out);
    fillInv();
    draw();
  },
};
