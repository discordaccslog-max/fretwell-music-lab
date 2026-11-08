// Melodic Dictation Studio
import { h } from '../app/toolkit.js';
import { createSeqEditor, compareSequences } from '../app/staff-editor.js';
import { renderScore } from '../core/notation.js';
import { play, chord, click, now } from '../core/audio.js';
import { generateMelody } from '../core/melody.js';
import { METERS, clickPattern } from '../core/rhythm.js';
import { majorKeys, minorKeys, keySignature, keyName, noteName, noteId, midi, withOctave, intervalBetween, degreeLabel, scaleSignatureSize, buildScale, diatonicChord, parseNote } from '../core/theory.js';

const MD_METERS = ['2/4', '3/4', '4/4', '6/8'];
const RANGES = { octave: 12, tenth: 16, twelfth: 19 };

function pickKey(s) {
  const mode = s.keyMode === 'minor' ? 'minor' : s.keyMode === 'any' ? (Math.random() < 0.5 ? 'major' : 'minor') : 'major';
  if (s.keyMode === 'C') return { tonic: parseNote('C4'), mode: 'major' };
  const list = (mode === 'minor' ? minorKeys() : majorKeys()).filter((k) => scaleSignatureSize(k, mode === 'minor' ? 'naturalMinor' : 'major') <= s.keyLevel);
  return { tonic: list[Math.floor(Math.random() * list.length)], mode };
}

function cadenceChords(tonic, mode) {
  const t = withOctave(tonic, 3);
  return [1, 4, 5, 1].map((d) => diatonicChord(t, mode, d).tones.map((n, i) => {
    let m = midi(withOctave(n, 3));
    while (m < 55) m += 12;
    return m - (i === 0 ? 12 : 0);
  }));
}

/** Schedule cadence, count-in and melody on the audio clock. Returns total seconds. */
function scheduleMelody(notes, meterId, tempo, inst, { cadence = false, tonic = null, mode = 'major' } = {}) {
  const meter = METERS[meterId];
  // The beat is a quarter note in x/4 and a dotted quarter in 6/8.
  const tick = (60 / tempo) / (meter.den === 8 ? 18 : 12);
  let t = now() + 0.08;
  if (cadence && tonic) {
    for (const ch of cadenceChords(tonic, mode)) { chord(ch, { when: t, dur: 0.75, velocity: 0.5 }); t += 0.8; }
    t += 0.35;
  }
  for (const c of clickPattern(meterId, false)) click(c.level === 2 ? 1 : 0, t + c.tick * tick);
  t += meter.bar * tick;
  let x = 0;
  for (const n of notes) {
    if (n.note) play(midi(n.note), { when: t + x * tick, dur: Math.max(0.15, n.dur * tick * 0.95), instrument: inst, velocity: 0.8 });
    x += n.dur;
  }
  return t - now() + x * tick;
}

