// Builds every HTML page, sitemap.xml and robots.txt from templates.
// Run: node scripts/build.mjs
import { writeFileSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTS, PRODUCT_BY_ID } from '../js/products.js';
import { PRODUCT_CONTENT } from './content-products.mjs';
import { FAQ, ABOUT, REFUNDS, DELIVERY, DISCLAIMER, TERMS, PRIVACY, ACCESSIBILITY, LAST_UPDATED } from './content-pages.mjs';
import { art, LOGO } from '../js/core/art.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// The site's primary address, used for canonical links, Open Graph tags, the sitemap and robots.txt.
// Override with the SITE_URL environment variable (it must end with a slash).
export const SITE = process.env.SITE_URL || 'https://fretwell-music-lab.vercel.app/';
// Vercel sets VERCEL=1 during its builds; the Privacy Policy names whichever host serves the pages.
const ON_VERCEL = !!process.env.VERCEL;
const HOSTING = ON_VERCEL
  ? 'The site itself is hosted on Vercel, and Vercel processes technical information such as IP addresses to deliver the pages and keep the service secure, under Vercel’s privacy policy. Vercel may show us basic request logs for troubleshooting; we do not use them to track or profile visitors, and we do not receive visitor logs from Google.'
  : 'The site itself is hosted on GitHub Pages, and GitHub processes technical information such as IP addresses to deliver the pages and keep the service secure, under GitHub’s privacy statement. We do not receive visitor logs from either service.';
const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=IBM+Plex+Mono:wght@500;600&family=Instrument+Sans:wght@400..700&display=swap';
const YEAR = 2026;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const relRoot = (path) => (path === '' ? './' : '../'.repeat(path.split('/').filter(Boolean).length));
const fill = (html, r) => html.replaceAll('{{r}}', r).replaceAll('{{hosting}}', HOSTING);

const THEME_INIT = `<script>(function(){try{var d=document.documentElement,t=localStorage.getItem('fretwell.theme');if(t==='dark'||t==='light')d.setAttribute('data-theme',t);if(localStorage.getItem('fretwell.large')==='1')d.classList.add('is-large');}catch(e){}})();</script>`;

function head({ path, title, description, noindex, r, extraHead = '', scripts = [] }) {
  const url = SITE + path;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${url}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Fretwell Music Lab">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Fretwell Music Lab: geometric shapes arranged like a keyboard, a fretboard and a musical staff">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F2EDE3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F0F0E" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${r}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${r}icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${r}css/site.css">
${extraHead}${THEME_INIT}
<script type="module" src="${r}js/site.js"></script>
${scripts.map((s) => `<script type="module" src="${r}${s}"></script>`).join('\n')}
</head>`;
}

function header(r) {
  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${r}">${LOGO}<span class="brand-name">Fretwell<br>Music Lab</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="nav-toggle-bars" aria-hidden="true"></span>Menu</button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul>
        <li><a href="${r}#foundations">Foundations</a></li>
        <li><a href="${r}#studio">Studio Editions</a></li>
        <li><a href="${r}about/">About</a></li>
        <li><a href="${r}faq/">FAQ</a></li>
        <li class="nav-room" hidden><a href="${r}practice/">Practice room</a></li>
        <li><a class="nav-key" href="${r}unlock/">Have a key?</a></li>
      </ul>
    </nav>
    <button class="theme-toggle" type="button" aria-label="Switch to dark mode"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg></button>
  </div>
</header>`;
}

function footer(r) {
  return `<footer class="site-footer">
  <div class="staff-rule" aria-hidden="true"></div>
  <div class="wrap footer-grid">
    <div class="footer-id">
      <p class="footer-brand">Fretwell Music Lab</p>
      <div data-footer-email></div>
      <p class="footer-copy">© <span data-year>${YEAR}</span> Fretwell Music Lab</p>
    </div>
    <nav class="footer-nav" aria-label="Policies">
      <h2 class="footer-h">Policies</h2>
      <ul>
        <li><a href="${r}terms/">Terms</a></li>
        <li><a href="${r}privacy/">Privacy</a></li>
        <li><a href="${r}refunds/">Refunds</a></li>
        <li><a href="${r}delivery/">Delivery</a></li>
        <li><a href="${r}disclaimer/">Disclaimer</a></li>
        <li><a href="${r}accessibility/">Accessibility</a></li>
        <li><a href="${r}contact/">Contact</a></li>
      </ul>
    </nav>
    <nav class="footer-nav" aria-label="Products">
      <h2 class="footer-h">Tools</h2>
      <ul>
        ${PRODUCTS.map((p) => `<li><a href="${r}${p.pagePath}">${esc(p.shortName)}</a></li>`).join('\n        ')}
      </ul>
    </nav>
    <nav class="footer-nav" aria-label="Site">
      <h2 class="footer-h">Site</h2>
      <ul>
        <li><a href="${r}">Home</a></li>
        <li><a href="${r}about/">About</a></li>
        <li><a href="${r}faq/">FAQ</a></li>
        <li><a href="${r}unlock/">Have a key?</a></li>
      </ul>
    </nav>
  </div>
</footer>`;
}

