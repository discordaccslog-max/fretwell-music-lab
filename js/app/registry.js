// Fretwell Music Lab — the tools available in the practice room.
export const TOOLS = [
  { id: 'note-reader', name: 'Note Reader', full: 'Note Reader: Staff & Fretboard Trainer', color: 'saffron', art: 'note', blurb: 'Name notes on the staff, fretboard and keyboard.' },
  { id: 'interval-trainer', name: 'Interval Ear Trainer', full: 'Interval Ear Trainer', color: 'vermilion', art: 'interval', blurb: 'Hear and name intervals up, down and together.' },
  { id: 'scale-explorer', name: 'Scale & Mode Explorer', full: 'Scale & Mode Explorer', color: 'cobalt', art: 'scale', blurb: 'Every scale in every key, seen, heard and built.' },
  { id: 'chord-builder', name: 'Chord Builder', full: 'Chord Builder & Ear Trainer', color: 'ink', art: 'chord', blurb: 'Build and hear triads and seventh chords.' },
  { id: 'rhythm-lab', name: 'Rhythm Lab', full: 'Rhythm Lab', color: 'paper', art: 'rhythm', blurb: 'Read and tap rhythms with timing feedback.' },
  { id: 'progression-lab', name: 'Progression Lab', full: 'Progression Lab: Harmony & Voice Leading', color: 'cobalt', art: 'progression', studio: true, blurb: 'Analyse, hear and write four-part harmony.' },
  { id: 'jazz-harmony', name: 'Jazz Harmony Studio', full: 'Jazz Harmony Studio', color: 'saffron', art: 'jazz', studio: true, blurb: 'Extended chords, voicings and ii–V–I.' },
  { id: 'melodic-dictation', name: 'Melodic Dictation Studio', full: 'Melodic Dictation Studio', color: 'vermilion', art: 'melody', studio: true, blurb: 'Hear melodies and write them on the staff.' },
  { id: 'atelier', name: 'Atelier Edition', full: 'Atelier Edition: Advanced Aural Skills', color: 'atelier', art: 'atelier', studio: true, blurb: 'The most demanding aural training.' },
];
export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

/** Lazy loaders: each tool's code is fetched only when it is opened. */
export const LOADERS = {
  'note-reader': () => import('../tools/note-reader.js'),
  'interval-trainer': () => import('../tools/interval-trainer.js'),
  'scale-explorer': () => import('../tools/scale-explorer.js'),
  'chord-builder': () => import('../tools/chord-builder.js'),
  'rhythm-lab': () => import('../tools/rhythm-lab.js'),
  'progression-lab': () => import('../tools/progression-lab.js'),
  'jazz-harmony': () => import('../tools/jazz-harmony.js'),
  'melodic-dictation': () => import('../tools/melodic-dictation.js'),
  atelier: () => import('../tools/atelier.js'),
};
