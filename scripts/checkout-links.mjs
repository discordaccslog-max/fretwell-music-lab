// Lists every course and add-on combination with its total price and the address to set as the
// payment link's "redirect after checkout" page. Create one payment link per line you want to sell,
// then paste each link into js/products.js (checkoutUrl for "no add-ons", addonCheckoutUrls for the rest).
// Run: node scripts/checkout-links.mjs        (add --csv for a spreadsheet)
import { PRODUCTS } from '../js/products.js';
import { ADDONS, allCombos, comboKey, comboPath, totalFor, checkoutFor } from '../js/addons.js';

const SITE = (process.env.SITE_URL || 'https://fretwell-music-lab.vercel.app/').replace(/\/?$/, '/');
const csv = process.argv.includes('--csv');
const rows = [['Course', 'Add-ons', 'Key in products.js', 'Total (USD)', 'Redirect after checkout', 'Link set']];
for (const p of PRODUCTS.filter((x) => x.addons)) {
  for (const combo of allCombos(Object.keys(p.addons))) {
    rows.push([p.name, combo.length ? combo.map((a) => ADDONS[a].name).join(' + ') : 'none', combo.length ? comboKey(combo) : 'checkoutUrl', totalFor(p, combo), SITE + p.thankYouPath + comboPath(combo), checkoutFor(p, combo) ? 'yes' : 'no']);
  }
}
if (csv) console.log(rows.map((r) => r.map((c) => (/[",]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n'));
else {
  let current = '';
  for (const r of rows.slice(1)) {
    if (r[0] !== current) { current = r[0]; console.log(`\n${current}`); }
    console.log(`  $${String(r[3]).padEnd(4)} ${r[1].padEnd(70)} ${r[5] === 'yes' ? '✓' : '·'} ${r[4]}`);
  }
  console.log(`\n${rows.length - 1} combinations. ✓ = link set in js/products.js.`);
}