const pages = [];
function page({ path, title, description, body, noindex = false, scripts = [], bodyClass = '', sitemap = !noindex, file = null }) {
  const r = relRoot(path);
  const html = `${head({ path, title, description, noindex, r, scripts })}
<body class="${bodyClass}">
${header(r)}
<main id="main">
${fill(body, r)}
</main>
${footer(r)}
</body>
</html>
`;
  const out = file ? join(ROOT, file) : join(ROOT, path, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  pages.push({ path, sitemap });
}

const staffRule = '<div class="staff-rule" aria-hidden="true"></div>';
const priceOf = (id) => `$${PRODUCT_BY_ID[id].price}`;

/* ------------------------------------------------------------------- tiles */

function tile(p, { large = false } = {}) {
  const c = PRODUCT_CONTENT[p.id];
  return `<a class="tile tile--${c.color}${large ? ' tile--large' : ''}" href="{{r}}${p.pagePath}">
  <div class="tile-art">${art(c.art)}</div>
  <div class="tile-body">
    <p class="tile-tier">${p.tier === 'Foundations' ? 'Foundations' : 'Studio Edition'}</p>
    <h3 class="tile-title">${esc(p.shortName)}</h3>
    <p class="tile-text">${esc(c.tagline)}</p>
    <p class="tile-price"><span data-price-for="${p.id}">${priceOf(p.id)}</span></p>
  </div>
</a>`;
}

/* -------------------------------------------------------------------- home */

function heroBoard() {
  const whites = [['C4', 60], ['D4', 62], ['E4', 64], ['F4', 65], ['G4', 67], ['A4', 69], ['B4', 71], ['C5', 72], ['D5', 74], ['E5', 76]];
  const colors = { 64: 'saffron', 69: 'cobalt', 72: 'vermilion' };
  const blacks = [['C♯4', 61, 1], ['E♭4', 63, 2], ['F♯4', 66, 4], ['A♭4', 68, 5], ['B♭4', 70, 6], ['C♯5', 73, 8], ['E♭5', 75, 9]];
  const frets = [
    // string row (0 = top/high), column, name, midi, colour
    [0, 0, 'A4', 69, 'vermilion'], [0, 3, 'C5', 72, 'ink'],
    [1, 0, 'E4', 64, 'ink'], [1, 3, 'G4', 67, 'cobalt'],
    [2, 0, 'C4', 60, 'saffron'], [2, 2, 'D4', 62, 'ink'],
    [3, 0, 'G3', 55, 'ink'], [3, 2, 'A3', 57, 'vermilion'],
  ];
  return `<div class="hero-board">
  <div class="hk-keys" role="group" aria-label="Keyboard shapes">
    ${whites.map(([n, m], i) => `<button type="button" class="hk hk-white${colors[m] ? ' hk--' + colors[m] : ''}" style="--col:${i}" data-midi="${m}" data-inst="keys" data-name="${n}" aria-label="Play ${n} on the keyboard"></button>`).join('')}
    ${blacks.map(([n, m, pos]) => `<button type="button" class="hk hk-black" style="--pos:${pos}" data-midi="${m}" data-inst="keys" data-name="${n}" aria-label="Play ${n} on the keyboard"></button>`).join('')}
  </div>
  <div class="hf-board" role="group" aria-label="Fretboard shapes">
    ${[0, 1, 2, 3].map((s) => `<span class="hf-string" style="--row:${s}" aria-hidden="true"></span>`).join('')}
    ${[1, 2, 3].map((c) => `<span class="hf-fret" style="--colx:${c}" aria-hidden="true"></span>`).join('')}
    ${frets.map(([s, c, n, m, col]) => `<button type="button" class="hf-dot hf--${col}" style="--row:${s};--colx:${c}" data-midi="${m}" data-inst="guitar" data-name="${n}" aria-label="Play ${n} on the fretboard"></button>`).join('')}
  </div>
</div>`;
}

const STEP_HTML = `<ol class="steps">
  <li><span class="step-n" aria-hidden="true">1</span><h3>Buy a tool</h3><p>Pay once through secure checkout. Prices are in US dollars, and taxes are shown before you pay.</p></li>
  <li><span class="step-n" aria-hidden="true">2</span><h3>Get your key</h3><p>Your license key appears instantly on the order confirmation page. Copy it and keep it safe.</p></li>
  <li><span class="step-n" aria-hidden="true">3</span><h3>Unlock and practise</h3><p>Enter the key on the <a href="{{r}}unlock/">unlock page</a>. Your tools open in your practice room on any device, with no account.</p></li>
</ol>`;

function faqList(items) {
  return `<div class="faq-list">${items.map(([q, a]) => `<details class="faq-item"><summary><span>${esc(q)}</span><span class="faq-icon" aria-hidden="true"></span></summary><div class="faq-a">${a}</div></details>`).join('')}</div>`;
}

function homePage() {
  const found = PRODUCTS.filter((p) => p.tier === 'Foundations' && p.id !== 'foundations-bundle');
  const studio = PRODUCTS.filter((p) => p.tier === 'Studio Editions');
  const atelier = studio.find((p) => p.id === 'atelier');
  const others = studio.filter((p) => p.id !== 'atelier');
  const bundle = PRODUCT_BY_ID['foundations-bundle'];
  const body = `
<section class="hero" aria-labelledby="hero-title">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow">Theory &amp; ear training for guitar and piano</p>
      <h1 id="hero-title" class="display">Hear it.<br>Read it.<br><span class="display-accent">Play it.</span></h1>
      <p class="lede">Interactive tools for notes, intervals, scales, chords, rhythm and harmony. Every sound is synthesized in your browser and every exercise is generated fresh. No account, no downloads.</p>
      <div class="hero-actions">
        <a class="btn btn-ink" href="#foundations">See the tools</a>
        <a class="btn btn-outline" href="#mini-quiz">Try the free quiz</a>
      </div>
    </div>
    <div class="hero-play" id="hero-play">
      <div class="hero-controls">
        <button class="sound-toggle" type="button" aria-pressed="false" data-sound-toggle><span class="sound-icon" aria-hidden="true"></span><span class="sound-label">Turn sound on</span></button>
        <label class="volume" hidden><span>Volume</span><input type="range" min="0" max="100" step="1" data-volume aria-label="Volume"></label>
      </div>
      ${heroBoard()}
      <div class="hero-staff" aria-hidden="true"><svg class="hero-staff-svg" viewBox="0 0 600 120" preserveAspectRatio="none"><g class="hs-lines">${[0, 1, 2, 3, 4].map((i) => `<rect x="0" y="${30 + i * 14}" width="600" height="2"/>`).join('')}</g></svg><div class="hero-staff-notes"></div></div>
      <p class="hero-hint">Press the shapes to play. Notes appear on the staff. <span class="hero-volnote">Start at a low volume, especially with headphones.</span></p>
    </div>
  </div>
</section>

<section class="section quiz-section" id="mini-quiz" aria-labelledby="quiz-title">
  <div class="wrap quiz-grid">
    <div class="quiz-intro">
      <p class="eyebrow">Free · not part of any paid tool</p>
      <h2 id="quiz-title" class="h-staff">Mini interval quiz</h2>
      <p>Five rounds. Two notes play one after the other. Is the gap a 3rd, a 5th or an octave? It is a quick taste of ear training, separate from the paid tools.</p>
      <p class="small">Requires sound. Start at a low volume, especially with headphones.</p>
    </div>
    <div class="mini-quiz" id="mini-quiz-app" aria-live="polite">
      <noscript><p>The mini quiz needs JavaScript turned on.</p></noscript>
    </div>
  </div>
</section>

<section class="section tier" id="foundations" aria-labelledby="found-title">
  <div class="wrap">
    <header class="tier-head">
      <p class="tier-label">Tier one</p>
      <h2 id="found-title" class="tier-title">Foundations</h2>
      <p class="tier-text">Five focused tools for the essentials of musicianship. Each one is sold on its own, or get all five with one key.</p>
    </header>
    ${staffRule}
    <div class="tiles">
      ${found.map((p) => tile(p)).join('\n')}
      <a class="tile tile--bundle" href="{{r}}${bundle.pagePath}">
        <div class="tile-art">${art('bundle')}</div>
        <div class="tile-body">
          <p class="tile-tier">Foundations</p>
          <h3 class="tile-title">Foundations Bundle</h3>
          <p class="tile-text">All five Foundations tools, unlocked by a single key.</p>
          <p class="tile-price"><span data-price-for="foundations-bundle">${priceOf('foundations-bundle')}</span></p>
        </div>
      </a>
    </div>
  </div>
</section>

<section class="studio" id="studio" aria-labelledby="studio-title">
  <div class="wrap">
    <header class="tier-head tier-head--studio">
      <p class="tier-label">Tier two</p>
      <h2 id="studio-title" class="tier-title">Studio Editions</h2>
      <p class="tier-text">Advanced tools with harder material, written exercises checked against rules, and multi-voice dictation.</p>
    </header>
    <div class="staff-rule staff-rule--light" aria-hidden="true"></div>
    <div class="studio-grid">
      ${tile(atelier, { large: true })}
      ${others.map((p) => tile(p)).join('\n')}
    </div>
  </div>
</section>

<section class="section how" aria-labelledby="how-title">
  <div class="wrap">
    <h2 id="how-title" class="h-staff">How buying and unlocking work</h2>
    ${STEP_HTML}
  </div>
</section>

<section class="section faq-preview" aria-labelledby="faqp-title">
  <div class="wrap faq-grid">
    <div>
      <h2 id="faqp-title" class="h-staff">Questions</h2>
      <p><a class="link-arrow" href="{{r}}faq/">Read all questions</a></p>
    </div>
    ${faqList([FAQ[0], FAQ[3], FAQ[7], FAQ[5]])}
  </div>
</section>`;
  page({
    path: '',
    title: 'Fretwell Music Lab — Interactive music theory & ear training',
    description: 'Interactive music theory and ear-training tools for guitar and piano players: notes, intervals, scales, chords, rhythm and harmony, in the browser with synthesized sound.',
    body,
    scripts: ['js/pages/home.js'],
    bodyClass: 'page-home',
  });
}

/* ---------------------------------------------------------------- products */

const ROOM_FEATURES = `<ul class="feature-grid">
  <li><strong>Instant feedback</strong> on every answer, with ✓ and ✗ marks and the correct answer shown.</li>
  <li><strong>Settings that save themselves</strong>, plus named practice sets you can switch between.</li>
  <li><strong>A session summary</strong> when you finish, with your accuracy and the items to review.</li>
  <li><strong>A reference view</strong> for looking things up without being quizzed.</li>
  <li><strong>Progress and streaks</strong>: accuracy over time and your weakest items, stored only on your device.</li>
  <li><strong>Progress backup</strong>: move your progress to another device with a backup code or file.</li>
  <li><strong>Works offline</strong> once unlocked, and installs to your home screen or desktop.</li>
  <li><strong>Keyboard shortcuts</strong>, visible focus, a larger-interface setting, and dark mode.</li>
</ul>`;

function productPage(p) {
  const c = PRODUCT_CONTENT[p.id];
  const studio = p.tier === 'Studio Editions';
  const r = '{{r}}';
  const tierLink = studio ? `<a href="${r}#studio">Studio Edition</a>` : `<a href="${r}#foundations">Foundations</a>`;
  let bundleList = '';
  if (p.id === 'foundations-bundle') {
    const tools = PRODUCTS.filter((x) => x.tier === 'Foundations' && x.id !== 'foundations-bundle');
    bundleList = `<section class="p-section"><h2>Included tools</h2><ul class="bundle-list">${tools.map((t) => {
      const tc = PRODUCT_CONTENT[t.id];
      return `<li class="bundle-item bundle-item--${tc.color}"><div class="bundle-art">${art(tc.art)}</div><div><h3><a href="${r}${t.pagePath}">${esc(t.name)}</a></h3><p>${esc(tc.tagline)}</p><p class="small">Exercises: ${tc.exercises.map((e) => esc(e[0])).join(' · ')}</p></div></li>`;
    }).join('')}</ul><p>Each tool’s page lists every exercise and setting, with a demo.</p></section>`;
  }
  const exercises = c.exercises.length ? `<section class="p-section"><h2>Exercises</h2><dl class="ex-list">${c.exercises.map(([n, d]) => `<div><dt>${esc(n)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl></section>` : '';
  const settings = c.settings.length ? `<section class="p-section"><h2>Settings you can change</h2><ul class="tick-list">${c.settings.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>` : '';
  const studioDiff = studio ? `<section class="p-section studio-diff"><h2>What makes it a Studio Edition</h2><p>Compared with the Foundations tools, this edition asks more of you in concrete ways:</p><dl class="ex-list">${c.studio.map(([n, d]) => `<div><dt>${esc(n)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl></section>` : '';
  const reference = c.reference ? `<section class="p-section"><h2>Reference view</h2><p>${esc(c.reference)}</p></section>` : '';
  const body = `
<article class="product product--${c.color}">
  <header class="p-hero">
    <div class="wrap p-hero-grid">
      <div class="p-hero-copy">
        <p class="eyebrow">${tierLink}</p>
        <h1 class="p-title">${esc(p.name)}</h1>
        <p class="lede">${esc(c.tagline)}</p>
      </div>
      <div class="p-hero-art">${art(c.art)}</div>
    </div>
  </header>
  <div class="wrap p-layout">
    <div class="p-main">
      <section class="p-section"><h2>What it trains</h2><p>${esc(c.intro)}</p><ul class="tick-list">${c.trains.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>
      ${bundleList}
      ${exercises}
      ${studioDiff}
      <section class="p-section demo-section"><h2>Try it</h2><p>A short interactive demo built from the same code as the real tool.</p><div class="demo" data-demo="${c.demo}"><noscript><p>The demo needs JavaScript turned on.</p></noscript></div></section>
      ${settings}
      <section class="p-section"><h2>Instruments and clefs</h2><p>${esc(c.instruments)}</p></section>
      ${reference}
      <section class="p-section p-who">
        <div><h2>Who it’s for</h2><ul class="tick-list">${c.forWho.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
        <div><h2>Who it isn’t for</h2><ul class="dash-list">${c.notFor.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
      </section>
      <section class="p-section"><h2>What you need</h2><ul class="tick-list">
        <li>A modern web browser on a computer, tablet or phone</li>
        <li>Speakers or headphones</li>
        ${c.ear ? '<li>The ability to hear audio — this tool includes ear training that depends on listening</li>' : ''}
      </ul>
      <p class="synth-note"><strong>About the sound:</strong> all instrument sounds are synthesized in your browser. They are not recordings of real instruments.</p></section>
      <section class="p-section"><h2>In every tool</h2>${ROOM_FEATURES}</section>
    </div>
    <aside class="p-buy" aria-label="Price and purchase">
      <div class="buy-card">
        <p class="buy-name">${esc(p.shortName)}</p>
        <p class="price"><span data-price-for="${p.id}">${priceOf(p.id)}</span> <span class="price-cur">USD</span></p>
        <p class="price-terms">Instant access with a license key · <a href="${r}refunds/">14-day refund policy</a> · Applicable taxes are shown at checkout</p>
        <div class="buy-slot" data-buy-for="${p.id}"></div>
        <ul class="buy-facts">
          <li>One-time purchase, no subscription</li>
          <li>No account or password</li>
          <li>Computer, tablet and phone</li>
          <li>Sounds are synthesized, not recorded</li>
        </ul>
        <p class="buy-key">Already bought it? <a href="${r}unlock/">Enter your key</a></p>
      </div>
    </aside>
  </div>
</article>`;
  page({
    path: p.pagePath,
    title: `${p.name} — Fretwell Music Lab`,
    description: `${c.tagline} ${p.tier === 'Foundations' ? 'A Foundations tool' : 'A Studio Edition'} from Fretwell Music Lab, $${p.price}.`.slice(0, 300),
    body,
    scripts: ['js/pages/product.js'],
    bodyClass: 'page-product',
  });
}

/* ------------------------------------------------------------- thank-you */

function thankYouPage(p) {
  const tools = p.id === 'foundations-bundle'
    ? 'Note Reader, Interval Ear Trainer, Scale & Mode Explorer, Chord Builder & Ear Trainer and Rhythm Lab'
    : p.name;
  const body = `
<section class="thanks" data-product="${p.id}">
  <div class="wrap thanks-grid">
    <div class="thanks-copy">
      <p class="eyebrow">Order complete</p>
      <h1 class="display-sm">Thank you. Here is your key.</h1>
      <p class="lede">This license key unlocks <strong>${esc(tools)}</strong>.</p>
    </div>
    <div class="key-reveal" data-key-reveal>
      <p class="key-label" id="key-label">Your license key</p>
      <p class="key-display" aria-labelledby="key-label" data-key-display><span class="key-placeholder">Generating your key…</span></p>
      <div class="key-actions">
        <button class="btn btn-ink" type="button" data-copy-key>Copy key</button>
        <button class="btn btn-outline" type="button" data-save-key>Save as text file</button>
        <button class="sound-toggle sound-toggle--small" type="button" aria-pressed="false" data-sound-toggle><span class="sound-icon" aria-hidden="true"></span><span class="sound-label">Sound</span></button>
      </div>
      <p class="key-status" role="status" aria-live="polite" data-key-status></p>
      <div class="key-reminder">
        <p><strong>Save this key now.</strong> Copy it into a notes app or password manager, or save the file. You will need it to open your tools on another device or browser.</p>
      </div>
      <a class="btn btn-vermilion btn-lg" href="{{r}}unlock/" data-open-tools>Open my tools</a>
    </div>
  </div>
  <div class="wrap">
    ${staffRule}
    <ol class="steps">
      <li><span class="step-n" aria-hidden="true">1</span><h3>Save your key</h3><p>Copy it or save the file before you leave this page.</p></li>
      <li><span class="step-n" aria-hidden="true">2</span><h3>Open your tools</h3><p>“Open my tools” takes you to the unlock page with your key filled in. Press Unlock.</p></li>
      <li><span class="step-n" aria-hidden="true">3</span><h3>Practise anywhere</h3><p>Enter the same key on your other devices. Install the practice room to use it offline.</p></li>
    </ol>
    <p class="thanks-help">Lost your key later? Contact us through the <a href="{{r}}contact/">Contact page</a> with your order number for a replacement.</p>
  </div>
</section>`;
  page({
    path: p.thankYouPath,
    title: `Your license key — ${p.shortName} — Fretwell Music Lab`,
    description: `License key for ${p.name}.`,
    body,
    noindex: true,
    scripts: ['js/pages/thank-you.js'],
    bodyClass: 'page-thanks',
  });
}

/* ------------------------------------------------------------------ unlock */

function unlockPage() {
  const body = `
<section class="unlock">
  <div class="wrap unlock-grid">
    <div class="unlock-copy">
      <p class="eyebrow">Have a key?</p>
      <h1 class="display-sm">Unlock your tools</h1>
      <p class="lede">Enter the license key from your order confirmation page. Your tools open in your practice room on this device.</p>
      <ul class="tick-list">
        <li>The key is checked in your browser. No account, no password.</li>
        <li>Enter the same key on each of your devices.</li>
        <li>Have more than one key? Enter them one after another; each adds its tools to the same practice room.</li>
      </ul>
      <p class="small">Lost your key? Contact us through the <a href="{{r}}contact/">Contact page</a> with your order number.</p>
    </div>
    <div class="key-card">
      <form class="key-form" data-key-form novalidate>
        <fieldset>
          <legend class="key-legend">License key</legend>
          <div class="key-boxes" data-key-boxes>
            <span class="key-prefix" aria-hidden="true">FRET</span><span class="key-dash" aria-hidden="true">–</span>
            <input class="key-box key-box--2" data-len="2" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Key part 1 of 4: product code, 2 characters">
            <span class="key-dash" aria-hidden="true">–</span>
            <input class="key-box key-box--5" data-len="5" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Key part 2 of 4: 5 characters">
            <span class="key-dash" aria-hidden="true">–</span>
            <input class="key-box key-box--5" data-len="5" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Key part 3 of 4: 5 characters">
            <span class="key-dash" aria-hidden="true">–</span>
            <input class="key-box key-box--4" data-len="4" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Key part 4 of 4: 4 characters">
          </div>
        </fieldset>
        <p class="key-hint">Type or paste your whole key into any box — the boxes fill in as you go. Upper or lower case both work.</p>
        <p class="key-error" role="alert" data-key-error></p>
        <div class="key-submit-row">
          <button class="btn btn-ink btn-lg" type="submit">Unlock</button>
          <button class="sound-toggle sound-toggle--small" type="button" aria-pressed="false" data-sound-toggle><span class="sound-icon" aria-hidden="true"></span><span class="sound-label">Sound</span></button>
        </div>
      </form>
      <div class="chord-anim" data-chord-anim aria-hidden="true"></div>
      <div class="unlock-success" data-unlock-success hidden tabindex="-1">
        <p class="unlock-ok"><span class="ok-icon" aria-hidden="true">✓</span> <span data-unlock-msg>Key accepted.</span></p>
        <a class="btn btn-vermilion btn-lg" href="{{r}}practice/">Open the practice room</a>
        <button class="btn btn-outline" type="button" data-another-key>Enter another key</button>
      </div>
    </div>
  </div>
</section>`;
  page({
    path: 'unlock/',
    title: 'Unlock your tools — Fretwell Music Lab',
    description: 'Enter your Fretwell Music Lab license key to open your tools in your practice room. No account or password needed.',
    body,
    scripts: ['js/pages/unlock.js'],
    bodyClass: 'page-unlock',
  });
}

/* ----------------------------------------------------------- practice room */

function practicePage() {
  const r = '../';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Practice room — Fretwell Music Lab</title>
<meta name="description" content="Your Fretwell Music Lab practice room.">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#F2EDE3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F0F0E" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="${r}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${r}icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Fretwell">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${r}css/site.css">
<link rel="stylesheet" href="${r}css/app.css">
${THEME_INIT}
<script type="module" src="${r}js/app/app.js"></script>
</head>
<body class="page-app">
<a class="skip-link" href="#app">Skip to content</a>
<header class="app-header">
  <div class="app-header-inner">
    <a class="brand brand--app" href="#/" aria-label="Practice room home">${LOGO}<span class="brand-name">Practice<br>room</span></a>
    <nav class="app-nav" aria-label="Practice room">
      <a href="#/" data-nav="room">Room</a>
      <a href="#/progress" data-nav="progress">Progress</a>
      <a href="#/settings" data-nav="settings">Settings</a>
      <a href="#/keys" data-nav="keys">Keys</a>
    </nav>
    <div class="app-tools">
      <label class="volume volume--app"><span class="sr-only">Volume</span><svg class="vol-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="range" min="0" max="100" step="1" data-volume aria-label="Volume"></label>
      <button class="theme-toggle" type="button" aria-label="Switch to dark mode"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg></button>
    </div>
  </div>
</header>
<main id="app" class="app-main" tabindex="-1">
  <noscript><div class="wrap"><p>The practice room needs JavaScript turned on.</p></div></noscript>
  <div class="app-loading wrap"><p>Opening your practice room…</p></div>
</main>
<footer class="app-footer">
  <div class="app-footer-inner">
    <p>© <span data-year>${YEAR}</span> Fretwell Music Lab</p>
    <nav aria-label="Site links"><a href="${r}">Shop</a> <a href="${r}faq/">FAQ</a> <a href="${r}terms/">Terms</a> <a href="${r}privacy/">Privacy</a> <a href="${r}refunds/">Refunds</a> <a href="${r}contact/">Contact</a></nav>
  </div>
</footer>
</body>
</html>
`;
  mkdirSync(join(ROOT, 'practice'), { recursive: true });
  writeFileSync(join(ROOT, 'practice', 'index.html'), html);
  pages.push({ path: 'practice/', sitemap: false });
  writeFileSync(join(ROOT, 'practice', 'manifest.webmanifest'), JSON.stringify({
    name: 'Fretwell Music Lab — Practice room',
    short_name: 'Fretwell',
    description: 'Interactive music theory and ear-training tools.',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#F2EDE3',
    theme_color: '#121212',
    icons: [
      { src: '../icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '../icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '../icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '../favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }, null, 2));
}

/* ------------------------------------------------------------ text pages */

function textPage({ path, title, h1, description, html, dated = false, eyebrow = '' }) {
  const body = `
<section class="text-page">
  <div class="wrap text-wrap">
    <header class="text-head">
      ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
      <h1 class="display-sm">${esc(h1)}</h1>
      ${dated ? `<p class="updated">Last updated: <time datetime="2026-11-08">${LAST_UPDATED}</time></p>` : ''}
    </header>
    ${staffRule}
    <div class="prose">${html}</div>
  </div>
</section>`;
  page({ path, title, description, body, bodyClass: 'page-text' });
}

function faqPage() {
  const body = `
<section class="text-page">
  <div class="wrap text-wrap">
    <header class="text-head"><p class="eyebrow">Help</p><h1 class="display-sm">Frequently asked questions</h1></header>
    ${staffRule}
    ${faqList(FAQ)}
    <p class="faq-more">Still have a question? Contact us through the <a href="{{r}}contact/">Contact page</a>.</p>
  </div>
</section>`;
  page({
    path: 'faq/',
    title: 'FAQ — Fretwell Music Lab',
    description: 'Answers about license keys, using more than one device, moving progress, offline use, supported browsers, synthesized sounds, refunds and more.',
    body,
    bodyClass: 'page-text',
  });
}

function contactPage() {
  const body = `
<section class="text-page">
  <div class="wrap text-wrap">
    <header class="text-head"><p class="eyebrow">Support</p><h1 class="display-sm">Contact</h1></header>
    ${staffRule}
    <div class="prose">
      <p class="lede">We are happy to help with keys, refunds, problems with a tool, classroom licenses and anything else.</p>
      <div class="contact-email" data-contact-email></div>
      <h2>Response time</h2>
      <p>We reply within two business days.</p>
      <h2>What to include</h2>
      <ul>
        <li>Your <strong>order number</strong>, from your order confirmation or receipt</li>
        <li>The <strong>email address you used at checkout</strong></li>
        <li>For a problem with a tool: which tool and exercise, what you expected and what happened, and which device and browser you were using</li>
      </ul>
      <p>For refunds, see the <a href="{{r}}refunds/">Refund Policy</a>. For lost keys, include your order number and we will send a replacement key.</p>
      <p>Common questions are answered in the <a href="{{r}}faq/">FAQ</a>.</p>
    </div>
  </div>
</section>`;
  page({
    path: 'contact/',
    title: 'Contact — Fretwell Music Lab',
    description: 'How to contact Fretwell Music Lab for help with license keys, refunds and the tools. We reply within two business days.',
    body,
    scripts: [],
    bodyClass: 'page-text',
  });
}

function notFoundPage() {
  const body = `
<section class="text-page not-found">
  <div class="wrap text-wrap">
    <p class="eyebrow">Error 404</p>
    <h1 class="display">Rest.</h1>
    <div class="nf-rest" aria-hidden="true"><svg viewBox="0 0 120 80"><g fill="currentColor"><rect x="0" y="10" width="120" height="3"/><rect x="0" y="24" width="120" height="3"/><rect x="0" y="38" width="120" height="3"/><rect x="0" y="52" width="120" height="3"/><rect x="0" y="66" width="120" height="3"/><rect x="44" y="24" width="32" height="10"/></g></svg></div>
    <p class="lede">There is nothing at this address — just a whole bar of silence.</p>
    <p><a class="btn btn-ink" href="{{r}}">Go to the home page</a> <a class="btn btn-outline" href="{{r}}unlock/">Enter a key</a></p>
  </div>
</section>`;
  // The host serves 404.html at any depth, so it sets its own base URL before loading assets
  // (/fretwell-music-lab/ on GitHub Pages, / on Vercel or a custom domain).
  const r = './';
  const baseScript = `<script>(function(){var p=location.pathname,m=p.match(/^\\/fretwell-music-lab\\//);document.write('<base href="'+(m?'/fretwell-music-lab/':'/')+'">');})();</script>`;
  const html = `${head({ path: '404.html', title: 'Page not found — Fretwell Music Lab', description: 'This page does not exist.', noindex: true, r }).replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + baseScript)}
<body class="page-text">
${header(r)}
<main id="main">
${fill(body, r)}
</main>
${footer(r)}
</body>
</html>
`;
  writeFileSync(join(ROOT, '404.html'), html);
}

/* -------------------------------------------------------------- run build */

homePage();
PRODUCTS.forEach(productPage);
PRODUCTS.forEach(thankYouPage);
unlockPage();
practicePage();
textPage({ path: 'about/', title: 'About — Fretwell Music Lab', h1: 'About Fretwell Music Lab', description: 'What Fretwell Music Lab makes and why: browser-based theory and ear-training tools with generated exercises and synthesized sound.', html: ABOUT, eyebrow: 'About' });
faqPage();
contactPage();
textPage({ path: 'terms/', title: 'Terms of Service — Fretwell Music Lab', h1: 'Terms of Service', description: 'The terms that apply when you use the Fretwell Music Lab website and buy and use its products.', html: TERMS, dated: true, eyebrow: 'Policies' });
textPage({ path: 'privacy/', title: 'Privacy Policy — Fretwell Music Lab', h1: 'Privacy Policy', description: 'No cookies, no analytics, no trackers. Your keys, progress and settings stay in your browser. How order information is handled and your rights.', html: PRIVACY, dated: true, eyebrow: 'Policies' });
textPage({ path: 'refunds/', title: 'Refund Policy — Fretwell Music Lab', h1: 'Refund Policy', description: 'Full refund on any Fretwell Music Lab purchase within 14 days, no reason required.', html: REFUNDS, dated: true, eyebrow: 'Policies' });
textPage({ path: 'delivery/', title: 'Delivery Policy — Fretwell Music Lab', h1: 'Delivery Policy', description: 'All products are digital. Your license key appears immediately after payment and unlocks your tools on any device.', html: DELIVERY, dated: true, eyebrow: 'Policies' });
textPage({ path: 'disclaimer/', title: 'Disclaimer — Fretwell Music Lab', h1: 'Disclaimer', description: 'Fretwell Music Lab tools are practice aids, not lessons. No specific results are promised. Sounds are synthesized.', html: DISCLAIMER, dated: true, eyebrow: 'Policies' });
textPage({ path: 'accessibility/', title: 'Accessibility — Fretwell Music Lab', h1: 'Accessibility', description: 'Keyboard operation, shortcuts, contrast, a larger-interface setting and other accessibility features of Fretwell Music Lab, and known limitations.', html: ACCESSIBILITY, dated: true, eyebrow: 'Policies' });
notFoundPage();

const urls = pages.filter((p) => p.sitemap).map((p) => `  <url><loc>${SITE}${p.path}</loc><lastmod>2026-11-08</lastmod></url>`);
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
writeFileSync(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
/* -------------------------------------------------------- service worker */
// Precache the practice room, its tools and shared assets so it works offline once loaded.
function walk(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((f) => {
    const rel = dir + '/' + f;
    return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : [rel];
  });
}
const precache = ['practice/', 'practice/manifest.webmanifest', 'unlock/', 'favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  ...walk('css'), ...walk('js').filter((f) => f.endsWith('.js'))];
const hash = createHash('sha256');
for (const f of precache) hash.update(f + ':' + readFileSync(join(ROOT, f.endsWith('/') ? f + 'index.html' : f)).length + ':' + readFileSync(join(ROOT, f.endsWith('/') ? f + 'index.html' : f)).toString('utf8'));
const version = hash.digest('hex').slice(0, 12);
writeFileSync(join(ROOT, 'sw.js'), `// Fretwell Music Lab — service worker (generated by scripts/build.mjs).
// Precaches the practice room and every tool so they work offline once loaded.
// Pages are fetched from the network first and fall back to the cache when offline.
const CACHE = 'fretwell-${version}';
const FONT_CACHE = 'fretwell-fonts';
const FONTS_CSS = '${FONTS}';
const PRECACHE = ${JSON.stringify(precache, null, 2)};

// Fonts are cached on a best-effort basis so text keeps its typeface offline; failures never block installation.
async function cacheFonts() {
  try {
    const c = await caches.open(FONT_CACHE);
    if (await c.match(FONTS_CSS)) return;
    const res = await fetch(FONTS_CSS, { mode: 'cors' });
    if (!res.ok) return;
    await c.put(FONTS_CSS, res.clone());
    const css = await res.text();
    const urls = [...css.matchAll(/url\\((https:[^)]+)\\)/g)].map((m) => m[1]);
    await Promise.all(urls.map((u) => fetch(u, { mode: 'cors' }).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => null)));
  } catch { /* offline or blocked: system fonts are used instead */ }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE.map((p) => new URL(p, self.registration.scope).href))).then(() => cacheFonts()).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('fretwell-') && k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(caches.open(FONT_CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; } catch { return hit || Response.error(); }
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || (await caches.match(new URL('practice/', self.registration.scope).href)) || Response.error()));
    return;
  }
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    const network = fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || network;
  }));
});
`);
console.log(`Built ${pages.length + 1} pages; sitemap has ${urls.length} URLs; service worker ${version} precaches ${precache.length} files.`);