export default {
  id: 'melodic-dictation',
  exercises: [
    { id: 'full', name: 'Melodic dictation', description: 'Write the pitch and rhythm of each note.' },
    { id: 'pitch', name: 'Pitch-only dictation', description: 'The rhythm is given; write the pitches.' },
  ],
  defaults: { exercise: 'full', sessionLength: 5, bars: 2, range: 'octave', keyMode: 'C', keyLevel: 2, level: 1, meter: '4/4', replays: 3, firstNote: true, cadence: true, tempo: 84, tone: 'pref', clef: 'treble' },
  walkthrough: [
    { title: 'Melodic Dictation Studio', text: 'Each melody is new. Listen, then write it on the staff. You can replay it as many times as your settings allow.' },
    { title: 'Writing notes', text: 'Click the staff where the note goes, play it on the keyboard below, or type its letter (A–G). Choose the note value first (keys 1–5: whole to sixteenth, . for a dot). ↑/↓ move the last note; − / = make it flat or sharp.' },
    { title: 'Checking', text: 'Press Check (Enter). Every note is marked for pitch and rhythm, and the correct melody appears below yours. Play both to compare.' },
    { title: 'Settings', text: 'Choose length, range, key, rhythm level, time signature, replays and tempo. Pitch-only dictation writes the rhythm for you.' },
  ],
  shortcuts: [['A–G', 'Add a note'], ['↑ / ↓', 'Move the last note'], ['− = 0', 'Flat, sharp, natural'], ['1–5', 'Whole, half, quarter, eighth, sixteenth'], ['.', 'Dotted'], ['Backspace', 'Delete the last note']],
  describeSettings(s) {
    return `${s.bars} bars of ${s.meter} · ${{ C: 'C major', major: 'major keys', minor: 'minor keys', any: 'major and minor keys' }[s.keyMode]} · rhythm level ${s.level} · ${s.replays === 99 ? 'unlimited' : s.replays} replay${s.replays === 1 ? '' : 's'}`;
  },
  settingsSchema() {
    return [
      { type: 'select', key: 'sessionLength', label: 'Session length', options: [3, 5, 10, 15].map((v) => ({ value: v, label: `${v} melodies` })) },
      { type: 'segmented', key: 'bars', label: 'Length', options: [2, 3, 4, 6, 8].map((v) => ({ value: v, label: `${v} bars` })) },
      { type: 'segmented', key: 'range', label: 'Range', options: [{ value: 'octave', label: 'Octave' }, { value: 'tenth', label: '10th' }, { value: 'twelfth', label: '12th' }] },
      { type: 'select', key: 'keyMode', label: 'Key', options: [{ value: 'C', label: 'C major only' }, { value: 'major', label: 'Any major key' }, { value: 'minor', label: 'Any minor key' }, { value: 'any', label: 'Major or minor' }] },
      { type: 'segmented', key: 'keyLevel', label: 'Key signatures', options: [{ value: 2, label: 'Up to 2 ♯/♭' }, { value: 4, label: 'Up to 4' }, { value: 7, label: 'All' }] },
      { type: 'segmented', key: 'level', label: 'Rhythm complexity', options: [1, 2, 3, 4].map((l) => ({ value: l, label: String(l) })), help: '1: quarters and halves · 2: eighths · 3: dotted rhythms · 4: sixteenths' },
      { type: 'segmented', key: 'meter', label: 'Time signature', options: MD_METERS.map((m) => ({ value: m, label: m })) },
      { type: 'segmented', key: 'replays', label: 'Replays', options: [1, 2, 3, 5, 99].map((v) => ({ value: v, label: v === 99 ? 'Unlimited' : String(v) })) },
      { type: 'toggle', key: 'firstNote', label: 'Give the first note' },
      { type: 'toggle', key: 'cadence', label: 'Play a key-setting cadence before each melody' },
      { type: 'range', key: 'tempo', label: 'Tempo (beats per minute)', min: 50, max: 140, step: 2 },
      { type: 'segmented', key: 'clef', label: 'Clef', options: [{ value: 'treble', label: 'Treble' }, { value: 'bass', label: 'Bass' }] },
      { type: 'select', key: 'tone', label: 'Tone', options: [{ value: 'pref', label: 'Default tone' }, { value: 'keys', label: 'Keyboard' }, { value: 'guitar', label: 'Guitar' }] },
    ];
  },
  itemLabel(item) {
    const [kind, a, b] = item.split(':');
    if (kind === 'degree') return `Scale degree ${a}${b ? ` (${b})` : ''}`;
    if (kind === 'melody') return `${a} melodies, rhythm level ${b}`;
    return item;
  },

  createQuestion({ settings: s, prefs, exercise }) {
    const naming = prefs.naming;
    const inst = s.tone === 'pref' ? prefs.instrument : s.tone;
    const { tonic: t0, mode } = pickKey(s);
    const octave = s.clef === 'bass' ? 3 : 4;
    let tonic = withOctave(t0, octave);
    if (midi(tonic) > (s.clef === 'bass' ? 55 : 67)) tonic = withOctave(t0, octave - 1);
    const low = midi(tonic) - 5;
    const high = low + RANGES[s.range];
    const meterId = MD_METERS.includes(s.meter) ? s.meter : '4/4';
    const meter = METERS[meterId];
    const mel = generateMelody({ tonic, mode, meter: meterId, bars: s.bars, low, high, level: s.level });
    const target = mel.notes.map((n) => ({ note: n.note, dur: n.dur }));
    const totalTicks = target.reduce((a, n) => a + n.dur, 0);
    const kname = keyName(tonic, mode);
    let plays = 0;
    const maxPlays = s.replays === 99 ? Infinity : s.replays + 1;
    const item = `melody:${mode}:${s.level}`;
    return {
      item, report: `${exercise} ${kname} ${meterId}: ${target.map((n) => noteId(n.note) + '/' + n.dur).join(' ')}`,
      prompt: `Write the melody in ${kname}`,
      sub: `${Math.round(totalTicks / meter.bar)} bars of ${meterId}${s.firstNote ? ', first note given' : ''}.`,
      canReplay: () => plays < maxPlays,
      play() {
        if (plays >= maxPlays) return;
        plays++;
        scheduleMelody(target, meterId, s.tempo, inst, { cadence: s.cadence && plays === 1, tonic, mode });
        if (this._replayBtn) {
          const left = maxPlays - plays;
          this._replayBtn.disabled = left <= 0;
          this._replayBtn.firstChild.textContent = Number.isFinite(left) ? `Replay (${left} left) ` : 'Replay ';
        }
      },
      render(stage, api) {
        const ed = createSeqEditor({
          mode: exercise === 'pitch' ? 'pitch' : 'full', clef: s.clef, keySig: keySignature(tonic, mode), meter,
          slots: target.map((n) => n.dur), total: totalTicks,
          given: s.firstNote ? [target[0]] : [], low, high, naming, label: 'Your melody',
        });
        stage.appendChild(ed.el);
        api.onKey((e) => ed.handleKey(e));
        api.addControl('Check', () => {
          const answer = ed.getNotes();
          const { results, correct } = compareSequences(answer, target, { checkRhythm: exercise !== 'pitch' });
          ed.showResults(results);
          target.forEach((n, i) => {
            const iv = intervalBetween(tonic, withOctave(n.note, tonic.o + (midi(withOctave(n.note, tonic.o)) < midi(tonic) ? 1 : 0)));
            const deg = degreeLabel(iv.name || 'P1');
            if (!(s.firstNote && i === 0) && results[i]) api.record(`degree:${deg}:${mode}`, !!results[i].pitch);
          });
          const items = [];
          let tt = 0;
          target.forEach((n) => {
            if (tt > 0 && tt % meter.bar === 0) items.push({ kind: 'bar' });
            const it = { kind: 'note', notes: [n.note], dur: n.dur, label: noteName(n.note, { naming }) };
            if (n.dur < 12) it.beam = 'c' + Math.floor(tt / meter.beats[0]);
            items.push(it);
            tt += n.dur;
          });
          items.push({ kind: 'bar', final: true });
          const { svg } = renderScore({ clef: s.clef, keySig: keySignature(tonic, mode), time: meterId, items, labels: true, minWidth: 560, label: 'The correct melody' });
          stage.appendChild(h('div', { class: 'score-box score-box--wide score-wrap' }, h('p', { class: 'score-caption' }, 'The melody'), svg));
          const wrong = results.filter((r) => !r.ok).length;
          api.submit({
            correct, item,
            message: correct ? 'Every note is right.' : `${wrong} note${wrong === 1 ? '' : 's'} to check — marked ✗ with the reason under each note. The correct melody is shown below yours.`,
            actions: [
              { label: 'Play the melody', onClick: () => scheduleMelody(target, meterId, s.tempo, inst) },
              { label: 'Play my answer', onClick: () => scheduleMelody(answer.filter((n) => n.note), meterId, s.tempo, inst) },
            ],
          });
        }, { key: 'Enter', primary: true });
      },
    };
  },

  renderReference(el, { prefs }) {
    const naming = prefs.naming;
    const modeSel = h('select', { id: 'md-mode' }, h('option', { value: 'major' }, 'Major'), h('option', { value: 'minor' }, 'Minor'));
    const keySel = h('select', { id: 'md-key' });
    const out = h('div');
    const fill = () => {
      keySel.textContent = '';
      (modeSel.value === 'minor' ? minorKeys() : majorKeys()).forEach((k) => keySel.appendChild(h('option', { value: noteId(k, false) }, keyName(k, modeSel.value))));
      keySel.value = modeSel.value === 'minor' ? 'A' : 'C';
    };
    const draw = () => {
      const mode = modeSel.value;
      const tonic = withOctave(parseNote(keySel.value), 4);
      const sc = buildScale(tonic, mode === 'minor' ? 'naturalMinor' : 'major');
      const line = [...sc, withOctave(tonic, 5)];
      const degs = ['1', '2', mode === 'minor' ? '♭3' : '3', '4', '5', mode === 'minor' ? '♭6' : '6', mode === 'minor' ? '♭7' : '7', '8'];
      out.textContent = '';
      const { svg } = renderScore({ clef: 'treble', keySig: keySignature(tonic, mode), items: line.map((n, i) => ({ kind: 'note', notes: [n], dur: 12, stem: 'none', label: `${degs[i]} ${noteName(n, { naming })}` })), labels: true, label: `${keyName(tonic, mode)} scale with degrees` });
      out.append(h('div', { class: 'score-box score-box--wide score-wrap' }, svg),
        h('div', { class: 'btn-row' }, line.map((n, i) => h('button', { type: 'button', class: 'btn btn-sm btn-outline', onclick: () => { play(midi(tonic), { dur: 0.5 }); play(midi(n), { when: now() + 0.55, dur: 1 }); } }, `1 → ${degs[i]}`))),
        h('p', { class: 'muted' }, 'Each button plays the tonic, then that degree, to help you hear every note against the key.'),
        mode === 'minor' ? h('p', {}, 'In minor keys the generated melodies use the natural minor scale, with the raised 7th (and raised 6th before it) when the line rises to the tonic.') : null);
      out._tonic = tonic; out._mode = mode;
    };
    modeSel.addEventListener('change', () => { fill(); draw(); });
    keySel.addEventListener('change', draw);
    el.append(h('h2', { class: 'panel-title' }, 'Keys and scale degrees'),
      h('div', { class: 'ref-controls' }, h('label', { for: 'md-mode' }, 'Mode', modeSel), h('label', { for: 'md-key' }, 'Key', keySel)),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn btn-ink', onclick: () => { const t = now() + 0.05; cadenceChords(out._tonic, out._mode).forEach((c, i) => chord(c, { when: t + i * 0.8, dur: 0.75, velocity: 0.55 })); } }, 'Play the cadence'),
        h('button', { type: 'button', class: 'btn btn-outline', onclick: () => { const t = now() + 0.05; const sc = buildScale(out._tonic, out._mode === 'minor' ? 'naturalMinor' : 'major'); [...sc, withOctave(out._tonic, 5)].forEach((n, i) => play(midi(n), { when: t + i * 0.4, dur: 0.5 })); } }, 'Play the scale')),
      out);
    fill();
    draw();
  },
};
