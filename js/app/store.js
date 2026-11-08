// Fretwell Music Lab — practice room storage. Everything lives in this browser's local storage only.

const P = 'fretwell.';
const MAX_SESSIONS = 300;
const MAX_RECENT = 60;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(P + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(P + key, JSON.stringify(value)); return true; } catch { return false; }
}

export const dayKey = (ts = Date.now()) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* ------------------------------------------------------------------ prefs */
export const PREF_DEFAULTS = {
  naming: 'letters',        // letters | solfege-ti | solfege-si
  accidentals: 'sharps',    // sharps | flats (for black keys and frets)
  instrument: 'keys',       // keys | guitar
  tuning: 'standard',
  leftHanded: false,
  large: false,
};
export function getPrefs() { return { ...PREF_DEFAULTS, ...read('prefs', {}) }; }
export function setPrefs(patch) {
  const next = { ...getPrefs(), ...patch };
  write('prefs', next);
  if ('large' in patch) {
    document.documentElement.classList.toggle('is-large', !!next.large);
    try { localStorage.setItem('fretwell.large', next.large ? '1' : '0'); } catch { /* ignore */ }
  }
  return next;
}

/* --------------------------------------------------- tool settings & sets */
export function getToolSettings(toolId, defaults) {
  const saved = read('settings.' + toolId, {});
  return { ...defaults, ...saved };
}
export function saveToolSettings(toolId, settings) { write('settings.' + toolId, settings); }
export function getPresets(toolId) { return read('presets.' + toolId, []); }
export function savePreset(toolId, name, settings) {
  const list = getPresets(toolId).filter((p) => p.name !== name);
  list.push({ name, settings: { ...settings } });
  list.sort((a, b) => a.name.localeCompare(b.name));
  write('presets.' + toolId, list);
  return list;
}
export function deletePreset(toolId, name) {
  const list = getPresets(toolId).filter((p) => p.name !== name);
  write('presets.' + toolId, list);
  return list;
}

/* ---------------------------------------------------------- walkthroughs */
export const hasSeen = (toolId) => !!read('seen', {})[toolId];
export function markSeen(toolId) { const s = read('seen', {}); s[toolId] = 1; write('seen', s); }
export function resetSeen() { write('seen', {}); }

/* --------------------------------------------------------------- progress */
function getProgress() {
  const p = read('progress', null);
  if (p && p.v === 1 && p.tools) return p;
  return { v: 1, tools: {}, days: {} };
}
function toolRec(p, toolId) {
  if (!p.tools[toolId]) p.tools[toolId] = { last: 0, recent: [], items: {}, conf: {}, sessions: [], daily: {} };
  return p.tools[toolId];
}

export function recordAnswer(toolId, exercise, item, correct, { answer = null } = {}) {
  const p = getProgress();
  const t = toolRec(p, toolId);
  const now = Date.now();
  t.last = now;
  t.recent.push(correct ? 1 : 0);
  if (t.recent.length > MAX_RECENT) t.recent.splice(0, t.recent.length - MAX_RECENT);
  const k = exercise + '|' + item;
  const rec = t.items[k] || [0, 0, 0];
  rec[0]++; if (correct) rec[1]++; rec[2] = now;
  t.items[k] = rec;
  if (!correct && answer !== null && answer !== undefined && String(answer) !== String(item)) {
    const ck = k + '>' + answer;
    t.conf[ck] = (t.conf[ck] || 0) + 1;
  }
  const d = dayKey(now);
  const dd = t.daily[d] || [0, 0];
  dd[0]++; if (correct) dd[1]++;
  t.daily[d] = dd;
  p.days[d] = (p.days[d] || 0) + 1;
  write('progress', p);
}

export function recordSession(toolId, s) {
  const p = getProgress();
  const t = toolRec(p, toolId);
  t.sessions.push({ t: Date.now(), ex: s.exercise, n: s.total, c: s.correct, s: Math.round(s.seconds) });
  if (t.sessions.length > MAX_SESSIONS) t.sessions.splice(0, t.sessions.length - MAX_SESSIONS);
  write('progress', p);
}

export function toolStats(toolId) {
  const p = getProgress();
  const t = p.tools[toolId] || { last: 0, recent: [], items: {}, conf: {}, sessions: [], daily: {} };
  const answers = Object.values(t.daily).reduce((s, [n]) => s + n, 0);
  const correct = Object.values(t.daily).reduce((s, [, c]) => s + c, 0);
  const recentAcc = t.recent.length ? t.recent.reduce((a, b) => a + b, 0) / t.recent.length : null;
  return { ...t, answers, correct, recentAcc };
}

/** Items with the lowest accuracy (at least `min` attempts). */
export function weakestItems(toolId, { min = 3, limit = 6, exercise = null } = {}) {
  const t = toolStats(toolId);
  return Object.entries(t.items)
    .filter(([k, [n]]) => n >= min && (!exercise || k.startsWith(exercise + '|')))
    .map(([k, [n, c, last]]) => ({ key: k, exercise: k.split('|')[0], item: k.split('|').slice(1).join('|'), n, c, acc: c / n, last }))
    .filter((x) => x.acc < 1)
    .sort((a, b) => a.acc - b.acc || b.n - a.n)
    .slice(0, limit);
}

