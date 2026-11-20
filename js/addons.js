// Fretwell Music Lab — optional course add-ons, shared by the shop pages, license keys and the practice room.

// The bit is stored inside the license key, so these values must never change.
export const ADDONS = {
  planner: {
    bit: 1,
    name: 'Practice planner',
    text: 'A calendar file (.ics) that schedules every lesson on the days and time you choose. Opens in Google Calendar, Apple Calendar and Outlook.',
  },
  guide: {
    bit: 2,
    name: 'Printable course guide',
    text: 'A print-ready guide to every lesson, with its goal, settings and pass mark and a checklist to tick off. Print it or save it as a PDF.',
  },
  bonus: {
    bit: 4,
    name: 'Bonus challenge lessons',
    text: 'Three extra lessons beyond the main course, with wider ranges, faster tempos or stricter pass marks.',
  },
  export: {
    bit: 8,
    name: 'Progress report export',
    text: 'Download your lesson results as a spreadsheet (CSV), or open a printable progress report.',
  },
};
export const ADDON_ORDER = ['planner', 'guide', 'bonus', 'export'];

/** The checkout key for a set of add-ons: their ids in ADDON_ORDER, joined with +. "" means no add-ons. */
export function comboKey(ids) {
  return ADDON_ORDER.filter((id) => ids.includes(id)).join('+');
}

/** The thank-you page folder for a set of add-ons, e.g. "planner-bonus/". "" means no add-ons. */
export function comboPath(ids) {
  const k = comboKey(ids);
  return k ? k.replace(/\+/g, '-') + '/' : '';
}

/** Every combination of a course's add-ons, including none, smallest first. */
export function allCombos(offered) {
  const ids = ADDON_ORDER.filter((id) => offered.includes(id));
  const out = [];
  for (let m = 0; m < 1 << ids.length; m++) out.push(ids.filter((_, i) => m & (1 << i)));
  return out.sort((a, b) => a.length - b.length);
}

/** The checkout link for a product and a set of add-ons, or "" if none is set. */
export function checkoutFor(p, ids = []) {
  const k = comboKey(ids);
  if (!k) return p.checkoutUrl || '';
  return (p.addonCheckoutUrls && p.addonCheckoutUrls[k]) || '';
}

/** Course price plus the chosen add-ons. */
export function totalFor(p, ids = []) {
  return p.price + ids.reduce((sum, id) => sum + ((p.addons && p.addons[id]) || 0), 0);
}
