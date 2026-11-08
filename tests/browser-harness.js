// In-browser test harness for the practice room (used during development; not loaded by the site).
// Usage in the browser console on practice/: const H = (await import('../tests/browser-harness.js')).default;
// It wraps each tool's question generator so a test can read the expected answer, then drives
// sessions through the real interface.
const base = new URL('../js/', import.meta.url).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (k, opts = {}) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...opts }));
const kd = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

async function waitFor(sel, t = 5000) {
  const s = performance.now();
  while (performance.now() - s < t) { const el = document.querySelector(sel); if (el) return el; await sleep(40); }
  throw new Error('timeout ' + sel);
}
async function wrap(id) {
  const m = await import(base + 'tools/' + id + '.js');
  const d = m.default;
  if (!d.__w) {
    const o = d.createQuestion;
    d.createQuestion = function (...a) { const q = o.apply(this, a); window.__q = q; window.__qctx = a[0]; return q; };
    d.__w = true;
  }
  return d;
}
async function open(id, exercise, patch = {}) {
  await wrap(id);
  const k = 'fretwell.settings.' + id;
  const cur = JSON.parse(localStorage.getItem(k) || '{}');
  localStorage.setItem(k, JSON.stringify({ ...cur, ...patch, exercise }));
  localStorage.setItem('fretwell.seen', JSON.stringify({ ...JSON.parse(localStorage.getItem('fretwell.seen') || '{}'), [id]: 1 }));
  location.hash = '#/'; await sleep(120);
  location.hash = '#/tool/' + id;
  await waitFor('.start-btn');
  document.querySelector('.start-btn').click();
  await waitFor('.q-title');
  await sleep(200);
}
const fb = () => { const f = document.querySelector('.q-feedback'); return f && (f.classList.contains('is-right') ? 'right' : f.classList.contains('is-wrongans') ? 'wrong' : null); };
async function waitFb(t = 12000) { const s = performance.now(); while (performance.now() - s < t) { const r = fb(); if (r) return r; await sleep(60); } return 'none'; }
async function next() { key('Enter'); await sleep(200); }
const clickId = (id) => { const b = document.querySelector(`.choices .choice[data-id="${CSS.escape(id)}"]`); if (!b) throw new Error('no choice ' + id); b.click(); };
const accKeys = (a) => ({ '-2': ['-', '-'], '-1': ['-'], '0': [], '1': ['='], '2': ['=', '='] }[a]);
const typeNote = (n) => { for (const k of accKeys(n.a)) key(k); key('CDEFGAB'[n.l]); };
const clickCtl = (label) => { const b = [...document.querySelectorAll('.q-controls button')].find((x) => x.textContent.startsWith(label)); if (b) b.click(); return !!b; };

async function session(id, exercise, patch, answer, n) {
  await open(id, exercise, { sessionLength: n, ...patch });
  const results = [];
  for (let i = 0; i < n; i++) {
    await waitFor('.q-title');
    try { await answer(window.__q, window.__qctx); } catch (e) { results.push('ERR:' + e.message); }
    results.push(await waitFb());
    await next();
  }
  await sleep(300);
  const s = document.querySelector('.summary .stat-list');
  return { results: results.join(' '), summary: s ? s.innerText.replace(/\n/g, ' ') : 'NO SUMMARY' };
}

/** Move a fretboard's keyboard cursor to (string, fret) and choose it. */
function chooseFret(stringIdx, fret) {
  const svg = document.querySelector('.fretboard[tabindex]');
  svg.focus();
  for (let i = 0; i < 6; i++) kd(svg, 'ArrowDown');
  for (let i = 0; i < stringIdx; i++) kd(svg, 'ArrowUp');
  for (let i = 0; i < 18; i++) kd(svg, 'ArrowLeft');
  for (let i = 0; i < fret; i++) kd(svg, 'ArrowRight');
  kd(svg, 'Enter');
}
/** Move a piano keyboard's cursor to a MIDI note and choose it. */
function chooseKey(m) {
  const svg = document.querySelector('.keyboard[tabindex]');
  svg.focus();
  const keys = [...svg.querySelectorAll('[data-midi]')].map((r) => +r.getAttribute('data-midi'));
  const low = Math.min(...keys);
  for (let i = 0; i < 100; i++) kd(svg, 'ArrowLeft');
  for (let i = low; i < m; i++) kd(svg, 'ArrowRight');
  kd(svg, 'Enter');
}

export default { sleep, key, kd, waitFor, wrap, open, fb, waitFb, next, clickId, typeNote, clickCtl, session, chooseFret, chooseKey };