export function confusions(toolId, limit = 8) {
  const t = toolStats(toolId);
  return Object.entries(t.conf)
    .map(([k, n]) => {
      const [left, answer] = k.split('>');
      const [exercise, ...rest] = left.split('|');
      return { exercise, item: rest.join('|'), answer, n };
    })
    .sort((a, b) => b.n - a.n)
    .slice(0, limit);
}

/** Item accuracy map for adaptive question weighting. */
export function itemAccuracy(toolId, exercise) {
  const t = toolStats(toolId);
  const out = {};
  for (const [k, [n, c]] of Object.entries(t.items)) {
    if (!k.startsWith(exercise + '|')) continue;
    out[k.slice(exercise.length + 1)] = { n, c, acc: n ? c / n : 0 };
  }
  return out;
}

export function streak() {
  const days = getProgress().days;
  const has = (d) => !!days[dayKey(d)];
  const DAY = 86400000;
  let current = 0;
  let cursor = Date.now();
  if (!has(cursor)) cursor -= DAY; // a streak survives until the end of today
  while (has(cursor)) { current++; cursor -= DAY; }
  const sorted = Object.keys(days).sort();
  let best = 0, run = 0, prev = null;
  for (const d of sorted) {
    const t = new Date(d + 'T12:00:00').getTime();
    run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return { current, best: Math.max(best, current), practisedToday: has(Date.now()), totalDays: sorted.length };
}

/** Accuracy per day for the last `n` days, for one tool or all tools. */
export function dailySeries(toolId = null, n = 30) {
  const p = getProgress();
  const tools = toolId ? [p.tools[toolId]].filter(Boolean) : Object.values(p.tools);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = dayKey(Date.now() - i * 86400000);
    let a = 0, c = 0;
    for (const t of tools) { const v = t.daily[d]; if (v) { a += v[0]; c += v[1]; } }
    out.push({ day: d, answers: a, acc: a ? c / a : null });
  }
  return out;
}

export function clearProgress() {
  write('progress', { v: 1, tools: {}, days: {} });
}

/* ----------------------------------------------------------------- backup */
const BACKUP_TAG = 'fretwell-music-lab-backup';

function collectAll() {
  const settings = {}, presets = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(P + 'settings.')) settings[k.slice((P + 'settings.').length)] = read(k.slice(P.length), {});
      if (k.startsWith(P + 'presets.')) presets[k.slice((P + 'presets.').length)] = read(k.slice(P.length), []);
    }
  } catch { /* storage unavailable */ }
  return { settings, presets };
}

export function exportData() {
  const { settings, presets } = collectAll();
  return {
    app: BACKUP_TAG,
    v: 1,
    exported: new Date().toISOString(),
    progress: getProgress(),
    settings,
    presets,
    prefs: getPrefs(),
    seen: read('seen', {}),
    rhythmLatency: read('latency', null),
  };
}

export function exportCode() {
  const json = JSON.stringify(exportData());
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return 'FWB1.' + btoa(bin);
}

/** Restore from a backup code or JSON text. Returns { ok, message }. */
export function importBackup(text) {
  let data = null;
  const t = String(text || '').trim();
  try {
    if (t.startsWith('FWB1.')) {
      const bin = atob(t.slice(5).replace(/\s+/g, ''));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      data = JSON.parse(new TextDecoder().decode(bytes));
    } else {
      data = JSON.parse(t);
    }
  } catch {
    return { ok: false, message: 'That doesn’t look like a Fretwell backup. Copy the whole code, starting with FWB1., or choose the backup file.' };
  }
  if (!data || data.app !== BACKUP_TAG || !data.progress || data.progress.v !== 1) {
    return { ok: false, message: 'That backup couldn’t be read. Make sure it was made with “Export progress” in the practice room.' };
  }
  write('progress', data.progress);
  for (const [id, s] of Object.entries(data.settings || {})) write('settings.' + id, s);
  for (const [id, list] of Object.entries(data.presets || {})) write('presets.' + id, list);
  if (data.prefs) setPrefs(data.prefs);
  if (data.seen) write('seen', data.seen);
  if (data.rhythmLatency !== null && data.rhythmLatency !== undefined) write('latency', data.rhythmLatency);
  const tools = Object.keys(data.progress.tools || {}).length;
  return { ok: true, message: `Progress restored${tools ? ` for ${tools} tool${tools === 1 ? '' : 's'}` : ''}.` };
}

/* --------------------------------------------------------- misc settings */
export const getLatency = () => read('latency', { offset: 0, calibrated: false });
export const setLatency = (v) => write('latency', v);
export { read as readRaw, write as writeRaw };
