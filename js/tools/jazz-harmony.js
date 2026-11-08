// Jazz Harmony Studio
import { h, weightedItem } from '../app/toolkit.js';
import { renderScore } from '../core/notation.js';
import { createKeyboard, createFretboard } from '../core/instruments.js';
import { chord, play, now } from '../core/audio.js';
import { CHORD_TYPES, chordTones, chordDegreeLabels, noteName, noteId, midi, pc, parseNote, withOctave, transpose, tuningMidis, majorKeys, TUNINGS } from '../core/theory.js';
import { jazzSymbol, twoFiveOne, voiceTwoFiveOne, voicingTarget, extensionVoicing, playVoicing, EXTENSIONS, FAMILIES, VOICING_NAMES, RECIPE_DEGREES } from '../core/jazz.js';
import { findVoicings } from '../core/fretwork.js';

const NATURAL = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ALL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const KEYS12 = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'];
const pickRoot = (s, oct = 3) => parseNote((s.roots === 'natural' ? NATURAL : ALL)[Math.floor(Math.random() * (s.roots === 'natural' ? NATURAL : ALL).length)] + oct);

function staffOf(notes, label) {
  const treble = notes.filter((n) => midi(n) >= 60), bass = notes.filter((n) => midi(n) < 60);
  const items = [];
  if (treble.length) items.push({ kind: 'note', notes: treble, dur: 48, staff: 0 });
  if (bass.length) items.push({ kind: 'note', notes: bass, dur: 48, staff: 1, together: treble.length > 0 });
  const { svg } = renderScore({ clef: 'grand', items, minWidth: 200, accMode: 'measure', label });
  svg.style.maxWidth = '300px';
  return svg;
}
function playNotes(notes, dur = 2) { chord(notes.map(midi), { dur, velocity: 0.62 }); }

/** Schedule a voiced ii–V–I: bass plus voicing, two beats, two beats, four beats. Returns length in seconds. */
function scheduleTwoFive(voiced, tempo, start = 0, withBass = true) {
  const beat = 60 / tempo;
  const lengths = [2, 2, 4];
  let t = now() + 0.08 + start;
  voiced.forEach((c, i) => {
    const d = lengths[i] * beat;
    const ms = c.notes.map(midi);
    if (withBass && c.form !== 'shell') play(midi(c.bass), { when: t, dur: d * 0.95, velocity: 0.7 });
    chord(ms, { when: t, dur: d * 0.95, velocity: 0.58 });
    t += d;
  });
  return 8 * beat;
}

function essentialPcs(root, type) {
  const ivls = CHORD_TYPES[type].ivls;
  const tones = chordTones(root, type);
  if (tones.length <= 4) return tones.map(pc);
  const pickIv = (names) => names.map((n) => ivls.indexOf(n)).find((i) => i >= 0);
  const third = pickIv(['M3', 'm3', 'P4']);
  const seventh = pickIv(['m7', 'M7', 'M6', 'd7']);
  const out = [tones[0], tones[third], tones[seventh], tones[tones.length - 1]].filter(Boolean);
  return [...new Set(out.map(pc))];
}

