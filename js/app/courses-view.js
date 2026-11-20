// Fretwell Music Lab — courses in the practice room: course pages, lessons, and the add-ons
// (practice planner, printable guide, bonus lessons, progress export).
import { TOOL_BY_ID, LOADERS } from './registry.js';
import * as store from './store.js';
import { h, mountTool, progressRing, fmtDate, toolArt } from './toolkit.js';
import { COURSE_BY_ID, ADDONS, courseLessons, describeLesson, exerciseName, TOOL_NAMES } from '../courses.js';
import { PRODUCT_BY_ID } from '../products.js';

const lessonHref = (courseId, key) => `#/course/${courseId}/lesson/${key}`;
const lessonLabel = (l) => (l.bonus ? `Bonus ${l.n}` : `Lesson ${l.n}`);

function courseStats(course, addons) {
  const lessons = courseLessons(course, addons);
  const prog = store.getCourseProgress(course.id);
  const main = lessons.filter((l) => !l.bonus);
  const passed = main.filter((l) => prog[l.key] && prog[l.key].passed).length;
  const next = lessons.find((l) => !(prog[l.key] && prog[l.key].passed)) || null;
  return { lessons, prog, main, passed, next };
}

/* -------------------------------------------------------------- room cards */
export function courseCards(courses) {
  const ids = Object.keys(courses);
  const grid = h('div', { class: 'room-grid' });
  for (const id of ids) {
    const course = COURSE_BY_ID[id];
    const p = PRODUCT_BY_ID[id];
    if (!course || !p) continue;
    const meta = TOOL_BY_ID[course.primary];
    const st = courseStats(course, courses[id]);
    grid.appendChild(h('a', { class: `room-card room-card--${meta.color}`, href: `#/course/${id}` },
      toolArt(meta),
      h('div', { class: 'rc-body' },
        h('p', { class: 'rc-tier' }, `Course · ${course.level}`),
        h('h2', { class: 'rc-title' }, p.shortName),
        h('p', { class: 'rc-blurb' }, `${st.main.length} lessons${courses[id].length ? ' · with ' + courses[id].map((a) => ADDONS[a].name.toLowerCase()).join(', ') : ''}`),
        h('div', { class: 'rc-meta' },
          progressRing(st.main.length ? st.passed / st.main.length : null, 64, `${st.passed} of ${st.main.length} lessons passed`),
          h('p', { class: 'rc-last' }, `${st.passed} of ${st.main.length} lessons passed`, h('br'), h('strong', {}, st.next ? `Next: ${st.next.t}` : 'Course complete'))))));
  }
  return grid;
}

