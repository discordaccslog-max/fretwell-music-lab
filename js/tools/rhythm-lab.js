// Rhythm Lab
import { h, kbd } from '../app/toolkit.js';
import { getLatency, setLatency } from '../app/store.js';
import { renderScore, rhythmItems } from '../core/notation.js';
import { click, play, now, eventTime, unlock, isReady } from '../core/audio.js';
import { METERS, generateRhythm, clickPattern, countLabel, DURATION_NAMES } from '../core/rhythm.js';
import { parseNote } from '../core/theory.js';

const RL_METERS = ['2/4', '3/4', '4/4', '5/4', '5/8', '6/8', '7/8'];
const WINDOWS = { relaxed: [0.075, 0.16], standard: [0.05, 0.11], strict: [0.03, 0.07] };
const B4 = parseNote('B4');
const ms = (x) => `${x >= 0 ? '+' : '−'}${Math.round(Math.abs(x) * 1000)} ms`;

function pulseSec(meter, tempo) { return 60 / tempo; }
function tickSec(meter, tempo) { return pulseSec(meter, tempo) / meter.pulse; }

/** Schedule metronome clicks for `bars` bars starting at t; silentBars is a set of bar indexes to skip. */
function scheduleClicks(meterId, t, bars, tempo, subdivide, silentBars = new Set()) {
  const meter = METERS[meterId];
  const pat = clickPattern(meterId, subdivide);
  const ts = tickSec(meter, tempo);
  for (let b = 0; b < bars; b++) {
    if (silentBars.has(b)) continue;
    for (const c of pat) click(c.level, t + (b * meter.bar + c.tick) * ts);
  }
  return t + bars * meter.bar * ts;
}

function matchTaps(expected, taps, okWin) {
  const used = new Set();
  const res = expected.map((e) => {
    let best = -1, bestErr = Infinity;
    taps.forEach((t, i) => {
      if (used.has(i)) return;
      const err = t - e;
      if (Math.abs(err) <= okWin && Math.abs(err) < Math.abs(bestErr)) { best = i; bestErr = err; }
    });
    if (best < 0) return { miss: true };
    used.add(best);
    return { err: bestErr };
  });
  return { res, extras: taps.length - used.size };
}

function tapSurface(api, onTap) {
  const pad = h('button', { type: 'button', class: 'tap-pad', 'aria-label': 'Tap pad: tap here, or press the space bar' }, 'Tap here or press Space');
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); onTap(e); pad.classList.add('is-hit'); setTimeout(() => pad.classList.remove('is-hit'), 90); });
  pad.addEventListener('click', (e) => { if (e.detail === 0) onTap(e); }); // keyboard activation (Enter on the pad)
  api.onKey((e) => {
    if (e.key === ' ' || e.code === 'Space') {
      if (!e.repeat) { onTap(e); pad.classList.add('is-hit'); setTimeout(() => pad.classList.remove('is-hit'), 90); }
      return true;
    }
    return false;
  });
  return pad;
}

