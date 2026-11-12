// Builds a private fulfillment evidence kit for payment processor reviews.
// It walks the live purchase-to-delivery flow for every product with a headless browser (Playwright
// driving the installed Chrome), captures screenshots, records one video, and compiles
// fulfillment-kit/Fulfillment-Overview.pdf. The kit folder is ignored by git and Vercel.
//
// Run: PLAYWRIGHT_PATH=<path to playwright/index.mjs> node scripts/fulfillment-kit.mjs
//      (or install playwright and run plainly). SITE_URL overrides the site address.
// Note: every run creates real, permanent reviewer keys (one per product).

import { mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync, renameSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PRODUCTS } from '../js/products.js';
import { PRODUCT_CONTENT } from './content-products.mjs';
import { TOOLS } from '../js/app/registry.js';
import { validateKey, PRODUCT_CODES } from '../js/core/license.js';
import { SITE_CONFIG } from '../js/site-config.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.env.SITE_URL || 'https://fretwell-music-lab.vercel.app/').replace(/\/?$/, '/');
const OUT = join(ROOT, 'fulfillment-kit');
const SHOTS = join(OUT, 'screenshots');
const CONF = join(OUT, 'confirmations');
const pwMod = await import(process.env.PLAYWRIGHT_PATH ? pathToFileURL(process.env.PLAYWRIGHT_PATH).href : 'playwright');
const { chromium } = pwMod.default || pwMod;

rmSync(OUT, { recursive: true, force: true });
[OUT, SHOTS, CONF].forEach((d) => mkdirSync(d, { recursive: true }));

const ALL_SEEN = JSON.stringify(Object.fromEntries(TOOLS.map((t) => [t.id, 1])));
// Exercises that show the tool working clearly in a single screenshot.
const IN_USE = {
  'note-reader': 'staff', 'interval-trainer': 'ascending', 'scale-explorer': 'ear', 'chord-builder': 'quality', 'rhythm-lab': 'ear',
  'progression-lab': 'analysis', 'jazz-harmony': 'quality', 'melodic-dictation': 'full', atelier: 'compound',
};
const today = new Date();
const stamp = today.toISOString().slice(0, 10);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const results = [];

async function settle(page, ms = 600) {
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(ms);
}

