// Interval Ear Trainer
import { h, weightedItem } from '../app/toolkit.js';
import { readRaw, writeRaw } from '../app/store.js';
import { renderScore } from '../core/notation.js';
import { createKeyboard } from '../core/instruments.js';
import { play, now } from '../core/audio.js';
import { parseInterval, intervalLongName, transpose, midi, spellMidi, noteName, INTERVALS_SIMPLE } from '../core/theory.js';

// From most to least distinct by ear; adaptive mode introduces intervals in this order.
const EASY_ORDER = ['P8', 'P5', 'M3', 'P4', 'm3', 'M6', 'm7', 'M2', 'm6', 'M7', 'm2', 'A4'];
const LABEL = (iv) => (iv === 'A4' ? 'Tritone' : intervalLongName(iv).replace(/^./, (c) => c.toUpperCase()));
const SHORT = (iv) => (iv === 'A4' ? 'TT' : iv);
const REGISTERS = { low: [43, 55], mid: [55, 67], high: [64, 76] };

function adaptiveKey(ex) { return 'adaptive.interval-trainer.' + ex; }

function activeSet(s, ex) {
  const chosen = EASY_ORDER.filter((iv) => s.intervals.includes(iv));
  if (!s.adaptive || chosen.length <= 3) return chosen;
  const level = Math.max(3, Math.min(chosen.length, readRaw(adaptiveKey(ex), 3)));
  return chosen.slice(0, level);
}

function scheduleInterval(root, semis, dir, inst, offset = 0, gap = 0.85) {
  const t = now() + 0.06 + offset;
  if (dir === 'harmonic') {
    play(root, { when: t, dur: 1.9, instrument: inst, velocity: 0.72 });
    play(root + semis, { when: t, dur: 1.9, instrument: inst, velocity: 0.72 });
    return 2;
  }
  const first = dir === 'descending' ? root + semis : root;
  const second = dir === 'descending' ? root : root + semis;
  play(first, { when: t, dur: gap + 0.1, instrument: inst, velocity: 0.8 });
  play(second, { when: t + gap, dur: 1.4, instrument: inst, velocity: 0.8 });
  return gap + 1.4;
}

function intervalStaff(rootNote, ivName, dir, cls = '') {
  const top = transpose(rootNote, ivName);
  const items = dir === 'harmonic'
    ? [{ kind: 'note', notes: [rootNote, top], dur: 48, noteCls: [cls, cls] }]
    : (dir === 'descending' ? [top, rootNote] : [rootNote, top]).map((n) => ({ kind: 'note', notes: [n], dur: 48, noteCls: [cls] }));
  const clef = midi(rootNote) < 55 ? 'bass' : 'treble';
  const { svg } = renderScore({ clef, items, minWidth: 220, accMode: 'measure', label: `${LABEL(ivName)} from ${noteName(rootNote, { octave: true })}` });
  svg.style.maxWidth = '340px';
  return { svg, top };
}

