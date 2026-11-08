// Segmented license-key input: boxes auto-advance while typing and share pasted keys between them.
import { compact } from './license.js';

/**
 * Wire up a set of inputs (each with data-len). Returns { value(), set(text), clear(), focus(), mark(state) }.
 */
export function segmentedKeyInput(container, { onChange = () => {}, onComplete = () => {} } = {}) {
  const boxes = [...container.querySelectorAll('input[data-len]')];
  const lens = boxes.map((b) => +b.dataset.len);
  const total = lens.reduce((a, b) => a + b, 0);
  const clean = (s) => compact(s).replace(/[^A-Z0-9]/g, '');

  function distribute(text, startIdx = 0) {
    let rest = clean(text);
    // No product code starts with "FR", so a leading FRET is always the printed prefix.
    if (rest.startsWith('FRET')) rest = rest.slice(4);
    let i = startIdx;
    while (i < boxes.length) {
      boxes[i].value = rest.slice(0, lens[i]);
      rest = rest.slice(lens[i]);
      if (!rest) break;
      i++;
    }
    const target = boxes.findIndex((b, k) => b.value.length < lens[k]);
    const focusIdx = target === -1 ? boxes.length - 1 : target;
    boxes[focusIdx].focus();
    const len = boxes[focusIdx].value.length;
    try { boxes[focusIdx].setSelectionRange(len, len); } catch { /* not supported */ }
    changed();
  }

  function changed() {
    onChange(value());
    if (boxes.every((b, k) => b.value.length === lens[k])) onComplete(value());
  }

  function value() {
    return 'FRET-' + boxes.map((b) => b.value).join('-');
  }

  boxes.forEach((box, i) => {
    box.setAttribute('maxlength', String(total + 8));
    box.addEventListener('input', () => {
      let v = clean(box.value);
      if (i === 0 && v.startsWith('FR')) {
        // The buyer is typing the FRET prefix that is already shown; let them finish it, then drop it.
        if (v.length < 4) { box.value = v; changed(); return; }
        if (v.startsWith('FRET')) v = v.slice(4);
      }
      if (v.length > lens[i]) {
        // Typed past the end of this box, or pasted on a phone keyboard: spill into the next boxes.
        const before = boxes.slice(0, i).map((b) => b.value).join('');
        distribute(before + v, 0);
        return;
      }
      box.value = v;
      if (v.length === lens[i] && i < boxes.length - 1) {
        boxes[i + 1].focus();
        boxes[i + 1].select();
      }
      changed();
    });
    box.addEventListener('paste', (e) => {
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (!text) return;
      e.preventDefault();
      const c = clean(text);
      if (c.length >= total || c.startsWith('FRET')) distribute(c, 0);
      else {
        const before = boxes.slice(0, i).map((b) => b.value).join('');
        distribute(before + c, 0);
      }
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && box.value === '' && i > 0) {
        e.preventDefault();
        const prev = boxes[i - 1];
        prev.focus();
        prev.value = prev.value.slice(0, -1);
        changed();
      } else if (e.key === 'ArrowLeft' && box.selectionStart === 0 && box.selectionEnd === 0 && i > 0) {
        e.preventDefault();
        boxes[i - 1].focus();
        const l = boxes[i - 1].value.length;
        boxes[i - 1].setSelectionRange(l, l);
      } else if (e.key === 'ArrowRight' && box.selectionStart === box.value.length && i < boxes.length - 1) {
        e.preventDefault();
        boxes[i + 1].focus();
        boxes[i + 1].setSelectionRange(0, 0);
      }
    });
  });

  return {
    value,
    set(text) { distribute(text, 0); },
    clear() { boxes.forEach((b) => { b.value = ''; b.classList.remove('is-error', 'is-ok'); }); boxes[0].focus(); changed(); },
    focus() { const t = boxes.find((b, k) => b.value.length < lens[k]) || boxes[0]; t.focus(); },
    mark(state) { boxes.forEach((b) => { b.classList.toggle('is-error', state === 'error'); b.classList.toggle('is-ok', state === 'ok'); b.setAttribute('aria-invalid', state === 'error' ? 'true' : 'false'); }); },
    isEmpty() { return boxes.every((b) => !b.value); },
    boxes,
  };
}