export default {
  id: 'jazz-harmony',
  exercises: [
    { id: 'spell', name: 'Spell the chord', description: 'Enter the notes of an extended or altered chord.' },
    { id: 'extension', name: 'Extensions by ear', description: 'Name the extension on top of a dominant chord.' },
    { id: 'quality', name: 'Chord quality by ear', description: 'Name the quality of a seventh or extended chord.' },
    { id: 'twofive', name: 'ii–V–I in every key', description: 'Pick the ii–V–I that belongs to a key.' },
    { id: 'voicing', name: 'Build the voicing', description: 'Press the keys of a shell or rootless voicing.' },
  ],
  defaults: { exercise: 'spell', sessionLength: 10, families: ['sevenths', 'ninths', 'altered'], extensions: ['9', 'b9', '#9', '13'], twoFiveMode: 'major', voicing: 'A', roots: 'all', tempo: 120, tone: 'pref' },
  walkthrough: [
    { title: 'Jazz Harmony Studio', text: 'Work with chords beyond the seventh: spell them, hear them, and voice them through ii–V–I progressions in every key.' },
    { title: 'Spelling', text: 'Enter the chord tones from the root up, in the order root, 3rd, 5th, 7th, then extensions. E♭7♯9 is E♭ G B♭ D♭ F♯. Press − or = twice for double flats and sharps.' },
    { title: 'Ear training', text: 'Extensions by ear plays a dominant chord with one extension as the top note. Chord quality by ear plays complete chords from the families you choose.' },
    { title: 'Voicings', text: 'The Reference tab plays ii–V–I in any key with shell or rootless voicings, and shows guitar shapes. Build the voicing asks you to play those voicings yourself.' },
  ],
  shortcuts: [['A–G', 'Spell a note'], ['− / =', 'Flat / sharp (twice for double)'], ['Arrows + Space', 'Choose keys'], ['Enter', 'Check']],
  describeSettings(s) {
    return `${s.families.map((f) => FAMILIES[f].name.toLowerCase()).join(', ')} · ${VOICING_NAMES[s.voicing].toLowerCase()}`;
  },
  settingsSchema() {
    return [
      { type: 'select', key: 'sessionLength', label: 'Session length', options: [5, 10, 20, 30].map((v) => ({ value: v, label: `${v} questions` })) },
      { type: 'checks', key: 'families', label: 'Chord families (spelling and quality by ear)', min: 1, options: Object.entries(FAMILIES).map(([id, f]) => ({ value: id, label: f.name })) },
      { type: 'checks', key: 'extensions', label: 'Extensions (extensions by ear)', min: 2, options: EXTENSIONS.map((e) => ({ value: e.id, label: e.label })) },
      { type: 'segmented', key: 'twoFiveMode', label: 'ii–V–I', options: [{ value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }, { value: 'both', label: 'Both' }] },
      { type: 'segmented', key: 'voicing', label: 'Voicing type', options: [{ value: 'shell', label: 'Shell' }, { value: 'A', label: 'Rootless A' }, { value: 'B', label: 'Rootless B' }] },
      { type: 'segmented', key: 'roots', label: 'Roots and keys', options: [{ value: 'natural', label: 'Natural notes' }, { value: 'all', label: 'All twelve' }] },
      { type: 'range', key: 'tempo', label: 'Tempo for ii–V–I playback', min: 60, max: 200, step: 5 },
      { type: 'select', key: 'tone', label: 'Tone', options: [{ value: 'pref', label: 'Default tone' }, { value: 'keys', label: 'Keyboard' }, { value: 'guitar', label: 'Guitar' }] },
      { type: 'select', pref: 'tuning', label: 'Tuning (all tools)', options: Object.entries(TUNINGS).map(([id, t]) => ({ value: id, label: t.name })) },
      { type: 'toggle', pref: 'leftHanded', label: 'Left-handed fretboard (all tools)' },
    ];
  },
  itemLabel(item) {
    if (CHORD_TYPES[item]) return `${CHORD_TYPES[item].symbol || 'major'} chords`.replace(/^ø7/, 'm7♭5').trim();
    const ext = EXTENSIONS.find((e) => 'ext' + e.id === item);
    if (ext) return `${ext.label} extension`;
    if (item.startsWith('251')) return `ii–V–I in ${item.split(':')[1].replace('b', '♭').replace('#', '♯')}`;
    if (item.startsWith('voicing')) { const [, role, form] = item.split(':'); return `${VOICING_NAMES[form]} on ${role}`; }
    return item;
  },

  createQuestion({ settings: s, prefs, exercise, accuracy }) {
    const naming = prefs.naming;
    const inst = s.tone === 'pref' ? prefs.instrument : s.tone;
    const types = s.families.flatMap((f) => FAMILIES[f].types);

    if (exercise === 'extension') {
      const exts = s.extensions.length >= 2 ? s.extensions : ['9', 'b9'];
      const extId = weightedItem(exts, Object.fromEntries(Object.entries(accuracy).map(([k, v]) => [k.slice(3), v])));
      const root = parseNote(['C', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'A', 'Bb'][Math.floor(Math.random() * 9)] + '3');
      const notes = extensionVoicing(root, extId);
      const ext = EXTENSIONS.find((e) => e.id === extId);
      const playIt = () => { const t = now() + 0.05; chord(notes.map(midi), { when: t, dur: 2.2, velocity: 0.62, instrument: inst }); };
      return {
        item: 'ext' + extId, report: `extension ${extId} on ${noteId(root)}`,
        prompt: 'Which extension is on top?',
        sub: 'A dominant seventh chord with one extension as the highest note.',
        play: playIt,
        render(stage, api) {
          const c = api.choices(stage, exts.map((e) => ({ id: e, label: EXTENSIONS.find((x) => x.id === e).label })), (ans) => {
            c.mark(extId, ans);
            const sym = noteName(root) + '7(' + ext.label + ')';
            stage.appendChild(h('div', { class: 'ref-grid ref-grid--2' }, h('div', { class: 'score-box' }, staffOf(notes, sym)), h('p', { class: 'ref-info' }, h('strong', { class: 'big-name' }, sym), h('br'), `Top note: ${noteName(notes[notes.length - 1], { naming })}, the ${ext.label} of ${noteName(root, { naming })}.`)));
            const actions = [{ label: 'Hear it again', onClick: playIt }, { label: 'Hear the chord without the extension', onClick: () => chord(notes.slice(0, 3).map(midi), { dur: 2, velocity: 0.62, instrument: inst }) }];
            if (ans !== extId) actions.push({ label: `Hear the ${EXTENSIONS.find((x) => x.id === ans).label} instead`, onClick: () => chord(extensionVoicing(root, ans).map(midi), { dur: 2.2, velocity: 0.62, instrument: inst }) });
            api.submit({ correct: ans === extId, item: 'ext' + extId, answer: 'ext' + ans, message: ans === extId ? `The ${ext.label}.` : `It was the ${ext.label}.`, actions });
          }, { label: 'Extension' });
        },
      };
    }

    if (exercise === 'quality') {
      const pool = types.length >= 2 ? types : ['maj7', 'dom7', 'min7'];
      const type = weightedItem(pool, accuracy);
      const root = parseNote(['C', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'A', 'Bb'][Math.floor(Math.random() * 9)] + '3');
      const notes = playVoicing(root, type);
      const playIt = () => chord(notes.map(midi), { dur: 2.2, velocity: 0.6, instrument: inst });
      return {
        item: type, report: `quality ${type} on ${noteId(root)}`,
        prompt: 'What kind of chord is this?',
        sub: 'Root in the bass, the other chord tones above.',
        play: playIt,
        render(stage, api) {
          const c = api.choices(stage, pool.map((t) => ({ id: t, label: jazzSymbol(parseNote('C4'), t).slice(1) || 'maj', sub: CHORD_TYPES[t].name })), (ans) => {
            c.mark(type, ans);
            const sym = jazzSymbol(root, type);
            stage.appendChild(h('div', { class: 'ref-grid ref-grid--2' }, h('div', { class: 'score-box' }, staffOf(notes, sym)), h('p', { class: 'ref-info' }, h('strong', { class: 'big-name' }, sym), h('br'), CHORD_TYPES[type].name, h('br'), chordDegreeLabels(type).join(' – '))));
            const actions = [{ label: 'Hear it again', onClick: playIt }];
            if (ans !== type) actions.push({ label: `Hear ${jazzSymbol(root, ans)}`, onClick: () => chord(playVoicing(root, ans).map(midi), { dur: 2.2, velocity: 0.6, instrument: inst }) });
            api.submit({ correct: ans === type, item: type, answer: ans, message: ans === type ? `${sym}: ${CHORD_TYPES[type].name}.` : `It was ${sym} (${CHORD_TYPES[type].name}).`, actions });
          }, { label: 'Chord quality' });
          c.el.style.setProperty('--min', '120px');
        },
      };
    }

    if (exercise === 'twofive') {
      const mode = s.twoFiveMode === 'both' ? (Math.random() < 0.5 ? 'major' : 'minor') : s.twoFiveMode;
      const keyList = s.roots === 'natural' ? NATURAL : KEYS12;
      const k = parseNote(keyList[Math.floor(Math.random() * keyList.length)] + '4');
      const sym = (key) => twoFiveOne(key, mode).map((c) => jazzSymbol(c.root, c.sevenths)).join(' – ');
      const wrongKeys = [transpose(k, 'P5'), transpose(k, 'P4'), transpose(k, 'M2'), transpose(k, 'm3', -1), transpose(k, 'm2')]
        .map((x) => (Math.abs(x.a) > 1 ? majorKeys().find((m) => pc(m) === pc(x)) || x : x));
      const opts = [k];
      for (const w of wrongKeys.sort(() => Math.random() - 0.5)) if (opts.length < 4 && !opts.some((o) => pc(o) === pc(w))) opts.push(w);
      const order = opts.map((x, i) => ({ x, i })).sort(() => Math.random() - 0.5);
      const kName = `${noteName(k, { naming })} ${mode}`;
      const item = `251:${noteId(k, false)} ${mode}`;
      return {
        item, report: `251 ${kName}`,
        prompt: `Which ii–V–I is in ${kName}?`,
        render(stage, api) {
          const c = api.choices(stage, order.map(({ x, i }) => ({ id: String(i), label: sym(x) })), (ans) => {
            c.mark('0', ans);
            const voiced = voiceTwoFiveOne(k, mode, s.voicing);
            scheduleTwoFive(voiced, s.tempo);
            const chosen = opts[+ans];
            api.submit({ correct: ans === '0', item, answer: `251:${noteId(chosen, false)} ${mode}`, message: ans === '0' ? `${sym(k)}: ii, V and I of ${kName}.` : `${sym(k)} is ii–V–I in ${kName}. Yours belongs to ${noteName(chosen, { naming })} ${mode}.`, actions: [{ label: 'Hear it', onClick: () => scheduleTwoFive(voiced, s.tempo) }] });
          }, { label: 'ii–V–I options', columns: 1 });
          c.el.style.setProperty('--min', '260px');
        },
      };
    }

    if (exercise === 'voicing') {
      const mode = s.twoFiveMode === 'both' ? (Math.random() < 0.5 ? 'major' : 'minor') : s.twoFiveMode;
      const keyList = s.roots === 'natural' ? NATURAL : KEYS12;
      const k = parseNote(keyList[Math.floor(Math.random() * keyList.length)] + '4');
      const chords = twoFiveOne(k, mode);
      const idx = Math.floor(Math.random() * 3);
      const c = chords[idx];
      const form = s.voicing;
      const target = voicingTarget(c, form);
      const sym = jazzSymbol(c.root, form === 'shell' ? c.sevenths : c.type);
      const degrees = form === 'shell' ? RECIPE_DEGREES.shell[c.role] : RECIPE_DEGREES[form][c.role];
      const item = `voicing:${['ii', 'V', 'I'][idx]}:${form}`;
      return {
        item, report: `voicing ${form} ${sym} in ${noteId(k, false)} ${mode}`,
        prompt: `Play a ${VOICING_NAMES[form].toLowerCase()} of ${sym}`,
        sub: `The ${['ii', 'V', 'I'][idx]} chord in ${noteName(k, { naming })} ${mode}. Degrees from the bottom: ${degrees}. Any octave; then Check.`,
        render(stage, api) {
          const sel = new Set();
          let done = false;
          const kb = createKeyboard({ low: 36, high: 83, naming, label: `Keyboard: play ${sym}`, onSelect: ({ midi: m }) => {
            if (done) return;
            if (sel.has(m)) sel.delete(m); else { sel.add(m); play(m, { dur: 0.6, velocity: 0.5 }); }
            kb.mark([...sel].map((x) => ({ midi: x, cls: 'is-selected' })));
          } });
          stage.appendChild(kb.el);
          requestAnimationFrame(() => kb.scrollTo(60));
          api.addControl('Check', () => {
            if (done || !sel.size) return;
            done = true;
            const ms = [...sel].sort((a, b) => a - b);
            const have = [...new Set(ms.map((m) => m % 12))].sort();
            const want = target.pcs.slice().sort();
            const pcsOk = have.length === want.length && have.every((p, i) => p === want[i]);
            const lowOk = ms[0] % 12 === target.lowestPc;
            const ok = pcsOk && lowOk;
            const shown = stackAround(target.notes, ms[0]);
            kb.mark([...ms.map((m) => ({ midi: m, cls: target.pcs.includes(m % 12) ? 'is-correct' : 'is-wrong', label: target.pcs.includes(m % 12) ? '✓' : '✗' })),
              ...(ok ? [] : shown.filter((n) => !sel.has(midi(n))).map((n) => ({ midi: midi(n), cls: 'is-target' })))]);
            chord(ms, { dur: 1.8, velocity: 0.6 });
            stage.appendChild(h('div', { class: 'score-box' }, staffOf(target.notes, `${sym} ${VOICING_NAMES[form]}`)));
            api.submit({ correct: ok, item, message: ok ? `${sym}: ${target.notes.map((n) => noteName(n, { naming })).join(' ')} (${degrees}).` : `${!pcsOk ? 'The notes are not quite right' : 'Right notes, but the lowest note should be ' + noteName(target.notes[0], { naming })}. The voicing is ${target.notes.map((n) => noteName(n, { naming })).join(' ')} (${degrees}); missing keys are shown in blue.`, actions: [{ label: 'Hear the voicing', onClick: () => playNotes(target.notes) }] });
          }, { key: 'Enter', primary: true });
          api.addControl('Clear', () => { if (done) return; sel.clear(); kb.mark([]); });
        },
      };
    }

    // Spell
    const pool = types.length ? types : ['dom7'];
    const type = weightedItem(pool, accuracy);
    const root = pickRoot(s, 4);
    const tones = chordTones(root, type);
    const sym = jazzSymbol(root, type);
    return {
      item: type, report: `spell ${sym}`,
      prompt: `Spell ${sym}`,
      sub: `${CHORD_TYPES[type].name}: ${tones.length} notes from the root up (${chordDegreeLabels(type).join(', ')}).`,
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
          tones.forEach((t, i) => row.appendChild(h('span', { class: 'entry-chip ' + (res[i] ? 'is-correct' : 'is-wrong') }, `${res[i] ? '✓' : '✗'} ${noteName(entered[i], { naming })}`)));
          const v = playVoicing(withOctave(root, 3), type);
          stage.appendChild(h('div', { class: 'score-box' }, staffOf(v, sym)));
          playNotes(v);
          api.submit({ correct: res.every(Boolean), item: type, answer: entered.map((x) => noteId(x, false)).join(' '), message: `${sym} is ${tones.map((t) => noteName(t, { naming })).join(' – ')} (${chordDegreeLabels(type).join(' – ')}).` });
        } });
        api.onKey((e) => { if (e.key === 'Backspace' && entered.length) { entered.pop(); draw(); return true; } return false; });
        api.addControl('Remove last', () => { entered.pop(); draw(); }, { key: '⌫' });
      },
    };
  },

  renderReference(el, { prefs }) {
    const naming = prefs.naming;
    const open = tuningMidis(prefs.tuning);
    // Chord explorer
    const rootSel = h('select', { id: 'jz-root' }, ALL.map((r) => h('option', { value: r }, noteName(parseNote(r)))));
    const typeSel = h('select', { id: 'jz-type' }, Object.values(FAMILIES).map((f) => h('optgroup', { label: f.name }, f.types.map((t) => h('option', { value: t }, jazzSymbol(parseNote('C4'), t).slice(1) || 'maj')))));
    rootSel.value = 'G'; typeSel.value = 'dom13';
    const out = h('div');
    let current = [];
    const drawChord = () => {
      const root = parseNote(rootSel.value + '3');
      const type = typeSel.value;
      const tones = chordTones(root, type);
      current = playVoicing(root, type);
      out.textContent = '';
      const kb = createKeyboard({ low: 36, high: 83, interactive: false, label: 'Keyboard showing the chord' });
      kb.mark(current.map((n, i) => ({ midi: midi(n), cls: i === 0 ? 'is-root' : 'is-target', label: noteName(n, { naming }).slice(0, 3) })));
      const pcs = tones.map(pc);
      const shell = findVoicings(open, [pcs[0], pcs[CHORD_TYPES[type].ivls.findIndex((x) => /^(M3|m3|P4)$/.test(x))], pcs[CHORD_TYPES[type].ivls.findIndex((x) => /^(m7|M7|M6|d7)$/.test(x))]].filter((x) => x !== undefined), pcs[0], { limit: 2, exactCount: 3 });
      const full = findVoicings(open, essentialPcs(root, type), pcs[0], { limit: 2, exactCount: Math.min(4, essentialPcs(root, type).length) });
      const shapeEl = (sh, title) => {
        const fb = createFretboard({ tuning: prefs.tuning, frets: 12, leftHanded: prefs.leftHanded, interactive: false, label: title });
        fb.mark(sh.map((x) => ({ string: x.string, fret: x.fret, cls: x.midi % 12 === pcs[0] ? 'is-root' : '', label: chordDegreeLabels(type)[pcs.indexOf(x.midi % 12)] })));
        return h('div', {}, h('h4', {}, title), h('button', { type: 'button', class: 'btn btn-sm btn-outline', onclick: () => chord(sh.map((x) => x.midi), { dur: 2, instrument: 'guitar', strum: 0.03 }) }, 'Strum'), fb.el);
      };
      out.append(h('div', { class: 'ref-grid ref-grid--2' }, h('div', { class: 'score-box' }, staffOf(current, jazzSymbol(root, type))),
        h('div', { class: 'ref-info' }, h('p', { class: 'big-name' }, jazzSymbol(root, type)), h('p', {}, CHORD_TYPES[type].name, h('br'), `Notes: ${tones.map((t) => noteName(t, { naming })).join(' – ')}`, h('br'), `Degrees: ${chordDegreeLabels(type).join(' – ')}`))),
        h('h3', {}, 'Keyboard'), kb.el,
        h('h3', {}, 'Guitar'), h('div', { class: 'ref-grid' }, ...shell.map((sh, i) => shapeEl(sh, `Shell shape ${i + 1} (root, 3rd, 7th)`)), ...full.map((sh, i) => shapeEl(sh, `Four-note shape ${i + 1}`))),
        !shell.length && !full.length ? h('p', { class: 'muted' }, 'No compact guitar shape fits within four frets for this chord in this tuning.') : null);
    };
    [rootSel, typeSel].forEach((x) => x.addEventListener('change', drawChord));

    // ii–V–I player
    const keySel = h('select', { id: 'jz-key' }, KEYS12.map((k) => h('option', { value: k }, noteName(parseNote(k)))));
    const modeSel = h('select', { id: 'jz-mode' }, h('option', { value: 'major' }, 'Major'), h('option', { value: 'minor' }, 'Minor'));
    const formSel = h('select', { id: 'jz-form' }, Object.entries(VOICING_NAMES).map(([v, l]) => h('option', { value: v }, l)));
    formSel.value = 'A';
    const tempoIn = h('input', { type: 'range', id: 'jz-tempo', min: '60', max: '200', value: '120' });
    const tfOut = h('div');
    const nowPlaying = h('p', { class: 'ref-info', 'aria-live': 'polite' });
    let timers = [];
    const drawTF = () => {
      const k = parseNote(keySel.value + '4');
      const voiced = voiceTwoFiveOne(k, modeSel.value, formSel.value);
      tfOut.textContent = '';
      const items = [];
      voiced.forEach((c) => {
        const tr = c.notes.filter((n) => midi(n) >= 60), bs = c.notes.filter((n) => midi(n) < 60);
        if (tr.length) items.push({ kind: 'note', notes: tr, dur: 24, staff: 0, label: jazzSymbol(c.root, formSel.value === 'shell' ? c.sevenths : c.type) });
        const low = c.form === 'shell' ? bs : [c.bass, ...bs];
        if (low.length) items.push({ kind: 'note', notes: low, dur: 24, staff: 1, together: tr.length > 0, label: tr.length ? null : jazzSymbol(c.root, formSel.value === 'shell' ? c.sevenths : c.type) });
      });
      const { svg } = renderScore({ clef: 'grand', items, minWidth: 360, labels: true, accMode: 'each', label: `ii–V–I in ${keySel.value} ${modeSel.value}` });
      tfOut.appendChild(h('div', { class: 'score-box score-wrap' }, svg));
      tfOut.appendChild(h('p', { class: 'muted' }, voiced.map((c) => `${jazzSymbol(c.root, formSel.value === 'shell' ? c.sevenths : c.type)}: ${c.notes.map((n) => noteName(n, { naming })).join(' ')} (${c.form === 'shell' ? RECIPE_DEGREES.shell[c.role] : RECIPE_DEGREES[c.form][c.role]})`).join(' · ')));
      return voiced;
    };
    [keySel, modeSel, formSel].forEach((x) => x.addEventListener('change', drawTF));
    const playAll = () => {
      timers.forEach(clearTimeout); timers = [];
      const tempo = +tempoIn.value;
      let offset = 0;
      KEYS12.forEach((key) => {
        const voiced = voiceTwoFiveOne(parseNote(key + '4'), modeSel.value, formSel.value);
        const len = scheduleTwoFive(voiced, tempo, offset);
        const label = `${noteName(parseNote(key))} ${modeSel.value}`;
        timers.push(setTimeout(() => { nowPlaying.textContent = `Now playing: ${label}`; }, offset * 1000));
        offset += len;
      });
      timers.push(setTimeout(() => { nowPlaying.textContent = ''; }, offset * 1000));
    };
    el.append(
      h('h2', { class: 'panel-title' }, 'Chord explorer'),
      h('div', { class: 'ref-controls' }, h('label', { for: 'jz-root' }, 'Root', rootSel), h('label', { for: 'jz-type' }, 'Chord', typeSel)),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn-ink', onclick: () => playNotes(current) }, 'Play'), h('button', { type: 'button', class: 'btn btn-outline', onclick: () => { const t = now() + 0.05; current.forEach((n, i) => play(midi(n), { when: t + i * 0.22, dur: 1.4, velocity: 0.6 })); } }, 'Play broken')),
      out,
      h('h2', { class: 'panel-title' }, 'ii–V–I player'),
      h('div', { class: 'ref-controls' }, h('label', { for: 'jz-key' }, 'Key', keySel), h('label', { for: 'jz-mode' }, 'Mode', modeSel), h('label', { for: 'jz-form' }, 'Voicing', formSel), h('label', { for: 'jz-tempo' }, 'Tempo', tempoIn)),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn btn-ink', onclick: () => scheduleTwoFive(drawTF(), +tempoIn.value) }, 'Play this key'),
        h('button', { type: 'button', class: 'btn btn-outline', onclick: playAll }, 'Play all twelve keys')),
      nowPlaying, tfOut);
    drawChord();
    drawTF();
  },
};

function stackAround(notes, lowMidi) {
  const shift = Math.round((lowMidi - midi(notes[0])) / 12) * 12;
  return notes.map((n) => withOctave(n, n.o + shift / 12));
}