export default {
  id: 'interval-trainer',
  exercises: [
    { id: 'ascending', name: 'Ascending intervals', description: 'The lower note plays first, then the upper note.' },
    { id: 'descending', name: 'Descending intervals', description: 'The upper note plays first, then the lower note.' },
    { id: 'harmonic', name: 'Harmonic intervals', description: 'Both notes play together.' },
    { id: 'mixed', name: 'Mixed', description: 'Ascending, descending or harmonic at random.' },
  ],
  defaults: { exercise: 'ascending', sessionLength: 20, intervals: INTERVALS_SIMPLE.slice(), adaptive: true, root: 'random', register: 'mid', tone: 'pref', compare: true },
  walkthrough: [
    { title: 'Interval Ear Trainer', text: 'Two notes play. Name the interval between them. Press R to hear it again as often as you like.' },
    { title: 'Answering', text: 'Click an interval, or press its number key. After each answer you see it on the staff and keyboard; if you were wrong you can hear your answer and the right one back to back.' },
    { title: 'Adaptive difficulty', text: 'With adaptive difficulty on, you start with a few very different intervals. When you get nine of the last ten right, another interval is added. If accuracy drops, it eases back.' },
    { title: 'Compare', text: 'The Reference tab plays any two intervals from the same note so you can compare them side by side.' },
  ],
  describeSettings(s) {
    return `${s.intervals.length} interval${s.intervals.length === 1 ? '' : 's'}${s.adaptive ? ' · adaptive' : ''} · ${s.register} register`;
  },
  settingsSchema() {
    return [
      { type: 'select', key: 'sessionLength', label: 'Session length', options: [10, 20, 30, 50].map((v) => ({ value: v, label: `${v} questions` })) },
      { type: 'checks', key: 'intervals', label: 'Intervals in play', min: 2, options: INTERVALS_SIMPLE.map((iv) => ({ value: iv, label: LABEL(iv) })),
        quick: [{ label: 'All', values: INTERVALS_SIMPLE }, { label: '3rds and 6ths', values: ['m3', 'M3', 'm6', 'M6'] }, { label: '4ths, 5ths, octave', values: ['P4', 'P5', 'P8'] }, { label: '2nds and 7ths', values: ['m2', 'M2', 'm7', 'M7'] }] },
      { type: 'toggle', key: 'adaptive', label: 'Adaptive difficulty', help: 'Starts with three intervals from your set and adds more as your accuracy rises.' },
      { type: 'segmented', key: 'root', label: 'Starting note', options: [{ value: 'random', label: 'Random' }, { value: 'C', label: 'Always C' }] },
      { type: 'segmented', key: 'register', label: 'Register', options: [{ value: 'low', label: 'Low' }, { value: 'mid', label: 'Middle' }, { value: 'high', label: 'High' }] },
      { type: 'select', key: 'tone', label: 'Tone', options: [{ value: 'pref', label: 'Default tone' }, { value: 'keys', label: 'Keyboard' }, { value: 'guitar', label: 'Guitar' }] },
      { type: 'toggle', key: 'compare', label: 'After a wrong answer, play my answer and the right answer' },
    ];
  },
  itemLabel: (iv) => LABEL(iv),

  createQuestion({ settings: s, prefs, exercise, accuracy, session }) {
    const inst = s.tone === 'pref' ? prefs.instrument : s.tone;
    const set = activeSet(s, exercise);
    const iv = weightedItem(set, accuracy);
    const semis = parseInterval(iv).semis;
    const [lo, hi] = REGISTERS[s.register];
    let root;
    if (s.root === 'C') root = lo + ((12 - (lo % 12)) % 12);
    else root = lo + Math.floor(Math.random() * (hi - lo - Math.max(0, semis - 7)));
    const dir = exercise === 'mixed' ? ['ascending', 'descending', 'harmonic'][Math.floor(Math.random() * 3)] : exercise;
    const rootNote = spellMidi(root, Math.random() < 0.5 ? 'sharps' : 'flats');
    if (!session.adaptive) session.adaptive = { recent: [], notice: '' };
    const ad = session.adaptive;
    const notice = ad.notice;
    ad.notice = '';
    return {
      item: iv,
      report: `${iv} ${dir} from MIDI ${root}`,
      prompt: 'Name the interval',
      sub: `${dir === 'harmonic' ? 'Played together' : dir === 'descending' ? 'Played downward' : 'Played upward'}${s.adaptive && set.length < s.intervals.length ? ` · ${set.length} of your ${s.intervals.length} intervals in play` : ''}${notice ? ' · ' + notice : ''}`,
      play: () => scheduleInterval(root, semis, dir, inst),
      render(stage, api) {
        const options = INTERVALS_SIMPLE.filter((x) => set.includes(x)).map((x) => ({ id: x, label: SHORT(x), sub: LABEL(x) }));
        const reveal = h('div', { class: 'ref-grid ref-grid--2' });
        const choices = api.choices(stage, options, (ans) => {
          const ok = ans === iv;
          choices.mark(iv, ans);
          const { svg, top } = intervalStaff(rootNote, iv, dir, ok ? 'is-correct' : '');
          const kb = createKeyboard({ low: Math.max(36, root - (root % 12) - 0), high: root - (root % 12) + 24 + (semis > 11 ? 12 : 0), interactive: false, label: 'Keyboard showing the interval' });
          kb.mark([{ midi: root, cls: 'is-root', label: noteName(rootNote, { naming: prefs.naming }).slice(0, 3) }, { midi: root + semis, cls: 'is-target', label: noteName(top, { naming: prefs.naming }).slice(0, 3) }]);
          reveal.append(h('div', { class: 'score-box' }, svg), kb.el);
          stage.appendChild(reveal);
          // Adaptive bookkeeping
          ad.recent.push(ok ? 1 : 0);
          if (ad.recent.length > 10) ad.recent.shift();
          if (s.adaptive) {
            const chosen = EASY_ORDER.filter((x) => s.intervals.includes(x));
            const level = Math.max(3, Math.min(chosen.length, readRaw(adaptiveKey(exercise), 3)));
            const sum = ad.recent.reduce((a, b) => a + b, 0);
            if (ad.recent.length >= 10 && sum >= 9 && level < chosen.length) {
              writeRaw(adaptiveKey(exercise), level + 1);
              ad.recent = [];
              ad.notice = `${LABEL(chosen[level])} added`;
            } else if (ad.recent.length >= 10 && sum <= 5 && level > 3) {
              writeRaw(adaptiveKey(exercise), level - 1);
              ad.recent = [];
              ad.notice = `${LABEL(chosen[level - 1])} set aside for now`;
            }
          }
          const actions = [{ label: 'Hear it again', onClick: () => scheduleInterval(root, semis, dir, inst) }];
          const ansSemis = parseInterval(ans).semis;
          const compareBoth = () => {
            const len = scheduleInterval(root, ansSemis, dir, inst);
            scheduleInterval(root, semis, dir, inst, len + 0.4);
          };
          if (!ok) actions.push({ label: `Compare: ${SHORT(ans)} then ${SHORT(iv)}`, onClick: compareBoth });
          if (!ok && s.compare) compareBoth();
          api.submit({ correct: ok, item: iv, answer: ans, message: ok ? `${LABEL(iv)}: ${noteName(rootNote, { naming: prefs.naming })} to ${noteName(top, { naming: prefs.naming })}.` : `It was a ${LABEL(iv).toLowerCase()}. You chose ${LABEL(ans).toLowerCase()}.${s.compare ? ' Listen: your answer first, then the right one.' : ''}`, actions });
        }, { label: 'Interval' });
      },
    };
  },

  renderReference(el, { prefs, onKey }) {
    const inst = () => prefs.instrument;
    let a = 'M3', b = 'm3', root = 60, dir = 'ascending';
    const opts = INTERVALS_SIMPLE.map((iv) => h('option', { value: iv }, LABEL(iv)));
    const selA = h('select', { id: 'cmp-a' }, opts.map((o) => o.cloneNode(true)));
    const selB = h('select', { id: 'cmp-b' }, opts.map((o) => o.cloneNode(true)));
    selA.value = a; selB.value = b;
    const selRoot = h('select', { id: 'cmp-root' }, [48, 53, 55, 57, 60, 62, 64, 65, 67].map((m) => h('option', { value: m }, noteName(spellMidi(m), { octave: true }))));
    selRoot.value = String(root);
    const selDir = h('select', { id: 'cmp-dir' }, [['ascending', 'Upward'], ['descending', 'Downward'], ['harmonic', 'Together']].map(([v, l]) => h('option', { value: v }, l)));
    const view = h('div', { class: 'ref-grid ref-grid--2' });
    const draw = () => {
      a = selA.value; b = selB.value; root = +selRoot.value; dir = selDir.value;
      view.textContent = '';
      const rn = spellMidi(root);
      for (const [iv, tag] of [[a, 'A'], [b, 'B']]) {
        const { svg, top } = intervalStaff(rn, iv, dir);
        const kb = createKeyboard({ low: 48, high: 84, interactive: false, label: `Keyboard showing interval ${tag}` });
        kb.mark([{ midi: root, cls: 'is-root' }, { midi: root + parseInterval(iv).semis, cls: 'is-target', label: noteName(top, { naming: prefs.naming }).slice(0, 3) }]);
        view.appendChild(h('div', {}, h('h3', {}, `${tag}: ${LABEL(iv)} (${parseInterval(iv).semis} semitones)`), h('div', { class: 'score-box' }, svg), kb.el));
      }
    };
    [selA, selB, selRoot, selDir].forEach((s) => s.addEventListener('change', draw));
    const playA = () => scheduleInterval(root, parseInterval(a).semis, dir, inst());
    const playB = () => scheduleInterval(root, parseInterval(b).semis, dir, inst());
    const playBoth = () => { const l = playA(); scheduleInterval(root, parseInterval(b).semis, dir, inst(), l + 0.35); };
    onKey((e) => { if (e.key === 'a' || e.key === 'A') { playA(); return true; } if (e.key === 'b' || e.key === 'B') { playB(); return true; } return false; });
    el.append(
      h('h2', { class: 'panel-title' }, 'Compare intervals'),
      h('p', {}, 'Choose two intervals and play them from the same starting note, as often as you like. Keyboard: A plays the first, B the second.'),
      h('div', { class: 'ref-controls' },
        h('label', { for: 'cmp-a' }, 'Interval A', selA), h('label', { for: 'cmp-b' }, 'Interval B', selB),
        h('label', { for: 'cmp-root' }, 'Starting note', selRoot), h('label', { for: 'cmp-dir' }, 'Direction', selDir)),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn btn-ink', onclick: playA }, 'Play A'),
        h('button', { type: 'button', class: 'btn btn-ink', onclick: playB }, 'Play B'),
        h('button', { type: 'button', class: 'btn btn-outline', onclick: playBoth }, 'Play A then B')),
      view,
      h('h2', { class: 'panel-title' }, 'All intervals from C'),
      h('table', { class: 'ref-table' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Interval'), h('th', { scope: 'col' }, 'Semitones'), h('th', { scope: 'col' }, 'From C4'), h('th', { scope: 'col' }, 'Listen'))),
        h('tbody', {}, INTERVALS_SIMPLE.map((iv) => {
          const top = transpose(spellMidi(60), iv);
          return h('tr', {}, h('th', { scope: 'row' }, LABEL(iv) + (iv === 'A4' ? ' (augmented 4th)' : '')), h('td', {}, String(parseInterval(iv).semis)), h('td', {}, `C – ${noteName(top, { naming: prefs.naming })}`),
            h('td', {}, h('button', { type: 'button', class: 'btn btn-sm btn-outline', onclick: () => scheduleInterval(60, parseInterval(iv).semis, 'ascending', inst()) }, 'Up'), ' ',
              h('button', { type: 'button', class: 'btn btn-sm btn-outline', onclick: () => scheduleInterval(60, parseInterval(iv).semis, 'harmonic', inst()) }, 'Together')));
        }))));
    draw();
  },
};
