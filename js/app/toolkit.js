// Fretwell Music Lab — the shell every tool runs in: tabs, practice sessions with immediate feedback,
// session summaries, progress, auto-saving settings and practice sets, walkthroughs, shortcuts,
// problem reports, plus shared answer inputs (choice buttons and a note-name pad).

import * as store from './store.js';
import { unlock, stopAll, isReady } from '../core/audio.js';
import { SITE_CONFIG } from '../site-config.js';
import { LETTERS, letterName, accidentalText, noteName } from '../core/theory.js';
import { art } from '../core/art.js';

/* ------------------------------------------------------------ DOM helper */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
  }
  return el;
}

export const kbd = (k) => h('span', { class: 'kbd', 'aria-hidden': 'true' }, k);
const CHOICE_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'w', 'e', 't', 'y', 'u', 'i', 'o', 'p', 'z', 'x', 'v'];

/* ------------------------------------------------------------ small parts */

export function progressRing(value, size = 64, label = '') {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const v = value === null || value === undefined ? 0 : Math.max(0, Math.min(1, value));
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'ring');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label || (value === null ? 'No answers yet' : `${Math.round(v * 100)} percent recent accuracy`));
  svg.innerHTML = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" fill="none" stroke-width="8"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" fill="none" stroke-width="8" stroke-dasharray="${(c * v).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="50%" dy="0.35em" text-anchor="middle" class="ring-text">${value === null || value === undefined ? '–' : Math.round(v * 100) + '%'}</text>`;
  return svg;
}

export function lineChart(series, { height = 160, label = 'Accuracy by day' } = {}) {
  const w = 600;
  const pad = { l: 36, r: 10, t: 12, b: 26 };
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${height}`);
  svg.setAttribute('class', 'chart');
  svg.setAttribute('role', 'img');
  const pts = series.map((s, i) => ({ ...s, x: pad.l + (i / Math.max(1, series.length - 1)) * (w - pad.l - pad.r) }));
  const y = (acc) => pad.t + (1 - acc) * (height - pad.t - pad.b);
  const withData = pts.filter((p) => p.acc !== null);
  const avg = withData.length ? withData.reduce((s, p) => s + p.acc, 0) / withData.length : null;
  svg.setAttribute('aria-label', withData.length ? `${label}: ${withData.length} days with practice in the last ${series.length} days, average accuracy ${Math.round(avg * 100)} percent.` : `${label}: no practice recorded in the last ${series.length} days.`);
  let inner = '';
  for (const g of [0, 0.5, 1]) inner += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(g)}" y2="${y(g)}" class="chart-grid"/><text x="${pad.l - 6}" y="${y(g) + 4}" text-anchor="end" class="chart-label">${g * 100}%</text>`;
  let path = '';
  let open = false;
  for (const p of pts) {
    if (p.acc === null) { open = false; continue; }
    path += `${open ? 'L' : 'M'}${p.x.toFixed(1)} ${y(p.acc).toFixed(1)} `;
    open = true;
  }
  if (path) inner += `<path d="${path}" class="chart-line" fill="none"/>`;
  for (const p of withData) inner += `<rect x="${p.x - 4}" y="${y(p.acc) - 4}" width="8" height="8" class="chart-dot"/>`;
  const first = series[0]?.day, last = series[series.length - 1]?.day;
  if (first) inner += `<text x="${pad.l}" y="${height - 6}" class="chart-label">${first.slice(5)}</text><text x="${w - pad.r}" y="${height - 6}" text-anchor="end" class="chart-label">${last.slice(5)}</text>`;
  if (!withData.length) inner += `<text x="${w / 2}" y="${height / 2}" text-anchor="middle" class="chart-empty">No practice in this period yet</text>`;
  svg.innerHTML = inner;
  return svg;
}

