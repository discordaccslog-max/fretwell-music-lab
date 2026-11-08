// Fretwell Music Lab — sound on/off toggles for storefront pages.
// Sound never starts by itself: a visitor turns it on with a clearly labelled button, and audio starts
// inside that click. If they turned sound on earlier, the first click on a later page starts audio again.
import { unlock, stopAll, unlockOnFirstGesture, setVolume, getVolume } from './audio.js';

const PREF = 'fretwell.sound';
let on = false;
const subs = new Set();

function savedPref() {
  try { return localStorage.getItem(PREF) === '1'; } catch { return false; }
}

export const isSoundOn = () => on;
export function onSoundChange(fn) { subs.add(fn); return () => subs.delete(fn); }

function render() {
  document.querySelectorAll('[data-sound-toggle]').forEach((btn) => {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    const label = btn.querySelector('.sound-label');
    const small = btn.classList.contains('sound-toggle--small');
    if (label) label.textContent = on ? (small ? 'Sound on' : 'Sound is on — turn off') : (small ? 'Sound off' : 'Turn sound on');
    btn.setAttribute('aria-label', on ? 'Sound is on. Turn sound off' : 'Turn sound on');
    const vol = btn.parentElement && btn.parentElement.querySelector('.volume');
    if (vol) vol.hidden = !on;
  });
  subs.forEach((fn) => fn(on));
}

export async function turnSoundOn() {
  on = true;
  try { localStorage.setItem(PREF, '1'); } catch { /* ignore */ }
  render();
  await unlock();
}

export function turnSoundOff() {
  on = false;
  try { localStorage.setItem(PREF, '0'); } catch { /* ignore */ }
  stopAll();
  render();
}

export function initSoundToggles() {
  if (savedPref()) {
    on = true;
    unlockOnFirstGesture();
  }
  document.querySelectorAll('[data-sound-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => (on ? turnSoundOff() : turnSoundOn()));
  });
  document.querySelectorAll('input[data-volume]').forEach((el) => {
    el.value = getVolume();
    el.addEventListener('input', () => setVolume(+el.value));
  });
  render();
}
