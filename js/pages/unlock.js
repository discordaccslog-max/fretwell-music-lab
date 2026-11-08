// Unlock page: check a license key in the browser and save it on this device.
import { segmentedKeyInput } from '../core/key-input.js';
import { addKey } from '../core/keys.js';
import { validateKey } from '../core/license.js';
import { PRODUCT_BY_ID } from '../products.js';
import { createChordAnim } from '../core/chord-anim.js';
import { initSoundToggles, isSoundOn } from '../core/sound-ui.js';
import { unlock as unlockAudio } from '../core/audio.js';

initSoundToggles();
const form = document.querySelector('[data-key-form]');
const errorEl = document.querySelector('[data-key-error]');
const success = document.querySelector('[data-unlock-success]');
const msg = document.querySelector('[data-unlock-msg]');
const anim = createChordAnim(document.querySelector('[data-chord-anim]'));
const input = segmentedKeyInput(form.querySelector('[data-key-boxes]'), {
  onChange: () => { errorEl.textContent = ''; input && input.mark(null); },
});
let redirectTimer = null;

let pending = null;
try { pending = sessionStorage.getItem('fretwell.pendingKey'); sessionStorage.removeItem('fretwell.pendingKey'); } catch { /* no handoff */ }
if (pending) {
  input.set(pending);
  form.querySelector('button[type="submit"]').focus();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isSoundOn()) await unlockAudio();
  const v = validateKey(input.value());
  if (!v.ok) {
    errorEl.textContent = input.isEmpty() ? 'Enter your license key to continue.' : v.message;
    input.mark('error');
    input.focus();
    return;
  }
  const saved = addKey(v.key);
  if (!saved.ok) { errorEl.textContent = saved.message; return; }
  input.mark('ok');
  const p = PRODUCT_BY_ID[v.product];
  const name = p ? p.name : (v.label || 'Your tools');
  const names = v.product === 'foundations-bundle' ? 'all five Foundations tools' : v.product === 'all-access' ? 'every tool' : name;
  const verb = v.product === 'foundations-bundle' ? 'are' : 'is';
  msg.textContent = saved.already ? `This key was already saved on this device. ${name} is in your practice room. Opening it now…` : `Key accepted. ${names[0].toUpperCase() + names.slice(1)} ${verb} now in your practice room. Opening it now…`;
  form.hidden = true;
  success.hidden = false;
  anim.resolve({ sound: isSoundOn() });
  success.focus({ preventScroll: true });
  document.querySelectorAll('.nav-room').forEach((li) => { li.hidden = false; });
  redirectTimer = setTimeout(() => { location.href = '../practice/'; }, 2600);
});

document.querySelector('[data-another-key]').addEventListener('click', () => {
  clearTimeout(redirectTimer);
  msg.textContent = 'Saved. Enter your next key below.';
  success.hidden = true;
  form.hidden = false;
  anim.reset();
  input.clear();
});
