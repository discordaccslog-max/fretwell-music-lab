// Fretwell Music Lab — license keys saved on this device (local storage only).
import { validateKey, toolsForKeys } from './license.js';

const KEY = 'fretwell.keys';

export function getKeys() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((k) => validateKey(k).ok) : [];
  } catch { return []; }
}

/** Save a key. Returns the validation result; ok keys are stored once. */
export function addKey(input) {
  const v = validateKey(input);
  if (!v.ok) return v;
  const keys = getKeys();
  const already = keys.includes(v.key);
  if (!already) keys.push(v.key);
  try { localStorage.setItem(KEY, JSON.stringify(keys)); } catch {
    return { ok: false, reason: 'storage', message: 'This browser is not letting the site save your key (private browsing can block storage). Try a normal window.' };
  }
  return { ...v, already };
}

export function clearKeys() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}

export function removeKey(key) {
  const keys = getKeys().filter((k) => k !== key);
  try { localStorage.setItem(KEY, JSON.stringify(keys)); } catch { /* storage unavailable */ }
}

export function unlockedTools() {
  return toolsForKeys(getKeys());
}

export function hasKeys() {
  return getKeys().length > 0;
}
