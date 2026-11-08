// Abstract geometric compositions for product tiles and product pages (inline SVG).
// Animations on hover use transform and opacity only (see css/site.css).

const svg = (cls, inner, vb = '0 0 240 240') => `<svg class="art art-${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${inner}</svg>`;

export function art(name) {
  switch (name) {
    case 'note': {
      const lines = [70, 90, 110, 130, 150].map((y) => `<rect x="18" y="${y - 2.5}" width="204" height="5" fill="currentColor"/>`).join('');
      return svg('note', `${lines}
        <g class="a-move a-1"><rect x="150" y="160" width="44" height="5" fill="currentColor"/><circle cx="172" cy="162" r="17" fill="currentColor"/></g>
        <g class="a-move a-2"><circle cx="112" cy="110" r="22" fill="var(--a1)"/></g>
        <g class="a-move a-3"><rect x="52" y="34" width="14" height="172" fill="currentColor"/></g>`);
    }
    case 'interval':
      return svg('interval', `<rect x="20" y="196" width="200" height="6" fill="currentColor"/>
        <path class="a-arc" d="M62 176 C 70 70, 170 40, 180 92" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round"/>
        <g class="a-move a-1"><circle cx="62" cy="176" r="24" fill="currentColor"/></g>
        <g class="a-move a-2"><circle cx="180" cy="92" r="24" fill="var(--a1)"/></g>`);
    case 'scale': {
      const sq = [0, 1, 2, 3, 4, 5, 6].map((i) => `<rect class="a-step" style="--i:${i}" x="${20 + i * 29}" y="${180 - i * 22}" width="26" height="26" fill="${i === 0 || i === 6 ? 'var(--a1)' : 'currentColor'}"/>`).join('');
      return svg('scale', `<rect x="20" y="210" width="200" height="5" fill="currentColor"/>${sq}`);
    }
    case 'chord':
      return svg('chord', `
        <rect class="a-bar" style="--i:0" x="40" y="160" width="150" height="26" fill="currentColor"/>
        <rect class="a-bar" style="--i:1" x="70" y="120" width="130" height="26" fill="var(--a1)"/>
        <rect class="a-bar" style="--i:2" x="30" y="80" width="120" height="26" fill="currentColor"/>
        <rect class="a-bar" style="--i:3" x="90" y="40" width="110" height="26" fill="var(--a2)"/>`);
    case 'rhythm': {
      let dots = '';
      const on = new Set([0, 3, 6, 8, 10, 12, 13, 15]);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const i = r * 4 + c;
        const filled = on.has(i);
        dots += `<circle class="${filled ? 'a-pulse' : ''}" style="--i:${i}" cx="${48 + c * 48}" cy="${48 + r * 48}" r="${filled ? 17 : 15}" fill="${filled ? (i % 5 === 0 ? 'var(--a1)' : 'currentColor') : 'none'}" stroke="currentColor" stroke-width="${filled ? 0 : 4}"/>`;
      }
      return svg('rhythm', dots);
    }
    case 'bundle':
      return svg('bundle', `
        <g class="a-move a-1"><rect x="10" y="40" width="70" height="5" fill="currentColor"/><rect x="10" y="55" width="70" height="5" fill="currentColor"/><rect x="10" y="70" width="70" height="5" fill="currentColor"/><circle cx="48" cy="57" r="11" fill="var(--a1)"/></g>
        <g class="a-move a-2"><path d="M104 72 C110 32, 150 26, 160 46" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><circle cx="104" cy="72" r="11" fill="currentColor"/><circle cx="160" cy="46" r="11" fill="var(--a2)"/></g>
        <g class="a-move a-3"><rect x="190" y="70" width="14" height="14" fill="currentColor"/><rect x="206" y="56" width="14" height="14" fill="currentColor"/><rect x="222" y="42" width="14" height="14" fill="var(--a1)"/></g>
        <g class="a-move a-4"><rect x="250" y="66" width="60" height="12" fill="currentColor"/><rect x="262" y="50" width="56" height="12" fill="var(--a2)"/><rect x="246" y="34" width="50" height="12" fill="currentColor"/></g>
        <g class="a-move a-5"><circle cx="342" cy="40" r="7" fill="currentColor"/><circle cx="364" cy="40" r="7" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="342" cy="64" r="7" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="364" cy="64" r="7" fill="var(--a1)"/></g>`, '0 0 380 110');
    case 'progression': {
      const cols = [[60, 100, 130, 180], [50, 95, 140, 170], [40, 90, 120, 185], [60, 100, 130, 180]];
      let out = '';
      cols.forEach((col, ci) => col.forEach((y, vi) => {
        out += `<rect class="a-col" style="--i:${ci}" x="${30 + ci * 52}" y="${y - 9}" width="24" height="18" fill="${vi === 3 ? 'var(--a1)' : 'currentColor'}"/>`;
      }));
      for (let v = 0; v < 4; v++) {
        const pts = cols.map((col, ci) => `${42 + ci * 52},${col[v]}`).join(' ');
        out += `<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="3" opacity=".55"/>`;
      }
      return svg('progression', out);
    }
    case 'jazz':
      return svg('jazz', `
        ${[0, 1, 2, 3, 4, 5].map((i) => `<rect class="a-bar" style="--i:${i}" x="${40 + (i % 2) * 34}" y="${190 - i * 28}" width="${150 - (i % 3) * 22}" height="18" fill="${i === 4 ? 'var(--a1)' : i === 2 ? 'var(--a2)' : 'currentColor'}"/>`).join('')}
        <rect class="a-slash" x="170" y="20" width="14" height="200" fill="currentColor" transform="rotate(18 177 120)"/>`);
    case 'melody': {
      const lines = [80, 100, 120, 140, 160].map((y) => `<rect x="14" y="${y - 1.5}" width="212" height="3" fill="currentColor" opacity=".6"/>`).join('');
      const pts = [[34, 150], [64, 130], [94, 140], [124, 100], [154, 110], [184, 80], [210, 120]];
      return svg('melody', `${lines}<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
        ${pts.map(([x, y], i) => `<circle class="a-dot" style="--i:${i}" cx="${x}" cy="${y}" r="${i === 5 ? 15 : 11}" fill="${i === 5 ? 'var(--a1)' : 'currentColor'}"/>`).join('')}`);
    }
    case 'atelier':
      return svg('atelier', `
        <g class="a-rings"><circle cx="160" cy="80" r="62" fill="none" stroke="var(--a2)" stroke-width="10"/><circle cx="160" cy="80" r="38" fill="none" stroke="currentColor" stroke-width="6"/><circle cx="160" cy="80" r="14" fill="var(--a1)"/></g>
        <polyline class="a-voice" points="20,190 52,170 84,182 116,150 148,160 180,130 212,140" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round"/>
        <polyline class="a-voice a-voice-2" points="20,226 52,214 84,230 116,206 148,218 180,196 212,206" fill="none" stroke="var(--a3)" stroke-width="7" stroke-linejoin="round"/>
        ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${20 + i * 14}" y="${30 + (i === 0 || i === 2 || i === 4 ? 0 : 10)}" width="10" height="${i === 0 || i === 2 || i === 4 ? 30 : 20}" fill="currentColor"/>`).join('')}`, '0 0 240 250');
    default:
      return '';
  }
}

export const LOGO = `<svg class="logo" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" fill="currentColor"/><g fill="var(--bg)"><rect x="5" y="9" width="22" height="1.6"/><rect x="5" y="13" width="22" height="1.6"/><rect x="5" y="17" width="22" height="1.6"/><rect x="5" y="21" width="22" height="1.6"/><rect x="5" y="25" width="22" height="1.6"/></g><circle cx="20" cy="17.8" r="5" fill="var(--vermilion)"/></svg>`;
