// Home page: the playable hero and the free mini interval quiz.
import { play, isReady, unlock, now } from '../core/audio.js';
import { initSoundToggles, isSoundOn, turnSoundOn, onSoundChange } from '../core/sound-ui.js';
import { parseNote, step } from '../core/theory.js';

const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
initSoundToggles();

/* ------------------------------------------------------------------ hero */
const hero = document.getElementById('hero-play');
if (hero) initHero(hero);

function initHero(el) {
  const notesBox = el.querySelector('.hero-staff-notes');
  const staffBox = el.querySelector('.hero-staff');
  const shapes = [...el.querySelectorAll('[data-midi]')];
  const staticNotes = [];
  let lastInteraction = 0;

  const yOf = (st) => 96 - (st - 30) * 7;

  function addNote(name, inst) {
    const n = parseNote(name);
    const st = step(n);
    const y = yOf(st);
    const note = document.createElement('span');
    note.className = 'hs-note' + (inst === 'guitar' ? ' is-guitar' : '');
    note.style.top = y + 'px';
    const head = document.createElement('span');
    head.className = 'hs-head';
    note.appendChild(head);
    const ledgerSteps = [];
    if (st <= 28) for (let s = 28; s >= st; s -= 2) ledgerSteps.push(s);
    if (st >= 40) for (let s = 40; s <= st; s += 2) ledgerSteps.push(s);
    for (const s of ledgerSteps) {
      const l = document.createElement('span');
      l.className = 'hs-ledger';
      l.style.top = (yOf(s) - y + 7) + 'px';
      note.appendChild(l);
    }
    if (n.a) {
      const acc = document.createElement('span');
      acc.className = 'hs-acc';
      acc.textContent = n.a > 0 ? '♯' : '♭';
      note.appendChild(acc);
    }
    const label = document.createElement('span');
    label.className = 'hs-name';
    label.textContent = name.replace(/\d/, '');
    note.appendChild(label);
    notesBox.appendChild(note);
    // Never let notes pile up (for example if a browser pauses animations in a background tab).
    while (notesBox.children.length > 18) notesBox.firstElementChild.remove();
    const width = staffBox.clientWidth;
    if (reduced) {
      staticNotes.push(note);
      while (staticNotes.length > Math.max(4, Math.floor(width / 56))) staticNotes.shift().remove();
      staticNotes.forEach((nEl, i) => { nEl.style.left = (width - 40 - (staticNotes.length - 1 - i) * 52) + 'px'; });
      return;
    }
    const dist = width + 70;
    note.style.setProperty('--dist', `-${dist}px`);
    note.style.setProperty('--dur', `${(dist / 95).toFixed(2)}s`);
    note.classList.add('is-moving');
    note.addEventListener('animationend', () => note.remove());
  }

  function hit(btn, { silent = false } = {}) {
    btn.classList.add('is-active');
    setTimeout(() => btn.classList.remove('is-active'), 200);
    const midi = +btn.dataset.midi;
    const inst = btn.dataset.inst;
    if (!silent && isSoundOn()) {
      if (isReady()) play(midi, { instrument: inst === 'guitar' ? 'guitar' : 'keys', dur: inst === 'guitar' ? 2.2 : 1.4, velocity: 0.8 });
      else unlock().then(() => play(midi, { instrument: inst === 'guitar' ? 'guitar' : 'keys', dur: 1.4 }));
    }
    addNote(btn.dataset.name, inst);
  }

  shapes.forEach((btn) => btn.addEventListener('click', () => { lastInteraction = performance.now(); hit(btn); }));

  // A gentle silent animation runs until the visitor interacts or turns sound on.
  const idle = ['C4', 'E4', 'G4', 'A3', 'C5', 'G4', 'E4', 'D4', 'A4', 'G3', 'C4', 'E4'];
  let idleIdx = 0;
  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(el);
  }
  if (!reduced) {
    setInterval(() => {
      if (!visible || document.hidden || isSoundOn() || lastInteraction > 0) return;
      const name = idle[idleIdx++ % idle.length];
      const btn = shapes.find((b) => b.dataset.name === name && (idleIdx % 2 ? b.dataset.inst === 'keys' : b.dataset.inst === 'guitar')) || shapes.find((b) => b.dataset.name === name);
      if (btn) hit(btn, { silent: true });
    }, 1100);
  }
  onSoundChange((on) => { if (on) lastInteraction = performance.now(); });
}

/* ------------------------------------------------------------- mini quiz */
const quizEl = document.getElementById('mini-quiz-app');
if (quizEl) initQuiz(quizEl);

