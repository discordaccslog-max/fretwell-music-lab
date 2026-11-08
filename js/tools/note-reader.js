// Note Reader: Staff & Fretboard Trainer
import { h } from '../app/toolkit.js';
import { renderScore } from '../core/notation.js';
import { createFretboard, createKeyboard } from '../core/instruments.js';
import { play } from '../core/audio.js';
import { fromStep, step, midi, pc, noteName, noteId, parseNote, spellMidi, spellingsOfMidi, tuningMidis, TUNINGS } from '../core/theory.js';

const NOTE_OPTIONS = (lo, hi) => {
  const out = [];
  for (let st = lo; st <= hi; st++) {
    const n = fromStep(st, 0);
    const nat = { l: n.l, a: 0, o: n.o };
    out.push({ value: noteId(nat), label: noteName(nat, { octave: true }) });
  }
  return out;
};
const TREBLE_OPTS = NOTE_OPTIONS(step(parseNote('F3')), step(parseNote('E6')));
const BASS_OPTS = NOTE_OPTIONS(step(parseNote('A1')), step(parseNote('G4')));
const UNUSUAL = new Set(['E#', 'B#', 'Cb', 'Fb']);

function randomStaffNote(clef, s, rng = Math.random) {
  const lo = step(parseNote(clef === 'treble' ? s.trebleLow : s.bassLow));
  const hi = step(parseNote(clef === 'treble' ? s.trebleHigh : s.bassHigh));
  const st = lo + Math.floor(rng() * (hi - lo + 1));
  const base = fromStep(st, 0);
  let a = 0;
  if (s.accidentals && rng() < 0.4) a = rng() < 0.5 ? 1 : -1;
  const n = { l: base.l, a, o: base.o };
  if (UNUSUAL.has(noteId(n, false))) n.a = 0;
  return n;
}

const pickClef = (s, rng = Math.random) => (s.clef === 'both' ? (rng() < 0.5 ? 'treble' : 'bass') : s.clef);
const tone = (s, prefs) => (s.tone === 'pref' ? prefs.instrument : s.tone);

function staffBox(clef, n, cls = '') {
  const { svg } = renderScore({ clef, items: [{ kind: 'note', notes: [n], dur: 48, noteCls: [cls] }], minWidth: 200, accMode: 'each', label: `${clef === 'treble' ? 'Treble' : 'Bass'} staff with one note` });
  svg.style.maxWidth = '320px';
  return h('div', { class: 'score-box' }, svg);
}

