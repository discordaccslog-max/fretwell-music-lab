// Draws the app icons, the Open Graph image and the favicon from simple geometry.
// Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const C = { paper: [242, 237, 227], ink: [18, 18, 18], verm: [227, 65, 43], cobalt: [35, 70, 211], saffron: [242, 178, 48], paper2: [231, 224, 210] };

function canvas(w, h, bg) {
  const px = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) px.set(bg, i * 3);
  const rect = (x, y, rw, rh, col) => {
    for (let yy = Math.max(0, Math.round(y)); yy < Math.min(h, Math.round(y + rh)); yy++)
      for (let xx = Math.max(0, Math.round(x)); xx < Math.min(w, Math.round(x + rw)); xx++) px.set(col, (yy * w + xx) * 3);
  };
  const circle = (cx, cy, r, col) => {
    for (let yy = Math.floor(cy - r - 1); yy <= cy + r + 1; yy++) {
      if (yy < 0 || yy >= h) continue;
      for (let xx = Math.floor(cx - r - 1); xx <= cx + r + 1; xx++) {
        if (xx < 0 || xx >= w) continue;
        // 4x4 supersampling for smooth edges
        let cov = 0;
        for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
          const dx = xx + (sx + 0.5) / 4 - cx, dy = yy + (sy + 0.5) / 4 - cy;
          if (dx * dx + dy * dy <= r * r) cov++;
        }
        if (!cov) continue;
        const i = (yy * w + xx) * 3, a = cov / 16;
        for (let k = 0; k < 3; k++) px[i + k] = Math.round(px[i + k] * (1 - a) + col[k] * a);
      }
    }
  };
  return { w, h, px, rect, circle };
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return (buf) => { let c = 0xffffffff; for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
})();
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(td));
  return Buffer.concat([len, td, crc]);
}
function png({ w, h, px }) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(px.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** The mark: black square, five paper staff lines, a vermilion notehead. `pad` leaves a safe zone for maskable icons. */
function icon(size, pad = 0) {
  const c = canvas(size, size, C.ink);
  const s = size * (1 - pad * 2), o = size * pad;
  const lx = o + s * 0.16, lw = s * 0.68, lh = Math.max(2, s * 0.05);
  for (let i = 0; i < 5; i++) c.rect(lx, o + s * (0.27 + i * 0.125) - lh / 2, lw, lh, C.paper);
  c.circle(o + s * 0.62, o + s * 0.52, s * 0.16, C.verm);
  return c;
}

function ogImage() {
  const w = 1200, h = 630;
  const c = canvas(w, h, C.paper);
  // Keyboard block
  const kx = 70, ky = 90, kw = 560, kh = 300;
  c.rect(kx, ky, kw, kh, C.ink);
  const whites = 10, ww = (kw - 4) / whites;
  const colors = { 2: C.saffron, 5: C.cobalt, 7: C.verm };
  for (let i = 0; i < whites; i++) c.rect(kx + 2 + i * ww + 2, ky + 2, ww - 4, kh - 4, colors[i] || [251, 248, 241]);
  for (const p of [1, 2, 4, 5, 6, 8, 9]) c.rect(kx + 2 + p * ww - ww * 0.31, ky + 2, ww * 0.62, kh * 0.58, C.ink);
  // Fretboard block
  const fx = 680, fy = 90, fw = 450, fh = 300;
  c.rect(fx, fy, fw, fh, C.ink); c.rect(fx + 3, fy + 3, fw - 6, fh - 6, C.paper2);
  for (let i = 1; i < 4; i++) c.rect(fx + (fw * i) / 4, fy, 5, fh, [140, 133, 119]);
  for (let s = 0; s < 4; s++) c.rect(fx, fy + fh * (0.125 + s * 0.25) - 1.5 - s * 0.5, fw, 3 + s, C.ink);
  const dots = [[0, 0, C.verm], [0, 3, C.ink], [1, 0, C.ink], [1, 3, C.cobalt], [2, 0, C.saffron], [2, 2, C.ink], [3, 0, C.ink], [3, 2, C.verm]];
  for (const [s, col, color] of dots) { c.circle(fx + fw * (0.125 + col * 0.25), fy + fh * (0.125 + s * 0.25), 26, C.ink); c.circle(fx + fw * (0.125 + col * 0.25), fy + fh * (0.125 + s * 0.25), 23, color); }
  // Staff with notes
  for (let i = 0; i < 5; i++) c.rect(70, 450 + i * 22, 1060, 4, C.ink);
  const notes = [[180, 4], [290, 2], [400, 0], [510, 3], [620, 1], [730, -1], [840, 2], [950, 4]];
  notes.forEach(([x, pos], i) => c.circle(x, 450 + 44 - pos * 11 + 2, 16, i === 5 ? C.verm : C.ink));
  c.rect(70, 560, 1060, 10, C.verm);
  return c;
}

mkdirSync(join(ROOT, 'icons'), { recursive: true });
writeFileSync(join(ROOT, 'icons', 'icon-192.png'), png(icon(192)));
writeFileSync(join(ROOT, 'icons', 'icon-512.png'), png(icon(512)));
writeFileSync(join(ROOT, 'icons', 'icon-maskable-512.png'), png(icon(512, 0.12)));
writeFileSync(join(ROOT, 'icons', 'apple-touch-icon.png'), png(icon(180, 0.06)));
writeFileSync(join(ROOT, 'og-image.png'), png(ogImage()));
writeFileSync(join(ROOT, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#121212"/><g fill="#F2EDE3"><rect x="5" y="8.2" width="22" height="1.7"/><rect x="5" y="12.2" width="22" height="1.7"/><rect x="5" y="16.2" width="22" height="1.7"/><rect x="5" y="20.2" width="22" height="1.7"/><rect x="5" y="24.2" width="22" height="1.7"/></g><circle cx="20" cy="17" r="5.2" fill="#E3412B"/></svg>\n`);
console.log('Icons, Open Graph image and favicon written.');