/* -------------------------------------------------------------- course page */
export function courseView(app, id, addons) {
  const course = COURSE_BY_ID[id];
  const p = PRODUCT_BY_ID[id];
  document.title = `${p.shortName} — Practice room — Fretwell Music Lab`;
  const st = courseStats(course, addons);
  const row = (l) => {
    const r = st.prog[l.key];
    return h('tr', { class: r && r.passed ? 'is-passed' : '' },
      h('th', { scope: 'row' }, lessonLabel(l)),
      h('td', {}, h('a', { href: lessonHref(id, l.key) }, l.t), h('span', { class: 'lesson-desc' }, `${TOOL_NAMES[l.tool]} · ${exerciseName(l)} · ${describeLesson(l)}`)),
      h('td', {}, `${l.s.sessionLength} · ${l.pass}%`),
      h('td', {}, r ? `${r.best}%` : '–'),
      h('td', {}, r && r.passed ? h('span', { class: 'ok-t' }, '✓ Passed') : r ? 'Not yet' : '–'));
  };
  const table = (rows, caption) => h('table', { class: 'data-table lesson-table' },
    h('caption', { class: 'sr-only' }, caption),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Lesson'), h('th', { scope: 'col' }, 'What you practise'), h('th', { scope: 'col' }, 'Questions · pass'), h('th', { scope: 'col' }, 'Best'), h('th', { scope: 'col' }, 'Status'))),
    h('tbody', {}, rows.map(row)));

  const main = st.lessons.filter((l) => !l.bonus);
  const units = [];
  for (const l of main) {
    const u = l.u || '';
    if (!units.length || units[units.length - 1].name !== u) units.push({ name: u, lessons: [] });
    units[units.length - 1].lessons.push(l);
  }
  const bonus = st.lessons.filter((l) => l.bonus);
  const status = h('p', { class: 'save-status', role: 'status', 'aria-live': 'polite' });

  const wrap = h('div', { class: 'wrap course-page' },
    h('a', { class: 'tool-back', href: '#/' }, '← Practice room'),
    h('p', { class: 'eyebrow' }, `Course · ${course.level}`),
    h('h1', { class: 'display-sm' }, p.name),
    h('div', { class: 'course-head' },
      progressRing(st.main.length ? st.passed / st.main.length : null, 96, `${st.passed} of ${st.main.length} lessons passed`),
      h('div', {},
        h('p', { class: 'lede' }, course.tagline),
        h('p', {}, `${st.passed} of ${st.main.length} lessons passed.`),
        st.next ? h('a', { class: 'btn btn-ink btn-lg', href: lessonHref(id, st.next.key) }, `${st.passed || bonus.some((b) => st.prog[b.key]) ? 'Continue' : 'Start'}: ${lessonLabel(st.next)} — ${st.next.t}`)
          : h('p', { class: 'notice' }, 'You have passed every lesson in this course. Lessons stay open for review.'))),
    h('p', { class: 'muted' }, 'Each lesson opens a tool with fixed settings. Answer every question; you pass when your score reaches the pass mark. You can repeat any lesson, in any order, as often as you like. Results are saved in this browser.'),
    ...units.map((u) => h('section', { class: 'course-unit' }, u.name ? h('h2', {}, u.name) : h('h2', {}, 'Lessons'), table(u.lessons, u.name || 'Lessons'))),
    bonus.length ? h('section', { class: 'course-unit' }, h('h2', {}, 'Bonus challenge lessons'), table(bonus, 'Bonus challenge lessons')) : null,
    addonPanel(course, p, addons, st, status),
    status);
  app.appendChild(wrap);
}

function addonPanel(course, p, addons, st, status) {
  const owned = addons.filter((a) => a !== 'bonus');
  if (!owned.length) return null;
  const blocks = [];
  if (addons.includes('planner')) blocks.push(plannerBlock(course, p, addons, status));
  if (addons.includes('guide')) blocks.push(h('div', { class: 'addon-block' },
    h('h3', {}, ADDONS.guide.name),
    h('p', {}, 'Every lesson with its goal, settings and pass mark, and a box to tick when you pass. Print it, or choose “Save as PDF” in the print window.'),
    h('a', { class: 'btn btn-outline', href: `#/course/${course.id}/guide` }, 'Open the printable guide')));
  if (addons.includes('export')) blocks.push(h('div', { class: 'addon-block' },
    h('h3', {}, ADDONS.export.name),
    h('p', {}, 'Your results for every lesson: attempts, best and latest score, pass status and date.'),
    h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn btn-outline', onclick: () => { download(`fretwell-${course.id}-progress.csv`, csv(course, addons), 'text/csv'); status.textContent = '✓ Progress spreadsheet saved.'; } }, 'Download spreadsheet (CSV)'),
      h('a', { class: 'btn btn-outline', href: `#/course/${course.id}/report` }, 'Open printable report'))));
  return h('section', { class: 'course-addons', 'aria-labelledby': 'addons-h' }, h('h2', { id: 'addons-h' }, 'Your add-ons'), h('div', { class: 'addon-grid' }, blocks));
}

