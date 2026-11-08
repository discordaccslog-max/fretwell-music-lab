// Site checks: internal links and anchors, placeholder text, page metadata, thank-you page rules,
// copy rules, and colour contrast of the design tokens.
// Run: node scripts/check-site.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['.git', 'node_modules', 'tests', 'scripts']);
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    if (SKIP.has(f)) continue;
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p); else files.push(p);
  }
})(ROOT);
const rel = (p) => relative(ROOT, p).split(sep).join('/');
const html = files.filter((f) => f.endsWith('.html'));
const problems = [];
const fail = (m) => problems.push(m);

// 1. Links and anchors
for (const f of html) {
  const src = readFileSync(f, 'utf8');
  if (rel(f) === '404.html') continue; // uses a computed <base>
  for (const m of src.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|data:|#$)/.test(url)) continue;
    const [pathPart, hash] = url.split('#');
    let target = pathPart ? resolve(dirname(f), pathPart) : f;
    if (pathPart && (pathPart.endsWith('/') || existsSync(target) && statSync(target).isDirectory())) target = join(target, 'index.html');
    if (!existsSync(target)) { fail(`${rel(f)}: broken link ${url}`); continue; }
    if (hash && !hash.startsWith('/') && target.endsWith('.html')) {
      const t = readFileSync(target, 'utf8');
      if (!t.includes(`id="${hash}"`)) fail(`${rel(f)}: missing anchor #${hash} in ${rel(target)}`);
    }
  }
}

// 2. Placeholder and leftover text (site files only)
const textFiles = files.filter((f) => /\.(html|js|css|webmanifest|xml|txt|svg)$/.test(f));
const PLACEHOLDER = /\b(TODO|FIXME|TBD|lorem|ipsum|coming soon|placeholder text|your name here|example\.com)\b|\{\{(?:r|hosting)\}\}/i;
for (const f of textFiles) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (PLACEHOLDER.test(line) && !line.includes('your-domain.example')) fail(`${rel(f)}:${i + 1}: placeholder-like text: ${line.trim().slice(0, 100)}`);
  });
}

// 3. Metadata and thank-you rules
const sitemap = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
for (const f of html) {
  const src = readFileSync(f, 'utf8');
  const r = rel(f);
  const isThanks = r.startsWith('thank-you/');
  if (!/<title>[^<]{8,}<\/title>/.test(src)) fail(`${r}: missing title`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(src)) fail(`${r}: missing description`);
  if (!r.startsWith('practice/') && !/property="og:title"/.test(src)) fail(`${r}: missing Open Graph tags`);
  if (isThanks) {
    if (!/name="robots" content="noindex/.test(src)) fail(`${r}: thank-you page without noindex`);
    if (sitemap.includes(r.replace('index.html', ''))) fail(`${r}: thank-you page listed in sitemap`);
  } else if (/thank-you\//.test(src.replace(/<script[\s\S]*?<\/script>/g, ''))) {
    fail(`${r}: links to a thank-you page`);
  }
}
const titles = html.map((f) => (readFileSync(f, 'utf8').match(/<title>([^<]+)<\/title>/) || [])[1]);
const dup = titles.filter((t, i) => t && titles.indexOf(t) !== i);
if (dup.length) fail(`duplicate titles: ${[...new Set(dup)].join(' | ')}`);
if (/thank-you|practice\//.test(sitemap)) fail('sitemap lists a non-public page');

// 4. Copy rules (visible page text)
const BANNED = [
  /perfect pitch/i, /\bguarantee/i, /\blimited[- ]time\b/i, /\bhurry\b/i, /\bonly \d+ left\b/i, /\bcountdown\b/i, /limited edition/i,
  /testimonial/i, /\b\d+[,.]?\d*\+? (?:users|students|customers|downloads)\b/i, /\bstars?\b.*\brating/i, /\brated\b/i,
  /\bbrain\b/i, /\bcognitive\b/i, /\bIQ\b/, /(?:improv|boost|sharpen|strengthen)\w* (?:your )?memory|memory (?:boost|benefit|improvement)/i, /become a professional/i, /join a band/i, /pass (?:your|any|the) exam/i,
  /ABRSM|Trinity College|Berklee|Juilliard|Royal Conservatory|RCM\b|Yamaha|Fender|Gibson|Steinway|Martin guitars|Roland|Korg/i,
  /\bcertified\b/i, /\baward/i, /\bendorsed by\b(?! any)/i,
];
for (const f of html) {
  const text = readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  for (const re of BANNED) { const m = text.match(re); if (m) fail(`${rel(f)}: copy rule — "${m[0]}"`); }
}

// 5. Contrast of the main token pairs (WCAG AA: 4.5 for text, 3 for large text and UI)
const lum = (hex) => {
  const [r, g, b] = hex.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = [
  ['light fg/bg', '121212', 'F2EDE3', 4.5], ['light muted/bg', '4B473F', 'F2EDE3', 4.5], ['light muted/surface', '4B473F', 'FBF8F1', 4.5],
  ['light ok/bg', '176B43', 'F2EDE3', 4.5], ['light bad/bg', 'B3301B', 'F2EDE3', 4.5], ['light accent text', 'B3301B', 'FBF8F1', 4.5], ['light cobalt text', '2346D3', 'F2EDE3', 4.5],
  ['dark fg/bg', 'F2EDE3', '0F0F0E', 4.5], ['dark muted/bg', 'BBB4A6', '0F0F0E', 4.5], ['dark muted/surface', 'BBB4A6', '1A1917', 4.5],
  ['dark ok/bg', '62D198', '0F0F0E', 4.5], ['dark bad/bg', 'FF7D69', '0F0F0E', 4.5], ['dark cobalt text', '93A8FF', '1A1917', 4.5],
  ['ink on saffron', '121212', 'F2B230', 4.5], ['ink on vermilion', '121212', 'E3412B', 4.5], ['paper on cobalt', 'F2EDE3', '2346D3', 4.5],
  ['paper on ink', 'F2EDE3', '121212', 4.5], ['footer copy', 'CFC8BA', '121212', 4.5], ['footer heading', 'F2B230', '121212', 4.5],
  ['focus cobalt on paper', '2346D3', 'F2EDE3', 3], ['focus saffron on dark', 'F2B230', '0F0F0E', 3], ['kb C label on white key', '6B655A', 'FBF8F1', 4.5],
];
for (const [name, fg, bg, need] of pairs) {
  const r = ratio(fg, bg);
  if (r < need) fail(`contrast ${name}: ${r.toFixed(2)} < ${need}`);
}

if (problems.length) {
  console.log(problems.join('\n'));
  console.log(`\n${problems.length} problem(s) found in ${html.length} pages.`);
  process.exit(1);
}
console.log(`All checks passed: ${html.length} pages, ${textFiles.length} text files, ${pairs.length} contrast pairs.`);