export default {
  id: 'note-reader',
  exercises: [
    { id: 'staff', name: 'Staff notes', description: 'Name the note on the treble, bass or grand staff.' },
    { id: 'fretboard', name: 'Fretboard notes', description: 'Name the highlighted fretboard position.' },
    { id: 'find-string', name: 'Find it on the string', description: 'Tap the fret for a note on the named string.' },
    { id: 'keyboard', name: 'Keyboard notes', description: 'Name the highlighted piano key.' },
    { id: 'staff-keyboard', name: 'Staff to keyboard', description: 'Press the key for the note on the staff.' },
  ],
  defaults: {
    exercise: 'staff', sessionLength: 20, clef: 'treble', accidentals: false,
    trebleLow: 'C4', trebleHigh: 'G5', bassLow: 'E2', bassHigh: 'C4',
    fretLow: 0, fretHigh: 12, strings: [0, 1, 2, 3, 4, 5], tone: 'pref', playAfter: true,
  },
  walkthrough: [
    { title: 'Note Reader', text: 'Each question shows one note — on the staff, the fretboard or the keyboard. Name it, or find it, and you get feedback straight away.' },
    { title: 'Answering', text: 'Click a letter, or type A–G on your keyboard. To add a sharp or flat, choose ♯ or ♭ first (or press = or −), then the letter.' },
    { title: 'Settings', text: 'In Settings you can choose the clef, the note range, whether sharps and flats appear, the frets and strings, and your guitar tuning.' },
    { title: 'Reference', text: 'The Reference tab lets you tap any key or fret and see the note on the staff and everywhere it appears on the neck.' },
  ],
  shortcuts: [['A–G', 'Name a note'], ['− / =', 'Flat / sharp for the next letter'], ['0', 'Natural'], ['Arrows', 'Move on the fretboard or keyboard'], ['Space', 'Choose the focused fret or key']],
  describeSettings(s) {
    const clef = { treble: 'Treble clef', bass: 'Bass clef', both: 'Both clefs' }[s.clef];
    return `${clef} · ${s.accidentals ? 'with sharps and flats' : 'natural notes'} · frets ${s.fretLow}–${s.fretHigh}`;
  },
  settingsSchema(s, prefs) {
    const tuning = tuningMidis(prefs.tuning);
    return [
      { type: 'select', key: 'sessionLength', label: 'Session length', options: [10, 20, 30, 50].map((v) => ({ value: v, label: `${v} questions` })) },
      { type: 'heading', label: 'Staff' },
      { type: 'segmented', key: 'clef', label: 'Clef', options: [{ value: 'treble', label: 'Treble' }, { value: 'bass', label: 'Bass' }, { value: 'both', label: 'Both' }] },
      { type: 'select', key: 'trebleLow', label: 'Treble clef: lowest note', options: TREBLE_OPTS },
      { type: 'select', key: 'trebleHigh', label: 'Treble clef: highest note', options: TREBLE_OPTS },
      { type: 'select', key: 'bassLow', label: 'Bass clef: lowest note', options: BASS_OPTS },
      { type: 'select', key: 'bassHigh', label: 'Bass clef: highest note', options: BASS_OPTS },
      { type: 'toggle', key: 'accidentals', label: 'Include sharps and flats' },
      { type: 'heading', label: 'Fretboard' },
      { type: 'select', key: 'fretLow', label: 'Lowest fret', options: Array.from({ length: 13 }, (_, i) => ({ value: i, label: i === 0 ? 'Open strings' : `Fret ${i}` })) },
      { type: 'select', key: 'fretHigh', label: 'Highest fret', options: Array.from({ length: 15 }, (_, i) => ({ value: i + 1, label: `Fret ${i + 1}` })) },
      { type: 'checks', key: 'strings', label: 'Strings', min: 1, options: [5, 4, 3, 2, 1, 0].map((sIdx) => ({ value: sIdx, label: `${6 - sIdx} (${noteName(spellMidi(tuning[sIdx], prefs.accidentals), { naming: prefs.naming })})` })) },
      { type: 'select', pref: 'tuning', label: 'Tuning (all tools)', options: Object.entries(TUNINGS).map(([id, t]) => ({ value: id, label: t.name })), rerender: true },
      { type: 'toggle', pref: 'leftHanded', label: 'Left-handed fretboard (all tools)' },
      { type: 'heading', label: 'Names and sound' },
      { type: 'select', pref: 'naming', label: 'Note names (all tools)', options: [{ value: 'letters', label: 'Letters' }, { value: 'solfege-ti', label: 'Solfège (Do–Ti)' }, { value: 'solfege-si', label: 'Solfège (Do–Si)' }] },
      { type: 'select', pref: 'accidentals', label: 'Black keys and frets shown as (all tools)', options: [{ value: 'sharps', label: 'Sharps' }, { value: 'flats', label: 'Flats' }] },
      { type: 'select', key: 'tone', label: 'Tone', options: [{ value: 'pref', label: 'Default tone' }, { value: 'keys', label: 'Keyboard' }, { value: 'guitar', label: 'Guitar' }] },
      { type: 'toggle', key: 'playAfter', label: 'Play the note after each answer' },
    ];
  },
  itemLabel(item) {
    const [kind, rest] = item.split(':');
    if (kind === 'treble' || kind === 'bass') return `${noteName(parseNote(rest), { octave: true })} on the ${kind} staff`;
    if (kind === 'fret') { const [s, f] = rest.split('.'); return `string ${6 - +s}, ${+f === 0 ? 'open' : 'fret ' + f}`; }
    if (kind === 'find') { const [nm, s] = rest.split('.'); return `${noteName(parseNote(nm))} on string ${6 - +s}`; }
    if (kind === 'key') return `the key ${noteName(spellMidi(+rest, 'sharps'), { octave: true })}`;
    return item;
  },

  createQuestion({ settings: s, prefs, exercise }) {
    const naming = prefs.naming;
    const inst = tone(s, prefs);
    const hear = (m) => play(m, { instrument: inst, dur: 1.2 });
    const fretRange = () => {
      const lo = Math.min(s.fretLow, s.fretHigh), hi = Math.max(s.fretLow, s.fretHigh);
      return [lo, Math.max(hi, lo + 1)];
    };

    if (exercise === 'staff' || exercise === 'staff-keyboard') {
      const clef = pickClef(s);
      const n = randomStaffNote(clef, s);
      const m = midi(n);
      const item = `${clef}:${noteId(n)}`;
      if (exercise === 'staff') {
        return {
          item, report: `${clef} ${noteId(n)}`,
          prompt: 'Name this note',
          render(stage, api) {
            stage.appendChild(staffBox(clef, n));
            const pad = api.notePad(stage, { accidentals: s.accidentals, onPick: (ans) => {
              const ok = ans.l === n.l && ans.a === n.a;
              const enh = !ok && pc(ans) === pc(n);
              pad.disable();
              if (s.playAfter) hear(m);
              api.submit({
                correct: ok, item, answer: `${clef}:${noteId({ ...ans, o: n.o })}`,
                message: ok ? `It is ${noteName(n, { naming, octave: true })}.` : enh ? `Same pitch, but this note is written as ${noteName(n, { naming })}, not ${noteName(ans, { naming })}.` : `It is ${noteName(n, { naming, octave: true })}. You chose ${noteName(ans, { naming })}.`,
                actions: [{ label: 'Hear it', onClick: () => hear(m) }],
              });
            } });
          },
        };
      }
      // Staff to keyboard
      const lo = Math.min(m, 48) - (Math.min(m, 48) % 12), hi = Math.max(m + 2, 72);
      return {
        item, report: `${clef} ${noteId(n)} to keyboard`,
        prompt: 'Press the key for this note',
        sub: 'Find the exact key, at the right octave.',
        render(stage, api) {
          stage.appendChild(staffBox(clef, n));
          let done = false;
          const kb = createKeyboard({ low: Math.max(36, lo), high: Math.min(96, hi + (11 - (hi % 12))), naming, label: 'Piano keyboard: press the key for the note on the staff', onSelect: ({ midi: km }) => {
            if (done) return;
            done = true;
            const ok = km === m;
            kb.mark([{ midi: m, cls: 'is-correct', label: '✓' }, ...(ok ? [] : [{ midi: km, cls: 'is-wrong', label: '✗' }])]);
            if (s.playAfter) hear(m);
            const pressed = spellMidi(km, prefs.accidentals);
            api.submit({ correct: ok, item, answer: `${clef}:${noteId(pressed)}`, message: ok ? `That is ${noteName(n, { naming, octave: true })}.` : `The note is ${noteName(n, { naming, octave: true })}; you pressed ${noteName(pressed, { naming, octave: true })}${Math.abs(km - m) % 12 === 0 ? ' — right note, wrong octave' : ''}.`, actions: [{ label: 'Hear it', onClick: () => hear(m) }] });
          } });
          stage.appendChild(kb.el);
          requestAnimationFrame(() => kb.scrollTo(m));
        },
      };
    }

    if (exercise === 'keyboard') {
      const m = 48 + Math.floor(Math.random() * 25);
      const black = [1, 3, 6, 8, 10].includes(m % 12);
      if (black && !s.accidentals && Math.random() < 0.75) return this.createQuestion({ settings: s, prefs, exercise });
      const item = `key:${m}`;
      const names = spellingsOfMidi(m);
      return {
        item, report: `key ${m}`,
        prompt: 'Name the highlighted key',
        render(stage, api) {
          const kb = createKeyboard({ low: 48, high: 72, interactive: false, naming, label: 'Piano keyboard with one key highlighted' });
          kb.mark([{ midi: m, cls: 'is-target' }]);
          stage.appendChild(kb.el);
          requestAnimationFrame(() => kb.scrollTo(m));
          const pad = api.notePad(stage, { accidentals: true, onPick: (ans) => {
            const ok = pc(ans) === m % 12;
            pad.disable();
            kb.mark([{ midi: m, cls: ok ? 'is-correct' : 'is-wrong', label: ok ? '✓' : '✗' }]);
            if (s.playAfter) hear(m);
            api.submit({ correct: ok, item, answer: `key:${(midi({ ...ans, o: 4 }) % 12) + 48}`, message: `That key is ${names.map((x) => noteName(x, { naming })).join(' or ')}.${ok ? '' : ` You chose ${noteName(ans, { naming })}.`}`, actions: [{ label: 'Hear it', onClick: () => hear(m) }] });
          } });
        },
      };
    }

    // Fretboard exercises
    const strings = s.strings && s.strings.length ? s.strings : [0, 1, 2, 3, 4, 5];
    const [flo, fhi] = fretRange();
    const sIdx = strings[Math.floor(Math.random() * strings.length)];
    const open = tuningMidis(prefs.tuning);
    const fbOpts = { tuning: prefs.tuning, frets: Math.max(12, fhi), leftHanded: prefs.leftHanded, naming };
    if (exercise === 'fretboard') {
      const fret = flo + Math.floor(Math.random() * (fhi - flo + 1));
      const m = open[sIdx] + fret;
      const black = [1, 3, 6, 8, 10].includes(m % 12);
      if (black && !s.accidentals && Math.random() < 0.7) return this.createQuestion({ settings: s, prefs, exercise });
      const item = `fret:${sIdx}.${fret}`;
      return {
        item, report: `string ${6 - sIdx} fret ${fret}`,
        prompt: 'Name the highlighted position',
        sub: `String ${6 - sIdx}, ${fret === 0 ? 'open' : 'fret ' + fret}`,
        render(stage, api) {
          const fb = createFretboard({ ...fbOpts, interactive: false, label: `Fretboard with string ${6 - sIdx}, ${fret === 0 ? 'open string' : 'fret ' + fret} highlighted` });
          fb.mark([{ string: sIdx, fret, cls: 'is-target', label: '?' }]);
          stage.appendChild(fb.el);
          requestAnimationFrame(() => fb.scrollToFret(fret));
          const pad = api.notePad(stage, { accidentals: true, onPick: (ans) => {
            const ok = pc(ans) === m % 12;
            pad.disable();
            const right = spellMidi(m, prefs.accidentals);
            fb.mark([{ string: sIdx, fret, cls: ok ? 'is-correct' : 'is-wrong', label: noteName(right, { naming }).slice(0, 3) }]);
            if (s.playAfter) play(m, { instrument: 'guitar', dur: 1.6 });
            api.submit({ correct: ok, item, answer: `fret:${noteId(ans, false)}`, message: `That is ${spellingsOfMidi(m).map((x) => noteName(x, { naming })).join(' / ')}.${ok ? '' : ` You chose ${noteName(ans, { naming })}.`}`, actions: [{ label: 'Hear it', onClick: () => play(m, { instrument: 'guitar', dur: 1.6 }) }] });
          } });
        },
      };
    }
    // Find it on the string
    const fret0 = flo + Math.floor(Math.random() * (fhi - flo + 1));
    const target = open[sIdx] + fret0;
    if ([1, 3, 6, 8, 10].includes(target % 12) && !s.accidentals && Math.random() < 0.7) return this.createQuestion({ settings: s, prefs, exercise });
    const tn = spellMidi(target, prefs.accidentals);
    const item = `find:${noteId(tn, false)}.${sIdx}`;
    return {
      item, report: `find ${noteId(tn, false)} on string ${6 - sIdx}`,
      prompt: `Find ${noteName(tn, { naming })} on string ${6 - sIdx}`,
      sub: `Frets ${flo}–${fhi}. Tap the fret, or use the arrow keys and Enter.`,
      render(stage, api) {
        let done = false;
        const fb = createFretboard({ ...fbOpts, label: `Fretboard: find ${noteName(tn, { naming })} on string ${6 - sIdx}`, onSelect: ({ string, fret, midi: mm }) => {
          if (done) return;
          if (fret < flo || fret > fhi) { api.setPrompt(`Find ${noteName(tn, { naming })} on string ${6 - sIdx}`, `Stay within frets ${flo}–${fhi}.`); return; }
          done = true;
          const ok = string === sIdx && mm % 12 === target % 12;
          const answers = [];
          for (let f = flo; f <= fhi; f++) if ((open[sIdx] + f) % 12 === target % 12) answers.push(f);
          fb.mark([
            ...answers.map((f) => ({ string: sIdx, fret: f, cls: 'is-correct', label: '✓' })),
            ...(ok ? [] : [{ string, fret, cls: 'is-wrong', label: '✗' }]),
          ]);
          play(open[sIdx] + answers[0], { instrument: 'guitar', dur: 1.6 });
          api.submit({ correct: ok, item, answer: `find:${noteId(spellMidi(mm, prefs.accidentals), false)}.${string}`, message: ok ? `${noteName(tn, { naming })} is at ${answers.map((f) => (f === 0 ? 'the open string' : 'fret ' + f)).join(' and ')} on string ${6 - sIdx}.` : `${noteName(tn, { naming })} is at ${answers.map((f) => (f === 0 ? 'the open string' : 'fret ' + f)).join(' and ')} on string ${6 - sIdx}. You chose ${noteName(spellMidi(mm, prefs.accidentals), { naming })}${string !== sIdx ? ` on string ${6 - string}` : ''}.` });
        } });
        stage.appendChild(fb.el);
        requestAnimationFrame(() => fb.scrollToFret(Math.round((flo + fhi) / 2)));
      },
    };
  },

  renderReference(el, { prefs }) {
    const naming = prefs.naming;
    const info = h('p', { class: 'ref-info', 'aria-live': 'polite' }, 'Tap a key or a fret, or use the arrow keys and Enter.');
    const staffHost = h('div', { class: 'score-box' });
    let fb = null;
    const show = (m, inst = 'keys') => {
      const n = spellMidi(m, prefs.accidentals);
      const alt = spellingsOfMidi(m).filter((x) => x.l !== n.l);
      staffHost.textContent = '';
      const { svg } = renderScore({ clef: 'grand', items: [{ kind: 'note', notes: [n], dur: 48 }], minWidth: 220, accMode: 'each', label: `Grand staff showing ${noteName(n, { octave: true })}` });
      svg.style.maxWidth = '300px';
      staffHost.appendChild(svg);
      info.innerHTML = '';
      info.append(h('strong', { class: 'big-name' }, noteName(n, { naming, octave: true })), h('br'),
        alt.length ? `Also written ${alt.map((x) => noteName(x, { naming, octave: true })).join(', ')}. ` : '',
        `${naming !== 'letters' ? 'Letter name ' + noteName(n, { octave: true }) + '. ' : ''}`, `MIDI note ${m}.`);
      const pos = fb.positionsOf(m, { byPc: false });
      fb.mark(pos.map((p) => ({ string: p.string, fret: p.fret, cls: 'is-target', label: noteName(n, { naming }).slice(0, 3) })));
      kb.mark([{ midi: m, cls: 'is-target' }]);
      play(m, { instrument: inst, dur: 1.4 });
    };
    const kb = createKeyboard({ low: 36, high: 84, naming, label: 'Piano keyboard reference', onSelect: ({ midi: m }) => show(m, 'keys') });
    fb = createFretboard({ tuning: prefs.tuning, frets: 15, leftHanded: prefs.leftHanded, naming, label: 'Fretboard reference', onSelect: ({ midi: m }) => show(m, 'guitar') });
    el.append(h('h2', { class: 'panel-title' }, 'Note finder'), info, h('div', { class: 'ref-grid ref-grid--2' }, staffHost, h('div', {}, h('p', { class: 'muted' }, 'Every position of the note is marked on the fretboard below.'))), h('h3', {}, 'Keyboard'), kb.el, h('h3', {}, 'Fretboard'), fb.el,
      h('h3', {}, 'Natural notes on the staff'),
      (() => {
        const items = [];
        for (const nm of ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5']) items.push({ kind: 'note', notes: [parseNote(nm)], dur: 48, label: noteName(parseNote(nm), { naming }) });
        const { svg } = renderScore({ clef: 'treble', items, labels: true, label: 'Treble clef natural notes from C4 to G5' });
        const b = h('div', { class: 'score-box score-box--wide score-wrap' }, svg);
        const items2 = [];
        for (const nm of ['E2', 'F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4']) items2.push({ kind: 'note', notes: [parseNote(nm)], dur: 48, label: noteName(parseNote(nm), { naming }) });
        const { svg: svg2 } = renderScore({ clef: 'bass', items: items2, labels: true, label: 'Bass clef natural notes from E2 to C4' });
        return h('div', {}, b, h('div', { class: 'score-box score-box--wide score-wrap', style: 'margin-top:10px' }, svg2));
      })());
  },
};
