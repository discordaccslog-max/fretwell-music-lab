// Contact form: checks the fields, then opens the visitor's email app with the message written out and
// addressed to the support email. Nothing is sent from the page; a copy option covers visitors without
// an email app.
import { SITE_CONFIG } from '../site-config.js';

const form = document.querySelector('[data-contact-form]');
const done = form.querySelector('[data-contact-done]');
const copyText = form.querySelector('[data-contact-copy-text]');
const status = form.querySelector('[data-contact-status]');
const to = SITE_CONFIG.supportEmail;

const fields = {
  name: { el: form.querySelector('#cf-name'), check: (v) => (v ? '' : 'Enter your name.') },
  email: { el: form.querySelector('#cf-email'), check: (v) => (!v ? 'Enter your email address so we can reply.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Check your email address — it needs an @ followed by a domain.') },
  topic: { el: form.querySelector('#cf-topic'), check: (v) => (v ? '' : 'Choose a topic.') },
  message: { el: form.querySelector('#cf-message'), check: (v) => (v.length >= 10 ? '' : 'Write a short message (at least a few words).') },
};

function showError(name, text) {
  const { el } = fields[name];
  const err = form.querySelector(`#${el.id}-err`);
  err.textContent = text;
  if (text) {
    el.setAttribute('aria-invalid', 'true');
    const ids = (el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
    if (!ids.includes(err.id)) el.setAttribute('aria-describedby', [...ids, err.id].join(' '));
  } else {
    el.removeAttribute('aria-invalid');
  }
  return !text;
}

for (const [name, f] of Object.entries(fields)) {
  f.el.addEventListener(f.el.tagName === 'SELECT' ? 'change' : 'blur', () => { if (f.el.value.trim() || f.el.getAttribute('aria-invalid')) showError(name, f.check(f.el.value.trim())); });
}

function compose() {
  const v = (n) => form.elements[n].value.trim();
  const subject = `${v('topic')}${v('order') ? ` — order ${v('order')}` : ''}`;
  const body = [
    v('message'),
    '',
    '---',
    `Name: ${v('name')}`,
    `Reply to: ${v('email')}`,
    v('order') ? `Order number: ${v('order')}` : null,
    `Topic: ${v('topic')}`,
  ].filter((x) => x !== null).join('\n');
  return { subject, body };
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  let first = null;
  for (const [name, f] of Object.entries(fields)) {
    if (!showError(name, f.check(f.el.value.trim())) && !first) first = f.el;
  }
  if (first) { first.focus(); return; }
  const { subject, body } = compose();
  copyText.value = `To: ${to}\nSubject: ${subject}\n\n${body}`;
  done.hidden = false;
  status.textContent = '';
  window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  setTimeout(() => done.focus({ preventScroll: false }), 300);
});

async function copy(text, okMessage) {
  try { await navigator.clipboard.writeText(text); status.textContent = okMessage; } catch {
    copyText.focus(); copyText.select();
    status.textContent = 'Select the text and copy it.';
  }
}
form.querySelector('[data-contact-copy]').addEventListener('click', () => copy(copyText.value, '✓ Message copied. Paste it into a new email.'));
form.querySelector('[data-contact-copy-address]').addEventListener('click', () => copy(to, `✓ ${to} copied.`));
