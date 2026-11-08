// Fretwell Music Lab — progressions with applied dominants and modulations (Atelier Edition).
import { transpose } from './theory.js';

/** Progressions in a major key, each containing one applied (secondary) dominant. */
export const SECONDARY_PROGRESSIONS = [
  { id: 'ii-a', target: 'ii', rn: ['I', 'vi', 'V7/ii', 'ii', 'V7', 'I'] },
  { id: 'ii-b', target: 'ii', rn: ['I', 'V7/ii', 'ii', 'V', 'I'] },
  { id: 'iii-a', target: 'iii', rn: ['I', 'V7/iii', 'iii', 'IV', 'V', 'I'] },
  { id: 'iii-b', target: 'iii', rn: ['I', 'vi', 'V7/iii', 'iii', 'IV', 'V7', 'I'] },
  { id: 'IV-a', target: 'IV', rn: ['I', 'V7/IV', 'IV', 'V7', 'I'] },
  { id: 'IV-b', target: 'IV', rn: ['I', 'vi', 'V7/IV', 'IV', 'V', 'I'] },
  { id: 'V-a', target: 'V', rn: ['I', 'ii', 'V7/V', 'V', 'I'] },
  { id: 'V-b', target: 'V', rn: ['I', 'IV', 'V7/V', 'V', 'I'] },
  { id: 'vi-a', target: 'vi', rn: ['I', 'V7/vi', 'vi', 'IV', 'V', 'I'] },
  { id: 'vi-b', target: 'vi', rn: ['I', 'iii', 'V7/vi', 'vi', 'ii', 'V7', 'I'] },
];

export const SECONDARY_TARGETS = [
  { id: 'ii', label: 'V⁷/ii' }, { id: 'iii', label: 'V⁷/iii' }, { id: 'IV', label: 'V⁷/IV' }, { id: 'V', label: 'V⁷/V' }, { id: 'vi', label: 'V⁷/vi' },
];

/** Modulations from a major home key. Every version has seven chords so length gives nothing away. */
export const MODULATIONS = [
  { id: 'none', name: 'Stays in the home key', short: 'No modulation' },
  { id: 'dominant', name: 'To the dominant (V)', short: 'Dominant' },
  { id: 'subdominant', name: 'To the subdominant (IV)', short: 'Subdominant' },
  { id: 'relative', name: 'To the relative minor (vi)', short: 'Relative minor' },
  { id: 'supertonic', name: 'To the supertonic minor (ii)', short: 'Supertonic minor' },
];

/** Chords for a modulation as [{ tonic, mode, rn }]: four in the home key, then pivot, V7 and I of the new key. */
export function modulationChords(tonic, id) {
  const h = (rn) => ({ tonic, mode: 'major', rn });
  const home = [h('I'), h('IV'), h('V7'), h('I')];
  switch (id) {
    case 'none': return [...home, h('vi'), h('V7'), h('I')];
    case 'dominant': {
      const k = transpose(tonic, 'P5');
      return [...home, { tonic: k, mode: 'major', rn: 'ii' }, { tonic: k, mode: 'major', rn: 'V7' }, { tonic: k, mode: 'major', rn: 'I' }];
    }
    case 'subdominant': {
      const k = transpose(tonic, 'P4');
      return [...home, { tonic: k, mode: 'major', rn: 'vi' }, { tonic: k, mode: 'major', rn: 'V7' }, { tonic: k, mode: 'major', rn: 'I' }];
    }
    case 'relative': {
      const k = transpose(tonic, 'M6');
      return [...home, { tonic: k, mode: 'minor', rn: 'VI' }, { tonic: k, mode: 'minor', rn: 'V7' }, { tonic: k, mode: 'minor', rn: 'i' }];
    }
    case 'supertonic': {
      const k = transpose(tonic, 'M2');
      return [...home, { tonic: k, mode: 'minor', rn: 'III' }, { tonic: k, mode: 'minor', rn: 'V7' }, { tonic: k, mode: 'minor', rn: 'i' }];
    }
    default: throw new Error('Unknown modulation ' + id);
  }
}

/** Labels for showing the analysis after an answer: home-key numerals, then "pivot" and new-key numerals. */
export function modulationAnalysis(tonic, id) {
  const list = modulationChords(tonic, id);
  return list.map((c, i) => ({ ...c, pivot: i === 4 && id !== 'none' }));
}
