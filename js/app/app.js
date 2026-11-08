// Fretwell Music Lab — the practice room.
import '../site.js';
import { TOOLS, TOOL_BY_ID, LOADERS } from './registry.js';
import * as store from './store.js';
import { h, mountTool, progressRing, lineChart, fmtDate, toolArt, confirmDialog } from './toolkit.js';
import { getKeys, addKey, clearKeys, unlockedTools } from '../core/keys.js';
import { validateKey } from '../core/license.js';
import { PRODUCT_BY_ID } from '../products.js';
import { unlockOnFirstGesture, setVolume, getVolume } from '../core/audio.js';
import { segmentedKeyInput } from '../core/key-input.js';
import { TUNINGS } from '../core/theory.js';

const app = document.getElementById('app');
let unmount = null;

unlockOnFirstGesture();
document.querySelectorAll('input[data-volume]').forEach((el) => {
  el.value = getVolume();
  el.addEventListener('input', () => setVolume(+el.value));
});
if (store.getPrefs().large) document.documentElement.classList.add('is-large');

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(() => { /* offline support unavailable */ });
  });
}

function setNav(name) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

function focusHeading() {
  const hd = app.querySelector('h1');
  if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
  window.scrollTo(0, 0);
}

function route() {
  if (unmount) { unmount(); unmount = null; }
  const hash = location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'tool' && parts[1]) return openTool(parts[1], parts[2]);
  if (parts[0] === 'progress') return progressView();
  if (parts[0] === 'settings') return settingsView();
  if (parts[0] === 'keys') return keysView();
  return roomView();
}
window.addEventListener('hashchange', route);

/* -------------------------------------------------------------- room */
function roomView(message = '') {
  setNav('room');
  document.title = 'Practice room — Fretwell Music Lab';
  const tools = unlockedTools();
  app.textContent = '';
  const st = store.streak();
  const wrap = h('div', { class: 'wrap room' });
  wrap.appendChild(h('div', { class: 'room-head' },
    h('div', {}, h('p', { class: 'eyebrow' }, 'Practice room'), h('h1', { class: 'display-sm' }, tools.length ? 'Your tools' : 'Welcome')),
    tools.length ? h('div', { class: 'room-streak' },
      h('span', { class: 'rs-num' }, String(st.current)), h('span', { class: 'rs-label' }, `day streak${st.practisedToday ? ' · practised today' : ''}`)) : null));
  if (message) wrap.appendChild(h('p', { class: 'notice', role: 'status' }, message));
  if (!tools.length) {
    wrap.appendChild(h('div', { class: 'empty-room' },
      h('p', { class: 'lede' }, 'No tools are unlocked on this device yet. Enter the license key from your order confirmation page to open your tools here.'),
      keyEntry((msg) => roomView(msg)),
      h('p', {}, 'Don’t have a key yet? ', h('a', { href: '../#foundations' }, 'See the tools'), '.')));
  } else {
    const grid = h('div', { class: 'room-grid' });
    for (const id of TOOLS.map((t) => t.id).filter((x) => tools.includes(x))) {
      const meta = TOOL_BY_ID[id];
      const s = store.toolStats(id);
      grid.appendChild(h('a', { class: `room-card room-card--${meta.color}`, href: `#/tool/${id}` },
        toolArt(meta),
        h('div', { class: 'rc-body' },
          h('p', { class: 'rc-tier' }, meta.studio ? 'Studio Edition' : 'Foundations'),
          h('h2', { class: 'rc-title' }, meta.name),
          h('p', { class: 'rc-blurb' }, meta.blurb),
          h('div', { class: 'rc-meta' },
            progressRing(s.recentAcc, 64),
            h('p', { class: 'rc-last' }, s.last ? ['Last practised', h('br'), h('strong', {}, fmtDate(s.last))] : ['Not practised yet', h('br'), h('strong', {}, 'Open to start')])))));
    }
    wrap.appendChild(grid);
    wrap.appendChild(h('p', { class: 'muted room-note' }, 'The ring shows your accuracy over your most recent answers in each tool. ', h('a', { href: '#/keys' }, 'Add another key'), ' to bring more tools into this room.'));
    const installHint = h('div', { class: 'install-hint' }, h('h2', {}, 'Use it offline'),
      h('p', {}, 'This practice room keeps working without an internet connection once it has loaded. To open it like an app, use your browser’s “Install” option, or on iPhone and iPad tap Share, then “Add to Home Screen”.'));
    wrap.appendChild(installHint);
  }
  app.appendChild(wrap);
  focusHeading();
}

