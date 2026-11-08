// Fretwell Music Lab — behaviour shared by every page: theme, menu, prices, buy buttons, contact details.
import { PRODUCT_BY_ID } from './products.js';
import { SITE_CONFIG } from './site-config.js';
import { hasKeys } from './core/keys.js';

const root = document.documentElement;

function effectiveTheme() {
  const t = root.getAttribute('data-theme');
  if (t) return t;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initTheme() {
  const buttons = document.querySelectorAll('.theme-toggle');
  const label = () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    buttons.forEach((b) => b.setAttribute('aria-label', `Switch to ${next} mode`));
  };
  buttons.forEach((b) => b.addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('fretwell.theme', next); } catch { /* storage unavailable */ }
    label();
  }));
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', label);
  label();
}

function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    });
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); toggle.focus(); }
    });
  }
  const here = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.site-nav a').forEach((a) => {
    const target = new URL(a.getAttribute('href'), location.href);
    if (!target.hash && target.pathname === here) a.setAttribute('aria-current', 'page');
  });
  if (hasKeys()) document.querySelectorAll('.nav-room').forEach((li) => { li.hidden = false; });
}

function initPrices() {
  document.querySelectorAll('[data-price-for]').forEach((el) => {
    const p = PRODUCT_BY_ID[el.getAttribute('data-price-for')];
    if (p) el.textContent = '$' + p.price;
  });
  document.querySelectorAll('[data-buy-for]').forEach((slot) => {
    const p = PRODUCT_BY_ID[slot.getAttribute('data-buy-for')];
    slot.textContent = '';
    if (!p || !p.checkoutUrl) return; // no checkout connected yet: no button at all
    const a = document.createElement('a');
    a.className = 'btn btn-buy';
    a.href = p.checkoutUrl;
    a.rel = 'noopener';
    a.textContent = `Buy now — $${p.price}`;
    slot.appendChild(a);
  });
}

function emailLink(email) {
  const a = document.createElement('a');
  a.href = 'mailto:' + email;
  a.textContent = email;
  return a;
}

function initContact() {
  const email = (SITE_CONFIG.supportEmail || '').trim();
  if (!email) return; // nothing is rendered without an address
  document.querySelectorAll('[data-footer-email]').forEach((el) => {
    const p = document.createElement('p');
    p.className = 'footer-email';
    p.appendChild(emailLink(email));
    el.appendChild(p);
  });
  document.querySelectorAll('[data-contact-email]').forEach((el) => {
    el.append('Email: ', emailLink(email));
  });
}

function initYear() {
  const y = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = y; });
}

initTheme();
initNav();
initPrices();
initContact();
initYear();