export const fmtDate = (ts) => (ts ? new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export function toolArt(meta) {
  const d = h('div', { class: `t-art t-art--${meta.color}` });
  d.innerHTML = art(meta.art);
  return d;
}

/* -------------------------------------------------------------- dialogs */

export function dialog({ title, body, actions = [], onClose = () => {}, label = null, wide = false }) {
  const prev = document.activeElement;
  const titleId = 'dlg-' + Math.random().toString(36).slice(2);
  const box = h('div', { class: 'dialog' + (wide ? ' dialog--wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId });
  if (label) box.appendChild(h('p', { class: 'dlg-step' }, label));
  box.appendChild(h('h2', { id: titleId, class: 'dlg-title' }, title));
  const content = h('div', { class: 'dlg-body' });
  if (typeof body === 'string') content.innerHTML = body; else if (body) content.appendChild(body);
  box.appendChild(content);
  const row = h('div', { class: 'dlg-actions' });
  box.appendChild(row);
  const backdrop = h('div', { class: 'dialog-backdrop' }, box);
  document.body.appendChild(backdrop);
  document.body.classList.add('has-dialog');
  function close(result) {
    backdrop.remove();
    document.body.classList.remove('has-dialog');
    document.removeEventListener('keydown', onKey, true);
    if (prev && prev.focus) prev.focus({ preventScroll: true });
    onClose(result);
  }
  function setActions(list) {
    row.textContent = '';
    list.forEach((a) => row.appendChild(h('button', { type: 'button', class: 'btn ' + (a.primary ? 'btn-ink' : 'btn-outline'), onclick: () => a.onClick ? a.onClick(close) : close(a.value) }, a.label)));
  }
  setActions(actions.length ? actions : [{ label: 'Close', primary: true }]);
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close('escape'); return; }
    if (e.key === 'Tab') {
      const f = [...box.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
    e.stopPropagation();
  }
  document.addEventListener('keydown', onKey, true);
  setTimeout(() => { const first = row.querySelector('.btn-ink') || row.querySelector('button'); first && first.focus(); }, 20);
  return { close, box, content, setActions, setTitle: (t) => { box.querySelector('.dlg-title').textContent = t; } };
}

export function confirmDialog(title, text, okLabel = 'Confirm') {
  return new Promise((resolve) => {
    dialog({ title, body: `<p>${text}</p>`, actions: [{ label: 'Cancel', value: false }, { label: okLabel, primary: true, value: true }], onClose: (v) => resolve(v === true) });
  });
}

/* ------------------------------------------------------- answer helpers */

/**
 * Multiple-choice buttons with number/letter shortcuts.
 * options: [{ id, label, sub }]. Returns { el, mark(correctId, chosenId), disable(), handleKey(e) }.
 */
export function choiceButtons(host, options, onPick, { columns = null, keys = CHOICE_KEYS, label = 'Answers' } = {}) {
  const wrap = h('div', { class: 'choices', role: 'group', 'aria-label': label });
  if (columns) wrap.style.setProperty('--cols', columns);
  const buttons = new Map();
  options.forEach((o, i) => {
    const key = keys[i];
    const b = h('button', { type: 'button', class: 'choice', 'data-id': o.id, 'aria-keyshortcuts': key || null },
      h('span', { class: 'choice-label' }, o.label), o.sub ? h('span', { class: 'choice-sub' }, o.sub) : null, key ? kbd(key.toUpperCase()) : null);
    b.addEventListener('click', () => onPick(o.id));
    buttons.set(o.id, { b, key });
    wrap.appendChild(b);
  });
  host.appendChild(wrap);
  return {
    el: wrap,
    mark(correctId, chosenId) {
      for (const [id, { b }] of buttons) {
        b.disabled = true;
        if (id === correctId) { b.classList.add('is-correct'); b.prepend(h('span', { class: 'mark', 'aria-hidden': 'true' }, '✓ ')); b.setAttribute('aria-label', b.textContent + ' (correct answer)'); }
        else if (id === chosenId) { b.classList.add('is-wrong'); b.prepend(h('span', { class: 'mark', 'aria-hidden': 'true' }, '✗ ')); b.setAttribute('aria-label', b.textContent + ' (your answer)'); }
      }
    },
    select(id) { for (const [bid, { b }] of buttons) b.setAttribute('aria-pressed', String(bid === id)); },
    disable() { for (const { b } of buttons.values()) b.disabled = true; },
    handleKey(e) {
      const k = e.key.toLowerCase();
      for (const [id, { key, b }] of buttons) if (key === k && !b.disabled) { onPick(id); return true; }
      return false;
    },
  };
}

/**
 * Note-name pad: seven letters plus accidental toggles. Keyboard: A–G pick a letter, - flat, = sharp, 0 natural.
 * onPick({ l, a }).
 */
export function notePad(host, { naming = 'letters', accidentals = true, doubles = false, onPick, label = 'Note name' } = {}) {
  let acc = 0;
  const wrap = h('div', { class: 'notepad', role: 'group', 'aria-label': label });
  const accRow = h('div', { class: 'notepad-acc', role: 'radiogroup', 'aria-label': 'Accidental' });
  const accDefs = doubles ? [[-2, '𝄫', '--'], [-1, '♭', '-'], [0, '♮', '0'], [1, '♯', '='], [2, '𝄪', '==']] : [[-1, '♭', '-'], [0, '♮', '0'], [1, '♯', '=']];
  const accBtns = accDefs.map(([v, sym, key]) => {
    const b = h('button', { type: 'button', class: 'choice choice--acc', role: 'radio', 'aria-checked': v === 0 ? 'true' : 'false', 'aria-label': { '-2': 'Double flat', '-1': 'Flat', '0': 'Natural', '1': 'Sharp', '2': 'Double sharp' }[v] },
      h('span', { class: 'choice-label' }, sym), kbd(key));
    b.addEventListener('click', () => setAcc(v));
    accRow.appendChild(b);
    return [v, b];
  });
  const letters = h('div', { class: 'notepad-letters' });
  const letterBtns = LETTERS.map((L, l) => {
    const b = h('button', { type: 'button', class: 'choice choice--note', 'data-l': l },
      h('span', { class: 'choice-label' }, letterName(l, naming)), naming !== 'letters' ? h('span', { class: 'choice-sub' }, L) : null, kbd(L));
    b.addEventListener('click', () => pick(l));
    letters.appendChild(b);
    return b;
  });
  if (accidentals) wrap.appendChild(accRow);
  wrap.appendChild(letters);
  host.appendChild(wrap);
  function setAcc(v) {
    acc = v;
    accBtns.forEach(([av, b]) => b.setAttribute('aria-checked', String(av === v)));
    letterBtns.forEach((b, l) => { b.querySelector('.choice-label').textContent = letterName(l, naming) + accidentalText(v); });
  }
  function pick(l) {
    const a = acc;
    setAcc(0);
    onPick({ l, a });
  }
  return {
    el: wrap,
    disable(d = true) { [...letterBtns, ...accBtns.map(([, b]) => b)].forEach((b) => { b.disabled = d; }); },
    handleKey(e) {
      const k = e.key;
      if (/^[a-gA-G]$/.test(k) && !e.ctrlKey && !e.metaKey && !e.altKey) { pick(LETTERS.indexOf(k.toUpperCase())); return true; }
      if (!accidentals) return false;
      if (k === '-' || k === '_') { setAcc(doubles && acc === -1 ? -2 : -1); return true; }
      if (k === '=' || k === '+') { setAcc(doubles && acc === 1 ? 2 : 1); return true; }
      if (k === '0') { setAcc(0); return true; }
      return false;
    },
  };
}

/** Weighted pick that favours items the player gets wrong. */
export function weightedItem(list, accMap, rng = Math.random, keyOf = (x) => x) {
  const weights = list.map((x) => {
    const s = accMap[keyOf(x)];
    if (!s || s.n < 2) return 2;
    return 1 + (1 - s.acc) * 4;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < list.length; i++) { r -= weights[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}

/* ------------------------------------------------------------ settings UI */

function field(def, settings, prefs, onChange) {
  const id = 'f-' + def.key + '-' + Math.random().toString(36).slice(2, 7);
  const getV = () => (def.pref ? prefs[def.pref] : settings[def.key]);
  const set = (v) => onChange(def, v);
  const wrap = h('div', { class: 'field field--' + def.type });
  if (def.type === 'heading') { wrap.appendChild(h('h3', { class: 'field-heading' }, def.label)); return wrap; }
  if (def.type === 'custom') { wrap.appendChild(def.render()); return wrap; }
  if (def.type === 'select') {
    wrap.appendChild(h('label', { for: id, class: 'field-label' }, def.label));
    const sel = h('select', { id }, def.options.map((o) => h('option', { value: String(o.value), selected: String(o.value) === String(getV()) }, o.label)));
    sel.addEventListener('change', () => {
      const o = def.options.find((x) => String(x.value) === sel.value);
      set(o ? o.value : sel.value);
    });
    wrap.appendChild(sel);
  } else if (def.type === 'segmented') {
    const lab = h('p', { class: 'field-label', id }, def.label);
    wrap.appendChild(lab);
    const row = h('div', { class: 'segmented', role: 'radiogroup', 'aria-labelledby': id });
    def.options.forEach((o) => {
      const b = h('button', { type: 'button', role: 'radio', class: 'seg', 'aria-checked': String(String(o.value) === String(getV())) }, o.label);
      b.addEventListener('click', () => { set(o.value); row.querySelectorAll('.seg').forEach((x) => x.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); });
      row.appendChild(b);
    });
    wrap.appendChild(row);
  } else if (def.type === 'checks') {
    const fs = h('fieldset', { class: 'checks' }, h('legend', { class: 'field-label' }, def.label));
    const cur = new Set(getV() || []);
    const grid = h('div', { class: 'checks-grid' });
    def.options.forEach((o) => {
      const cid = id + '-' + String(o.value).replace(/[^a-z0-9]/gi, '_');
      const cb = h('input', { type: 'checkbox', id: cid, checked: cur.has(o.value) });
      cb.addEventListener('change', () => {
        const next = new Set(getV() || []);
        if (cb.checked) next.add(o.value); else next.delete(o.value);
        if (next.size < (def.min || 1)) { cb.checked = true; msg.textContent = `Keep at least ${def.min || 1} selected.`; return; }
        msg.textContent = '';
        set(def.options.map((x) => x.value).filter((v) => next.has(v)));
      });
      grid.appendChild(h('label', { class: 'check', for: cid }, cb, h('span', {}, o.label)));
    });
    fs.appendChild(grid);
    const msg = h('p', { class: 'field-msg', role: 'status' });
    fs.appendChild(msg);
    if (def.quick) {
      const q = h('div', { class: 'checks-quick' });
      def.quick.forEach((qq) => q.appendChild(h('button', { type: 'button', class: 'btn btn-sm btn-outline', onclick: () => { set(qq.values.slice()); onChange(null, null, true); } }, qq.label)));
      fs.appendChild(q);
    }
    wrap.appendChild(fs);
  } else if (def.type === 'toggle') {
    const cb = h('input', { type: 'checkbox', id, checked: !!getV() });
    cb.addEventListener('change', () => set(cb.checked));
    wrap.appendChild(h('label', { class: 'toggle', for: id }, cb, h('span', { class: 'toggle-ui', 'aria-hidden': 'true' }), h('span', {}, def.label)));
  } else if (def.type === 'range') {
    const out = h('output', { for: id, class: 'range-out' }, def.format ? def.format(getV()) : String(getV()));
    wrap.appendChild(h('label', { for: id, class: 'field-label' }, def.label, ' ', out));
    const r = h('input', { type: 'range', id, min: def.min, max: def.max, step: def.step || 1, value: getV() });
    r.addEventListener('input', () => { out.textContent = def.format ? def.format(+r.value) : r.value; });
    r.addEventListener('change', () => set(+r.value));
    wrap.appendChild(r);
  }
  if (def.help) wrap.appendChild(h('p', { class: 'field-help' }, def.help));
  return wrap;
}

/* ----------------------------------------------------------------- shell */

const TABS = [['practice', 'Practice'], ['reference', 'Reference'], ['progress', 'Progress'], ['settings', 'Settings']];

/**
 * Mount a tool definition. def: { id, exercises, defaults, settingsSchema, walkthrough, createQuestion,
 * renderReference, itemLabel, shortcuts }. ctx: { meta, prefs, setRoute }.
 */
export function mountTool(container, def, ctx) {
  const meta = ctx.meta;
  let settings = store.getToolSettings(def.id, def.defaults);
  if (!def.exercises.some((e) => e.id === settings.exercise)) settings.exercise = def.exercises[0].id;
  let prefs = store.getPrefs();
  let tab = TABS.some(([t]) => t === ctx.tab) ? ctx.tab : 'practice';
  let mode = 'start';
  let session = null;
  let question = null;
  let qApi = null;
  let cleanupQ = null;
  const keyHandlers = [];

  const reportLink = h('a', { class: 'btn btn-sm btn-outline report-link', hidden: true }, 'Report a problem');
  const email = (SITE_CONFIG.supportEmail || '').trim();
  const updateReport = () => {
    if (!email) return;
    reportLink.hidden = false;
    const ex = def.exercises.find((e) => e.id === settings.exercise);
    const lines = [
      'Please describe what happened:', '', '', '---',
      `Tool: ${meta.full}`,
      `Exercise: ${ex ? ex.name : settings.exercise}`,
      question ? `Question: ${question.report || question.item}` : 'Question: (none open)',
      `Settings: ${JSON.stringify(settings)}`,
      `Browser: ${navigator.userAgent}`,
    ];
    reportLink.href = `mailto:${email}?subject=${encodeURIComponent('Problem report: ' + meta.name)}&body=${encodeURIComponent(lines.join('\n'))}`;
  };

  const shortcutsBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline', 'aria-keyshortcuts': '?' }, 'Shortcuts ', kbd('?'));
  const guideBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline' }, 'How it works');
  const head = h('header', { class: 'tool-head' },
    h('a', { class: 'tool-back', href: '#/' }, '← Practice room'),
    h('div', { class: 'tool-title-row' },
      toolArt(meta),
      h('h1', { class: 'tool-title', tabindex: '-1' }, meta.full)),
    h('div', { class: 'tool-head-actions' }, guideBtn, shortcutsBtn, reportLink));
  const tabsEl = h('div', { class: 'tool-tabs', role: 'tablist', 'aria-label': meta.name + ' sections' });
  const panel = h('div', { class: 'tool-panel', role: 'tabpanel', tabindex: '-1' });
  const tabButtons = TABS.map(([id, label]) => {
    const b = h('button', { type: 'button', role: 'tab', class: 'tool-tab', id: 'tab-' + id, 'aria-selected': String(id === tab), 'aria-controls': 'tool-panel', tabindex: id === tab ? '0' : '-1' }, label);
    b.addEventListener('click', () => switchTab(id));
    b.addEventListener('keydown', (e) => {
      const i = TABS.findIndex(([t]) => t === id);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0];
        switchTab(n);
        tabsEl.querySelector('#tab-' + n).focus();
      }
    });
    tabsEl.appendChild(b);
    return b;
  });
  panel.id = 'tool-panel';
  const root = h('section', { class: `tool tool--${meta.color}` }, head, tabsEl, panel);
  container.textContent = '';
  container.appendChild(root);

  function switchTab(id) {
    if (mode === 'session' && id !== 'practice' && session && session.total > 0) finishSession(true, false);
    tab = id;
    tabButtons.forEach((b, i) => { const on = TABS[i][0] === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    panel.setAttribute('aria-labelledby', 'tab-' + id);
    ctx.setRoute && ctx.setRoute(id);
    render();
  }

  function render() {
    teardownQuestion();
    stopAll();
    panel.textContent = '';
    if (tab === 'practice') {
      if (mode === 'session' && session) renderSession();
      else if (mode === 'summary' && session) renderSummary();
      else renderStart();
    } else if (tab === 'reference') {
      const ref = h('div', { class: 'reference' });
      panel.appendChild(ref);
      def.renderReference(ref, refCtx());
    } else if (tab === 'progress') renderProgress();
    else renderSettings();
    updateReport();
  }

  const refCtx = () => ({ settings, prefs, meta, h, ensureAudio, onKey: (fn) => keyHandlers.push(fn) });

  async function ensureAudio() { if (!isReady()) await unlock(); return isReady(); }

  /* ---- practice: start */
  function renderStart() {
    mode = 'start';
    const ex = def.exercises;
    const list = h('div', { class: 'ex-cards', role: 'radiogroup', 'aria-label': 'Exercise' });
    ex.forEach((e) => {
      const on = e.id === settings.exercise;
      const b = h('button', { type: 'button', role: 'radio', class: 'ex-card', 'aria-checked': String(on), tabindex: on ? '0' : '-1' },
        h('span', { class: 'ex-name' }, e.name), h('span', { class: 'ex-desc' }, e.description));
      b.addEventListener('click', () => { settings.exercise = e.id; save(); renderStartKeep(b); });
      b.addEventListener('keydown', (ev) => {
        const i = ex.findIndex((x) => x.id === e.id);
        if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(ev.key)) {
          ev.preventDefault();
          const n = ex[(i + (ev.key === 'ArrowDown' || ev.key === 'ArrowRight' ? 1 : ex.length - 1)) % ex.length];
          settings.exercise = n.id; save(); renderStart();
          panel.querySelector('.ex-card[aria-checked="true"]').focus();
        }
      });
      list.appendChild(b);
    });
    const summary = def.describeSettings ? def.describeSettings(settings, prefs) : '';
    const presets = store.getPresets(def.id);
    const presetSel = presets.length ? h('label', { class: 'preset-pick' }, 'Practice set ',
      h('select', { onchange: (e) => { const p = presets.find((x) => x.name === e.target.value); if (p) { settings = { ...def.defaults, ...p.settings }; save(); renderStart(); } } },
        h('option', { value: '' }, 'Current settings'), presets.map((p) => h('option', { value: p.name }, p.name)))) : null;
    const startBtn = h('button', { type: 'button', class: 'btn btn-ink btn-lg start-btn' }, 'Start practice ', kbd('Enter'));
    startBtn.addEventListener('click', startSession);
    panel.append(
      h('div', { class: 'practice-start' },
        h('h2', { class: 'panel-title' }, 'Choose an exercise'),
        list,
        h('div', { class: 'start-row' },
          h('div', { class: 'start-info' },
            h('p', {}, h('strong', {}, sessionLabel()), summary ? ' · ' + summary : ''),
            h('p', {}, h('button', { type: 'button', class: 'linklike', onclick: () => switchTab('settings') }, 'Change settings'), presetSel ? ' · ' : '', presetSel)),
          startBtn),
        h('p', { class: 'vol-tip' }, 'Tip: start at a low volume, especially with headphones. Adjust it with the volume slider at the top.')));
  }
  function renderStartKeep(btn) {
    panel.querySelectorAll('.ex-card').forEach((b) => { const on = b === btn; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
  }
  const sessionLabel = () => (settings.sessionLength ? `${settings.sessionLength} questions` : 'Open-ended session');

  async function startSession() {
    await ensureAudio();
    session = { exercise: settings.exercise, total: 0, correct: 0, run: 0, bestRun: 0, started: performance.now(), missed: {}, answered: false };
    mode = 'session';
    render();
  }

  /* ---- practice: session */
  function renderSession() {
    const ex = def.exercises.find((e) => e.id === session.exercise);
    const progress = h('span', { class: 'sb-count' });
    const score = h('span', { class: 'sb-score' });
    const endBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline' }, 'End session');
    endBtn.addEventListener('click', () => finishSession(true));
    const bar = h('div', { class: 'session-bar' }, h('span', { class: 'sb-ex' }, ex.name), progress, score, endBtn);
    const title = h('h2', { class: 'q-title', tabindex: '-1' });
    const sub = h('p', { class: 'q-sub' });
    const stage = h('div', { class: 'q-stage' });
    const controls = h('div', { class: 'q-controls' });
    const feedback = h('div', { class: 'q-feedback', role: 'status', 'aria-live': 'polite' });
    const nextRow = h('div', { class: 'q-next' });
    panel.append(h('div', { class: 'session' }, bar, h('div', { class: 'q-prompt' }, title, sub), stage, controls, feedback, nextRow));

    const updateBar = () => {
      progress.textContent = settings.sessionLength ? `Question ${Math.min(session.total + (session.answered ? 0 : 1), settings.sessionLength)} of ${settings.sessionLength}` : `Question ${session.total + (session.answered ? 0 : 1)}`;
      score.innerHTML = `<span class="ok-t">✓ ${session.correct}</span> <span class="bad-t">✗ ${session.total - session.correct}</span>`;
    };

    function next() {
      teardownQuestion();
      stopAll();
      if (settings.sessionLength && session.total >= settings.sessionLength) { finishSession(false); return; }
      session.answered = false;
      stage.textContent = ''; controls.textContent = ''; feedback.textContent = ''; feedback.className = 'q-feedback'; nextRow.textContent = '';
      const q = def.createQuestion({ settings, prefs, toolId: def.id, exercise: session.exercise, accuracy: store.itemAccuracy(def.id, session.exercise), session });
      question = q;
      title.textContent = q.prompt || '';
      sub.textContent = q.sub || '';
      sub.hidden = !q.sub;
      const extra = [];
      qApi = {
        settings, prefs, h,
        choices: (host, options, onPick, opts) => { const c = choiceButtons(host, options, onPick, opts); extra.push(c); return c; },
        notePad: (host, opts) => { const p = notePad(host, { naming: prefs.naming, ...opts }); extra.push(p); return p; },
        submit: (r) => submit(r),
        setPrompt: (t, s) => { title.textContent = t; if (s !== undefined) { sub.textContent = s; sub.hidden = !s; } },
        addControl: (label, onClick, { key = null, primary = false, id = null } = {}) => {
          const b = h('button', { type: 'button', class: 'btn ' + (primary ? 'btn-ink' : 'btn-outline'), 'data-ctl': id || '' }, label, key ? kbd(key) : null);
          b.addEventListener('click', onClick);
          controls.appendChild(b);
          if (primary) b.dataset.primary = '1';
          return b;
        },
        onKey: (fn) => extra.push({ handleKey: fn }),
        answered: () => session.answered,
        // Record an extra stat (for example one chord inside a progression) without counting a question.
        record: (item, correct, answer = null) => store.recordAnswer(def.id, session.exercise, item, correct, { answer }),
        stage,
      };
      if (q.play) {
        const rb = qApi.addControl(q.replayLabel || 'Replay', () => { if (q.canReplay && !q.canReplay()) return; ensureAudio().then(() => q.play()); }, { key: 'R', id: 'replay' });
        q._replayBtn = rb;
      }
      cleanupQ = q.render(stage, qApi) || null;
      qApi._extra = extra;
      updateBar();
      if (q.play && q.autoPlay !== false) ensureAudio().then(() => setTimeout(() => q.play(), 120));
      updateReport();
      title.focus({ preventScroll: true });
    }

    function submit(r) {
      if (session.answered) return;
      session.answered = true;
      session.total++;
      if (r.correct) { session.correct++; session.run++; session.bestRun = Math.max(session.bestRun, session.run); }
      else {
        session.run = 0;
        const label = def.itemLabel ? def.itemLabel(r.item ?? question.item, session.exercise) : (r.item ?? question.item);
        session.missed[label] = (session.missed[label] || 0) + 1;
      }
      store.recordAnswer(def.id, session.exercise, r.item ?? question.item, !!r.correct, { answer: r.answer });
      feedback.className = 'q-feedback ' + (r.correct ? 'is-right' : 'is-wrongans');
      feedback.textContent = '';
      feedback.append(h('span', { class: 'fb-icon', 'aria-hidden': 'true' }, r.correct ? '✓' : '✗'),
        h('div', { class: 'fb-text' }, h('strong', {}, r.correct ? (r.title || 'Correct.') : (r.title || 'Not quite.')), ' ', r.html ? h('span', { html: r.message }) : (r.message || '')));
      if (r.actions) {
        const acts = h('div', { class: 'fb-actions' });
        r.actions.forEach((a) => acts.appendChild(h('button', { type: 'button', class: 'btn btn-sm btn-outline', onclick: () => ensureAudio().then(a.onClick) }, a.label)));
        feedback.appendChild(acts);
      }
      controls.querySelectorAll('[data-primary]').forEach((b) => { b.disabled = true; });
      const last = settings.sessionLength && session.total >= settings.sessionLength;
      const nb = h('button', { type: 'button', class: 'btn btn-ink btn-lg' }, last ? 'See summary ' : 'Next ', kbd('Enter'));
      nb.addEventListener('click', next);
      nextRow.appendChild(nb);
      updateBar();
      nb.focus({ preventScroll: true });
      feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    session.next = next;
    next();
  }

  function teardownQuestion() {
    if (cleanupQ) { try { cleanupQ(); } catch { /* ignore */ } }
    cleanupQ = null;
    question = null;
    qApi = null;
  }

  function finishSession(early, rerender = true) {
    teardownQuestion();
    stopAll();
    if (!session) return;
    const secs = (performance.now() - session.started) / 1000;
    if (session.total > 0) store.recordSession(def.id, { exercise: session.exercise, total: session.total, correct: session.correct, seconds: secs });
    session.seconds = secs;
    session.early = early;
    if (session.total === 0) { session = null; mode = 'start'; if (rerender) render(); return; }
    mode = 'summary';
    if (rerender) render();
  }

  /* ---- practice: summary */
  function renderSummary() {
    const s = session;
    const acc = s.total ? s.correct / s.total : 0;
    const mins = Math.floor(s.seconds / 60), secs = Math.round(s.seconds % 60);
    const ex = def.exercises.find((e) => e.id === s.exercise);
    const missed = Object.entries(s.missed).sort((a, b) => b[1] - a[1]);
    const weak = store.weakestItems(def.id, { exercise: s.exercise, limit: 5 });
    const again = h('button', { type: 'button', class: 'btn btn-ink btn-lg' }, 'Practise again ', kbd('Enter'));
    again.addEventListener('click', startSession);
    panel.append(h('div', { class: 'summary' },
      h('h2', { class: 'panel-title', tabindex: '-1' }, s.early ? 'Session ended' : 'Session complete'),
      h('p', { class: 'summary-ex' }, ex.name),
      h('div', { class: 'summary-stats' },
        progressRing(acc, 120, `${Math.round(acc * 100)} percent correct`),
        h('dl', { class: 'stat-list' },
          h('div', {}, h('dt', {}, 'Correct'), h('dd', {}, `${s.correct} of ${s.total}`)),
          h('div', {}, h('dt', {}, 'Time'), h('dd', {}, `${mins} min ${secs} s`)),
          h('div', {}, h('dt', {}, 'Best run'), h('dd', {}, String(s.bestRun))),
          h('div', {}, h('dt', {}, 'Practice streak'), h('dd', {}, `${store.streak().current} day${store.streak().current === 1 ? '' : 's'}`)))),
      missed.length ? h('div', { class: 'summary-block' }, h('h3', {}, 'To review from this session'),
        h('ul', { class: 'review-list' }, missed.map(([label, n]) => h('li', {}, h('span', { class: 'bad-t', 'aria-hidden': 'true' }, '✗ '), label, n > 1 ? ` (${n}×)` : '')))) :
        h('p', { class: 'summary-perfect' }, h('span', { class: 'ok-t', 'aria-hidden': 'true' }, '✓ '), 'No mistakes in this session.'),
      weak.length ? h('div', { class: 'summary-block' }, h('h3', {}, 'Weakest items overall'),
        h('ul', { class: 'review-list' }, weak.map((w) => h('li', {}, `${def.itemLabel ? def.itemLabel(w.item, w.exercise) : w.item} — ${Math.round(w.acc * 100)}% of ${w.n}`)))) : null,
      h('div', { class: 'summary-actions' }, again,
        h('button', { type: 'button', class: 'btn btn-outline', onclick: () => { mode = 'start'; switchTab('settings'); } }, 'Change settings'),
        h('a', { class: 'btn btn-outline', href: '#/' }, 'Back to practice room'))));
    panel.querySelector('.panel-title').focus({ preventScroll: true });
    session.summaryShown = true;
  }

  /* ---- progress */
  function renderProgress() {
    const t = store.toolStats(def.id);
    const weak = store.weakestItems(def.id, { limit: 8 });
    const conf = store.confusions(def.id, 8);
    const st = store.streak();
    const byEx = {};
    for (const [k, [n, c]] of Object.entries(t.items)) {
      const ex = k.split('|')[0];
      byEx[ex] = byEx[ex] || [0, 0];
      byEx[ex][0] += n; byEx[ex][1] += c;
    }
    const exName = (id) => (def.exercises.find((e) => e.id === id) || { name: id }).name;
    panel.append(h('div', { class: 'progress-view' },
      h('h2', { class: 'panel-title' }, 'Your progress'),
      h('div', { class: 'stat-tiles' },
        statTile('Answers', String(t.answers)),
        statTile('Accuracy', t.answers ? Math.round((t.correct / t.answers) * 100) + '%' : '–'),
        statTile('Recent accuracy', t.recentAcc === null ? '–' : Math.round(t.recentAcc * 100) + '%'),
        statTile('Sessions', String(t.sessions.length)),
        statTile('Streak', `${st.current} day${st.current === 1 ? '' : 's'}`),
        statTile('Last practised', t.last ? fmtDate(t.last) : 'Not yet')),
      h('h3', {}, 'Accuracy over the last 30 days'),
      lineChart(store.dailySeries(def.id, 30)),
      def.detailedProgress ? exerciseCharts(t, exName) : null,
      Object.keys(byEx).length ? h('div', { class: 'progress-block' }, h('h3', {}, 'By exercise'),
        h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Exercise'), h('th', { scope: 'col' }, 'Answers'), h('th', { scope: 'col' }, 'Accuracy'))),
          h('tbody', {}, Object.entries(byEx).map(([ex, [n, c]]) => h('tr', {}, h('th', { scope: 'row' }, exName(ex)), h('td', {}, String(n)), h('td', {}, Math.round((c / n) * 100) + '%')))))) : null,
      h('div', { class: 'progress-block' }, h('h3', {}, 'Weakest items'),
        weak.length ? h('ul', { class: 'review-list' }, weak.map((w) => h('li', {}, h('strong', {}, def.itemLabel ? def.itemLabel(w.item, w.exercise) : w.item), ` — ${Math.round(w.acc * 100)}% correct over ${w.n} tries (${exName(w.exercise)})`)))
          : h('p', { class: 'muted' }, 'Items appear here once you have answered them at least three times.')),
      conf.length ? h('div', { class: 'progress-block' }, h('h3', {}, 'Most confused answers'),
        h('ul', { class: 'review-list' }, conf.map((c) => h('li', {}, `${def.itemLabel ? def.itemLabel(c.item, c.exercise) : c.item}: answered as ${def.itemLabel ? def.itemLabel(c.answer, c.exercise) : c.answer} — ${c.n}×`)))) : null,
      t.sessions.length ? h('div', { class: 'progress-block' }, h('h3', {}, 'Recent sessions'),
        h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Date'), h('th', { scope: 'col' }, 'Exercise'), h('th', { scope: 'col' }, 'Score'))),
          h('tbody', {}, t.sessions.slice(-10).reverse().map((s) => h('tr', {}, h('td', {}, fmtDate(s.t)), h('td', {}, exName(s.ex)), h('td', {}, `${s.c}/${s.n}`)))))) : null,
      h('p', { class: 'muted' }, 'Progress is stored only in this browser. Use “Export progress” on the practice room’s Progress page to move it to another device.')));
  }
  function exerciseCharts(t, exName) {
    // Accuracy over time for each exercise, built from the session history.
    const days = [];
    for (let i = 29; i >= 0; i--) days.push(store.dayKey(Date.now() - i * 86400000));
    const blocks = def.exercises.map((e) => {
      const per = {};
      for (const s of t.sessions) if (s.ex === e.id) { const d = store.dayKey(s.t); per[d] = per[d] || [0, 0]; per[d][0] += s.n; per[d][1] += s.c; }
      if (!Object.keys(per).length) return null;
      const series = days.map((d) => ({ day: d, answers: per[d] ? per[d][0] : 0, acc: per[d] ? per[d][1] / per[d][0] : null }));
      return h('div', { class: 'progress-block' }, h('h4', {}, exName(e.id)), lineChart(series, { height: 120, label: `${exName(e.id)} accuracy by day` }));
    }).filter(Boolean);
    return blocks.length ? h('div', {}, h('h3', {}, 'Each exercise over the last 30 days'), ...blocks) : null;
  }
  const statTile = (label, value) => h('div', { class: 'stat-tile' }, h('span', { class: 'st-value' }, value), h('span', { class: 'st-label' }, label));

  /* ---- settings */
  function renderSettings() {
    const form = h('div', { class: 'settings-form' });
    const schema = def.settingsSchema(settings, prefs);
    const onChange = (fdef, v, rerender = false) => {
      if (fdef) {
        if (fdef.pref) { prefs = store.setPrefs({ [fdef.pref]: v }); }
        else settings[fdef.key] = v;
        save();
        status.textContent = 'Saved.';
        setTimeout(() => { status.textContent = ''; }, 1400);
      }
      if (rerender || (fdef && fdef.rerender)) { const y = window.scrollY; render(); window.scrollTo(0, y); }
    };
    for (const f of schema) form.appendChild(field(f, settings, prefs, onChange));
    const status = h('p', { class: 'save-status', role: 'status', 'aria-live': 'polite' });
    const nameInput = h('input', { type: 'text', class: 'input', id: 'preset-name', maxlength: '40', placeholder: 'e.g. Thirds and sixths' });
    const presetList = h('ul', { class: 'preset-list' });
    const drawPresets = () => {
      presetList.textContent = '';
      const list = store.getPresets(def.id);
      if (!list.length) presetList.appendChild(h('li', { class: 'muted' }, 'No saved practice sets yet.'));
      list.forEach((p) => presetList.appendChild(h('li', {},
        h('span', { class: 'preset-name' }, p.name),
        h('button', { type: 'button', class: 'btn btn-sm btn-outline', onclick: () => { settings = { ...def.defaults, ...p.settings }; save(); render(); } }, 'Use'),
        h('button', { type: 'button', class: 'btn btn-sm btn-outline', 'aria-label': `Delete practice set ${p.name}`, onclick: () => { store.deletePreset(def.id, p.name); drawPresets(); } }, 'Delete'))));
    };
    drawPresets();
    panel.append(h('div', { class: 'settings-view' },
      h('h2', { class: 'panel-title' }, 'Settings'),
      h('p', { class: 'muted' }, 'Changes save automatically on this device.'),
      status,
      form,
      h('div', { class: 'preset-box' },
        h('h3', {}, 'Practice sets'),
        h('p', {}, 'Save the current settings under a name to switch back to them quickly.'),
        h('div', { class: 'preset-save' }, h('label', { for: 'preset-name', class: 'field-label' }, 'Name'), nameInput,
          h('button', { type: 'button', class: 'btn btn-ink', onclick: () => { const n = nameInput.value.trim(); if (!n) { nameInput.focus(); return; } store.savePreset(def.id, n, settings); nameInput.value = ''; drawPresets(); status.textContent = `Saved practice set “${n}”.`; } }, 'Save practice set')),
        presetList),
      h('p', {}, h('button', { type: 'button', class: 'btn btn-outline', onclick: () => { settings = { ...def.defaults }; save(); render(); } }, 'Reset to defaults'))));
  }

  function save() { store.saveToolSettings(def.id, settings); updateReport(); }

  /* ---- walkthrough & shortcuts */
  function walkthrough() {
    const steps = def.walkthrough;
    let i = 0;
    const d = dialog({ title: steps[0].title, body: `<p>${steps[0].text}</p>`, label: `Step 1 of ${steps.length}`, onClose: () => store.markSeen(def.id) });
    const draw = () => {
      d.setTitle(steps[i].title);
      d.content.innerHTML = `<p>${steps[i].text}</p>`;
      d.box.querySelector('.dlg-step').textContent = `Step ${i + 1} of ${steps.length}`;
      const acts = [{ label: 'Skip', onClick: (close) => close('skip') }];
      if (i > 0) acts.push({ label: 'Back', onClick: () => { i--; draw(); } });
      acts.push(i < steps.length - 1 ? { label: 'Next', primary: true, onClick: () => { i++; draw(); } } : { label: 'Start practising', primary: true, onClick: (close) => close('done') });
      d.setActions(acts);
      setTimeout(() => d.box.querySelector('.btn-ink')?.focus(), 10);
    };
    draw();
  }
  function shortcuts() {
    const rows = [['?', 'Show this list'], ['Enter', 'Start, check, or go to the next question'], ['R', 'Replay the sound'], ['1–9', 'Choose an answer'], ...(def.shortcuts || []), ['Esc', 'Close a dialog']];
    const tbl = h('table', { class: 'data-table' }, h('tbody', {}, rows.map(([k, v]) => h('tr', {}, h('th', { scope: 'row' }, h('kbd', {}, k)), h('td', {}, v)))));
    dialog({ title: 'Keyboard shortcuts', body: tbl });
  }
  guideBtn.addEventListener('click', walkthrough);
  shortcutsBtn.addEventListener('click', shortcuts);

  /* ---- keys */
  function onKey(e) {
    if (document.body.classList.contains('has-dialog')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' && t.type !== 'checkbox' && t.type !== 'range' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (e.key === '?') { e.preventDefault(); shortcuts(); return; }
    if (tab === 'practice' && mode === 'start' && e.key === 'Enter' && !(t && t.closest && t.closest('button, a, select'))) { e.preventDefault(); startSession(); return; }
    if (tab === 'practice' && mode === 'summary' && e.key === 'Enter' && !(t && t.closest && t.closest('button, a'))) { e.preventDefault(); startSession(); return; }
    if (tab === 'practice' && mode === 'session' && session) {
      if (session.answered && e.key === 'Enter') {
        if (t && t.closest && (t.closest('button, a') && !t.closest('.q-next') || t.closest('.fretboard[tabindex], .keyboard[tabindex]'))) return;
        e.preventDefault(); session.next(); return;
      }
      if (!session.answered && e.key === 'Enter') {
        if (t && t.closest && t.closest('button, a, .fretboard[tabindex], .keyboard[tabindex]')) return;
        const primary = panel.querySelector('.q-controls [data-primary]:not([disabled])');
        if (primary) { e.preventDefault(); primary.click(); return; }
      }
      if (t && t.closest && t.closest('.fretboard[tabindex], .keyboard[tabindex]') && (e.key.startsWith('Arrow') || e.key === ' ' || e.key === 'Enter')) return;
      if (qApi && qApi._extra) for (const x of qApi._extra) if (x.handleKey && !session.answered && x.handleKey(e)) { e.preventDefault(); return; }
      if ((e.key === 'r' || e.key === 'R') && question && question.play) {
        e.preventDefault();
        if (question.canReplay && !question.canReplay()) return;
        ensureAudio().then(() => question.play());
        return;
      }
    }
    if (tab === 'reference') for (const fn of keyHandlers) if (fn(e)) { e.preventDefault(); return; }
  }
  document.addEventListener('keydown', onKey);

  render();
  if (!store.hasSeen(def.id) && def.walkthrough && def.walkthrough.length) setTimeout(walkthrough, 250);
  head.querySelector('.tool-title').focus({ preventScroll: true });

  return () => {
    document.removeEventListener('keydown', onKey);
    if (mode === 'session' && session && session.total > 0) finishSession(true, false);
    teardownQuestion();
    stopAll();
  };
}

export { noteName };
