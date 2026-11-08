// Progression Lab: Harmony & Voice Leading
import { h, choiceButtons } from '../app/toolkit.js';
import { renderScore, svgEl } from '../core/notation.js';
import { chord as playChord, now } from '../core/audio.js';
import { PROGRESSIONS, majorKeys, minorKeys, keySignature, keyName, noteName, noteId, midi, step, keyAccidental, diatonicChord, diatonicLabel, romanHTML, romanParts, parseNote, scaleSignatureSize, chordSymbol, withOctave, makeRng } from '../core/theory.js';
import { chordsFor, realize, checkSATB, VOICES, RANGES } from '../core/voicelead.js';

const MAJ = { I: ['ii', 'iii', 'IV', 'V', 'vi', 'vii°'], ii: ['V', 'vii°'], iii: ['vi', 'IV'], IV: ['V', 'ii', 'I', 'vii°'], V: ['I', 'vi'], vi: ['ii', 'IV', 'V'], 'vii°': ['I'] };
const MIN = { i: ['ii°', 'III', 'iv', 'V', 'VI', 'VII'], 'ii°': ['V'], III: ['VI', 'iv'], iv: ['V', 'ii°', 'i'], V: ['i', 'VI'], VI: ['ii°', 'iv', 'V'], VII: ['III'] };
const NUMERALS = {
  major: [['I', 1, false], ['ii', 2, false], ['iii', 3, false], ['IV', 4, false], ['V', 5, false], ['vi', 6, false], ['vii°', 7, false]],
  minor: [['i', 1, false], ['ii°', 2, false], ['III', 3, false], ['iv', 4, false], ['V', 5, false], ['VI', 6, false], ['VII', 7, true], ['vii°', 7, false]],
};
const FIGS = [['Root', false, 0, 'z'], ['6', false, 1, 'x'], ['6/4', false, 2, 'c'], ['7', true, 0, 'v'], ['6/5', true, 1, 'b'], ['4/3', true, 2, 'n'], ['4/2', true, 3, 'm']];

function keysFor(mode, level) {
  return (mode === 'minor' ? minorKeys() : majorKeys()).filter((k) => scaleSignatureSize(k, mode === 'minor' ? 'naturalMinor' : 'major') <= level);
}
const pick = (a, rng = Math.random) => a[Math.floor(rng() * a.length)];

/** A functional progression: random walk through common-practice chord successions, closing V–I. */
function generate(mode, len, vocab, rng = Math.random) {
  const g = mode === 'minor' ? MIN : MAJ;
  const tonic = mode === 'minor' ? 'i' : 'I';
  for (let attempt = 0; attempt < 400; attempt++) {
    const seq = [tonic];
    while (seq.length < len - 2) seq.push(pick(g[seq[seq.length - 1]], rng));
    const prev = seq[seq.length - 1];
    if (!g[prev].includes('V')) continue;
    seq.push('V', tonic);
    if (seq.some((x, i) => i > 0 && x === seq[i - 1])) continue;
    const out = seq.slice();
    if (vocab === 'sevenths') {
      for (let i = 1; i < out.length - 1; i++) {
        if (out[i] === 'V' && rng() < 0.65) out[i] = 'V7';
        else if (out[i] === 'ii' && rng() < 0.5) out[i] = 'ii7';
        else if (out[i] === 'ii°' && rng() < 0.5) out[i] = 'iiø7';
        else if (out[i] === 'vii°' && rng() < 0.5) out[i] = mode === 'minor' ? 'vii°7' : 'viiø7';
      }
    }
    if (vocab !== 'triads') {
      for (let i = 1; i < out.length - 2; i++) {
        if (rng() > 0.45) continue;
        const base = out[i];
        const seventh = base.endsWith('7');
        if (seventh) {
          const f = pick(['65', '43'], rng);
          out[i] = base.slice(0, -1) + f;
        } else if (base === tonic && out[i + 1].startsWith('V') && rng() < 0.5) out[i] = tonic + '64';
        else if (base !== 'VII') out[i] = base + '6';
      }
    }
    return out;
  }
  return mode === 'minor' ? ['i', 'iv', 'V', 'i'] : ['I', 'IV', 'V', 'I'];
}

