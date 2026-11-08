// Atelier Edition: Advanced Aural Skills
import { h, weightedItem, choiceButtons } from '../app/toolkit.js';
import { createSeqEditor, compareSequences } from '../app/staff-editor.js';
import { renderScore, rhythmItems } from '../core/notation.js';
import { play, chord, click, now } from '../core/audio.js';
import { INTERVALS_COMPOUND, parseInterval, intervalLongName, transpose, spellMidi, noteName, noteId, midi, CHORD_TYPES, SEVENTH_TYPES, voiceChord, chordSymbol, parseNote, majorKeys, minorKeys, keySignature, keyName, scaleSignatureSize, withOctave, makeRng } from '../core/theory.js';
import { chordsFor, chordsInKeys, realize } from '../core/voicelead.js';
import { SECONDARY_PROGRESSIONS, SECONDARY_TARGETS, MODULATIONS, modulationChords } from '../core/harmony-sets.js';
import { generateTwoVoice } from '../core/melody.js';
import { METERS, generateRhythm, clickPattern } from '../core/rhythm.js';

const AT_METERS = ['5/8', '6/8', '7/8', '9/8', '12/8', '5/4'];
const INV = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];
const LABEL = (iv) => intervalLongName(iv).replace(/^./, (c) => c.toUpperCase());

function limitReplays(s) {
  let plays = 0;
  const max = s.replays === 99 ? Infinity : s.replays + 1;
  return {
    can: () => plays < max,
    use(q) {
      if (plays >= max) return false;
      plays++;
      if (q && q._replayBtn) {
        const left = max - plays;
        q._replayBtn.disabled = left <= 0;
        q._replayBtn.firstChild.textContent = Number.isFinite(left) ? `Replay (${left} left) ` : 'Replay ';
      }
      return true;
    },
  };
}
const majorKeysUpTo = (n) => majorKeys().filter((k) => scaleSignatureSize(k, 'major') <= n);
const minorKeysUpTo = (n) => minorKeys().filter((k) => scaleSignatureSize(k, 'naturalMinor') <= n);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function playVoicings(voicings, tempo) {
  const beat = 60 / tempo;
  const t0 = now() + 0.08;
  voicings.forEach((v, k) => chord(v.map(midi), { when: t0 + k * beat, dur: beat * 0.95, velocity: 0.6 }));
}
function satb(tonic, mode, chords, voicing, labels, label) {
  const items = chords.map((c, k) => ({ kind: 'satb', voices: voicing[k], label: labels[k] }));
  return renderScore({ clef: 'grand', keySig: keySignature(tonic, mode), items, labels: true, slot: 66, accMode: 'measure', label }).svg;
}