/* -------------------------------------------------------------- lesson */
export async function lessonView(app, id, key, addons, isCurrent) {
  const course = COURSE_BY_ID[id];
  const p = PRODUCT_BY_ID[id];
  const lessons = courseLessons(course, addons);
  const idx = lessons.findIndex((l) => l.key === key);
  if (idx < 0) { location.hash = `#/course/${id}`; return null; }
  const l = lessons[idx];
  const meta = TOOL_BY_ID[l.tool];
  document.title = `${l.t} — ${p.shortName} — Fretwell Music Lab`;
  const host = h('div', { class: 'wrap tool-host' }, h('p', { class: 'app-loading' }, `Opening ${l.t}…`));
  app.appendChild(host);
  let mod;
  try { mod = await LOADERS[l.tool](); } catch {
    host.textContent = '';
    host.appendChild(h('div', { class: 'notice' }, h('h1', {}, 'This lesson couldn’t load'), h('p', {}, 'Check your connection and try again. Once a lesson has loaded online, it works offline too.'), h('button', { class: 'btn btn-ink', type: 'button', onclick: () => location.reload() }, 'Try again')));
    return null;
  }
  if (!isCurrent()) return null;
  const next = lessons[idx + 1] || null;
  const count = lessons.filter((x) => x.bonus === l.bonus).length;
  const unmount = mountTool(host, mod.default, {
    meta,
    tab: 'practice',
    lesson: {
      title: l.t,
      context: `${p.shortName} · ${lessonLabel(l)} of ${count}${l.bonus ? ' (bonus)' : ''} · ${meta.name}`,
      goal: `${describeLesson(l)}. Pass with ${l.pass}% or more over ${l.s.sessionLength} questions.`,
      settings: l.s,
      pass: l.pass,
      best: store.getCourseProgress(id)[l.key] || null,
      backHref: `#/course/${id}`,
      backLabel: p.shortName,
      onFinish: ({ total, correct }) => {
        const before = store.getCourseProgress(id)[l.key];
        const rec = store.recordLesson(id, l.key, { total, correct, pass: l.pass });
        return { passed: rec.passed, passedNow: rec.passed && !(before && before.passed), next: next ? { href: lessonHref(id, next.key), title: next.t } : null };
      },
    },
  });
  window.scrollTo(0, 0);
  return unmount;
}

/* -------------------------------------------------------------- printable guide */
export function guideView(app, id, addons) {
  const course = COURSE_BY_ID[id];
  const p = PRODUCT_BY_ID[id];
  document.title = `Course guide — ${p.shortName} — Fretwell Music Lab`;
  const lessons = courseLessons(course, addons);
  const item = (l) => h('li', { class: 'guide-item' },
    h('span', { class: 'guide-box', 'aria-hidden': 'true' }),
    h('div', {},
      h('h3', {}, `${lessonLabel(l)}: ${l.t}`),
      h('p', {}, `${TOOL_NAMES[l.tool]} · ${exerciseName(l)}`),
      h('p', { class: 'muted' }, `${describeLesson(l)}. ${l.s.sessionLength} questions, pass mark ${l.pass}%.`)));
  const groups = [];
  for (const l of lessons) {
    const name = l.bonus ? 'Bonus challenge lessons' : (l.u || 'Lessons');
    if (!groups.length || groups[groups.length - 1].name !== name) groups.push({ name, lessons: [] });
    groups[groups.length - 1].lessons.push(l);
  }
  app.appendChild(h('div', { class: 'wrap course-print' },
    h('div', { class: 'no-print btn-row' },
      h('a', { class: 'btn btn-outline', href: `#/course/${id}` }, `← ${p.shortName}`),
      h('button', { type: 'button', class: 'btn btn-ink', onclick: () => window.print() }, 'Print or save as PDF')),
    h('p', { class: 'eyebrow' }, 'Fretwell Music Lab · Course guide'),
    h('h1', { class: 'display-sm' }, p.name),
    h('p', { class: 'lede' }, course.tagline),
    h('p', {}, course.intro),
    h('h2', {}, 'How to use this guide'),
    h('ul', { class: 'tick-list' },
      h('li', {}, 'Open each lesson from the course page in your practice room. Its settings are set for you.'),
      h('li', {}, 'Answer every question. You pass when your score reaches the pass mark; tick the box here when you do.'),
      h('li', {}, 'Short, regular sessions work better than long, occasional ones. Repeat a lesson until it feels easy before moving on.')),
    ...groups.map((g) => h('section', { class: 'guide-group' }, h('h2', {}, g.name), h('ol', { class: 'guide-list' }, g.lessons.map(item))))));
}

