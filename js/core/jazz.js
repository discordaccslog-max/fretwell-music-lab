// Fretwell Music Lab — jazz voicings and ii–V–I progressions.
import { transpose, CHORD_TYPES, midi, withOctave, noteName, pc } from './theory.js';

export function jazzSymbol(root, typeId) {
  const sym = { hdim7: 'm7♭5', dim7: '°7', min9b5: 'm9♭5' }[typeId] ?? CHORD_TYPES[typeId].symbol;
  return noteName(root) + sym;
}

// Voicing recipes: interval names above the root, from the lowest note up.
const RECIPES = {
  ii: { type: 'min9', shell: ['P1', 'm3', 'm7'], A: ['m3', 'P5', 'm7', 'M9'], B: ['m7', 'M9', 'm3', 'P5'], sevenths: 'min7' },
  V: { type: 'dom13', shell: ['P1', 'm7', 'M3'], A: ['M3', 'M6', 'm7', 'M9'], B: ['m7', 'M9', 'M3', 'M6'], sevenths: 'dom7' },
  I: { type: 'maj9', shell: ['P1', 'M3', 'M7'], A: ['M3', 'P5', 'M7', 'M9'], B: ['M7', 'M9', 'M3', 'P5'], sevenths: 'maj7' },
  iiMinor: { type: 'hdim7', shell: ['P1', 'm3', 'm7'], A: ['m3', 'd5', 'm7', 'P8'], B: ['m7', 'P1', 'm3', 'd5'], sevenths: 'hdim7' },
  VMinor: { type: 'dom7b9', shell: ['P1', 'm7', 'M3'], A: ['M3', 'm6', 'm7', 'm2'], B: ['m7', 'm2', 'M3', 'm6'], sevenths: 'dom7b9' },
  iMinor: { type: 'minMaj9', shell: ['P1', 'm3', 'M7'], A: ['m3', 'P5', 'M7', 'M9'], B: ['M7', 'M9', 'm3', 'P5'], sevenths: 'minMaj7' },
};
export const VOICING_NAMES = { shell: 'Shell (root, 3rd, 7th)', A: 'Rootless A form', B: 'Rootless B form' };
// Shells alternate root–3rd–7th (ii, I) and root–7th–3rd (V) so the 3rds and 7ths move by step.
export const RECIPE_DEGREES = { shell: { ii: '1 – 3 – 7', V: '1 – 7 – 3', I: '1 – 3 – 7', iiMinor: '1 – 3 – 7', VMinor: '1 – 7 – 3', iMinor: '1 – 3 – 7' }, A: { ii: '3 – 5 – 7 – 9', V: '3 – 13 – 7 – 9', I: '3 – 5 – 7 – 9', iiMinor: '3 – ♭5 – 7 – 1', VMinor: '3 – ♭13 – 7 – ♭9', iMinor: '3 – 5 – 7 – 9' }, B: { ii: '7 – 9 – 3 – 5', V: '7 – 9 – 3 – 13', I: '7 – 9 – 3 – 5', iiMinor: '7 – 1 – 3 – ♭5', VMinor: '7 – ♭9 – 3 – ♭13', iMinor: '7 – 9 – 3 – 5' } };

/** Stack spelled notes upward from a starting octave so each note is above the previous one. */
export function stack(root, ivls, lowMidi) {
  const out = [];
  let prev = null;
  for (const iv of ivls) {
    const t = transpose(root, iv);
    let n = withOctave(t, 1);
    while (midi(n) < (prev ? midi(prev) + 1 : lowMidi)) n = withOctave(t, n.o + 1);
    out.push(n);
    prev = n;
  }
  return out;
}

/** The three chords of a ii–V–I in a key: [{ role, root, type, sevenths, recipe }]. */
export function twoFiveOne(tonic, mode = 'major') {
  const t = withOctave(tonic, 3);
  const roles = mode === 'minor' ? ['iiMinor', 'VMinor', 'iMinor'] : ['ii', 'V', 'I'];
  const roots = [transpose(t, 'M2'), transpose(t, 'P5'), t];
  return roles.map((role, i) => ({ role, root: roots[i], type: RECIPES[role].type, sevenths: RECIPES[role].sevenths, recipe: RECIPES[role], label: ['ii', 'V', 'I'][i] }));
}