function beatLights(meterId) {
  const meter = METERS[meterId];
  const wrap = h('div', { class: 'beat-lights', 'aria-hidden': 'true' });
  const lights = meter.beats.map((_, i) => wrap.appendChild(h('span', { class: 'beat-light' + (i === 0 ? ' is-down' : '') })));
  let raf = 0;
  return {
    el: wrap,
    run(t0, endT, tempo) {
      cancelAnimationFrame(raf);
      const ts = tickSec(meter, tempo);
      const starts = [];
      let acc = 0;
      for (const b of meter.beats) { starts.push(acc); acc += b; }
      const loop = () => {
        const t = now();
        if (t > endT) { lights.forEach((l) => l.classList.remove('is-on')); return; }
        const pos = (((t - t0) / ts) % meter.bar + meter.bar) % meter.bar;
        let idx = 0;
        starts.forEach((s, i) => { if (pos >= s) idx = i; });
        lights.forEach((l, i) => l.classList.toggle('is-on', t >= t0 && i === idx));
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    },
    stop() { cancelAnimationFrame(raf); },
  };
}

function rhythmSvg(events, meterId, { cls = null, labels = null, label = 'Rhythm' } = {}) {
  const meter = METERS[meterId];
  const items = rhythmItems(events, meter, { pitch: B4 });
  let k = 0;
  items.forEach((it) => {
    if (it.evIndex === undefined) return;
    if (cls && cls[it.evIndex]) it.noteCls = [cls[it.evIndex]];
    if (labels && labels[it.evIndex]) { it.label = labels[it.evIndex]; it.labelCls = cls ? cls[it.evIndex] : ''; }
    k++;
  });
  const { svg } = renderScore({ clef: 'percussion', time: meterId, items, minWidth: 340, labels: !!labels, label });
  return svg;
}

function describeRhythm(events) {
  return events.map((e) => (e.rest ? 'rest' : DURATION_NAMES[e.dur] || 'note')).join(', ');
}

export default {
  id: 'rhythm-lab',
  exercises: [
    { id: 'read', name: 'Read and tap', description: 'Read the rhythm, then tap it after the count-in.' },
    { id: 'pulse', name: 'Steady pulse', description: 'Tap every beat, including through a quiet bar.' },
    { id: 'ear', name: 'Rhythm by ear', description: 'Hear a rhythm and pick the matching notation.' },
  ],
  defaults: { exercise: 'read', sessionLength: 10, meter: '4/4', tempo: 80, level: 2, bars: 1, countIn: 1, subdivide: false, window: 'standard', tapSound: true },
  walkthrough: [
    { title: 'Rhythm Lab', text: 'Read a rhythm, press Start, listen to the count-in, then tap the rhythm with the metronome. Every tap is marked early, late or on time.' },
    { title: 'Tapping', text: 'Tap the big pad, click it, or press the space bar. Use whatever you will practise with: taps on a phone screen and key presses have slightly different delays.' },
    { title: 'Calibrate first', text: 'In Settings, run the latency calibration once on each device. It measures the delay between the sound and your tap so the timing feedback is accurate.' },
    { title: 'Steady pulse and by ear', text: 'Steady pulse checks that you keep time when the metronome goes quiet. Rhythm by ear plays a rhythm for you to match to its notation.' },
  ],
  shortcuts: [['Space', 'Tap'], ['Enter', 'Start, then next'], ['1–3', 'Choose a rhythm (by ear)']],
  describeSettings(s) {
    return `${s.meter} · ♩ = ${s.tempo}${METERS[s.meter].den === 8 ? ' (♪ pulse)' : ''} · level ${s.level} · ${getLatency().calibrated ? 'calibrated' : 'not calibrated yet'}`;
  },
  settingsSchema(s) {
    return [
      { type: 'select', key: 'sessionLength', label: 'Session length', options: [5, 10, 20].map((v) => ({ value: v, label: `${v} exercises` })) },
      { type: 'segmented', key: 'meter', label: 'Time signature', options: RL_METERS.map((m) => ({ value: m, label: m })) },
      { type: 'range', key: 'tempo', label: METERS[s.meter].den === 8 ? 'Tempo (eighth notes per minute)' : 'Tempo (beats per minute)', min: 40, max: 180, step: 2 },
      { type: 'segmented', key: 'level', label: 'Rhythm level', options: [1, 2, 3, 4, 5].map((l) => ({ value: l, label: String(l) })), help: '1: quarters and halves · 2: eighths · 3: dotted rhythms and rests · 4: sixteenths · 5: syncopation and triplets' },
      { type: 'segmented', key: 'bars', label: 'Bars per exercise', options: [{ value: 1, label: '1 bar' }, { value: 2, label: '2 bars' }] },
      { type: 'segmented', key: 'countIn', label: 'Count-in', options: [{ value: 1, label: '1 bar' }, { value: 2, label: '2 bars' }] },
      { type: 'toggle', key: 'subdivide', label: 'Metronome subdivision (eighth-note clicks in x/4 time)' },
      { type: 'segmented', key: 'window', label: 'Timing window', options: [{ value: 'relaxed', label: 'Relaxed' }, { value: 'standard', label: 'Standard' }, { value: 'strict', label: 'Strict' }], help: 'How close a tap must be to count as on time: relaxed ±75 ms, standard ±50 ms, strict ±30 ms.' },
      { type: 'toggle', key: 'tapSound', label: 'Play a soft tone on each tap' },
      { type: 'heading', label: 'Latency calibration' },
      { type: 'custom', render: () => calibrationBox() },
    ];
  },
  itemLabel(item) {
    const [kind, meter, lvl] = item.split(':');
    const k = { read: 'Read and tap', pulse: 'Steady pulse', ear: 'Rhythm by ear' }[kind] || kind;
    return `${k} in ${meter}${lvl ? `, level ${lvl.slice(1)}` : ''}`;
  },

  createQuestion({ settings: s, exercise }) {
    const meterId = RL_METERS.includes(s.meter) ? s.meter : '4/4';
    const meter = METERS[meterId];
    const tempo = s.tempo;
    const ts = tickSec(meter, tempo);
    const [goodWin, okWin] = WINDOWS[s.window] || WINDOWS.standard;
    const latency = () => getLatency().offset || 0;
    const rng = Math.random;
    const tuplets = meter.den === 4 && s.level >= 5;

    if (exercise === 'ear') {
      const level = s.level;
      const make = () => generateRhythm(meterId, 1, level, rng, { tuplets, rests: level >= 3 });
      const sig = (ev) => ev.map((e) => (e.rest ? 'r' : '') + e.dur).join(',');
      const answer = make();
      const opts = [answer];
      for (let tries = 0; opts.length < 3 && tries < 200; tries++) {
        const c = make();
        if (!opts.some((o) => sig(o) === sig(c))) opts.push(c);
      }
      const order = opts.map((_, i) => i).sort(() => rng() - 0.5);
      const correctIdx = order.indexOf(0);
      const item = `ear:${meterId}:L${level}`;
      const playIt = () => {
        const t0 = now() + 0.12;
        const start = scheduleClicks(meterId, t0, 1, tempo, s.subdivide);
        scheduleClicks(meterId, start, 1, tempo, false);
        answer.forEach((e) => { if (!e.rest) play(72, { when: start + e.start * ts, dur: Math.max(0.12, e.dur * ts * 0.9), instrument: 'keys', velocity: 0.8 }); });
      };
      return {
        correctIdx,
        item, report: `ear ${meterId} ${sig(answer)}`,
        prompt: 'Which rhythm did you hear?',
        sub: `One bar of ${meterId} after a one-bar count-in.`,
        play: playIt,
        render(stage, api) {
          const wrap = h('div', { class: 'choices', role: 'group', 'aria-label': 'Rhythm options', style: '--min: 260px' });
          const buttons = order.map((oi, i) => {
            const b = h('button', { type: 'button', class: 'choice', 'aria-label': `Option ${i + 1}: ${describeRhythm(opts[oi])}` }, h('span', { class: 'choice-label' }, `Option ${i + 1}`), rhythmSvg(opts[oi], meterId, { label: `Option ${i + 1}` }), kbd(String(i + 1)));
            b.style.minHeight = '120px';
            b.addEventListener('click', () => choose(i));
            wrap.appendChild(b);
            return b;
          });
          stage.appendChild(wrap);
          let done = false;
          const choose = (i) => {
            if (done) return;
            done = true;
            buttons.forEach((b, j) => { b.disabled = true; if (j === correctIdx) { b.classList.add('is-correct'); b.prepend(h('span', { class: 'mark' }, '✓ ')); } else if (j === i) { b.classList.add('is-wrong'); b.prepend(h('span', { class: 'mark' }, '✗ ')); } });
            api.submit({ correct: i === correctIdx, item, message: i === correctIdx ? `Option ${correctIdx + 1}.` : `It was option ${correctIdx + 1}.`, actions: [{ label: 'Hear it again', onClick: playIt }] });
          };
          api.onKey((e) => { if (['1', '2', '3'].includes(e.key)) { choose(+e.key - 1); return true; } return false; });
        },
      };
    }

    if (exercise === 'pulse') {
      const bars = 4;
      const gapBar = 2;
      const item = `pulse:${meterId}`;
      return {
        item, report: `pulse ${meterId} ${tempo}`,
        prompt: 'Tap every beat',
        sub: `Count-in, then four bars of ${meterId}. The metronome goes quiet in bar ${gapBar + 1} — keep tapping.`,
        render(stage, api) {
          const lights = beatLights(meterId);
          const diagram = h('div', { class: 'beat-lights', 'aria-hidden': 'true' });
          for (let b = 0; b < bars; b++) diagram.appendChild(h('span', { class: 'beat-light', style: `width:auto;padding:0 10px;${b === gapBar ? 'border-style:dashed' : ''}` }, b === gapBar ? 'quiet' : `bar ${b + 1}`));
          let running = false, taps = [], expected = [], endT = 0;
          const pad = tapSurface(api, (e) => {
            if (!running) return;
            const t = eventTime(e) - latency();
            taps.push(t);
            if (s.tapSound) play(84, { dur: 0.08, velocity: 0.35, instrument: 'keys' });
          });
          stage.append(diagram, lights.el, pad);
          const startBtn = api.addControl('Start', async () => {
            if (running || api.answered()) return;
            await unlock();
            running = true; taps = []; expected = [];
            startBtn.disabled = true;
            pad.focus({ preventScroll: true });
            const t0 = now() + 0.2;
            const start = scheduleClicks(meterId, t0, s.countIn, tempo, s.subdivide);
            scheduleClicks(meterId, start, bars, tempo, s.subdivide, new Set([gapBar]));
            let acc = 0;
            const starts = meter.beats.map((b) => { const v = acc; acc += b; return v; });
            for (let b = 0; b < bars; b++) for (const st of starts) expected.push(start + (b * meter.bar + st) * ts);
            endT = start + bars * meter.bar * ts;
            this.expected = expected;
            lights.run(t0, endT, tempo);
            const wait = (endT - now() + okWin + 0.3) * 1000;
            setTimeout(finish, wait);
          }, { key: 'Enter', primary: true });
          function finish() {
            running = false;
            lights.stop();
            const { res, extras } = matchTaps(expected, taps, okWin);
            const misses = res.filter((r) => r.miss).length;
            const hits = res.filter((r) => !r.miss);
            const good = hits.filter((r) => Math.abs(r.err) <= goodWin).length;
            const avg = hits.length ? hits.reduce((a, r) => a + r.err, 0) / hits.length : 0;
            const gapRes = res.slice(gapBar * meter.beats.length, (gapBar + 1) * meter.beats.length);
            const gapAvg = gapRes.filter((r) => !r.miss).reduce((a, r, _, arr) => a + r.err / arr.length, 0);
            const list = h('ul', { class: 'timing-list', 'aria-label': 'Timing for each beat' }, res.map((r, i) => h('li', { class: r.miss ? 't-miss' : Math.abs(r.err) <= goodWin ? 't-good' : 't-off' }, `${Math.floor(i / meter.beats.length) + 1}.${(i % meter.beats.length) + 1} ${r.miss ? '✗ missed' : (Math.abs(r.err) <= goodWin ? '✓ ' : (r.err < 0 ? 'early ' : 'late ')) + ms(r.err)}`)));
            stage.appendChild(list);
            const ok = misses === 0 && extras === 0;
            api.submit({ correct: ok, item, message: `${good} of ${res.length} beats on time${misses ? `, ${misses} missed` : ''}${extras ? `, ${extras} extra tap${extras === 1 ? '' : 's'}` : ''}. ${hits.length ? `On average you were ${Math.abs(Math.round(avg * 1000))} ms ${avg < 0 ? 'early' : 'late'}` : ''}${gapRes.some((r) => !r.miss) ? `; in the quiet bar, ${Math.abs(Math.round(gapAvg * 1000))} ms ${gapAvg < 0 ? 'early' : 'late'}` : ''}.` });
          }
          return () => { running = false; lights.stop(); };
        },
      };
    }

    // Read and tap
    const events = generateRhythm(meterId, s.bars, s.level, rng, { tuplets, rests: s.level >= 3 });
    const item = `read:${meterId}:L${s.level}`;
    const hearIt = () => {
      const t0 = now() + 0.12;
      const start = scheduleClicks(meterId, t0, 1, tempo, s.subdivide);
      scheduleClicks(meterId, start, s.bars, tempo, s.subdivide);
      events.forEach((e) => { if (!e.rest) play(72, { when: start + e.start * ts, dur: Math.max(0.12, e.dur * ts * 0.9), instrument: 'keys', velocity: 0.8 }); });
    };
    return {
      item, report: `read ${meterId} at ${tempo} level ${s.level}: ${events.map((e) => (e.rest ? 'r' : '') + e.dur).join(' ')}`,
      prompt: 'Read the rhythm, then tap it',
      sub: `Press Start for a ${s.countIn}-bar count-in, then tap with the metronome.${getLatency().calibrated ? '' : ' Tip: calibrate latency in Settings for the most accurate feedback.'}`,
      play: hearIt,
      replayLabel: 'Hear the rhythm',
      autoPlay: false,
      render(stage, api) {
        const scoreBox = h('div', { class: 'score-box score-wrap' }, rhythmSvg(events, meterId, { label: `Rhythm to tap: ${describeRhythm(events)}` }));
        const counts = h('p', { class: 'score-caption' }, 'Count: ' + events.filter((e) => !e.rest).map((e) => countLabel(meterId, e.start % meter.bar)).join(' '));
        const lights = beatLights(meterId);
        let running = false, taps = [], expected = [], endT = 0;
        const pad = tapSurface(api, (e) => {
          if (!running) return;
          taps.push(eventTime(e) - latency());
          if (s.tapSound) play(84, { dur: 0.08, velocity: 0.35, instrument: 'keys' });
        });
        stage.append(scoreBox, counts, lights.el, pad);
        const startBtn = api.addControl('Start', async () => {
          if (running || api.answered()) return;
          await unlock();
          if (!isReady()) return;
          running = true; taps = [];
          startBtn.disabled = true;
          pad.focus({ preventScroll: true });
          const t0 = now() + 0.2;
          const start = scheduleClicks(meterId, t0, s.countIn, tempo, s.subdivide);
          scheduleClicks(meterId, start, s.bars, tempo, s.subdivide);
          expected = events.filter((e) => !e.rest).map((e) => start + e.start * ts);
          this.expected = expected;
          endT = start + s.bars * meter.bar * ts;
          lights.run(t0, endT, tempo);
          setTimeout(finish, (endT - now() + okWin + 0.35) * 1000);
        }, { key: 'Enter', primary: true });
        function finish() {
          running = false;
          lights.stop();
          const { res, extras } = matchTaps(expected, taps, okWin);
          const noteIdx = events.map((e, i) => (e.rest ? -1 : i)).filter((i) => i >= 0);
          const cls = {}, labels = {};
          res.forEach((r, k) => {
            const i = noteIdx[k];
            cls[i] = r.miss ? 'is-wrong' : Math.abs(r.err) <= goodWin ? 'is-correct' : 'is-active';
            labels[i] = r.miss ? '✗' : Math.abs(r.err) <= goodWin ? '✓' : (r.err < 0 ? 'early' : 'late');
          });
          scoreBox.textContent = '';
          scoreBox.appendChild(rhythmSvg(events, meterId, { cls, labels, label: 'Your timing on each note' }));
          const misses = res.filter((r) => r.miss).length;
          const hits = res.filter((r) => !r.miss);
          const good = hits.filter((r) => Math.abs(r.err) <= goodWin).length;
          const avg = hits.length ? hits.reduce((a, r) => a + r.err, 0) / hits.length : 0;
          stage.appendChild(h('ul', { class: 'timing-list', 'aria-label': 'Timing for each note' }, res.map((r, k) => h('li', { class: r.miss ? 't-miss' : Math.abs(r.err) <= goodWin ? 't-good' : 't-off' }, `Note ${k + 1}: ${r.miss ? '✗ missed' : (Math.abs(r.err) <= goodWin ? '✓ ' : (r.err < 0 ? 'early ' : 'late ')) + ms(r.err)}`))));
          const ok = misses === 0 && extras === 0;
          api.submit({ correct: ok, item, message: `${good} of ${res.length} notes on time${misses ? `, ${misses} missed` : ''}${extras ? `, ${extras} extra tap${extras === 1 ? '' : 's'}` : ''}.${hits.length ? ` On average ${Math.abs(Math.round(avg * 1000))} ms ${avg < 0 ? 'early' : 'late'}.` : ''}`, actions: [{ label: 'Hear the rhythm', onClick: hearIt }] });
        }
        return () => { running = false; lights.stop(); };
      },
    };
  },

  renderReference(el) {
    let tempo = 80;
    const tempoIn = h('input', { type: 'range', id: 'rl-tempo', min: '40', max: '160', value: String(tempo) });
    const tempoOut = h('output', { for: 'rl-tempo' }, String(tempo));
    tempoIn.addEventListener('input', () => { tempo = +tempoIn.value; tempoOut.textContent = tempo; });
    const playPattern = (meterId, events) => {
      const meter = METERS[meterId];
      const ts = tickSec(meter, tempo);
      const t0 = now() + 0.1;
      const start = scheduleClicks(meterId, t0, 1, tempo, false);
      scheduleClicks(meterId, start, 1, tempo, false);
      let t = 0;
      for (const e of events) { if (!e.rest) play(72, { when: start + t * ts, dur: Math.max(0.1, e.dur * ts * 0.9), velocity: 0.8 }); t += e.dur; }
    };
    const rows = [
      ['Whole note', [{ dur: 48 }], '1 2 3 4', 'Four beats'],
      ['Half notes', [{ dur: 24 }, { dur: 24 }], '1 (2) 3 (4)', 'Two beats each'],
      ['Quarter notes', [{ dur: 12 }, { dur: 12 }, { dur: 12 }, { dur: 12 }], '1 2 3 4', 'One beat each'],
      ['Eighth notes', Array(8).fill({ dur: 6 }), '1 & 2 & 3 & 4 &', 'Half a beat each'],
      ['Sixteenth notes', Array(16).fill({ dur: 3 }), '1 e & a 2 e & a …', 'A quarter of a beat each'],
      ['Dotted quarter and eighth', [{ dur: 18 }, { dur: 6 }, { dur: 18 }, { dur: 6 }], '1 (2) & 3 (4) &', 'A dot adds half the value'],
      ['Dotted eighth and sixteenth', [{ dur: 9 }, { dur: 3 }, { dur: 9 }, { dur: 3 }, { dur: 9 }, { dur: 3 }, { dur: 9 }, { dur: 3 }], '1 (e &) a 2 (e &) a …', 'Long–short'],
      ['Eighth-note triplets', Array(12).fill(0).map(() => ({ dur: 4, tuplet: true })), '1 trip let 2 trip let …', 'Three in the space of two'],
      ['Quarter rest', [{ dur: 12 }, { dur: 12, rest: true }, { dur: 12 }, { dur: 12, rest: true }], '1 (2) 3 (4)', 'Silence for one beat'],
      ['Eighth rest', [{ dur: 6, rest: true }, { dur: 6 }, { dur: 6, rest: true }, { dur: 6 }, { dur: 6, rest: true }, { dur: 6 }, { dur: 6, rest: true }, { dur: 6 }], '(1) & (2) & …', 'Off-beat eighths'],
    ];
    const table = h('table', { class: 'ref-table' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Value'), h('th', { scope: 'col' }, 'In 4/4'), h('th', { scope: 'col' }, 'Counting'), h('th', { scope: 'col' }, 'Listen'))),
      h('tbody', {}, rows.map(([name, evs, count, note]) => {
        let t = 0;
        const events = evs.map((e) => { const x = { ...e, start: t }; t += e.dur; return x; });
        return h('tr', {}, h('th', { scope: 'row' }, name, h('br'), h('span', { class: 'muted' }, note)), h('td', { style: 'min-width:220px' }, rhythmSvg(events, '4/4', { label: name })), h('td', {}, count), h('td', {}, h('button', { type: 'button', class: 'btn btn-sm btn-outline', onclick: () => playPattern('4/4', events) }, 'Play')));
      })));
    const meters = h('table', { class: 'ref-table' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Time signature'), h('th', { scope: 'col' }, 'Beat grouping'), h('th', { scope: 'col' }, 'Listen'))),
      h('tbody', {}, ['2/4', '3/4', '4/4', '5/4', '5/8', '6/8', '7/8'].map((m) => {
        const meter = METERS[m];
        const grouping = meter.den === 8 ? meter.beats.map((b) => b / 6).join(' + ') + ' eighth notes' : `${meter.num} quarter-note beats`;
        return h('tr', {}, h('th', { scope: 'row' }, m), h('td', {}, grouping), h('td', {}, h('button', { type: 'button', class: 'btn btn-sm btn-outline', onclick: () => { const t0 = now() + 0.1; scheduleClicks(m, t0, 2, tempo, false); } }, 'Metronome')));
      })));
    el.append(h('h2', { class: 'panel-title' }, 'Rhythm reference'),
      h('p', { class: 'ref-controls' }, h('label', { for: 'rl-tempo' }, 'Tempo ', tempoOut, tempoIn)),
      h('p', {}, 'Each example plays after a one-bar count-in.'),
      table, h('h3', {}, 'Time signatures'), meters);
  },
};

/* ------------------------------------------------------------- calibration */
function calibrationBox() {
  const lat = getLatency();
  const out = h('p', { 'aria-live': 'polite' }, lat.calibrated ? `Calibrated: your device delay is ${Math.round(lat.offset * 1000)} ms.` : 'Not calibrated yet.');
  const slider = h('input', { type: 'range', id: 'lat-adjust', min: '-150', max: '250', step: '5', value: String(Math.round((lat.offset || 0) * 1000)) });
  const sOut = h('output', { for: 'lat-adjust' }, `${slider.value} ms`);
  slider.addEventListener('input', () => { sOut.textContent = `${slider.value} ms`; });
  slider.addEventListener('change', () => { setLatency({ offset: +slider.value / 1000, calibrated: true }); out.textContent = `Saved: ${slider.value} ms.`; });
  const lights = h('div', { class: 'beat-lights', 'aria-hidden': 'true' }, ...Array.from({ length: 8 }, () => h('span', { class: 'beat-light' })));
  let running = false, clicks = [], taps = [];
  const pad = h('button', { type: 'button', class: 'tap-pad', disabled: true }, 'Tap here or press Space with each click');
  const onTap = (e) => {
    if (!running) return;
    taps.push(eventTime(e));
    const k = taps.length - 1;
    if (lights.children[k]) lights.children[k].classList.add('is-on');
  };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); onTap(e); });
  pad.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); onTap(e); } });
  const start = h('button', { type: 'button', class: 'btn btn-ink' }, 'Start calibration');
  start.addEventListener('click', async () => {
    await unlock();
    if (!isReady() || running) return;
    running = true; taps = []; clicks = [];
    [...lights.children].forEach((l) => l.classList.remove('is-on'));
    pad.disabled = false;
    pad.focus();
    out.textContent = 'Listen to two clicks, then tap along with the next eight.';
    const beat = 60 / 90;
    const t0 = now() + 0.3;
    for (let i = 0; i < 10; i++) {
      click(i < 2 ? 1 : 2, t0 + i * beat);
      if (i >= 2) clicks.push(t0 + i * beat);
    }
    setTimeout(() => {
      running = false;
      pad.disabled = true;
      const offsets = [];
      for (const c of clicks) {
        let best = null;
        for (const t of taps) if (Math.abs(t - c) < 0.3 && (best === null || Math.abs(t - c) < Math.abs(best - c))) best = t;
        if (best !== null) offsets.push(best - c);
      }
      if (offsets.length < 5) { out.textContent = `Only ${offsets.length} taps matched the clicks. Try again and tap with each click.`; return; }
      offsets.sort((a, b) => a - b);
      const med = offsets[Math.floor(offsets.length / 2)];
      setLatency({ offset: med, calibrated: true });
      slider.value = String(Math.round(med * 1000));
      sOut.textContent = `${slider.value} ms`;
      out.textContent = `Calibrated: your device delay is ${Math.round(med * 1000)} ms. Saved on this device.`;
    }, (t0 - now() + 10 * beat + 0.4) * 1000);
  });
  return h('div', { class: 'cal-box' },
    h('p', {}, 'Phones, tablets, Bluetooth headphones and computers all add a small delay between a sound and your tap. Calibrate once on each device, using the same speakers or headphones you practise with.'),
    start, lights, pad, out,
    h('label', { for: 'lat-adjust', class: 'field-label' }, 'Fine adjust ', sOut), slider,
    h('p', { class: 'field-help' }, 'If your taps are always shown as late, raise this value; if always early, lower it.'));
}