/* -------------------------------------------------------------- printable report */
export function reportView(app, id, addons) {
  const course = COURSE_BY_ID[id];
  const p = PRODUCT_BY_ID[id];
  document.title = `Progress report — ${p.shortName} — Fretwell Music Lab`;
  const st = courseStats(course, addons);
  const attempts = st.lessons.reduce((n, l) => n + ((st.prog[l.key] && st.prog[l.key].attempts) || 0), 0);
  const status = h('p', { class: 'save-status no-print', role: 'status', 'aria-live': 'polite' });
  app.appendChild(h('div', { class: 'wrap course-print' },
    h('div', { class: 'no-print btn-row' },
      h('a', { class: 'btn btn-outline', href: `#/course/${id}` }, `← ${p.shortName}`),
      h('button', { type: 'button', class: 'btn btn-ink', onclick: () => window.print() }, 'Print or save as PDF'),
      h('button', { type: 'button', class: 'btn btn-outline', onclick: () => { download(`fretwell-${id}-progress.csv`, csv(course, addons), 'text/csv'); status.textContent = '✓ Progress spreadsheet saved.'; } }, 'Download spreadsheet (CSV)')),
    status,
    h('p', { class: 'eyebrow' }, 'Fretwell Music Lab · Progress report'),
    h('h1', { class: 'display-sm' }, p.name),
    h('p', {}, `Report created ${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })} from the results saved in this browser.`),
    h('div', { class: 'stat-tiles' },
      tile('Lessons passed', `${st.passed} of ${st.main.length}`),
      tile('Lesson attempts', String(attempts)),
      tile('Bonus lessons passed', st.lessons.some((l) => l.bonus) ? String(st.lessons.filter((l) => l.bonus && st.prog[l.key] && st.prog[l.key].passed).length) : '–')),
    h('table', { class: 'data-table' },
      h('thead', {}, h('tr', {}, ...['Lesson', 'Title', 'Pass mark', 'Attempts', 'Best', 'Latest', 'Passed', 'Last attempt'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, st.lessons.map((l) => {
        const r = st.prog[l.key];
        return h('tr', {}, h('th', { scope: 'row' }, lessonLabel(l)), h('td', {}, l.t), h('td', {}, l.pass + '%'), h('td', {}, r ? String(r.attempts) : '0'),
          h('td', {}, r ? r.best + '%' : '–'), h('td', {}, r && r.lastScore !== undefined ? r.lastScore + '%' : '–'), h('td', {}, r && r.passed ? 'Yes' : 'No'), h('td', {}, r ? fmtDate(r.last) : '–'));
      })))));
}
const tile = (label, value) => h('div', { class: 'stat-tile' }, h('span', { class: 'st-value' }, value), h('span', { class: 'st-label' }, label));

/* -------------------------------------------------------------- files */
function download(name, text, type) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

const csvCell = (v) => { const t = String(v ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

/** Lesson results as CSV. */
export function csv(course, addons) {
  const prog = store.getCourseProgress(course.id);
  const rows = [['Lesson', 'Title', 'Tool', 'Exercise', 'Questions', 'Pass mark (%)', 'Attempts', 'Best score (%)', 'Latest score (%)', 'Passed', 'Last attempt']];
  for (const l of courseLessons(course, addons)) {
    const r = prog[l.key];
    rows.push([lessonLabel(l), l.t, TOOL_NAMES[l.tool], exerciseName(l), l.s.sessionLength, l.pass, r ? r.attempts : 0, r ? r.best : '', r && r.lastScore !== undefined ? r.lastScore : '', r && r.passed ? 'yes' : 'no', r ? new Date(r.last).toISOString().slice(0, 16).replace('T', ' ') : '']);
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/* -------------------------------------------------------------- practice planner */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function plannerBlock(course, p, addons, status) {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const start = h('input', { type: 'date', id: 'plan-start', class: 'input', value: iso });
  const time = h('input', { type: 'time', id: 'plan-time', class: 'input', value: '18:00' });
  const mins = h('select', { id: 'plan-mins' }, [15, 20, 30, 45].map((m) => h('option', { value: String(m), selected: m === 20 }, `${m} minutes`)));
  const dayBoxes = DAY_NAMES.map((d, i) => h('label', { class: 'plan-day' }, h('input', { type: 'checkbox', value: String(i), checked: [1, 3, 5].includes(i) }), ' ', d.slice(0, 3)));
  const err = h('p', { class: 'key-error', role: 'alert' });
  return h('div', { class: 'addon-block' },
    h('h3', {}, ADDONS.planner.name),
    h('p', {}, 'Choose when you practise. The calendar file puts one lesson on each practice day, in order, with a link back to that lesson.'),
    h('div', { class: 'plan-grid' },
      h('div', {}, h('label', { class: 'field-label', for: 'plan-start' }, 'First day'), start),
      h('div', {}, h('label', { class: 'field-label', for: 'plan-time' }, 'Time'), time),
      h('div', {}, h('label', { class: 'field-label', for: 'plan-mins' }, 'Length'), mins)),
    h('fieldset', { class: 'plan-days' }, h('legend', { class: 'field-label' }, 'Practice days'), ...dayBoxes),
    err,
    h('button', { type: 'button', class: 'btn btn-outline', onclick: () => {
      const days = dayBoxes.map((b) => b.querySelector('input')).filter((x) => x.checked).map((x) => +x.value);
      if (!days.length) { err.textContent = 'Choose at least one practice day.'; return; }
      if (!start.value || !time.value) { err.textContent = 'Choose a first day and a time.'; return; }
      err.textContent = '';
      const text = ics(course, p, courseLessons(course, addons), { start: start.value, time: time.value, minutes: +mins.value, days });
      download(`fretwell-${course.id}-plan.ics`, text, 'text/calendar');
      status.textContent = '✓ Calendar file saved. Open it to add the lessons to your calendar.';
    } }, 'Download calendar file (.ics)'));
}

const icsText = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
function fold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 60) { out.push(rest.slice(0, 60)); rest = ' ' + rest.slice(60); } // short lines stay under the 75-byte limit
  out.push(rest);
  return out.join('\r\n');
}

/** An iCalendar file with one event per lesson, on the chosen weekdays, in floating local time. */
export function ics(course, p, lessons, { start, time, minutes, days }) {
  const [y, m, d] = start.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const date = new Date(y, m - 1, d, hh, mm);
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
  const now = new Date();
  const utc = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const base = location.href.split('#')[0];
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fretwell Music Lab//Practice planner//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${icsText('Fretwell: ' + p.shortName)}`];
  const uid = Math.random().toString(36).slice(2, 10);
  for (const l of lessons) {
    while (!days.includes(date.getDay())) date.setDate(date.getDate() + 1);
    const link = `${base}#/course/${course.id}/lesson/${l.key}`;
    lines.push('BEGIN:VEVENT',
      `UID:${course.id}-${l.key}-${uid}@fretwell-music-lab`,
      `DTSTAMP:${utc}`,
      `DTSTART:${stamp(date)}`,
      `DURATION:PT${minutes}M`,
      `SUMMARY:${icsText(`${p.shortName}: ${lessonLabel(l)} — ${l.t}`)}`,
      `DESCRIPTION:${icsText(`${describeLesson(l)}. ${l.s.sessionLength} questions, pass mark ${l.pass}%.\nOpen the lesson: ${link}`)}`,
      `URL:${link}`,
      'END:VEVENT');
    date.setDate(date.getDate() + 1);
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