async function runProduct(p, index) {
  const n = String(index + 1).padStart(2, '0');
  const base = `${n}-${p.id}`;
  const file = (step) => join(SHOTS, `${base}-${step}.png`);
  const r = { product: p, shots: {}, checkout: !!p.checkoutUrl };
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();

  // 1. Product page
  await page.goto(SITE + p.pagePath, { waitUntil: 'networkidle' });
  await settle(page, 900);
  await page.screenshot({ path: file('1-product-page-full'), fullPage: true });
  r.shots.productFull = file('1-product-page-full');
  await page.screenshot({ path: file('1-product-page'), fullPage: false });
  r.shots.product = file('1-product-page');
  r.priceText = (await page.textContent('.price')).replace(/\s+/g, ' ').trim();
  r.termsText = (await page.textContent('.price-terms')).replace(/\s+/g, ' ').trim();
  if (r.checkout) {
    const card = page.locator('.buy-card');
    await card.scrollIntoViewIfNeeded();
    await page.locator('.btn-buy').click({ force: true });
    await settle(page, 300);
    await card.screenshot({ path: file('1b-agreement-unticked') });
    r.shots.unticked = file('1b-agreement-unticked');
    r.disabledBefore = await page.getAttribute('.btn-buy', 'aria-disabled');
    r.hrefBefore = await page.getAttribute('.btn-buy', 'href');
    await page.check('.agree input');
    await settle(page, 300);
    await card.screenshot({ path: file('1c-agreement-ticked') });
    r.shots.ticked = file('1c-agreement-ticked');
    r.disabledAfter = await page.getAttribute('.btn-buy', 'aria-disabled');
    r.hrefAfter = await page.getAttribute('.btn-buy', 'href');
  }

  // 2. Payment happens on the provider's checkout (not captured). 3. Order confirmation page.
  const exampleRef = `EXAMPLE-${PRODUCTS.indexOf(p) + 1}0${stamp.replace(/-/g, '')}`;
  r.exampleRef = exampleRef;
  await page.goto(`${SITE}${p.thankYouPath}?orderId=${exampleRef}&transactionId=EXAMPLE-TXN`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-key-display] .key-group');
  await settle(page, 1800);
  r.key = await page.$$eval('[data-key-display] .key-char', (els) => els.map((e) => e.textContent).join(''));
  r.confirmDate = await page.textContent('[data-confirm-date]');
  await page.screenshot({ path: file('2-order-confirmation'), fullPage: true });
  r.shots.confirmation = file('2-order-confirmation');

  // 4. Saved confirmation (text file) and printed confirmation
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-save-confirmation]')]);
  const savedName = download.suggestedFilename();
  const savedPath = join(CONF, savedName);
  await download.saveAs(savedPath);
  r.savedName = savedName;
  r.savedText = readFileSync(savedPath, 'utf8');
  await page.emulateMedia({ media: 'print' });
  await settle(page, 300);
  await page.screenshot({ path: file('3-printed-confirmation'), fullPage: true });
  r.shots.printed = file('3-printed-confirmation');
  await page.pdf({ path: join(CONF, `${p.id}-printed-confirmation.pdf`), format: 'Letter', printBackground: true });
  await page.emulateMedia({ media: 'screen' });

  // 5. Unlock page
  await page.evaluate(([seen, settings]) => {
    localStorage.setItem('fretwell.seen', seen);
    for (const [id, ex] of Object.entries(settings)) localStorage.setItem('fretwell.settings.' + id, JSON.stringify({ exercise: ex }));
  }, [ALL_SEEN, IN_USE]);
  await Promise.all([page.waitForURL(/\/unlock\/$/), page.click('[data-open-tools]')]);
  await page.waitForFunction(() => [...document.querySelectorAll('.key-box')].every((b) => b.value));
  await settle(page, 600);
  await page.screenshot({ path: file('4-unlock-page'), fullPage: true });
  r.shots.unlock = file('4-unlock-page');
  await page.click('[data-key-form] button[type="submit"]');
  await page.waitForSelector('[data-unlock-success]:not([hidden])');
  await settle(page, 1300);
  r.unlockMessage = (await page.textContent('[data-unlock-msg]')).trim();
  await page.screenshot({ path: file('5-key-accepted'), fullPage: true });
  r.shots.accepted = file('5-key-accepted');

  // 6. Practice room (the buyer's library)
  await page.waitForURL(/\/practice\//, { timeout: 15000 });
  await page.waitForSelector('.rc-title');
  await settle(page, 700);
  r.library = await page.$$eval('.rc-title', (els) => els.map((e) => e.textContent));
  await page.screenshot({ path: file('6-practice-room'), fullPage: true });
  r.shots.library = file('6-practice-room');

  // 7. Product in use
  await page.click('.room-card');
  await page.waitForSelector('.start-btn');
  await settle(page, 600);
  await page.click('.start-btn');
  await page.waitForSelector('.q-title');
  await settle(page, 1200);
  const choice = page.locator('.choices .choice:not([disabled])').first();
  if (await choice.count()) await choice.click();
  else if (await page.locator('.notepad').count()) await page.keyboard.press('c');
  await settle(page, 1200);
  r.inUseTool = (await page.textContent('.tool-title')).trim();
  await page.screenshot({ path: file('7-product-in-use'), fullPage: false });
  r.shots.inUse = file('7-product-in-use');

  const v = validateKey(r.key);
  r.keyValid = v.ok && JSON.stringify(v.tools) === JSON.stringify(PRODUCT_CODES[v.code].tools) && v.product === p.id;
  await context.close();
  return r;
}

for (const [i, p] of PRODUCTS.entries()) {
  process.stdout.write(`Capturing ${p.name}… `);
  const r = await runProduct(p, i);
  results.push(r);
  console.log(r.keyValid ? 'done' : 'KEY CHECK FAILED');
}

