// Fretwell Music Lab — product catalogue.
//
// Every product page renders its price and buy button from this file.
// To start selling a product, paste its checkout link into `checkoutUrl`.
// While `checkoutUrl` is empty the buy button is not shown at all; prices and details still display.
// Set each checkout to redirect buyers to the product's thank-you page after payment:
//   <your site address>/<thankYouPath>
//
// Prices are in US dollars.

export const PRODUCTS = [
  {
    id: 'note-reader',
    name: 'Note Reader: Staff & Fretboard Trainer',
    shortName: 'Note Reader',
    tier: 'Foundations',
    price: 10,
    thankYouPath: 'thank-you/note-reader/',
    pagePath: 'products/note-reader/',
    checkoutUrl: '',
  },
  {
    id: 'interval-trainer',
    name: 'Interval Ear Trainer',
    shortName: 'Interval Ear Trainer',
    tier: 'Foundations',
    price: 14,
    thankYouPath: 'thank-you/interval-trainer/',
    pagePath: 'products/interval-trainer/',
    checkoutUrl: '',
  },
  {
    id: 'scale-explorer',
    name: 'Scale & Mode Explorer',
    shortName: 'Scale & Mode Explorer',
    tier: 'Foundations',
    price: 16,
    thankYouPath: 'thank-you/scale-explorer/',
    pagePath: 'products/scale-explorer/',
    checkoutUrl: '',
  },
  {
    id: 'chord-builder',
    name: 'Chord Builder & Ear Trainer',
    shortName: 'Chord Builder',
    tier: 'Foundations',
    price: 19,
    thankYouPath: 'thank-you/chord-builder/',
    pagePath: 'products/chord-builder/',
    checkoutUrl: 'https://square.link/u/PnXr1H3r',
  },
  {
    id: 'rhythm-lab',
    name: 'Rhythm Lab',
    shortName: 'Rhythm Lab',
    tier: 'Foundations',
    price: 22,
    thankYouPath: 'thank-you/rhythm-lab/',
    pagePath: 'products/rhythm-lab/',
    checkoutUrl: '',
  },
  {
    id: 'foundations-bundle',
    name: 'Foundations Bundle',
    shortName: 'Foundations Bundle',
    tier: 'Foundations',
    price: 49,
    thankYouPath: 'thank-you/foundations-bundle/',
    pagePath: 'products/foundations-bundle/',
    checkoutUrl: '',
  },
  {
    id: 'progression-lab',
    name: 'Progression Lab: Harmony & Voice Leading',
    shortName: 'Progression Lab',
    tier: 'Studio Editions',
    price: 35,
    thankYouPath: 'thank-you/progression-lab/',
    pagePath: 'products/progression-lab/',
    checkoutUrl: '',
  },
  {
    id: 'jazz-harmony',
    name: 'Jazz Harmony Studio',
    shortName: 'Jazz Harmony Studio',
    tier: 'Studio Editions',
    price: 45,
    thankYouPath: 'thank-you/jazz-harmony/',
    pagePath: 'products/jazz-harmony/',
    checkoutUrl: '',
  },
  {
    id: 'melodic-dictation',
    name: 'Melodic Dictation Studio',
    shortName: 'Melodic Dictation Studio',
    tier: 'Studio Editions',
    price: 55,
    thankYouPath: 'thank-you/melodic-dictation/',
    pagePath: 'products/melodic-dictation/',
    checkoutUrl: '',
  },
  {
    id: 'atelier',
    name: 'Atelier Edition: Advanced Aural Skills',
    shortName: 'Atelier Edition',
    tier: 'Studio Editions',
    price: 75,
    thankYouPath: 'thank-you/atelier/',
    pagePath: 'products/atelier/',
    checkoutUrl: '',
  },
];

export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

export function formatPrice(p) {
  return '$' + p.price;
}