function makeExample(s, rng = Math.random, { lenOverride = null, vocabOverride = null, transform = null } = {}) {
  for (let tries = 0; tries < 30; tries++) {
    const mode = s.modes === 'both' ? (rng() < 0.5 ? 'major' : 'minor') : s.modes;
    const tonic = withOctave(pick(keysFor(mode, s.keyLevel), rng), 4);
    let rns = generate(mode, lenOverride || s.length, vocabOverride || s.vocab, rng);
    if (transform) rns = transform(rns, rng);
    const chords = chordsFor(tonic, mode, rns);
    const voicing = realize(chords, { rng: makeRng(Math.floor(rng() * 1e9)) });
    if (voicing) return { mode, tonic, rns, chords, voicing };
  }
  return null;
}

function satbScore(ex, voicings, { labels = true, cls = null, showLabels = null, label = 'Four-part progression' } = {}) {
  const items = ex.chords.map((c, k) => ({ kind: 'satb', voices: voicings[k], cls: cls ? cls[k] : [], label: showLabels ? showLabels[k] : (labels ? c.label : null) }));
  return renderScore({ clef: 'grand', keySig: keySignature(ex.tonic, ex.mode), items, labels: true, slot: 62, accMode: 'each', label });
}

function playVoicings(voicings, tempo, start = 0) {
  const beat = 60 / tempo;
  const t0 = now() + 0.08 + start;
  voicings.forEach((v, k) => {
    const ms = v.filter(Boolean).map(midi);
    if (ms.length) playChord(ms, { when: t0 + k * beat, dur: beat * 0.95, velocity: 0.62 });
  });
  return voicings.length * beat;
}

function answerLabel(tonic, mode, a) {
  if (!a || !a.num) return '';
  return diatonicLabel(tonic, mode, a.num[1], { seventh: a.fig ? a.fig[1] : false, inversion: a.fig ? a.fig[2] : 0, natural: a.num[2] });
}
const chordKey = (c) => ({ degree: c.degree, seventh: c.tones.length >= 4, inversion: c.inversion, natural: c.degree === 7 && c.typeId === 'maj' || c.degree === 5 && c.typeId === 'min' });