/**
 * Voice a ii–V–I with smooth voice leading.
 * kind: 'shell' | 'A' | 'B'. Rootless forms alternate A/B (ii and I in the chosen form, V in the other).
 * Returns [{ ...chord, notes, form, bass }].
 */
export function voiceTwoFiveOne(tonic, mode, kind) {
  const chords = twoFiveOne(tonic, mode);
  let prev = null;
  return chords.map((c, i) => {
    const form = kind === 'shell' ? 'shell' : (i === 1 ? (kind === 'A' ? 'B' : 'A') : kind);
    // Shells may use root–3rd–7th or root–7th–3rd, whichever keeps the 3rd and 7th closest to the last chord.
    const orders = form === 'shell' ? [c.recipe.shell, [c.recipe.shell[0], c.recipe.shell[2], c.recipe.shell[1]]] : [c.recipe[form]];
    let best = null;
    for (const ivls of orders) {
      for (const low of [48, 50, 52, 53, 55, 57, 59, 60]) {
        const cand = form === 'shell' ? stack(c.root, ivls, low - 12) : stack(c.root, ivls, low);
        const ms = cand.map(midi);
        const lowest = ms[0];
        if (form === 'shell' ? (lowest < 38 || lowest > 52) : (lowest < 50 || lowest > 63)) continue;
        const upper = form === 'shell' ? ms.slice(1) : ms;
        const cost = prev ? upper.reduce((s, m, k) => s + Math.abs(m - prev[Math.min(k, prev.length - 1)]), 0) : Math.abs(upper.reduce((a, b) => a + b, 0) / upper.length - (form === 'shell' ? 56 : 64));
        if (!best || cost < best.cost) best = { notes: cand, cost, upper };
      }
    }
    prev = best.upper.slice().sort((a, b) => a - b);
    const bass = withOctave(c.root, midi(withOctave(c.root, 2)) < 38 ? 3 : 2);
    return { ...c, notes: best.notes, form, bass };
  });
}

/** Required pitch classes and lowest-note pitch class for a voicing drill answer. */
export function voicingTarget(chordSpec, form) {
  const notes = stack(chordSpec.root, chordSpec.recipe[form], 48);
  return { pcs: [...new Set(notes.map(pc))], lowestPc: pc(notes[0]), notes };
}

export const EXTENSIONS = [
  { id: '9', label: '9', ivl: 'M9' },
  { id: 'b9', label: '♭9', ivl: 'm9' },
  { id: '#9', label: '♯9', ivl: 'A9' },
  { id: '#11', label: '♯11', ivl: 'A11' },
  { id: '13', label: '13', ivl: 'M13' },
  { id: 'b13', label: '♭13', ivl: 'm13' },
];

/** A dominant chord with one extension on top: bass root, shell (3, 7), extension as the highest note. */
export function extensionVoicing(root, extId) {
  const ext = EXTENSIONS.find((e) => e.id === extId);
  const bass = withOctave(root, 2);
  const shell = stack(root, ['M3', 'm7'], 52);
  const top = transpose(root, ext.ivl);
  let n = withOctave(top, 3);
  while (midi(n) <= midi(shell[1])) n = withOctave(top, n.o + 1);
  return [bass, ...shell, n];
}

/** Playback voicing for any chord type: root in the bass, the other tones stacked above. */
export function playVoicing(root, typeId) {
  const ivls = CHORD_TYPES[typeId].ivls.slice(1);
  const drop = ivls.length >= 5 ? new Set(['P5', 'P11']) : new Set();
  const upper = ivls.filter((iv) => !drop.has(iv));
  return [withOctave(root, 2), ...stack(root, upper, 53)];
}

export const FAMILIES = {
  sevenths: { name: 'Seventh chords', types: ['maj7', 'dom7', 'min7', 'hdim7', 'dim7'] },
  sixths: { name: 'Sixth chords', types: ['maj6', 'min6', 'six9'] },
  ninths: { name: 'Ninth chords', types: ['maj9', 'dom9', 'min9', 'minMaj9', 'min9b5'] },
  elevenths: { name: 'Eleventh and sus chords', types: ['min11', 'dom9sus4', 'maj7s11'] },
  thirteenths: { name: 'Thirteenth chords', types: ['dom13', 'dom13s11'] },
  altered: { name: 'Altered dominants', types: ['dom7b9', 'dom7s9', 'dom7s11', 'dom7b13', 'dom7s5', 'dom7alt'] },
};
