// The unlock animation: an unresolved dominant seventh chord that resolves when a key is accepted.
import { svgEl } from './notation.js';
import { chord, isReady, now } from './audio.js';

const TREBLE = 'M11 31 C10 26 12 21.5 15.5 21.5 C20.5 21.5 23.5 26 22.5 31.5 C21.5 38 15.5 41 11 40.2 C5 39.2 1.8 33.5 3.8 26.5 C6 19 13.8 13.6 17 6.5 C19.2 1.5 19 -8.6 15.2 -11.6 C11.4 -14 9 -6 10 0 L14.2 46.5 C15 52.5 10.4 55.8 7.2 53';

export function createChordAnim(host) {
  host.textContent = '';
  const svg = svgEl('svg', { viewBox: '0 0 360 150', role: 'img', 'aria-label': 'A dominant seventh chord waiting to resolve' }, host);
  const top = 40;
  for (let i = 0; i < 5; i++) svgEl('rect', { x: 0, y: top + i * 10 - 0.6, width: 360, height: 1.2, class: 'n-fill' }, svg);
  svgEl('path', { d: TREBLE, transform: `translate(8,${top})`, class: 'n-stroke', 'stroke-width': 2.5, fill: 'none' }, svg);
  svgEl('circle', { cx: 15.6, cy: top + 50.2, r: 3.3, class: 'n-fill' }, svg);
  const yOf = (st) => top + 40 - (st - 30) * 5;
  const glow = svgEl('rect', { x: 150, y: 128, width: 120, height: 6, class: 'ca-glow', fill: 'var(--vermilion)' }, svg);
  void glow;
  // G4, B4, D5, F5 → G4, C5, E5, E5
  const notes = [
    { st: 32, to: 32, tension: false },
    { st: 34, to: 35, tension: true },
    { st: 36, to: 37, tension: false },
    { st: 38, to: 37, tension: true },
  ];
  const x0 = 120;
  const els = notes.map((n, i) => {
    const g = svgEl('g', { class: 'ca-note' + (n.tension ? ' ca-tension' : '') }, svg);
    const cx = x0 + (i % 2) * 14;
    svgEl('ellipse', { cx, cy: yOf(n.st), rx: 6.6, ry: 4.1, fill: 'none', 'stroke-width': 2.6, class: n.tension ? '' : 'n-stroke', stroke: n.tension ? 'var(--accent-text)' : undefined }, g);
    return { g, n, cx };
  });
  const label = svgEl('text', { x: x0 + 6, y: 122, 'text-anchor': 'middle', class: 'n-label' }, svg);
  label.textContent = 'G7';
  const label2 = svgEl('text', { x: 236, y: 122, 'text-anchor': 'middle', class: 'n-label', opacity: 0 }, svg);
  label2.textContent = 'C';

  return {
    resolve({ sound = false } = {}) {
      host.classList.add('is-resolved');
      svg.setAttribute('aria-label', 'The chord resolves to C major');
      els.forEach(({ g, n }) => {
        const dy = (yOf(n.to) - yOf(n.st));
        g.style.transform = `translate(${236 - 6 - x0}px, ${dy}px)`;
        g.classList.remove('ca-tension');
        g.querySelector('ellipse').setAttribute('stroke', 'currentColor');
      });
      label.setAttribute('opacity', '0.35');
      label2.setAttribute('opacity', '1');
      if (sound && isReady()) {
        const t = now() + 0.05;
        chord([43, 59, 62, 65], { when: t, dur: 0.7, velocity: 0.6 });
        chord([48, 60, 64, 67], { when: t + 0.75, dur: 1.8, velocity: 0.62 });
      }
    },
    reset() {
      host.classList.remove('is-resolved');
      els.forEach(({ g, n }) => { g.style.transform = ''; if (n.tension) g.classList.add('ca-tension'); });
      label.setAttribute('opacity', '1');
      label2.setAttribute('opacity', '0');
    },
  };
}