export default {
  id: 'atelier',
  detailedProgress: true,
  exercises: [
    { id: 'compound', name: 'Compound intervals', description: 'Name intervals from the minor 9th to two octaves.' },
    { id: 'sevenths', name: 'Seventh chords by ear', description: 'Name the quality and inversion of a seventh chord.' },
    { id: 'secondary', name: 'Secondary dominants', description: 'Name the applied dominant in a progression.' },
    { id: 'modulation', name: 'Modulations', description: 'Hear where a progression moves.' },
    { id: 'twovoice', name: 'Two-voice dictation', description: 'Write two voices moving note against note.' },
    { id: 'rhythm', name: 'Rhythmic dictation', description: 'Write a rhythm in a compound or irregular meter.' },
  ],
  defaults: { exercise: 'compound', sessionLength: 10, compound: INTERVALS_COMPOUND.slice(), cdir: 'mixed', register: 'low', seventhTypes: SEVENTH_TYPES.slice(), inversions: [0, 1, 2, 3], tvLength: 8, firstGiven: true, meters: AT_METERS.slice(), rlevel: 3, rbars: 1, tempo: 80, tone: 'pref', replays: 5 },
  walkthrough: [
    { title: 'Atelier Edition', text: 'Six demanding aural exercises. Use custom practice sets (Settings → Practice sets) to build exactly the mix you want.' },
    { title: 'Listening exercises', text: 'Compound intervals, seventh chords, secondary dominants and modulations are answered with buttons or number keys. Seventh chords need two answers: the quality (1–5) and the inversion (Z X C V).' },
    { title: 'Dictation', text: 'Two-voice dictation gives you a staff for each voice: click a staff (or press U or L) to choose it, then add notes by clicking or typing A–G. Rhythmic dictation uses note values 1–5, the dot key, and Space to add the chosen value.' },
    { title: 'Detailed progress', text: 'The Progress tab tracks each exercise over time, your weakest items, and the answers you most often confuse.' },
  ],
  shortcuts: [['1–5', 'Seventh-chord quality'], ['Z X C V', 'Inversion'], ['U / L', 'Upper or lower voice (two-voice dictation)'], ['A–G', 'Add a note'], ['1–5, .', 'Note value, dot (rhythmic dictation)'], ['Space', 'Add the chosen value (rhythmic dictation)'], ['Backspace', 'Delete the last note']],
  describeSettings(s) {
    return `${s.replays === 99 ? 'Unlimited' : s.replays} replay${s.replays === 1 ? '' : 's'} · ${s.compound.length} compound intervals · ${s.meters.join(', ')}`;
  },
  settingsSchema() {
    return [
      { type: 'select', key: 'sessionLength', label: 'Session length', options: [5, 10, 20, 30].map((v) => ({ value: v, label: `${v} questions` })) },
      { type: 'segmented', key: 'replays', label: 'Replays', options: [1, 2, 3, 5, 99].map((v) => ({ value: v, label: v === 99 ? 'Unlimited' : String(v) })) },
      { type: 'range', key: 'tempo', label: 'Tempo', min: 50, max: 140, step: 2 },
      { type: 'select', key: 'tone', label: 'Tone', options: [{ value: 'pref', label: 'Default tone' }, { value: 'keys', label: 'Keyboard' }, { value: 'guitar', label: 'Guitar' }] },
      { type: 'heading', label: 'Compound intervals' },
      { type: 'checks', key: 'compound', label: 'Intervals', min: 2, options: INTERVALS_COMPOUND.map((iv) => ({ value: iv, label: LABEL(iv) })), quick: [{ label: 'All', values: INTERVALS_COMPOUND }, { label: '9ths and 10ths', values: ['m9', 'M9', 'm10', 'M10'] }, { label: '11ths, 12ths, 13ths', values: ['P11', 'A11', 'P12', 'm13', 'M13'] }] },
      { type: 'segmented', key: 'cdir', label: 'Direction', options: [{ value: 'ascending', label: 'Up' }, { value: 'descending', label: 'Down' }, { value: 'harmonic', label: 'Together' }, { value: 'mixed', label: 'Mixed' }] },
      { type: 'segmented', key: 'register', label: 'Register', options: [{ value: 'low', label: 'Low' }, { value: 'mid', label: 'Middle' }] },
      { type: 'heading', label: 'Seventh chords' },
      { type: 'checks', key: 'seventhTypes', label: 'Qualities', min: 2, options: SEVENTH_TYPES.map((t) => ({ value: t, label: CHORD_TYPES[t].short })) },
      { type: 'checks', key: 'inversions', label: 'Inversions', min: 1, options: [0, 1, 2, 3].map((i) => ({ value: i, label: INV[i] })) },
      { type: 'heading', label: 'Two-voice dictation' },
      { type: 'segmented', key: 'tvLength', label: 'Length', options: [6, 8, 10].map((v) => ({ value: v, label: `${v} notes` })) },
      { type: 'toggle', key: 'firstGiven', label: 'Give the first note of each voice' },
      { type: 'heading', label: 'Rhythmic dictation' },
      { type: 'checks', key: 'meters', label: 'Meters', min: 1, options: AT_METERS.map((m) => ({ value: m, label: m })) },
      { type: 'segmented', key: 'rlevel', label: 'Rhythm level', options: [2, 3, 4, 5].map((v) => ({ value: v, label: String(v) })) },
      { type: 'segmented', key: 'rbars', label: 'Bars', options: [{ value: 1, label: '1 bar' }, { value: 2, label: '2 bars' }] },
    ];
  },
  itemLabel(item, exercise) {
    if (exercise === 'compound' || INTERVALS_COMPOUND.includes(item)) return LABEL(item);
    if (exercise === 'sevenths' || item.includes(':') && CHORD_TYPES[item.split(':')[0]]) { const [t, i] = item.split(':'); return CHORD_TYPES[t] ? `${CHORD_TYPES[t].short}, ${INV[+i].toLowerCase()}` : item; }
    if (exercise === 'secondary') { const t = SECONDARY_TARGETS.find((x) => x.id === item); return t ? t.label : item; }
    if (exercise === 'modulation') { const m = MODULATIONS.find((x) => x.id === item); return m ? m.name : item; }
    if (exercise === 'rhythm') return `Rhythm in ${item}`;
    if (exercise === 'twovoice') return `Two voices (${item})`;
    return item;
  },

  createQuestion({ settings: s, prefs, exercise, accuracy }) {
    const naming = prefs.naming;
    const inst = s.tone === 'pref' ? prefs.instrument : s.tone;
    const rep = limitReplays(s);

    if (exercise === 'compound') {
      const set = s.compound.length >= 2 ? s.compound : INTERVALS_COMPOUND;
      const iv = weightedItem(set, accuracy);
      const semis = parseInterval(iv).semis;
      const [lo, hi] = s.register === 'low' ? [40, 52] : [48, 57];
      const root = lo + Math.floor(Math.random() * (hi - lo + 1));
      const dir = s.cdir === 'mixed' ? pick(['ascending', 'descending', 'harmonic']) : s.cdir;
      const rootNote = spellMidi(root, Math.random() < 0.5 ? 'sharps' : 'flats');
      const top = transpose(rootNote, iv);
      const sched = (semisX = semis, offset = 0) => {
        const t = now() + 0.06 + offset;
        if (dir === 'harmonic') { play(root, { when: t, dur: 2, instrument: inst }); play(root + semisX, { when: t, dur: 2, instrument: inst }); return 2.2; }
        const [a, b] = dir === 'descending' ? [root + semisX, root] : [root, root + semisX];
        play(a, { when: t, dur: 1, instrument: inst }); play(b, { when: t + 0.9, dur: 1.4, instrument: inst });
        return 2.4;
      };
      const q = {
        item: iv, report: `${iv} ${dir} from ${root}`,
        prompt: 'Name the compound interval',
        sub: dir === 'harmonic' ? 'Played together' : dir === 'descending' ? 'Played downward' : 'Played upward',
        canReplay: rep.can,
        play() { if (rep.use(this)) sched(); },
        render(stage, api) {
          const c = api.choices(stage, INTERVALS_COMPOUND.filter((x) => set.includes(x)).map((x) => ({ id: x, label: x, sub: LABEL(x) })), (ans) => {
            c.mark(iv, ans);
            const items = dir === 'harmonic' ? [{ kind: 'note', notes: [rootNote], dur: 48, staff: 1 }, { kind: 'note', notes: [top], dur: 48, staff: midi(top) >= 60 ? 0 : 1, together: true }]
              : (dir === 'descending' ? [top, rootNote] : [rootNote, top]).map((n) => ({ kind: 'note', notes: [n], dur: 48 }));
            const { svg } = renderScore({ clef: 'grand', items, minWidth: 220, accMode: 'measure', label: `${LABEL(iv)} from ${noteName(rootNote, { octave: true })}` });
            svg.style.maxWidth = '320px';
            stage.appendChild(h('div', { class: 'score-box' }, svg));
            const actions = [{ label: 'Hear it again', onClick: () => sched() }];
            if (ans !== iv) actions.push({ label: `Compare: ${ans} then ${iv}`, onClick: () => { const l = sched(parseInterval(ans).semis); sched(semis, l + 0.4); } });
            api.submit({ correct: ans === iv, item: iv, answer: ans, message: `${LABEL(iv)} (${semis} semitones): ${noteName(rootNote, { naming, octave: true })} to ${noteName(top, { naming, octave: true })}.`, actions });
          }, { label: 'Compound interval' });
        },
      };
      return q;
    }

    if (exercise === 'sevenths') {
      const types = s.seventhTypes.length >= 2 ? s.seventhTypes : SEVENTH_TYPES;
      const invs = s.inversions.length ? s.inversions : [0];
      const combos = types.flatMap((t) => invs.map((i) => `${t}:${i}`));
      const pickC = weightedItem(combos, accuracy);
      const [type, invS] = pickC.split(':');
      const inv = +invS;
      const root = parseNote(pick(['C', 'D', 'Eb', 'E', 'F', 'G', 'A', 'Bb']) + '3');
      const notes = voiceChord(root, type, inv, 3);
      const playIt = () => { const t = now() + 0.05; notes.forEach((n, i) => play(midi(n), { when: t + i * 0.28, dur: 1.1, instrument: inst, velocity: 0.72 })); chord(notes.map(midi), { when: t + notes.length * 0.28 + 0.3, dur: 2, instrument: inst }); };
      return {
        item: pickC, report: `seventh ${noteId(root)} ${type} inv${inv}`,
        prompt: 'Name the quality and the inversion',
        sub: 'Broken, then together. Choose a quality (1–5) and an inversion (Z X C V).',
        canReplay: rep.can,
        play() { if (rep.use(this)) playIt(); },
        render(stage, api) {
          let qa = null, ia = null;
          const box1 = h('div'), box2 = h('div');
          stage.append(h('p', { class: 'field-label' }, 'Quality'), box1, h('p', { class: 'field-label' }, 'Inversion'), box2);
          const done = () => {
            if (qa === null || ia === null) return;
            const ans = `${qa}:${ia}`;
            const ok = ans === pickC;
            qPad.mark(type, qa);
            iPad.mark(String(inv), String(ia));
            const sym = chordSymbol(root, type, inv ? voiceChord(root, type, inv, 3)[0] : null);
            const { svg } = renderScore({ clef: 'bass', items: [{ kind: 'note', notes, dur: 48 }], minWidth: 200, accMode: 'measure', label: sym });
            svg.style.maxWidth = '300px';
            stage.appendChild(h('div', { class: 'ref-grid ref-grid--2' }, h('div', { class: 'score-box' }, svg), h('p', { class: 'ref-info' }, h('strong', { class: 'big-name' }, sym), h('br'), `${CHORD_TYPES[type].short}, ${INV[inv].toLowerCase()}.`)));
            const actions = [{ label: 'Hear it again', onClick: playIt }];
            if (!ok) actions.push({ label: 'Hear your answer', onClick: () => chord(voiceChord(root, qa, Math.min(+ia, 3), 3).map(midi), { dur: 2, instrument: inst }) });
            api.submit({ correct: ok, item: pickC, answer: ans, message: ok ? `${CHORD_TYPES[type].short}, ${INV[inv].toLowerCase()}.` : `It was ${CHORD_TYPES[type].short.toLowerCase()}, ${INV[inv].toLowerCase()}. You chose ${CHORD_TYPES[qa].short.toLowerCase()}, ${INV[+ia].toLowerCase()}.`, actions });
          };
          const qPad = choiceButtons(box1, types.map((t) => ({ id: t, label: CHORD_TYPES[t].short })), (id) => { if (api.answered()) return; qa = id; qPad.select(id); done(); }, { keys: ['1', '2', '3', '4', '5'], label: 'Quality' });
          const iPad = choiceButtons(box2, [0, 1, 2, 3].filter((i) => invs.includes(i)).map((i) => ({ id: String(i), label: INV[i] })), (id) => { if (api.answered()) return; ia = +id; iPad.select(id); done(); }, { keys: ['z', 'x', 'c', 'v'].filter((_, i) => invs.includes(i)), label: 'Inversion' });
          api.onKey((e) => qPad.handleKey(e) || iPad.handleKey(e));
        },
      };
    }

    if (exercise === 'secondary' || exercise === 'modulation') {
      let tonic, chords, labels, item, options, answerId, mode = 'major';
      if (exercise === 'secondary') {
        const targets = SECONDARY_TARGETS.map((t) => t.id);
        const target = weightedItem(targets, accuracy);
        const prog = pick(SECONDARY_PROGRESSIONS.filter((p) => p.target === target));
        tonic = withOctave(pick(majorKeysUpTo(4)), 4);
        chords = chordsFor(tonic, 'major', prog.rn);
        labels = chords.map((c) => c.label);
        item = target; answerId = target;
        options = SECONDARY_TARGETS.map((t) => ({ id: t.id, label: t.label }));
      } else {
        const id = weightedItem(MODULATIONS.map((m) => m.id), accuracy);
        tonic = withOctave(pick(majorKeysUpTo(3)), 4);
        const list = modulationChords(tonic, id);
        chords = chordsInKeys(list);
        labels = list.map((c, i) => (i >= 4 && id !== 'none' ? `${noteName(c.tonic)}${c.mode === 'minor' ? 'm' : ''}: ${chords[i].label}` : chords[i].label));
        item = id; answerId = id;
        options = MODULATIONS.map((m) => ({ id: m.id, label: m.short, sub: m.name }));
      }
      const voicing = realize(chords, { rng: makeRng(Math.floor(Math.random() * 1e9)) });
      const playIt = () => playVoicings(voicing, s.tempo);
      return {
        item, report: `${exercise} ${item} in ${noteId(tonic, false)}: ${labels.join(' ')}`,
        prompt: exercise === 'secondary' ? 'Which secondary dominant do you hear?' : 'Where does the progression go?',
        sub: `Home key: ${keyName(tonic, mode)}. ${chords.length} chords.`,
        canReplay: rep.can,
        play() { if (rep.use(this)) playIt(); },
        render(stage, api) {
          const c = api.choices(stage, options, (ans) => {
            c.mark(answerId, ans);
            stage.appendChild(h('div', { class: 'score-box score-box--wide score-wrap' }, satb(tonic, mode, chords, voicing, labels, 'Analysis of the progression')));
            const right = options.find((o) => o.id === answerId);
            api.submit({ correct: ans === answerId, item, answer: ans, message: `${exercise === 'secondary' ? `The applied dominant is ${right.label}` : right.sub}. Analysis: ${labels.join(' – ')}.`, actions: [{ label: 'Hear it again', onClick: playIt }] });
          }, { label: exercise === 'secondary' ? 'Secondary dominant' : 'Modulation' });
          c.el.style.setProperty('--min', '150px');
        },
      };
    }

    if (exercise === 'twovoice') {
      const mode = Math.random() < 0.6 ? 'major' : 'minor';
      const tonic = withOctave(pick(mode === 'minor' ? minorKeysUpTo(3) : majorKeysUpTo(3)), 4);
      const tv = generateTwoVoice({ tonic, mode, length: s.tvLength });
      const beat = 60 / s.tempo;
      const playIt = () => {
        const t = now() + 0.08;
        tv.lower.forEach((n, i) => {
          play(midi(n), { when: t + i * beat * 1.2, dur: beat * 1.15, instrument: inst, velocity: 0.7 });
          play(midi(tv.upper[i]), { when: t + i * beat * 1.2, dur: beat * 1.15, instrument: inst, velocity: 0.72 });
        });
      };
      const sig = keySignature(tonic, mode);
      const meter = METERS['4/4'];
      const slots = tv.lower.map(() => 24);
      const item = mode;
      return {
        item, report: `two-voice ${keyName(tonic, mode)}: ${tv.upper.map((n) => noteId(n)).join(' ')} / ${tv.lower.map((n) => noteId(n)).join(' ')}`,
        prompt: `Write both voices in ${keyName(tonic, mode)}`,
        sub: `${tv.lower.length} notes in each voice, note against note.${s.firstGiven ? ' The first notes are given.' : ''} Choose a voice with U or L.`,
        canReplay: rep.can,
        play() { if (rep.use(this)) playIt(); },
        render(stage, api) {
          const mk = (voice) => createSeqEditor({ mode: 'pitch', clef: voice === 'upper' ? 'treble' : 'bass', keySig: sig, meter, slots, total: slots.length * 24, given: s.firstGiven ? [{ note: tv[voice][0], dur: 24 }] : [], low: voice === 'upper' ? 60 : 43, high: voice === 'upper' ? 81 : 64, naming, label: voice === 'upper' ? 'Upper voice' : 'Lower voice', keyboard: voice === 'upper' });
          const up = mk('upper'), lo = mk('lower');
          let active = 'upper';
          const wrapU = h('div', { class: 'voice-ed is-current-voice' }, h('p', { class: 'field-label' }, 'Upper voice (treble clef)'), up.el);
          const wrapL = h('div', { class: 'voice-ed' }, h('p', { class: 'field-label' }, 'Lower voice (bass clef)'), lo.el);
          const setActive = (v) => {
            active = v;
            wrapU.classList.toggle('is-current-voice', v === 'upper');
            wrapL.classList.toggle('is-current-voice', v === 'lower');
            wrapU.querySelector('.field-label').textContent = `Upper voice (treble clef)${v === 'upper' ? ' — writing' : ''}`;
            wrapL.querySelector('.field-label').textContent = `Lower voice (bass clef)${v === 'lower' ? ' — writing' : ''}`;
          };
          wrapU.addEventListener('pointerdown', () => setActive('upper'), true);
          wrapL.addEventListener('pointerdown', () => setActive('lower'), true);
          setActive('upper');
          stage.append(wrapU, wrapL);
          api.onKey((e) => {
            if (e.key === 'u' || e.key === 'U') { setActive('upper'); return true; }
            if (e.key === 'l' || e.key === 'L') { setActive('lower'); return true; }
            return (active === 'upper' ? up : lo).handleKey(e);
          });
          api.addControl('Check', () => {
            const tU = tv.upper.map((n) => ({ note: n, dur: 24 }));
            const tL = tv.lower.map((n) => ({ note: n, dur: 24 }));
            const rU = compareSequences(up.getNotes(), tU, { checkRhythm: false });
            const rL = compareSequences(lo.getNotes(), tL, { checkRhythm: false });
            up.showResults(rU.results); lo.showResults(rL.results);
            api.record(`upper:${mode}`, rU.correct);
            api.record(`lower:${mode}`, rL.correct);
            const items = tv.upper.map((n, i) => [{ kind: 'note', notes: [n], dur: 24, staff: 0, label: null }, { kind: 'note', notes: [tv.lower[i]], dur: 24, staff: 1, together: true }]).flat();
            const withBars = [];
            items.forEach((it, i) => { if (i > 0 && i % 4 === 0) withBars.push({ kind: 'bar' }); withBars.push(it); });
            withBars.push({ kind: 'bar', final: true });
            const { svg } = renderScore({ clef: 'grand', keySig: sig, time: '4/4', items: withBars, minWidth: 560, accMode: 'measure', label: 'The two voices' });
            stage.appendChild(h('div', { class: 'score-box score-box--wide score-wrap' }, h('p', { class: 'score-caption' }, 'Both voices'), svg));
            const wrong = [...rU.results, ...rL.results].filter((r) => !r.ok).length;
            api.submit({ correct: rU.correct && rL.correct, item, message: rU.correct && rL.correct ? 'Both voices are right.' : `${wrong} note${wrong === 1 ? '' : 's'} to check. Upper voice: ${rU.correct ? 'correct' : 'see ✗ marks'}. Lower voice: ${rL.correct ? 'correct' : 'see ✗ marks'}.`, actions: [{ label: 'Hear both voices', onClick: playIt }, { label: 'Hear the upper voice', onClick: () => { const t = now() + 0.08; tv.upper.forEach((n, i) => play(midi(n), { when: t + i * beat * 1.2, dur: beat * 1.1, instrument: inst })); } }, { label: 'Hear the lower voice', onClick: () => { const t = now() + 0.08; tv.lower.forEach((n, i) => play(midi(n), { when: t + i * beat * 1.2, dur: beat * 1.1, instrument: inst })); } }] });
          }, { key: 'Enter', primary: true });
        },
      };
    }

    // Rhythmic dictation
    const meters = s.meters.length ? s.meters : AT_METERS;
    const meterId = weightedItem(meters, accuracy);
    const meter = METERS[meterId];
    const events = generateRhythm(meterId, s.rbars, s.rlevel, Math.random, { rests: false, tuplets: false });
    const tick = (60 / s.tempo) / (meter.den === 8 ? 6 : 12);
    const target = events.map((e) => ({ note: null, dur: e.dur }));
    const playIt = () => {
      let t = now() + 0.1;
      const pat = clickPattern(meterId, false);
      for (const c of pat) click(c.level, t + c.tick * tick);
      t += meter.bar * tick;
      for (let b = 0; b < s.rbars; b++) for (const c of pat) click(c.level === 2 ? 1 : 0, t + (b * meter.bar + c.tick) * tick);
      events.forEach((e) => play(72, { when: t + e.start * tick, dur: Math.max(0.1, e.dur * tick * 0.85), instrument: 'keys', velocity: 0.82 }));
    };
    return {
      item: meterId, report: `rhythm ${meterId}: ${events.map((e) => e.dur).join(' ')}`,
      prompt: `Write the rhythm in ${meterId}`,
      sub: `${s.rbars} bar${s.rbars === 1 ? '' : 's'} after a one-bar count-in.${meter.den === 8 ? ` Tempo: ${s.tempo} eighth notes per minute.` : ''}`,
      canReplay: rep.can,
      play() { if (rep.use(this)) playIt(); },
      render(stage, api) {
        const ed = createSeqEditor({ mode: 'rhythm', meter, total: s.rbars * meter.bar, label: 'Your rhythm' });
        stage.appendChild(ed.el);
        stage.appendChild(h('p', { class: 'muted' }, 'Choose a note value (1–5, . for dotted), then click the staff or press Space to add it.'));
        api.onKey((e) => ed.handleKey(e));
        api.addControl('Check', () => {
          const answer = ed.getNotes();
          const r = compareSequences(answer, target, { checkPitch: false });
          ed.showResults(r.results);
          const items = rhythmItems(events, meter, { pitch: parseNote('B4') });
          const { svg } = renderScore({ clef: 'percussion', time: meterId, items, minWidth: 420, label: 'The correct rhythm' });
          stage.appendChild(h('div', { class: 'score-box score-box--wide score-wrap' }, h('p', { class: 'score-caption' }, 'The rhythm'), svg));
          api.submit({ correct: r.correct, item: meterId, message: r.correct ? 'Every note value is right.' : 'Compare your rhythm with the correct one below.', actions: [{ label: 'Hear it again', onClick: playIt }] });
        }, { key: 'Enter', primary: true });
      },
    };
  },

  renderReference(el, { prefs }) {
    const naming = prefs.naming;
    // Compound intervals
    const ivSel = h('select', { id: 'at-iv' }, INTERVALS_COMPOUND.map((iv) => h('option', { value: iv }, LABEL(iv))));
    const playIv = (harm) => { const r = 48; const sm = parseInterval(ivSel.value).semis; const t = now() + 0.05; play(r, { when: t, dur: harm ? 2 : 1 }); play(r + sm, { when: harm ? t : t + 0.9, dur: 1.6 }); };
    // Seventh chords
    const tSel = h('select', { id: 'at-type' }, SEVENTH_TYPES.map((t) => h('option', { value: t }, CHORD_TYPES[t].short)));
    const iSel = h('select', { id: 'at-inv' }, [0, 1, 2, 3].map((i) => h('option', { value: i }, INV[i])));
    const sevOut = h('div', { class: 'score-box' });
    const drawSev = () => {
      const notes = voiceChord(parseNote('C3'), tSel.value, +iSel.value, 3);
      sevOut.textContent = '';
      const { svg } = renderScore({ clef: 'bass', items: [{ kind: 'note', notes, dur: 48 }], minWidth: 200, accMode: 'measure', label: 'Seventh chord' });
      svg.style.maxWidth = '280px';
      sevOut.append(svg, h('p', { class: 'score-caption' }, notes.map((n) => noteName(n, { naming })).join(' ')));
      sevOut._notes = notes;
    };
    [tSel, iSel].forEach((x) => x.addEventListener('change', drawSev));
    // Progressions
    const progSel = h('select', { id: 'at-prog' },
      h('optgroup', { label: 'Secondary dominants' }, SECONDARY_PROGRESSIONS.map((p) => h('option', { value: 'sec:' + p.id }, `${SECONDARY_TARGETS.find((t) => t.id === p.target).label}: ${p.rn.join(' – ')}`))),
      h('optgroup', { label: 'Modulations from C major' }, MODULATIONS.map((m) => h('option', { value: 'mod:' + m.id }, m.name))));
    const progOut = h('div', { class: 'score-box score-box--wide score-wrap' });
    let progVoicing = null;
    const drawProg = () => {
      const [kind, id] = progSel.value.split(':');
      const tonic = parseNote('C4');
      let chords, labels;
      if (kind === 'sec') {
        const p = SECONDARY_PROGRESSIONS.find((x) => x.id === id);
        chords = chordsFor(tonic, 'major', p.rn);
        labels = chords.map((c) => c.label);
      } else {
        const list = modulationChords(tonic, id);
        chords = chordsInKeys(list);
        labels = list.map((c, i) => (i >= 4 && id !== 'none' ? `${noteName(c.tonic)}${c.mode === 'minor' ? 'm' : ''}: ${chords[i].label}` : chords[i].label));
      }
      progVoicing = realize(chords, { rng: makeRng(5) });
      progOut.textContent = '';
      progOut.appendChild(satb(tonic, 'major', chords, progVoicing, labels, 'Progression with analysis'));
    };
    progSel.addEventListener('change', drawProg);
    el.append(
      h('h2', { class: 'panel-title' }, 'Compound intervals'),
      h('div', { class: 'ref-controls' }, h('label', { for: 'at-iv' }, 'Interval', ivSel)),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn-ink', onclick: () => playIv(false) }, 'Play upward from C3'), h('button', { type: 'button', class: 'btn btn-outline', onclick: () => playIv(true) }, 'Play together')),
      h('h2', { class: 'panel-title' }, 'Seventh chords in every inversion'),
      h('div', { class: 'ref-controls' }, h('label', { for: 'at-type' }, 'Quality', tSel), h('label', { for: 'at-inv' }, 'Inversion', iSel)),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn-ink', onclick: () => chord(sevOut._notes.map(midi), { dur: 2 }) }, 'Play')),
      sevOut,
      h('h2', { class: 'panel-title' }, 'Applied dominants and modulations'),
      h('div', { class: 'ref-controls' }, h('label', { for: 'at-prog' }, 'Progression', progSel)),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn-ink', onclick: () => progVoicing && playVoicings(progVoicing, 72) }, 'Play')),
      progOut);
    drawSev();
    drawProg();
  },
};