/* ------------------------------------------------------------------ video */
const videoProduct = PRODUCTS.find((p) => p.checkoutUrl) || PRODUCTS[0];
{
  const vdir = join(OUT, 'video-tmp');
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: vdir, size: { width: 1280, height: 800 } }, acceptDownloads: true });
  const page = await context.newPage();
  const card = (title, lines) => `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;height:100vh;display:grid;place-items:center;background:#F2EDE3;color:#121212;font-family:Segoe UI,Helvetica,Arial,sans-serif}
    .c{max-width:860px;border:3px solid #121212;background:#FBF8F1;padding:48px}
    .e{font-size:14px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#B3301B;margin:0 0 12px}
    h1{font-size:44px;line-height:1.05;margin:0 0 20px;letter-spacing:-.02em}
    p{font-size:21px;line-height:1.5;margin:0 0 12px}</style></head><body><div class="c"><p class="e">Fretwell Music Lab · purchase-to-delivery flow</p><h1>${title}</h1>${lines.map((l) => `<p>${l}</p>`).join('')}</div></body></html>`;
  await page.setContent(card(`${esc(videoProduct.name)} — $${videoProduct.price}`, ['This recording follows one complete purchase on the live website, from the product page to the product in use.', 'Step 1: the product page, showing the price, delivery method, refund policy and the Terms agreement.']));
  await page.waitForTimeout(3500);
  await page.goto(SITE + videoProduct.pagePath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.evaluate(() => document.querySelector('.buy-card').scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await page.waitForTimeout(1600);
  if (videoProduct.checkoutUrl) {
    await page.locator('.btn-buy').click({ force: true });
    await page.waitForTimeout(1600);
    await page.check('.agree input');
    await page.waitForTimeout(1800);
  }
  await page.setContent(card('Step 2: payment on Square (not shown)', [
    'The buyer selects “Buy now” and pays on Square’s secure hosted checkout. This step happens on Square’s website, so it is described here rather than recorded.',
    'When payment completes, Square redirects the buyer to this product’s order confirmation page and adds its order reference to the address. The reference shown next is an example.',
  ]));
  await page.waitForTimeout(6000);
  await page.goto(`${SITE}${videoProduct.thankYouPath}?orderId=EXAMPLE-SQUARE-ORDER&transactionId=EXAMPLE-TXN`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  await page.evaluate(([seen, settings]) => {
    localStorage.setItem('fretwell.seen', seen);
    for (const [id, ex] of Object.entries(settings)) localStorage.setItem('fretwell.settings.' + id, JSON.stringify({ exercise: ex }));
  }, [ALL_SEEN, IN_USE]);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-save-confirmation]')]);
  await dl.path();
  await page.waitForTimeout(1500);
  await Promise.all([page.waitForURL(/\/unlock\/$/), page.click('[data-open-tools]')]);
  await page.waitForTimeout(1800);
  await page.click('[data-key-form] button[type="submit"]');
  await page.waitForURL(/\/practice\//, { timeout: 15000 });
  await page.waitForSelector('.rc-title');
  await page.waitForTimeout(2200);
  await page.click('.room-card');
  await page.waitForSelector('.start-btn');
  await page.waitForTimeout(1500);
  await page.click('.start-btn');
  await page.waitForSelector('.q-title');
  await page.waitForTimeout(2200);
  const c = page.locator('.choices .choice:not([disabled])').first();
  if (await c.count()) await c.click();
  await page.waitForTimeout(3000);
  await context.close();
  const vid = readdirSync(vdir).find((f) => f.endsWith('.webm'));
  renameSync(join(vdir, vid), join(OUT, 'purchase-to-use-flow.webm'));
  rmSync(vdir, { recursive: true, force: true });
}

/* --------------------------------------------------------------- summary */
const contactUrl = SITE + 'contact/';
const prices = PRODUCTS.map((p) => p.price);
const SUMMARY = `Business and Fulfillment Summary — Fretwell Music Lab

What we sell
Fretwell Music Lab sells interactive music theory and ear-training software for guitar and piano players. The tools run in a web browser on a computer, tablet or phone. There are ten products: five Foundations tools, a Foundations Bundle and four Studio Editions, priced from $${Math.min(...prices)} to $${Math.max(...prices)} (USD). Each is a one-time purchase; there are no subscriptions.

How and when products are delivered
Delivery is digital and immediate. After the customer completes payment on our payment provider's hosted checkout, the provider redirects them to the product's order confirmation page on our website (${SITE}). That page instantly shows the customer's license key, together with the product name, the date and time and the provider's order reference. The customer can copy the key, save the confirmation as a text file or print it. Entering the key on our unlock page opens the purchased tools straight away in the customer's web browser, and the same key works on any of the customer's own devices. Delivery takes seconds; the key is shown on screen and is not posted.

Shipping
There is no physical shipment. Nothing is mailed. All products are software used in the browser.

Refund policy
Full refund on any purchase if requested within 14 days, no reason required. Customers request a refund through our Contact page with their order number. Refunds go to the original payment method and are issued within 5 business days of the request; the payment provider's processing time may add a few days.

Customer support
Customers contact us through the Contact page (${contactUrl}), which lists our support email address. We reply within two business days. Customers who lose their key receive a replacement key after giving their order number.
`;
writeFileSync(join(OUT, 'Business-and-Fulfillment-Summary.txt'), SUMMARY);
const keysTxt = `Fretwell Music Lab — reviewer license keys (created ${stamp})\n\nEnter a key at ${SITE}unlock/ to open that product in the practice room. Keys do not expire and work on any device.\n\n` +
  results.map((r) => `${r.product.name} ($${r.product.price}): ${r.key}`).join('\n') + '\n';
writeFileSync(join(OUT, 'reviewer-keys.txt'), keysTxt);

/* ------------------------------------------------------------------- PDF */
// Screenshots are embedded in the PDF as compressed JPEG data, so the PDF never depends on file paths.
const embedded = new Map();
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  for (const src of results.flatMap((r) => Object.values(r.shots))) {
    if (embedded.has(src)) continue;
    const b64 = readFileSync(src).toString('base64');
    embedded.set(src, await page.evaluate(async (data) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + data;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0);
      return c.toDataURL('image/jpeg', 0.8);
    }, b64));
  }
  await ctx.close();
}
const rel = (abs) => embedded.get(abs);
const main = results.find((r) => r.product.id === videoProduct.id);
const fig = (src, caption) => `<figure><img src="${rel(src)}" alt=""><figcaption>${caption}</figcaption></figure>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Fretwell Music Lab — Fulfillment Overview</title><style>
@page { size: Letter; margin: 16mm 15mm; }
body { font-family: "Segoe UI", Helvetica, Arial, sans-serif; color: #121212; font-size: 10.5pt; line-height: 1.45; }
h1 { font-size: 24pt; margin: 0 0 4px; letter-spacing: -.01em; }
h2 { font-size: 15pt; margin: 22px 0 8px; padding-top: 8px; border-top: 2px solid #121212; break-after: avoid; }
h3 { font-size: 12pt; margin: 16px 0 6px; break-after: avoid; }
.meta { color: #4B473F; margin: 0 0 14px; }
pre.summary { white-space: pre-wrap; font-family: inherit; font-size: 10.5pt; background: #F6F2EA; border: 1px solid #121212; padding: 12px 14px; }
pre.file { white-space: pre-wrap; font-family: Consolas, monospace; font-size: 8.5pt; background: #F6F2EA; border: 1px solid #999; padding: 10px; break-inside: avoid; }
figure { margin: 10px 0 14px; break-inside: avoid; }
figure img { display: block; max-width: 100%; max-height: 8.1in; border: 1px solid #999; margin: 0 auto; }
figcaption { font-size: 9pt; color: #4B473F; margin-top: 4px; }
table { border-collapse: collapse; width: 100%; font-size: 9.5pt; }
th, td { border: 1px solid #999; padding: 5px 7px; text-align: left; vertical-align: top; }
th { background: #EEE8DC; }
code, .key { font-family: Consolas, monospace; }
.note { border-left: 5px solid #E3412B; background: #FBF1EE; padding: 8px 12px; margin: 10px 0; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.grid figure img { max-height: 3.6in; }
.product { break-before: page; }
ol li { margin-bottom: 6px; }
</style></head><body>
<h1>Fretwell Music Lab — Fulfillment Overview</h1>
<p class="meta">Captured from the live website ${esc(SITE)} · Products are delivered as license keys; there are no physical goods.</p>

<h2>Business and Fulfillment Summary</h2>
<p>Plain text for payment processor forms (also saved as <code>Business-and-Fulfillment-Summary.txt</code>):</p>
<pre class="summary">${esc(SUMMARY)}</pre>

<h2>How delivery works, step by step</h2>
<p>Shown for ${esc(main.product.name)} ($${main.product.price}). Every product follows the same steps; per-product evidence follows later in this document.</p>
<ol>
<li><strong>Product page.</strong> The page shows the price (${esc(main.priceText)}), the delivery method and refund terms (“${esc(main.termsText)}”), what is needed to use the product, and that sounds are synthesized.${main.checkout ? ` Above the buy button the buyer must tick “I agree to the Terms of Service and Refund Policy” (both linked). Until it is ticked the button is disabled (aria-disabled=${esc(main.disabledBefore)}, no link) and a hint explains why; once ticked it links to the Square checkout (${esc(main.hrefAfter)}).` : ''}</li>
<li><strong>Payment (on Square, not captured).</strong> The buyer pays on Square’s secure hosted checkout. Square is configured to redirect buyers after payment to the product’s order confirmation page on this site, adding its order reference (<code>orderId</code>, <code>transactionId</code>) to the address.</li>
<li><strong>Order confirmation and delivery.</strong> The confirmation page immediately generates and shows the buyer’s license key, with “Order complete. Your product is delivered.”, the product name, the date and time, the order reference and the delivery method. The screenshots use an example order reference.</li>
<li><strong>Saved confirmation.</strong> “Save confirmation” downloads a text file with the order details, the key, instructions and links to the Terms, Refund Policy and Delivery Policy. “Print” produces a print-friendly confirmation.</li>
<li><strong>Unlock.</strong> “Open my tools” opens the unlock page with the key filled in; the buyer presses Unlock and the key is accepted.</li>
<li><strong>Practice room.</strong> The buyer’s practice room (their library) lists the purchased tools.</li>
<li><strong>Product in use.</strong> The buyer opens the tool and practises immediately.</li>
</ol>
${fig(main.shots.product, `Step 1 — product page (top of page) for ${esc(main.product.name)}.`)}
${main.checkout ? `<div class="grid">${fig(main.shots.unticked, 'Step 1 — Terms agreement not ticked: buy button disabled, hint shown.')}${fig(main.shots.ticked, 'Step 1 — Terms agreement ticked: buy button links to Square checkout.')}</div>` : ''}
${fig(main.shots.confirmation, 'Step 3 — order confirmation page with the license key (example order reference).')}
<h3>Step 4 — saved confirmation (contents of ${esc(main.savedName)})</h3>
<pre class="file">${esc(main.savedText)}</pre>
${fig(main.shots.printed, 'Step 4 — printed confirmation (print layout).')}
${fig(main.shots.unlock, 'Step 5 — unlock page with the key filled in.')}
${fig(main.shots.accepted, `Step 5 — key accepted: “${esc(main.unlockMessage)}”`)}
${fig(main.shots.library, 'Step 6 — practice room (library) showing the purchased tool.')}
${fig(main.shots.inUse, `Step 7 — ${esc(main.inUseTool)} in use.`)}
<p>A screen recording of this complete flow is saved as <code>purchase-to-use-flow.webm</code>.</p>

<h2>Replacement keys</h2>
<p>License keys are created in the buyer’s browser on the order confirmation page; there is no account system. A customer who loses their key, or whose confirmation page closed before they saved it, contacts us through the Contact page with their order number. We check the order in the payment provider’s dashboard, open that product’s order confirmation page ourselves to generate a new valid key, and send it to the customer in our reply. Devices where the original key was entered stay unlocked.</p>
<h2>Refunds</h2>
<p>Full refund on any purchase if requested within 14 days, no reason required, as stated in the Refund Policy (${esc(SITE)}refunds/). Customers request a refund through the Contact page with their order number. We issue the refund through the payment provider to the original payment method within 5 business days of the request; the provider’s processing time may add a few days. Under the Refund Policy a refunded key is no longer licensed for use. Because keys are checked in the browser, a key cannot be switched off remotely.</p>
<h2>Reviewer access</h2>
<p>A reviewer can use every product without an account: open ${esc(SITE)}unlock/ (or “Have a key?” in the site header), enter a key below and press Unlock. The tools open in the practice room at ${esc(SITE)}practice/. Keys do not expire and work on any device. Every product page also has a free interactive demo, and the home page has a free mini quiz.</p>
<table><thead><tr><th>Product</th><th>Price</th><th>Reviewer key</th><th>Opens</th></tr></thead><tbody>
${results.map((r) => `<tr><td>${esc(r.product.name)}</td><td>$${r.product.price}</td><td class="key">${esc(r.key)}</td><td>${esc(r.library.join(', '))}</td></tr>`).join('')}
</tbody></table>
<p>Each key above was produced by that product’s live order confirmation page during this capture and verified by unlocking it.</p>

<h2>Products and order confirmation pages</h2>
<table><thead><tr><th>Product</th><th>Tier</th><th>Price</th><th>Order confirmation page (payment redirect)</th></tr></thead><tbody>
${results.map((r) => `<tr><td>${esc(r.product.name)}</td><td>${esc(r.product.tier)}</td><td>$${r.product.price}</td><td><code>${esc(SITE + r.product.thankYouPath)}</code></td></tr>`).join('')}
</tbody></table>

${results.map((r) => `<section class="product"><h2>${esc(r.product.name)} — $${r.product.price}</h2>
<p>${esc(PRODUCT_CONTENT[r.product.id].tagline)}</p>
<p>Price shown: ${esc(r.priceText)} · Terms beside the price: “${esc(r.termsText)}” · Delivered ${esc(r.confirmDate)} · Example order reference: <code>${esc(r.exampleRef)}</code> · Reviewer key: <span class="key">${esc(r.key)}</span></p>
<div class="grid">
${fig(r.shots.product, 'Product page')}
${fig(r.shots.confirmation, 'Order confirmation with license key')}
${fig(r.shots.unlock, 'Unlock page')}
${fig(r.shots.library, `Practice room: ${esc(r.library.join(', '))}`)}
</div>
${fig(r.shots.inUse, `${esc(r.inUseTool)} in use`)}
</section>`).join('\n')}
</body></html>`;
// KIT_HTML_OUT saves the HTML used for the PDF (for checking the layout); it is not part of the kit.
if (process.env.KIT_HTML_OUT) writeFileSync(process.env.KIT_HTML_OUT, html);
{
  const page = await (await browser.newContext()).newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await page.waitForTimeout(500);
  await page.pdf({ path: join(OUT, 'Fulfillment-Overview.pdf'), format: 'Letter', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#666">Fretwell Music Lab — Fulfillment Overview · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>', margin: { top: '16mm', bottom: '18mm', left: '15mm', right: '15mm' } });
}
await browser.close();
writeFileSync(join(OUT, 'capture-results.json'), JSON.stringify(results.map((r) => ({ product: r.product.id, key: r.key, keyValid: r.keyValid, library: r.library, checkout: r.checkout, disabledBefore: r.disabledBefore, hrefBefore: r.hrefBefore, disabledAfter: r.disabledAfter, hrefAfter: r.hrefAfter, unlockMessage: r.unlockMessage })), null, 2));
console.log(`Kit written to ${OUT}`);
if (results.some((r) => !r.keyValid) || !existsSync(join(OUT, 'Fulfillment-Overview.pdf'))) process.exit(1);