function initQuiz(box) {
  const ROUNDS = 5;
  const TYPES = [
    { id: 'third', label: '3rd', name: 'a 3rd', semis: () => (Math.random() < 0.5 ? 3 : 4) },
    { id: 'fifth', label: '5th', name: 'a 5th', semis: () => 7 },
    { id: 'octave', label: 'Octave', name: 'an octave', semis: () => 12 },
  ];
  let round, results, q, answered;

  function newQuestion() {
    const t = TYPES[Math.floor(Math.random() * TYPES.length)];
    q = { type: t, root: 57 + Math.floor(Math.random() * 10), semis: t.semis() };
    answered = false;
  }

  function setFeedback(text) {
    const fb = box.querySelector('.mq-feedback');
    if (fb) fb.textContent = text;
  }

  function render() {
    box.textContent = '';
    if (round >= ROUNDS) return renderEnd();
    const top = document.createElement('div');
    top.className = 'mq-top';
    top.innerHTML = `<p style="margin:0;font-weight:700">Round ${round + 1} of ${ROUNDS}</p>`;
    const dots = document.createElement('div');
    dots.className = 'mq-dots';
    dots.setAttribute('aria-label', `${results.filter(Boolean).length} correct so far`);
    for (let i = 0; i < ROUNDS; i++) {
      const d = document.createElement('span');
      d.className = 'mq-dot' + (results[i] === true ? ' is-ok' : results[i] === false ? ' is-bad' : '');
      d.textContent = results[i] === true ? '✓' : results[i] === false ? '✗' : '';
      dots.appendChild(d);
    }
    top.appendChild(dots);
    box.appendChild(top);
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'btn btn-ink btn-lg mq-play';
    playBtn.innerHTML = '▶ Play the two notes <span class="kbd" style="font-family:var(--font-mono);font-size:.8rem;opacity:.75">R</span>';
    playBtn.addEventListener('click', () => schedulePair());
    box.appendChild(playBtn);
    const choices = document.createElement('div');
    choices.className = 'mq-choices';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', 'Your answer');
    TYPES.forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mq-choice';
      b.dataset.type = t.id;
      b.innerHTML = `<span>${t.label}</span><span class="kbd" aria-hidden="true">${i + 1}</span>`;
      b.addEventListener('click', () => answer(t.id));
      choices.appendChild(b);
    });
    box.appendChild(choices);
    const fb = document.createElement('p');
    fb.className = 'mq-feedback';
    fb.textContent = 'Press play, listen, then choose.';
    box.appendChild(fb);
  }

  async function schedulePair() {
    if (!isSoundOn()) await turnSoundOn();
    else if (!isReady()) await unlock();
    if (!isReady()) { setFeedback('Sound could not start in this browser. Check that the tab is not muted and try again.'); return; }
    const t = now() + 0.08;
    play(q.root, { when: t, dur: 0.85, velocity: 0.8 });
    play(q.root + q.semis, { when: t + 0.75, dur: 1.3, velocity: 0.8 });
  }

  function answer(id) {
    if (answered) return;
    answered = true;
    const ok = id === q.type.id;
    results[round] = ok;
    box.querySelectorAll('.mq-choice').forEach((b) => {
      b.disabled = true;
      if (b.dataset.type === q.type.id) { b.classList.add('is-ok'); b.insertAdjacentText('afterbegin', '✓ '); }
      else if (b.dataset.type === id) { b.classList.add('is-bad'); b.insertAdjacentText('afterbegin', '✗ '); }
    });
    const exact = q.type.id === 'third' ? (q.semis === 4 ? 'a major 3rd' : 'a minor 3rd') : q.type.name;
    setFeedback(ok ? `✓ Correct — that was ${exact}.` : `✗ Not quite — that was ${exact}.`);
    const dots = box.querySelectorAll('.mq-dot');
    if (dots[round]) { dots[round].classList.add(ok ? 'is-ok' : 'is-bad'); dots[round].textContent = ok ? '✓' : '✗'; }
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn btn-outline';
    next.style.marginTop = '12px';
    next.innerHTML = round + 1 >= ROUNDS ? 'See your score <span class="kbd" style="font-family:var(--font-mono);font-size:.8rem;opacity:.7">Enter</span>' : 'Next round <span class="kbd" style="font-family:var(--font-mono);font-size:.8rem;opacity:.7">Enter</span>';
    next.addEventListener('click', advance);
    box.appendChild(next);
    next.focus({ preventScroll: true });
  }

  function advance() {
    round++;
    newQuestion();
    render();
    const playBtn = box.querySelector('.mq-play');
    if (playBtn) playBtn.focus({ preventScroll: true });
  }

  function renderEnd() {
    const score = results.filter(Boolean).length;
    box.innerHTML = `<p class="eyebrow" style="margin-bottom:6px">Your score</p>
      <p class="mq-result">${score} / ${ROUNDS}</p>
      <p>${score === ROUNDS ? 'Every one right.' : score >= 3 ? 'A solid ear for these three intervals.' : 'These three take a little listening to tell apart — try another round.'}
      The Interval Ear Trainer covers every interval from the minor 2nd to the octave, played up, down or together.</p>
      <p style="display:flex;flex-wrap:wrap;gap:10px"><button type="button" class="btn btn-ink" data-again>Play again</button> <a class="btn btn-outline" href="products/interval-trainer/">See the Interval Ear Trainer</a></p>`;
    box.querySelector('[data-again]').addEventListener('click', start);
  }

  function start() {
    round = 0;
    results = [];
    newQuestion();
    render();
  }

  box.addEventListener('keydown', (e) => {
    if (e.target.closest('input, select, textarea')) return;
    if (round >= ROUNDS) return;
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); schedulePair(); }
    else if (['1', '2', '3'].includes(e.key)) { e.preventDefault(); answer(TYPES[+e.key - 1].id); }
    else if (e.key === 'Enter' && answered && !e.target.closest('button')) { e.preventDefault(); advance(); }
  });
  start();
}