function keyEntry(onSaved) {
  const form = h('form', { class: 'key-form key-form--inline', novalidate: true },
    h('fieldset', {}, h('legend', { class: 'key-legend' }, 'License key'),
      h('div', { class: 'key-boxes' },
        h('span', { class: 'key-prefix', 'aria-hidden': 'true' }, 'FRET'), h('span', { class: 'key-dash', 'aria-hidden': 'true' }, '–'),
        h('input', { class: 'key-box key-box--2', 'data-len': '2', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Key part 1 of 4: product code, 2 characters' }),
        h('span', { class: 'key-dash', 'aria-hidden': 'true' }, '–'),
        h('input', { class: 'key-box key-box--5', 'data-len': '5', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Key part 2 of 4: 5 characters' }),
        h('span', { class: 'key-dash', 'aria-hidden': 'true' }, '–'),
        h('input', { class: 'key-box key-box--5', 'data-len': '5', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Key part 3 of 4: 5 characters' }),
        h('span', { class: 'key-dash', 'aria-hidden': 'true' }, '–'),
        h('input', { class: 'key-box key-box--4', 'data-len': '4', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Key part 4 of 4: 4 characters' }))),
    h('p', { class: 'key-hint' }, 'Type or paste your whole key into any box.'),
    h('p', { class: 'key-error', role: 'alert' }),
    h('button', { type: 'submit', class: 'btn btn-ink btn-lg' }, 'Unlock'));
  const err = form.querySelector('.key-error');
  const input = segmentedKeyInput(form.querySelector('.key-boxes'), { onChange: () => { err.textContent = ''; } });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = validateKey(input.value());
    if (!v.ok) { err.textContent = input.isEmpty() ? 'Enter your license key to continue.' : v.message; input.mark('error'); input.focus(); return; }
    const r = addKey(v.key);
    if (!r.ok) { err.textContent = r.message; return; }
    const p = PRODUCT_BY_ID[v.product];
    onSaved(r.already ? `That key was already saved. ${p.name} is in your room.` : `Key accepted. ${p.name} is now in your practice room.`);
  });
  return form;
}

/* -------------------------------------------------------------- tool */
async function openTool(id, tab) {
  const meta = TOOL_BY_ID[id];
  if (!meta || !LOADERS[id]) { location.hash = '#/'; return; }
  if (!unlockedTools().includes(id)) { roomView(`${meta.name} isn’t unlocked on this device. Enter its key on the Keys page.`); return; }
  setNav('room');
  document.title = `${meta.name} — Practice room — Fretwell Music Lab`;
  app.textContent = '';
  const host = h('div', { class: 'wrap tool-host' }, h('p', { class: 'app-loading' }, `Opening ${meta.name}…`));
  app.appendChild(host);
  let mod;
  try { mod = await LOADERS[id](); } catch {
    host.textContent = '';
    host.appendChild(h('div', { class: 'notice' }, h('h1', {}, 'This tool couldn’t load'), h('p', {}, 'Check your connection and try again. Once a tool has loaded online, it works offline too.'), h('button', { class: 'btn btn-ink', type: 'button', onclick: route }, 'Try again')));
    return;
  }
  if (!location.hash.startsWith('#/tool/' + id)) return;
  unmount = mountTool(host, mod.default, {
    meta,
    tab,
    setRoute: (t) => { const want = `#/tool/${id}${t && t !== 'practice' ? '/' + t : ''}`; if (location.hash !== want) history.replaceState(null, '', want); },
  });
  window.scrollTo(0, 0);
}

/* -------------------------------------------------------------- progress */
function progressView() {
  setNav('progress');
  document.title = 'Progress — Practice room — Fretwell Music Lab';
  app.textContent = '';
  const tools = unlockedTools();
  const st = store.streak();
  const totals = TOOLS.map((t) => ({ meta: t, s: store.toolStats(t.id) })).filter((x) => tools.includes(x.meta.id) || x.s.answers > 0);
  const answers = totals.reduce((s, x) => s + x.s.answers, 0);
  const correct = totals.reduce((s, x) => s + x.s.correct, 0);
  const weak = totals.flatMap((x) => store.weakestItems(x.meta.id, { limit: 3 }).map((w) => ({ ...w, tool: x.meta })))
    .sort((a, b) => a.acc - b.acc).slice(0, 8);
  const status = h('p', { class: 'save-status', role: 'status', 'aria-live': 'polite' });
  const codeOut = h('textarea', { class: 'input code-box', rows: '4', readonly: true, 'aria-label': 'Backup code', hidden: true });
  const importBox = h('textarea', { class: 'input code-box', rows: '4', id: 'import-code', placeholder: 'Paste a backup code that starts with FWB1.' });
  const fileIn = h('input', { type: 'file', accept: '.json,application/json,text/plain', id: 'import-file' });
  const wrap = h('div', { class: 'wrap progress-page' },
    h('p', { class: 'eyebrow' }, 'Practice room'),
    h('h1', { class: 'display-sm' }, 'Progress'),
    h('div', { class: 'stat-tiles' },
      tile('Current streak', `${st.current} day${st.current === 1 ? '' : 's'}`),
      tile('Best streak', `${st.best} day${st.best === 1 ? '' : 's'}`),
      tile('Days practised', String(st.totalDays)),
      tile('Answers', String(answers)),
      tile('Overall accuracy', answers ? Math.round((correct / answers) * 100) + '%' : '–')),
    h('h2', {}, 'Accuracy over the last 30 days'),
    lineChart(store.dailySeries(null, 30)),
    h('h2', {}, 'By tool'),
    totals.length ? h('table', { class: 'data-table' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Tool'), h('th', { scope: 'col' }, 'Answers'), h('th', { scope: 'col' }, 'Accuracy'), h('th', { scope: 'col' }, 'Last practised'))),
      h('tbody', {}, totals.map(({ meta, s }) => h('tr', {}, h('th', { scope: 'row' }, h('a', { href: `#/tool/${meta.id}/progress` }, meta.name)), h('td', {}, String(s.answers)), h('td', {}, s.answers ? Math.round((s.correct / s.answers) * 100) + '%' : '–'), h('td', {}, s.last ? fmtDate(s.last) : '–'))))) : h('p', { class: 'muted' }, 'No practice recorded yet.'),
    h('h2', {}, 'Weakest items'),
    weak.length ? h('ul', { class: 'review-list' }, weak.map((w) => h('li', {}, h('strong', {}, w.tool.name), `: ${w.item.replace(/\|/g, ' ')} — ${Math.round(w.acc * 100)}% of ${w.n}`))) : h('p', { class: 'muted' }, 'Items appear here once you have answered them at least three times. Open a tool’s Progress tab for full detail.'),
    h('section', { class: 'backup', 'aria-labelledby': 'backup-h' },
      h('h2', { id: 'backup-h' }, 'Move your progress to another device'),
      h('p', {}, 'Your progress, settings and practice sets are stored only in this browser. Export them as a backup code or a small file, then import it on your other device. License keys are not included — enter your key on the new device.'),
      h('div', { class: 'backup-cols' },
        h('div', {},
          h('h3', {}, 'Export progress'),
          h('div', { class: 'btn-row' },
            h('button', { type: 'button', class: 'btn btn-ink', onclick: async () => {
              const code = store.exportCode();
              codeOut.value = code; codeOut.hidden = false;
              try { await navigator.clipboard.writeText(code); status.textContent = '✓ Backup code copied. Paste it into Import progress on your other device.'; } catch { codeOut.select(); status.textContent = 'Backup code created below. Select it and copy it.'; }
            } }, 'Copy backup code'),
            h('button', { type: 'button', class: 'btn btn-outline', onclick: () => {
              const blob = new Blob([JSON.stringify(store.exportData(), null, 1)], { type: 'application/json' });
              const a = h('a', { href: URL.createObjectURL(blob), download: `fretwell-progress-${store.dayKey()}.json` });
              document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
              status.textContent = '✓ Backup file saved.';
            } }, 'Save backup file')),
          codeOut),
        h('div', {},
          h('h3', {}, 'Import progress'),
          h('label', { for: 'import-code', class: 'field-label' }, 'Backup code'),
          importBox,
          h('div', { class: 'btn-row' },
            h('button', { type: 'button', class: 'btn btn-ink', onclick: async () => {
              if (!importBox.value.trim()) { status.textContent = 'Paste a backup code first, or choose a backup file.'; importBox.focus(); return; }
              if (!(await confirmDialog('Replace progress on this device?', 'Importing replaces the progress, settings and practice sets saved in this browser with the ones in the backup.', 'Import'))) return;
              const r = store.importBackup(importBox.value);
              status.textContent = (r.ok ? '✓ ' : '✗ ') + r.message;
              if (r.ok) setTimeout(progressView, 900);
            } }, 'Import code'),
            h('label', { class: 'btn btn-outline file-btn', for: 'import-file' }, 'Choose backup file')),
          fileIn)),
      status));
  fileIn.className = 'sr-only';
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files && fileIn.files[0];
    if (!f) return;
    const text = await f.text();
    if (!(await confirmDialog('Replace progress on this device?', 'Importing replaces the progress, settings and practice sets saved in this browser with the ones in the backup.', 'Import'))) return;
    const r = store.importBackup(text);
    status.textContent = (r.ok ? '✓ ' : '✗ ') + r.message;
    if (r.ok) setTimeout(progressView, 900);
  });
  app.appendChild(wrap);
  focusHeading();
}
const tile = (label, value) => h('div', { class: 'stat-tile' }, h('span', { class: 'st-value' }, value), h('span', { class: 'st-label' }, label));

/* -------------------------------------------------------------- settings */
function settingsView() {
  setNav('settings');
  document.title = 'Settings — Practice room — Fretwell Music Lab';
  app.textContent = '';
  const prefs = store.getPrefs();
  const status = h('p', { class: 'save-status', role: 'status', 'aria-live': 'polite' });
  const saved = () => { status.textContent = 'Saved.'; setTimeout(() => { status.textContent = ''; }, 1400); };
  const sel = (id, label, value, options, onChange) => h('div', { class: 'field field--select' },
    h('label', { for: id, class: 'field-label' }, label),
    h('select', { id, onchange: (e) => { onChange(e.target.value); saved(); } }, options.map(([v, l]) => h('option', { value: v, selected: v === value }, l))));
  const tog = (id, label, value, onChange, help) => h('div', { class: 'field field--toggle' },
    h('label', { class: 'toggle', for: id }, h('input', { type: 'checkbox', id, checked: value, onchange: (e) => { onChange(e.target.checked); saved(); } }), h('span', { class: 'toggle-ui', 'aria-hidden': 'true' }), h('span', {}, label)),
    help ? h('p', { class: 'field-help' }, help) : null);
  const theme = document.documentElement.getAttribute('data-theme') || 'system';
  const wrap = h('div', { class: 'wrap settings-page' },
    h('p', { class: 'eyebrow' }, 'Practice room'),
    h('h1', { class: 'display-sm' }, 'Settings'),
    h('p', { class: 'muted' }, 'These settings apply to every tool and save automatically on this device. Each tool also has its own Settings tab.'),
    status,
    h('div', { class: 'settings-form' },
      h('h2', { class: 'field-heading' }, 'Display'),
      tog('pref-large', 'Larger interface', prefs.large, (v) => store.setPrefs({ large: v }), 'Makes text, buttons, the staff, the keyboard and the fretboard bigger.'),
      sel('pref-theme', 'Colour mode', theme, [['system', 'Match my device'], ['light', 'Light'], ['dark', 'Dark']], (v) => {
        if (v === 'system') { document.documentElement.removeAttribute('data-theme'); try { localStorage.removeItem('fretwell.theme'); } catch { /* ignore */ } }
        else { document.documentElement.setAttribute('data-theme', v); try { localStorage.setItem('fretwell.theme', v); } catch { /* ignore */ } }
      }),
      h('h2', { class: 'field-heading' }, 'Note names'),
      sel('pref-naming', 'Name notes with', prefs.naming, [['letters', 'Letters (C D E F G A B)'], ['solfege-ti', 'Fixed-do solfège (Do Re Mi Fa Sol La Ti)'], ['solfege-si', 'Fixed-do solfège (Do Re Mi Fa Sol La Si)']], (v) => store.setPrefs({ naming: v })),
      sel('pref-acc', 'Black keys and frets are labelled with', prefs.accidentals, [['sharps', 'Sharps (C♯, F♯ …)'], ['flats', 'Flats (D♭, G♭ …)']], (v) => store.setPrefs({ accidentals: v })),
      h('h2', { class: 'field-heading' }, 'Sound'),
      sel('pref-inst', 'Default tone', prefs.instrument, [['keys', 'Keyboard'], ['guitar', 'Plucked guitar']], (v) => store.setPrefs({ instrument: v })),
      h('div', { class: 'field' }, h('label', { for: 'pref-vol', class: 'field-label' }, 'Volume'),
        h('input', { type: 'range', id: 'pref-vol', min: '0', max: '100', 'data-volume': '', value: String(getVolume()), oninput: (e) => setVolume(+e.target.value) }),
        h('p', { class: 'field-help' }, 'Start at a low volume, especially with headphones. All sounds are synthesized in your browser.')),
      h('h2', { class: 'field-heading' }, 'Guitar'),
      sel('pref-tuning', 'Tuning', prefs.tuning, Object.entries(TUNINGS).map(([id, t]) => [id, t.name]), (v) => store.setPrefs({ tuning: v })),
      tog('pref-lefty', 'Left-handed fretboard', prefs.leftHanded, (v) => store.setPrefs({ leftHanded: v }), 'Mirrors the fretboard so the nut is on the right.'),
      h('h2', { class: 'field-heading' }, 'Help and data'),
      h('p', {}, h('button', { type: 'button', class: 'btn btn-outline', onclick: () => { store.resetSeen(); status.textContent = 'Walkthroughs will show again the next time you open each tool.'; } }, 'Show tool walkthroughs again')),
      h('p', {}, h('button', { type: 'button', class: 'btn btn-outline', onclick: async () => {
        if (await confirmDialog('Delete all progress?', 'This removes your answers, stats and streaks from this browser. Your keys and settings stay. This can’t be undone unless you have a backup.', 'Delete progress')) { store.clearProgress(); status.textContent = 'All progress on this device was deleted.'; }
      } }, 'Delete all progress'))));
  app.appendChild(wrap);
  focusHeading();
}

/* -------------------------------------------------------------- keys */
function keysView(message = '') {
  setNav('keys');
  document.title = 'Keys — Practice room — Fretwell Music Lab';
  app.textContent = '';
  const keys = getKeys();
  const wrap = h('div', { class: 'wrap keys-page' },
    h('p', { class: 'eyebrow' }, 'Practice room'),
    h('h1', { class: 'display-sm' }, 'Keys'),
    message ? h('p', { class: 'notice', role: 'status' }, message) : null,
    h('h2', {}, 'Keys on this device'),
    keys.length ? h('ul', { class: 'key-list' }, keys.map((k) => {
      const v = validateKey(k);
      const p = PRODUCT_BY_ID[v.product];
      return h('li', {}, h('span', { class: 'kl-name' }, p ? p.name : v.product), h('code', { class: 'kl-key' }, k));
    })) : h('p', { class: 'muted' }, 'No keys are saved on this device.'),
    h('h2', {}, 'Add a key'),
    h('p', {}, 'Each key you add brings its tools into this practice room.'),
    keyEntry((msg) => keysView(msg)),
    keys.length ? h('div', { class: 'signout' },
      h('h2', {}, 'Sign out on this device'),
      h('p', {}, 'Removes your saved keys from this browser, so the tools lock again here. Your progress stays unless you delete it in Settings. You can enter your key again at any time.'),
      h('button', { type: 'button', class: 'btn btn-outline', onclick: async () => {
        if (await confirmDialog('Sign out on this device?', 'Your saved keys will be removed from this browser. Make sure you have your keys saved somewhere so you can enter them again.', 'Sign out')) {
          clearKeys();
          location.hash = '#/';
          roomView('You are signed out on this device. Your keys were removed from this browser.');
        }
      } }, 'Sign out on this device')) : null);
  app.appendChild(wrap);
  focusHeading();
}

route();