export default {
  id: 'progression-lab',
  exercises: [
    { id: 'analysis', name: 'Roman numeral analysis', description: 'Label each chord of a four-part progression.' },
    { id: 'ear', name: 'Progressions by ear', description: 'Hear a progression and name each chord after the tonic.' },
    { id: 'voice', name: 'Voice leading', description: 'Write soprano, alto and tenor over a given bass, checked against the rules.' },
  ],
  defaults: { exercise: 'analysis', sessionLength: 5, modes: 'major', keyLevel: 2, vocab: 'triads', length: 4, tempo: 72, showWarnings: true },
  walkthrough: [
    { title: 'Progression Lab', text: 'Analyse progressions written in four parts, identify progressions by ear, and write your own four-part harmony.' },
    { title: 'Analysis', text: 'Label each chord: choose the numeral (keys 1–8), then the inversion or seventh figure if your settings include them (Z X C V B N M). The next chord is selected automatically. Press Enter to check.' },
    { title: 'Voice leading', text: 'The bass and numerals are given. Pick a voice (S, A or T), then click the staff to place a note; arrows move notes, − and = add flats and sharps. Check runs every rule and shows what to fix.' },
    { title: 'Rules', text: 'The checker looks for parallel 5ths and octaves, crossing, spacing, range, doubled leading tones, unresolved sevenths and leading tones, augmented melodic leaps and missing chord tones. Show the model answer to compare.' },
  ],
  shortcuts: [['1–8', 'Choose a numeral'], ['Z X C V B N M', 'Root, 6, 6/4, 7, 6/5, 4/3, 4/2'], ['S / A / T', 'Select a voice (voice leading)'], ['← →', 'Move between chords'], ['↑ ↓', 'Move the selected note'], ['− = 0', 'Flat, sharp, natural'], ['Backspace', 'Remove the selected note'], ['P', 'Play your harmony']],
  describeSettings(s) {
    return `${{ major: 'Major keys', minor: 'Minor keys', both: 'Major and minor' }[s.modes]} · ${{ triads: 'root-position triads', inversions: 'triads with inversions', sevenths: 'with sevenths and inversions' }[s.vocab]} · ${s.length} chords`;
  },
  settingsSchema() {
    return [
      { type: 'select', key: 'sessionLength', label: 'Session length', options: [3, 5, 10, 15].map((v) => ({ value: v, label: `${v} progressions` })) },
      { type: 'segmented', key: 'modes', label: 'Keys', options: [{ value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }, { value: 'both', label: 'Both' }] },
      { type: 'segmented', key: 'keyLevel', label: 'Key signatures', options: [{ value: 2, label: 'Up to 2 ♯/♭' }, { value: 4, label: 'Up to 4' }, { value: 7, label: 'All' }] },
      { type: 'segmented', key: 'vocab', label: 'Chord vocabulary', options: [{ value: 'triads', label: 'Root-position triads' }, { value: 'inversions', label: '+ inversions' }, { value: 'sevenths', label: '+ sevenths' }] },
      { type: 'segmented', key: 'length', label: 'Progression length', options: [4, 6, 8].map((v) => ({ value: v, label: `${v} chords` })), help: 'Voice-leading exercises use up to 6 chords.' },
      { type: 'range', key: 'tempo', label: 'Playback tempo (chords per minute)', min: 40, max: 120, step: 4 },
      { type: 'toggle', key: 'showWarnings', label: 'Show style warnings as well as rule errors' },
    ];
  },
  itemLabel(item) {
    const [kind, rest] = item.split(':');
    if (kind === 'chord') return rest;
    if (kind === 'prog') return `${rest} progression`;
    if (kind === 'voice') return `Voice leading in ${rest}`;
    return item;
  },

  createQuestion({ settings: s, exercise }) {
    if (exercise === 'voice') return voiceQuestion(s);
    // Ear training uses root-position triads, plus V7 when sevenths are switched on.
    const ex = makeExample(s, Math.random, exercise === 'ear' ? { vocabOverride: 'triads', transform: s.vocab === 'sevenths' ? (rns, rng) => rns.map((x, i) => (x === 'V' && i > 0 && rng() < 0.6 ? 'V7' : x)) : null } : {});
    const mode = ex.mode;
    const numerals = NUMERALS[mode];
    const figs = exercise === 'ear' ? [] : s.vocab === 'triads' ? [] : s.vocab === 'inversions' ? FIGS.slice(0, 3) : FIGS;
    const earSevenths = exercise === 'ear' && s.vocab === 'sevenths';
    const item = `prog:${mode}`;
    const kname = keyName(ex.tonic, mode);
    const title = exercise === 'ear' ? `Name each chord in ${kname}` : `Analyse this progression in ${kname}`;
    return {
      item, report: `${exercise} ${kname}: ${ex.rns.join(' ')}`,
      prompt: title,
      sub: exercise === 'ear' ? 'The first chord is the tonic. Listen, then label the rest.' : 'Choose a numeral for each chord. Selected chord is outlined.',
      play: () => playVoicings(ex.voicing, s.tempo),
      autoPlay: exercise === 'ear',
      replayLabel: exercise === 'ear' ? 'Replay' : 'Play',
      render(stage, api) {
        const answers = ex.chords.map(() => ({ num: null, fig: null }));
        if (exercise === 'ear') answers[0] = { num: numerals[0], fig: null, given: true };
        let cur = exercise === 'ear' ? 1 : 0;
        const scoreBox = h('div', { class: 'score-box score-box--wide score-wrap' });
        if (exercise === 'analysis') {
          const { svg } = satbScore(ex, ex.voicing, { labels: false, label: `Progression in ${kname}` });
          scoreBox.appendChild(svg);
          stage.appendChild(scoreBox);
        }
        const slots = h('div', { class: 'analysis-row' });
        stage.appendChild(slots);
        const drawSlots = () => {
          slots.textContent = '';
          answers.forEach((a, k) => {
            const lbl = a.num ? (exercise === 'ear' ? a.num[0] : answerLabel(ex.tonic, mode, { num: a.num, fig: a.fig || (figs.length ? null : FIGS[0]) })) : '';
            const b = h('button', { type: 'button', class: 'analysis-slot' + (k === cur ? ' is-current' : ''), 'aria-label': `Chord ${k + 1}: ${lbl || 'not labelled yet'}`, disabled: a.given || null },
              h('h3', {}, `Chord ${k + 1}`), h('span', { class: 'slot-answer' }, lbl || '—'));
            b.addEventListener('click', () => { cur = k; drawSlots(); });
            slots.appendChild(b);
          });
        };
        const advance = () => {
          const next = answers.findIndex((a, k) => k > cur && !a.given && !(a.num && (a.fig || !figs.length)));
          if (next >= 0) cur = next;
          else { const any = answers.findIndex((a) => !a.given && !(a.num && (a.fig || !figs.length))); if (any >= 0) cur = any; }
          drawSlots();
        };
        drawSlots();
        const numBox = h('div', {});
        stage.appendChild(h('p', { class: 'field-label' }, 'Numeral'));
        stage.appendChild(numBox);
        const numOptions = numerals.map((n, i) => ({ id: String(i), label: n[0] }));
        if (earSevenths) numOptions.push({ id: 'V7', label: 'V7' });
        const numPad = choiceButtons(numBox, numOptions, (id) => {
          if (api.answered()) return;
          if (id === 'V7') answers[cur] = { num: numerals.find((n) => n[0] === 'V'), fig: FIGS[3] };
          else answers[cur] = { ...answers[cur], num: numerals[+id] };
          if (!figs.length || answers[cur].fig) advance(); else drawSlots();
        }, { keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], label: 'Numeral' });
        let figPad = null;
        if (figs.length) {
          const figBox = h('div', {});
          stage.append(h('p', { class: 'field-label' }, 'Inversion or seventh'), figBox);
          figPad = choiceButtons(figBox, figs.map((f, i) => ({ id: String(i), label: f[0] })), (id) => {
            if (api.answered()) return;
            answers[cur] = { ...answers[cur], fig: figs[+id] };
            if (answers[cur].num) advance(); else drawSlots();
          }, { keys: figs.map((f) => f[3]), label: 'Inversion or seventh' });
        }
        api.onKey((e) => {
          if (e.key === 'ArrowRight') { cur = Math.min(answers.length - 1, cur + 1); drawSlots(); return true; }
          if (e.key === 'ArrowLeft') { cur = Math.max(exercise === 'ear' ? 1 : 0, cur - 1); drawSlots(); return true; }
          return numPad.handleKey(e) || (figPad ? figPad.handleKey(e) : false);
        });
        api.addControl('Check', () => {
          const incomplete = answers.findIndex((a) => !a.given && !a.num);
          if (incomplete >= 0) { cur = incomplete; drawSlots(); api.setPrompt(title, `Label chord ${incomplete + 1} first.`); return; }
          const results = ex.chords.map((c, k) => {
            if (answers[k].given) return true;
            const want = chordKey(c);
            const a = answers[k];
            const fig = a.fig || FIGS[0];
            if (exercise === 'ear') {
              const okDeg = a.num[1] === want.degree && a.num[2] === want.natural;
              const okSev = earSevenths ? (fig[1] === want.seventh) : true;
              return okDeg && okSev;
            }
            return a.num[1] === want.degree && a.num[2] === want.natural && fig[1] === want.seventh && (figs.length ? fig[2] === want.inversion : true);
          });
          results.forEach((ok, k) => { if (!answers[k].given) api.record(`chord:${ex.chords[k].label} (${mode})`, ok); });
          slots.textContent = '';
          ex.chords.forEach((c, k) => {
            const a = answers[k];
            const given = exercise === 'ear' ? a.num[0] + (a.fig && a.fig[1] ? '7' : '') : answerLabel(ex.tonic, mode, { num: a.num, fig: a.fig || FIGS[0] });
            slots.appendChild(h('div', { class: 'analysis-slot ' + (results[k] ? 'is-correct' : 'is-wrong') },
              h('h3', {}, `${results[k] ? '✓' : '✗'} Chord ${k + 1}`),
              h('span', { class: 'slot-answer', html: romanHTML(c.parts) }),
              h('span', { class: 'muted' }, `${chordSymbol(c.root, c.typeId, c.inversion ? c.bass : null)}${!results[k] && !a.given ? ` · you: ${given}` : ''}`)));
          });
          if (exercise === 'ear') {
            scoreBox.textContent = '';
            scoreBox.appendChild(satbScore(ex, ex.voicing, { label: `Progression in ${kname}` }).svg);
            stage.insertBefore(scoreBox, slots);
          }
          numPad.disable(); if (figPad) figPad.disable();
          const ok = results.every(Boolean);
          api.submit({ correct: ok, item, message: ok ? `${ex.chords.map((c) => c.label).join(' – ')}` : `${results.filter((x) => !x).length} chord${results.filter((x) => !x).length === 1 ? '' : 's'} to review. The progression is ${ex.chords.map((c) => c.label).join(' – ')}.`, actions: [{ label: 'Play the progression', onClick: () => playVoicings(ex.voicing, s.tempo) }] });
        }, { key: 'Enter', primary: true });
      },
    };
  },

  renderReference(el) {
    let mode = 'major';
    let tonic = parseNote('C4');
    const modeSel = h('select', { id: 'pl-mode' }, h('option', { value: 'major' }, 'Major'), h('option', { value: 'minor' }, 'Minor'));
    const keySel = h('select', { id: 'pl-key' });
    const progSel = h('select', { id: 'pl-prog' });
    const tempoIn = h('input', { type: 'range', id: 'pl-tempo', min: '40', max: '120', value: '72' });
    const scoreHost = h('div', { class: 'score-box score-box--wide score-wrap' });
    const chart = h('div');
    let current = null;
    const fillKeys = () => {
      keySel.textContent = '';
      (mode === 'minor' ? minorKeys() : majorKeys()).forEach((k) => keySel.appendChild(h('option', { value: noteId(k, false) }, keyName(k, mode))));
      const match = [...keySel.options].find((o) => parseNote(o.value).l === tonic.l && parseNote(o.value).a === tonic.a);
      keySel.value = match ? match.value : keySel.options[0].value;
      tonic = withOctave(parseNote(keySel.value), 4);
      progSel.textContent = '';
      PROGRESSIONS.filter((p) => p.mode === mode).forEach((p) => progSel.appendChild(h('option', { value: p.id }, `${p.name}: ${p.rn.join(' – ')}`)));
    };
    const draw = () => {
      const p = PROGRESSIONS.find((x) => x.id === progSel.value);
      const chords = chordsFor(tonic, mode, p.rn);
      const voicing = realize(chords, { rng: makeRng(7) });
      current = { tonic, mode, chords, voicing };
      scoreHost.textContent = '';
      scoreHost.appendChild(satbScore(current, voicing, { label: `${p.name} in ${keyName(tonic, mode)}` }).svg);
      chart.textContent = '';
      const rows = [];
      const degs = mode === 'minor' ? [[1], [2], [3], [4], [5], [5, true], [6], [7], [7, true]] : [[1], [2], [3], [4], [5], [6], [7]];
      for (const [d, nat] of degs) {
        const tri = diatonicChord(tonic, mode, d, { natural: !!nat });
        const sev = diatonicChord(tonic, mode, d, { seventh: true, natural: !!nat });
        rows.push(h('tr', {},
          h('th', { scope: 'row', html: romanHTML(romanParts(d, tri.typeId)) }),
          h('td', {}, chordSymbol(tri.root, tri.typeId), h('br'), h('span', { class: 'muted' }, tri.tones.map((t) => noteName(t)).join(' '))),
          h('td', { html: romanHTML(romanParts(d, sev.typeId)) }),
          h('td', {}, chordSymbol(sev.root, sev.typeId), h('br'), h('span', { class: 'muted' }, sev.tones.map((t) => noteName(t)).join(' '))),
          h('td', {}, h('button', { type: 'button', class: 'btn btn-sm btn-outline', onclick: () => playChord(tri.tones.map((t) => midi(withOctave(t, 4))), { dur: 1.4 }) }, 'Triad'), ' ',
            h('button', { type: 'button', class: 'btn btn-sm btn-outline', onclick: () => playChord(sev.tones.map((t) => midi(withOctave(t, 4))), { dur: 1.4 }) }, '7th'))));
      }
      chart.append(h('h3', {}, `Chords in ${keyName(tonic, mode)}`), h('p', { class: 'muted' }, mode === 'minor' ? 'Minor keys use the raised leading tone for V and vii°; the natural VII and v are shown too.' : 'The seventh chords use the notes of the key.'),
        h('table', { class: 'ref-table' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Triad'), h('th', { scope: 'col' }, 'Chord'), h('th', { scope: 'col' }, 'Seventh'), h('th', { scope: 'col' }, 'Chord'), h('th', { scope: 'col' }, 'Listen'))), h('tbody', {}, rows)));
    };
    modeSel.addEventListener('change', () => { mode = modeSel.value; tonic = parseNote(mode === 'minor' ? 'A4' : 'C4'); fillKeys(); draw(); });
    keySel.addEventListener('change', () => { tonic = withOctave(parseNote(keySel.value), 4); draw(); });
    progSel.addEventListener('change', draw);
    el.append(h('h2', { class: 'panel-title' }, 'Progression library'),
      h('div', { class: 'ref-controls' }, h('label', { for: 'pl-mode' }, 'Mode', modeSel), h('label', { for: 'pl-key' }, 'Key', keySel), h('label', { for: 'pl-prog' }, 'Progression', progSel), h('label', { for: 'pl-tempo' }, 'Tempo', tempoIn)),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn-ink', onclick: () => current && playVoicings(current.voicing, +tempoIn.value) }, 'Play')),
      scoreHost, chart);
    fillKeys();
    draw();
  },
};

/* ------------------------------------------------------------ voice leading */
function voiceQuestion(s) {
  const len = Math.min(6, s.length);
  const ex = makeExample(s, Math.random, { lenOverride: len });
  const kname = keyName(ex.tonic, ex.mode);
  const sig = keySignature(ex.tonic, ex.mode);
  const bass = ex.voicing.map((v) => v[0]);
  const voicings = ex.chords.map((_, k) => [bass[k], null, null, null]);
  return {
    chords: ex.chords, bass,
    item: `voice:${ex.mode}`, report: `voice leading ${kname}: ${ex.rns.join(' ')}`,
    prompt: `Write the upper voices in ${kname}`,
    sub: `${ex.chords.map((c) => c.label).join(' – ')}. Bass given. Choose S, A or T, then click the staff.`,
    play: () => playVoicings(voicings, s.tempo),
    replayLabel: 'Play my harmony',
    autoPlay: false,
    render(stage, api) {
      let col = 0, voice = 3, locked = false, cls = null;
      const host = h('div', { class: 'staff-input score-wrap' });
      const info = h('p', { class: 'score-caption', 'aria-live': 'polite' });
      const voiceBtns = h('div', { class: 'voice-pick', role: 'radiogroup', 'aria-label': 'Voice to edit' });
      const vb = [3, 2, 1].map((v) => {
        const b = h('button', { type: 'button', class: 'choice', role: 'radio', 'aria-checked': String(v === voice) }, h('span', { class: 'choice-label' }, VOICES[v]), h('span', { class: 'kbd' }, VOICES[v][0]));
        b.addEventListener('click', () => { voice = v; draw(); });
        voiceBtns.appendChild(b);
        return [v, b];
      });
      const accBtns = h('div', { class: 'voice-pick' }, ...[[-1, '♭', '−'], [0, '♮', '0'], [1, '♯', '=']].map(([a, sym, k]) => h('button', { type: 'button', class: 'choice', 'aria-label': `Make the selected note ${['flat', 'natural', 'sharp'][a + 1]}`, onclick: () => setAcc(a) }, h('span', { class: 'choice-label' }, sym), h('span', { class: 'kbd' }, k))),
        h('button', { type: 'button', class: 'btn btn-sm btn-outline', onclick: () => clearNote() }, 'Remove note'));
      stage.append(h('div', { class: 'select-row' }, voiceBtns, accBtns), host, info);
      const defaults = { 3: 72, 2: 65, 1: 57 };
      function setNote(k, v, n) { if (locked) return; voicings[k][v] = n; draw(); }
      function setAcc(a) { const n = voicings[col][voice]; if (n) setNote(col, voice, { ...n, a }); }
      function clearNote() { if (locked) return; voicings[col][voice] = null; draw(); }
      function move(dir) {
        const n = voicings[col][voice];
        if (!n) {
          const c = ex.chords[col];
          let best = null;
          for (const t of c.tones) for (let o = 2; o <= 5; o++) { const x = withOctave(t, o); if (best === null || Math.abs(midi(x) - defaults[voice]) < Math.abs(midi(best) - defaults[voice])) best = x; }
          setNote(col, voice, best);
          return;
        }
        const st = step(n) + dir;
        const l = ((st % 7) + 7) % 7;
        const cand = { l, a: keyAccidental(sig, l), o: Math.floor(st / 7) };
        if (midi(cand) < RANGES[voice][0] - 4 || midi(cand) > RANGES[voice][1] + 4) return;
        setNote(col, voice, cand);
      }
      function advance() {
        if (voice > 1) voice -= 1; else { voice = 3; col = Math.min(ex.chords.length - 1, col + 1); }
      }
      function draw() {
        vb.forEach(([v, b]) => b.setAttribute('aria-checked', String(v === voice)));
        host.textContent = '';
        const c2 = cls || ex.chords.map((_, k) => [0, 1, 2, 3].map((v) => (v === 0 ? 'is-given' : k === col && v === voice && !locked ? 'is-active' : '')));
        const { svg, layout } = satbScore(ex, voicings, { cls: c2, label: `Your four-part writing in ${kname}` });
        host.appendChild(svg);
        if (!locked) {
          const x = layout.columns[col].x;
          svgEl('rect', { x: x - 20, y: layout.staffTop[0] - 30, width: 46, height: layout.staffTop[1] + 70 - layout.staffTop[0], fill: 'none', class: 'si-cursor' }, svg);
        }
        svg.setAttribute('tabindex', locked ? '-1' : '0');
        svg.addEventListener('click', (e) => {
          if (locked) return;
          const pt = svg.createSVGPoint();
          pt.x = e.clientX; pt.y = e.clientY;
          const p = pt.matrixTransform(svg.getScreenCTM().inverse());
          let k = 0, best = Infinity;
          layout.columns.forEach((cc, i) => { if (Math.abs(cc.x - p.x) < best) { best = Math.abs(cc.x - p.x); k = i; } });
          col = k;
          const mid = (layout.staffTop[0] + 40 + layout.staffTop[1]) / 2;
          const onTreble = p.y < mid;
          if (onTreble && voice === 1) voice = voicings[k][3] ? 2 : 3;
          if (!onTreble) voice = 1;
          const st = layout.stepAt(p.y, onTreble ? 0 : 1);
          const l = ((st % 7) + 7) % 7;
          voicings[k][voice] = { l, a: keyAccidental(sig, l), o: Math.floor(st / 7) };
          advance();
          draw();
        });
        const filled = voicings.reduce((n, v) => n + v.slice(1).filter(Boolean).length, 0);
        const cur = voicings[col][voice];
        info.textContent = locked ? '' : `Chord ${col + 1} (${ex.chords[col].label}), ${VOICES[voice].toLowerCase()}: ${cur ? noteName(cur, { octave: true }) : 'empty'} · ${filled} of ${ex.chords.length * 3} notes written.`;
      }
      draw();
      api.onKey((e) => {
        if (locked) return false;
        const k = e.key.toLowerCase();
        if (k === 's') { voice = 3; draw(); return true; }
        if (k === 'a') { voice = 2; draw(); return true; }
        if (k === 't') { voice = 1; draw(); return true; }
        if (k === 'p') { playVoicings(voicings, s.tempo); return true; }
        if (e.key === 'ArrowLeft') { col = Math.max(0, col - 1); draw(); return true; }
        if (e.key === 'ArrowRight') { col = Math.min(ex.chords.length - 1, col + 1); draw(); return true; }
        if (e.key === 'ArrowUp') { move(1); return true; }
        if (e.key === 'ArrowDown') { move(-1); return true; }
        if (e.key === '-' || e.key === '_') { setAcc(-1); return true; }
        if (e.key === '=' || e.key === '+') { setAcc(1); return true; }
        if (e.key === '0') { setAcc(0); return true; }
        if (e.key === 'Backspace' || e.key === 'Delete') { clearNote(); return true; }
        return false;
      });
      api.addControl('Check', () => {
        if (locked) return;
        const r = checkSATB(ex.chords, voicings);
        locked = true;
        cls = ex.chords.map((_, k) => [0, 1, 2, 3].map((v) => (v === 0 ? 'is-given' : 'is-correct')));
        for (const e of r.errors) for (const v of e.voices) if (cls[e.chord] && v > 0) cls[e.chord][v] = 'is-wrong';
        draw();
        const warnings = s.showWarnings ? r.warnings : [];
        const list = h('ul', { class: 'issue-list' }, r.errors.map((e) => h('li', { class: 'is-err' }, e.message)), warnings.map((w) => h('li', { class: 'is-warn' }, 'Style: ' + w.message)));
        stage.appendChild(r.errors.length || warnings.length ? list : h('p', { class: 'ok-t' }, '✓ No rule errors or style warnings.'));
        const model = () => {
          const m = realize(ex.chords, { bassLine: bass, rng: makeRng(11) });
          if (!m) return;
          if (!stage.querySelector('.model-box')) {
            stage.appendChild(h('div', { class: 'score-box score-box--wide score-wrap model-box' }, h('p', { class: 'score-caption' }, 'Model answer (one of many correct solutions)'), satbScore(ex, m, { label: 'Model answer' }).svg));
          }
          playVoicings(m, s.tempo);
        };
        api.submit({
          correct: r.errors.length === 0,
          item: `voice:${ex.mode}`,
          message: r.errors.length ? `${r.errors.length} rule error${r.errors.length === 1 ? '' : 's'} to fix — marked ✗ on the staff and listed below.` : `Your four-part writing follows the rules${warnings.length ? `, with ${warnings.length} style note${warnings.length === 1 ? '' : 's'}` : ''}.`,
          actions: [{ label: 'Play my harmony', onClick: () => playVoicings(voicings, s.tempo) }, { label: 'Show and play the model answer', onClick: model }],
        });
      }, { key: 'Enter', primary: true });
    },
  };
}

