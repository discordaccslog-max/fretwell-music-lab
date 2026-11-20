// Fretwell Music Lab — guided courses.
//
// A course is a sequence of lessons. Each lesson opens one of the practice room tools with fixed
// settings, a set number of questions and a pass mark. Every exercise and setting used here exists
// in the tools (tests/courses.test.js checks them against each tool's settings).
//
// Prices, add-ons and checkout links live in products.js; this file holds the teaching content.

export { ADDONS, ADDON_ORDER } from './addons.js';

/* ------------------------------------------------------------ lesson helpers */
const L = (tool) => (t, exercise, n, pass, s = {}, u = null) => ({ t, tool, pass, u, s: { exercise, sessionLength: n, ...s } });
const nr = L('note-reader');
const iv = L('interval-trainer');
const sc = L('scale-explorer');
const ch = L('chord-builder');
const rh = L('rhythm-lab');
const pg = L('progression-lab');
const jz = L('jazz-harmony');
const md = L('melodic-dictation');
const at = L('atelier');
const unit = (name, lessons) => lessons.map((l) => ({ ...l, u: name }));

const ALL_IV = ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
const ALL_CMP = ['m9', 'M9', 'm10', 'M10', 'P11', 'A11', 'P12', 'm13', 'M13', 'm14', 'M14', 'P15'];
const TRIADS = ['maj', 'min', 'dim', 'aug'];
const SEVENTHS = ['maj7', 'dom7', 'min7', 'hdim7', 'dim7'];
const MODES = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'naturalMinor', 'locrian'];
const FIVE_SCALES = ['major', 'naturalMinor', 'harmonicMinor', 'majorPentatonic', 'minorPentatonic'];
const ALL_STRINGS = [0, 1, 2, 3, 4, 5];

/* ------------------------------------------------------------ courses */
export const COURSES = [
  {
    id: 'treble-clef-sprint',
    level: 'Beginner',
    primary: 'note-reader',
    tagline: 'Six short lessons that take you from middle C to fluent reading across the whole treble staff.',
    intro: 'Each lesson widens the range by a few notes, so you are never guessing at notes you have not met yet. You finish reading ledger lines above and below the staff, and notes with sharps and flats.',
    forWho: ['Beginners learning to read treble clef', 'Guitarists, singers and pianists who read slowly and want speed'],
    notFor: ['Players who already read treble clef fluently'],
    lessons: [
      nr('Middle C to G', 'staff', 10, 90, { clef: 'treble', trebleLow: 'C4', trebleHigh: 'G4' }),
      nr('The middle of the staff', 'staff', 20, 85, { clef: 'treble', trebleLow: 'E4', trebleHigh: 'E5' }),
      nr('The whole staff', 'staff', 20, 85, { clef: 'treble', trebleLow: 'E4', trebleHigh: 'F5' }),
      nr('Ledger lines below', 'staff', 20, 80, { clef: 'treble', trebleLow: 'A3', trebleHigh: 'F5' }),
      nr('Ledger lines above', 'staff', 20, 80, { clef: 'treble', trebleLow: 'E4', trebleHigh: 'C6' }),
      nr('Sharps and flats', 'staff', 20, 80, { clef: 'treble', trebleLow: 'C4', trebleHigh: 'A5', accidentals: true }),
    ],
    bonus: [
      nr('Speed round: full range', 'staff', 30, 90, { clef: 'treble', trebleLow: 'A3', trebleHigh: 'C6' }),
      nr('Treble staff to keyboard', 'staff-keyboard', 20, 85, { clef: 'treble', trebleLow: 'C4', trebleHigh: 'C5' }),
      nr('Ledger-line marathon', 'staff', 50, 85, { clef: 'treble', trebleLow: 'F3', trebleHigh: 'E6', accidentals: true }),
    ],
  },
  {
    id: 'bass-clef-sprint',
    level: 'Beginner',
    primary: 'note-reader',
    tagline: 'Six short lessons that make the bass clef as easy to read as the treble.',
    intro: 'The course starts around the C below middle C and grows outward one step at a time, through ledger lines below the staff and up to middle C and beyond, then adds sharps and flats.',
    forWho: ['Pianists who read treble clef but stall in the left hand', 'Bass players and cellists starting to read'],
    notFor: ['Players who already read bass clef fluently'],
    lessons: [
      nr('C3 to G3', 'staff', 10, 90, { clef: 'bass', bassLow: 'C3', bassHigh: 'G3' }),
      nr('The middle of the bass staff', 'staff', 20, 85, { clef: 'bass', bassLow: 'G2', bassHigh: 'G3' }),
      nr('The whole bass staff', 'staff', 20, 85, { clef: 'bass', bassLow: 'G2', bassHigh: 'A3' }),
      nr('Ledger lines below', 'staff', 20, 80, { clef: 'bass', bassLow: 'C2', bassHigh: 'A3' }),
      nr('Up to middle C and above', 'staff', 20, 80, { clef: 'bass', bassLow: 'G2', bassHigh: 'E4' }),
      nr('Sharps and flats', 'staff', 20, 80, { clef: 'bass', bassLow: 'E2', bassHigh: 'C4', accidentals: true }),
    ],
    bonus: [
      nr('Grand staff: both clefs mixed', 'staff', 30, 85, { clef: 'both', trebleLow: 'C4', trebleHigh: 'G5', bassLow: 'E2', bassHigh: 'C4' }),
      nr('Bass staff to keyboard', 'staff-keyboard', 20, 85, { clef: 'bass', bassLow: 'C3', bassHigh: 'C4' }),
      nr('Low ledger-line marathon', 'staff', 50, 85, { clef: 'bass', bassLow: 'A1', bassHigh: 'G4', accidentals: true }),
    ],
  },
  {
    id: 'fretboard-map',
    level: 'Beginner',
    primary: 'note-reader',
    tagline: 'Learn every note on the guitar neck, two strings at a time, up to the 12th fret.',
    intro: 'You start with the low E and A strings, where root notes live, then add the middle and top strings. Later lessons ask you to find named notes on a given string, and finish with the whole neck including sharps and flats.',
    forWho: ['Guitarists who play shapes but cannot name the notes under their fingers', 'Players who want to move chord and scale shapes to any key'],
    notFor: ['Players who already name every fret instantly'],
    lessons: [
      nr('Low E string, open to fret 5', 'fretboard', 20, 85, { strings: [0], fretLow: 0, fretHigh: 5 }),
      nr('A string, open to fret 5', 'fretboard', 20, 85, { strings: [1], fretLow: 0, fretHigh: 5 }),
      nr('Both bass strings to fret 12', 'fretboard', 20, 80, { strings: [0, 1], fretLow: 0, fretHigh: 12 }),
      nr('D and G strings', 'fretboard', 20, 80, { strings: [2, 3], fretLow: 0, fretHigh: 12 }),
      nr('B and high E strings', 'fretboard', 20, 80, { strings: [4, 5], fretLow: 0, fretHigh: 12 }),
      nr('Find it on the bass strings', 'find-string', 20, 80, { strings: [0, 1], fretLow: 0, fretHigh: 12 }),
      nr('Find it on any string', 'find-string', 30, 80, { strings: ALL_STRINGS, fretLow: 0, fretHigh: 12 }),
      nr('The whole neck with sharps and flats', 'fretboard', 30, 80, { strings: ALL_STRINGS, fretLow: 0, fretHigh: 12, accidentals: true }),
    ],
    bonus: [
      nr('Above the 12th fret', 'fretboard', 20, 80, { strings: ALL_STRINGS, fretLow: 12, fretHigh: 15, accidentals: true }),
      nr('Find it fast', 'find-string', 50, 85, { strings: ALL_STRINGS, fretLow: 0, fretHigh: 12 }),
      nr('Full-neck marathon', 'fretboard', 50, 85, { strings: ALL_STRINGS, fretLow: 0, fretHigh: 15, accidentals: true }),
    ],
  },
  {
    id: 'piano-keys-fluency',
    level: 'Beginner',
    primary: 'note-reader',
    tagline: 'Know every key on the piano, connect the staff to the keyboard, and play triads in any key.',
    intro: 'The first lessons name white and black keys. Then notes on the treble, bass and grand staff have to be found at the right octave, and the last lessons build major and minor triads on the keyboard from natural and then any root.',
    forWho: ['New piano and keyboard players', 'Guitarists and singers who want to find notes on a keyboard'],
    notFor: ['Pianists who already read both clefs at the keyboard'],
    lessons: [
      nr('White keys', 'keyboard', 20, 90, { accidentals: false }),
      nr('Black keys and their two names', 'keyboard', 20, 85, { accidentals: true }),
      nr('Treble staff to keyboard', 'staff-keyboard', 20, 85, { clef: 'treble', trebleLow: 'C4', trebleHigh: 'C5' }),
      nr('Bass staff to keyboard', 'staff-keyboard', 20, 85, { clef: 'bass', bassLow: 'C3', bassHigh: 'C4' }),
      nr('Grand staff to keyboard', 'staff-keyboard', 20, 80, { clef: 'both', trebleLow: 'C4', trebleHigh: 'G5', bassLow: 'F2', bassHigh: 'C4' }),
      ch('Major and minor triads on the keyboard', 'build-kb', 10, 85, { types: ['maj', 'min'], inversions: [0], roots: 'natural' }),
      ch('Triads in every key', 'build-kb', 10, 80, { types: ['maj', 'min'], inversions: [0], roots: 'all' }),
    ],
    bonus: [
      ch('Triad inversions on the keyboard', 'build-kb', 10, 80, { types: ['maj', 'min'], inversions: [0, 1, 2], roots: 'natural' }),
      ch('Seventh chords on the keyboard', 'build-kb', 10, 80, { types: ['maj7', 'dom7', 'min7'], inversions: [0], roots: 'natural' }),
      nr('Grand staff with sharps and flats', 'staff-keyboard', 30, 80, { clef: 'both', trebleLow: 'C4', trebleHigh: 'G5', bassLow: 'F2', bassHigh: 'C4', accidentals: true }),
    ],
  },
  {
    id: 'interval-ear-bootcamp',
    level: 'Beginner',
    primary: 'interval-trainer',
    tagline: 'Ten lessons that build your interval ear from three easy sounds to all twelve, up, down and together.',
    intro: 'You begin with the 3rd, 5th and octave, then learn the intervals that are easy to confuse in small groups. The last lessons put all twelve together ascending, descending and played at the same time.',
    forWho: ['Anyone starting ear training', 'Players who want to work out melodies and solos by ear'],
    notFor: ['Musicians who already name every interval reliably'],
    lessons: [
      iv('Thirds, fifths and octaves', 'ascending', 20, 85, { intervals: ['M3', 'P5', 'P8'], root: 'C', adaptive: false }),
      iv('Major or minor third', 'ascending', 20, 85, { intervals: ['m3', 'M3'] }),
      iv('Fourths and fifths', 'ascending', 20, 85, { intervals: ['P4', 'P5', 'P8'] }),
      iv('Seconds and thirds', 'ascending', 20, 80, { intervals: ['m2', 'M2', 'm3', 'M3'] }),
      iv('Sixths', 'ascending', 20, 80, { intervals: ['M3', 'P5', 'm6', 'M6'] }),
      iv('Sevenths and the octave', 'ascending', 20, 80, { intervals: ['M6', 'm7', 'M7', 'P8'] }),
      iv('The tritone', 'ascending', 20, 85, { intervals: ['P4', 'A4', 'P5'] }),
      iv('All intervals, ascending', 'ascending', 30, 80, { intervals: ALL_IV }),
      iv('All intervals, descending', 'descending', 30, 75, { intervals: ALL_IV }),
      iv('All intervals, together', 'harmonic', 30, 75, { intervals: ALL_IV }),
    ],
    bonus: [
      iv('Mixed directions', 'mixed', 50, 80, { intervals: ALL_IV }),
      iv('Low register', 'mixed', 30, 75, { intervals: ALL_IV, register: 'low' }),
      iv('High register', 'mixed', 30, 80, { intervals: ALL_IV, register: 'high' }),
    ],
  },
  {
    id: 'major-minor-ear',
    level: 'Beginner',
    primary: 'chord-builder',
    tagline: 'Hear the difference between major and minor, from single intervals to full chords in any inversion.',
    intro: 'The course trains one skill from several angles: major and minor 3rds and 6ths, then major and minor chords played broken and together. It ends with diminished and augmented chords and inversions.',
    forWho: ['Beginners who are not sure whether a chord sounds major or minor', 'Players learning songs by ear'],
    notFor: ['Musicians who already identify chord qualities with ease'],
    lessons: [
      iv('Major or minor third, rising', 'ascending', 20, 85, { intervals: ['m3', 'M3'] }),
      iv('Major or minor third, together', 'harmonic', 20, 80, { intervals: ['m3', 'M3'] }),
      iv('Major or minor sixth', 'ascending', 20, 80, { intervals: ['m6', 'M6'] }),
      ch('Major or minor chord, broken', 'quality', 10, 85, { types: ['maj', 'min'], inversions: [0], earPlay: 'broken' }),
      ch('Major or minor chord, together', 'quality', 10, 85, { types: ['maj', 'min'], inversions: [0], earPlay: 'block' }),
      ch('Inversions included', 'quality', 10, 80, { types: ['maj', 'min'], inversions: [0, 1, 2], earPlay: 'both' }),
      ch('Diminished and augmented', 'quality', 10, 75, { types: TRIADS, inversions: [0], earPlay: 'both' }),
      ch('All four triads, any inversion', 'quality', 20, 75, { types: TRIADS, inversions: [0, 1, 2], earPlay: 'both' }),
    ],
    bonus: [
      ch('Which inversion?', 'inversion', 10, 75, { types: ['maj', 'min'], inversions: [0, 1, 2] }),
      iv('Thirds and sixths, mixed directions', 'mixed', 30, 80, { intervals: ['m3', 'M3', 'm6', 'M6'] }),
      ch('Seventh-chord colours', 'quality', 10, 70, { types: ['maj7', 'dom7', 'min7'], inversions: [0], earPlay: 'both' }),
    ],
  },
  {
    id: 'scale-workout-guitar',
    level: 'Intermediate',
    primary: 'scale-explorer',
    tagline: 'Ten lessons of scale shapes on the fretboard: major, minor, pentatonic and three notes per string.',
    intro: 'Each lesson focuses on one family of shapes in a small set of keys before mixing them. The course covers box patterns and three-notes-per-string patterns, harmonic minor, spelling scales with sharps and flats, and recognising scales by ear.',
    forWho: ['Guitarists who know one or two shapes and want the rest', 'Players who want to solo across the whole neck'],
    notFor: ['Players looking for technique or picking exercises', 'Pianists (see Pentatonic & Blues Path or Modes Made Clear)'],
    lessons: [
      sc('Major scale shapes', 'fretboard', 10, 85, { scales: ['major'], keyLevel: 2, patterns: 'box' }),
      sc('Natural minor shapes', 'fretboard', 10, 85, { scales: ['naturalMinor'], keyLevel: 2, patterns: 'box' }),
      sc('Minor pentatonic boxes', 'fretboard', 10, 85, { scales: ['minorPentatonic'], keyLevel: 2, patterns: 'box' }),
      sc('Major pentatonic boxes', 'fretboard', 10, 85, { scales: ['majorPentatonic'], keyLevel: 2, patterns: 'box' }),
      sc('Three notes per string: major', 'fretboard', 10, 80, { scales: ['major'], keyLevel: 2, patterns: 'nps' }),
      sc('Three notes per string: minor', 'fretboard', 10, 80, { scales: ['naturalMinor'], keyLevel: 2, patterns: 'nps' }),
      sc('Harmonic minor', 'fretboard', 10, 80, { scales: ['harmonicMinor'], keyLevel: 2, patterns: 'box' }),
      sc('Spell the scale in more keys', 'build', 10, 85, { scales: ['major', 'naturalMinor'], keyLevel: 4 }),
      sc('Mixed shapes in more keys', 'fretboard', 20, 80, { scales: ['major', 'naturalMinor', 'majorPentatonic', 'minorPentatonic'], keyLevel: 4, patterns: 'box' }),
      sc('Hear the scale', 'ear', 10, 75, { scales: FIVE_SCALES, keyLevel: 2 }),
    ],
    bonus: [
      sc('Blues scale shapes', 'fretboard', 10, 80, { scales: ['blues'], keyLevel: 2, patterns: 'box' }),
      sc('Every key', 'fretboard', 20, 80, { scales: FIVE_SCALES, keyLevel: 7, patterns: 'box' }),
      sc('Melodic minor, three notes per string', 'fretboard', 10, 75, { scales: ['melodicMinor'], keyLevel: 2, patterns: 'nps' }),
    ],
  },
  {
    id: 'modes-made-clear',
    level: 'Intermediate',
    primary: 'scale-explorer',
    tagline: 'Spell, hear and play all seven modes, one at a time and then side by side.',
    intro: 'Each mode gets its own lesson where you build it from different roots. Then you compare modes by their scale degrees, learn to hear the bright modes against the dark ones, and find them on the fretboard.',
    forWho: ['Players who know the major scale and want to understand modes', 'Improvisers who want each mode’s sound in their ear'],
    notFor: ['Complete beginners (start with Scale Workout or Pentatonic & Blues Path)'],
    lessons: [
      sc('Dorian', 'build', 10, 85, { scales: ['dorian'], keyLevel: 2 }),
      sc('Mixolydian', 'build', 10, 85, { scales: ['mixolydian'], keyLevel: 2 }),
      sc('Lydian', 'build', 10, 85, { scales: ['lydian'], keyLevel: 2 }),
      sc('Phrygian', 'build', 10, 85, { scales: ['phrygian'], keyLevel: 2 }),
      sc('Locrian', 'build', 10, 85, { scales: ['locrian'], keyLevel: 2 }),
      sc('All seven modes, built', 'build', 20, 80, { scales: MODES, keyLevel: 4 }),
      sc('Mode degrees', 'degrees', 10, 80, { scales: ['dorian', 'mixolydian', 'lydian'], keyLevel: 2 }),
      sc('Bright modes by ear', 'ear', 10, 75, { scales: ['major', 'lydian', 'mixolydian'], keyLevel: 2 }),
      sc('Dark modes by ear', 'ear', 10, 75, { scales: ['naturalMinor', 'dorian', 'phrygian'], keyLevel: 2 }),
      sc('Modes on the fretboard', 'fretboard', 10, 80, { scales: ['dorian', 'mixolydian', 'lydian', 'phrygian'], keyLevel: 2, patterns: 'nps' }),
    ],
    bonus: [
      sc('All modes by ear', 'ear', 20, 70, { scales: MODES, keyLevel: 2 }),
      sc('Modes in every key', 'build', 20, 80, { scales: MODES, keyLevel: 7 }),
      sc('Degrees of every mode', 'degrees', 20, 75, { scales: MODES, keyLevel: 4 }),
    ],
  },
  {
    id: 'pentatonic-blues-path',
    level: 'Beginner',
    primary: 'scale-explorer',
    tagline: 'The pentatonic and blues scales, spelled, played and heard, in eight lessons.',
    intro: 'You build the minor and major pentatonic scales and both blues scales from different roots, find their box shapes on the fretboard, and learn to tell them apart by ear and by scale degree.',
    forWho: ['Guitarists and keyboard players starting to improvise', 'Players who want the blues scale in more than one key'],
    notFor: ['Players who already use these scales in every key'],
    lessons: [
      sc('Minor pentatonic, built', 'build', 10, 90, { scales: ['minorPentatonic'], keyLevel: 2 }),
      sc('Major pentatonic, built', 'build', 10, 90, { scales: ['majorPentatonic'], keyLevel: 2 }),
      sc('The blues scale', 'build', 10, 85, { scales: ['blues'], keyLevel: 2 }),
      sc('The major blues scale', 'build', 10, 85, { scales: ['majorBlues'], keyLevel: 2 }),
      sc('Pentatonic boxes', 'fretboard', 10, 80, { scales: ['minorPentatonic', 'majorPentatonic'], keyLevel: 2, patterns: 'box' }),
      sc('Blues boxes', 'fretboard', 10, 80, { scales: ['blues'], keyLevel: 2, patterns: 'box' }),
      sc('Pentatonic or blues by ear', 'ear', 10, 75, { scales: ['minorPentatonic', 'majorPentatonic', 'blues'], keyLevel: 2 }),
      sc('Scale degrees', 'degrees', 10, 80, { scales: ['minorPentatonic', 'blues'], keyLevel: 2 }),
    ],
    bonus: [
      sc('Every key', 'build', 20, 85, { scales: ['minorPentatonic', 'majorPentatonic', 'blues', 'majorBlues'], keyLevel: 7 }),
      sc('All four by ear', 'ear', 20, 70, { scales: ['minorPentatonic', 'majorPentatonic', 'blues', 'majorBlues'], keyLevel: 2 }),
      sc('Box shapes in more keys', 'fretboard', 20, 80, { scales: ['minorPentatonic', 'majorPentatonic', 'blues'], keyLevel: 4, patterns: 'box' }),
    ],
  },
  {
    id: 'triads-everywhere',
    level: 'Intermediate',
    primary: 'chord-builder',
    tagline: 'Spell, build and hear every triad, in every inversion, on the keyboard and the fretboard.',
    intro: 'You start by spelling major and minor triads, add diminished and augmented, then build them on the keyboard and the fretboard in root position and inversions. The last lessons identify triad quality and inversion by ear.',
    forWho: ['Players who want chords to make sense beyond memorised shapes', 'Theory students learning triads'],
    notFor: ['Players who already spell and hear triads fluently'],
    lessons: [
      ch('Spell major and minor triads', 'spell', 10, 90, { types: ['maj', 'min'], inversions: [0], roots: 'natural' }),
      ch('Spell all four triad types', 'spell', 10, 85, { types: TRIADS, inversions: [0], roots: 'natural' }),
      ch('Triads from any root', 'spell', 10, 80, { types: TRIADS, inversions: [0], roots: 'all' }),
      ch('Root position on the keyboard', 'build-kb', 10, 85, { types: ['maj', 'min'], inversions: [0], roots: 'natural' }),
      ch('Inversions on the keyboard', 'build-kb', 10, 80, { types: ['maj', 'min'], inversions: [0, 1, 2], roots: 'natural' }),
      ch('Triads on the fretboard', 'build-fb', 10, 80, { types: ['maj', 'min'], inversions: [0], roots: 'natural' }),
      ch('Inversions on the fretboard', 'build-fb', 10, 75, { types: ['maj', 'min'], inversions: [0, 1, 2], roots: 'natural' }),
      ch('Triad quality by ear', 'quality', 10, 75, { types: TRIADS, inversions: [0] }),
      ch('Inversion by ear', 'inversion', 10, 70, { types: ['maj', 'min'], inversions: [0, 1, 2] }),
    ],
    bonus: [
      ch('Diminished and augmented on the fretboard', 'build-fb', 10, 75, { types: ['dim', 'aug'], inversions: [0], roots: 'natural' }),
      ch('Any triad, any root, any inversion', 'build-kb', 20, 80, { types: TRIADS, inversions: [0, 1, 2], roots: 'all' }),
      ch('Inversion by ear, all types', 'inversion', 10, 65, { types: TRIADS, inversions: [0, 1, 2] }),
    ],
  },
  {
    id: 'seventh-chord-essentials',
    level: 'Intermediate',
    primary: 'chord-builder',
    tagline: 'The five seventh chords: spelled, built in every inversion, found on the fretboard and heard.',
    intro: 'Seventh chords are introduced in pairs that are easy to mix up, then all five together and from any root. You build them on the keyboard and fretboard, identify them by ear, and finish by spelling them with jazz chord symbols.',
    forWho: ['Players moving beyond triads', 'Anyone preparing for jazz, gospel or harmony study'],
    notFor: ['Complete beginners (start with Triads Everywhere)'],
    lessons: [
      ch('Major 7 and dominant 7', 'spell', 10, 85, { types: ['maj7', 'dom7'], inversions: [0], roots: 'natural' }),
      ch('Minor 7 and half-diminished', 'spell', 10, 85, { types: ['min7', 'hdim7'], inversions: [0], roots: 'natural' }),
      ch('All five seventh chords', 'spell', 10, 80, { types: SEVENTHS, inversions: [0], roots: 'natural' }),
      ch('Sevenths from any root', 'spell', 10, 80, { types: SEVENTHS, inversions: [0], roots: 'all' }),
      ch('Sevenths on the keyboard', 'build-kb', 10, 80, { types: ['maj7', 'dom7', 'min7'], inversions: [0], roots: 'natural' }),
      ch('Seventh-chord inversions', 'build-kb', 10, 75, { types: ['maj7', 'dom7', 'min7'], inversions: [0, 1, 2, 3], roots: 'natural' }),
      ch('Sevenths on the fretboard', 'build-fb', 10, 75, { types: ['maj7', 'dom7', 'min7'], inversions: [0], roots: 'natural' }),
      ch('Major 7 or dominant 7 by ear', 'quality', 10, 80, { types: ['maj7', 'dom7'], inversions: [0] }),
      ch('All five sevenths by ear', 'quality', 10, 70, { types: SEVENTHS, inversions: [0] }),
      jz('Seventh chords with jazz symbols', 'spell', 10, 80, { families: ['sevenths'], roots: 'all' }),
    ],
    bonus: [
      ch('Seventh-chord inversion by ear', 'inversion', 10, 65, { types: ['maj7', 'dom7', 'min7'], inversions: [0, 1, 2, 3] }),
      jz('Sevenths and sixths', 'spell', 10, 80, { families: ['sevenths', 'sixths'], roots: 'all' }),
      ch('Any seventh, any root, any inversion', 'build-kb', 20, 75, { types: SEVENTHS, inversions: [0, 1, 2, 3], roots: 'all' }),
    ],
  },
  {
    id: 'rhythm-reading-foundations',
    level: 'Beginner',
    primary: 'rhythm-lab',
    tagline: 'Read and tap rhythms with timing feedback, from quarter notes to dotted rhythms.',
    intro: 'You start by keeping a steady pulse, then read and tap rhythms that add one new idea per lesson: eighth notes, three-four time, two-bar phrases and dotted rhythms. Ear lessons ask you to recognise rhythms you hear.',
    forWho: ['Beginners who struggle to count rhythms', 'Self-taught players who want to read rhythm notation'],
    notFor: ['Players who already sight-read rhythms comfortably'],
    lessons: [
      rh('A steady pulse', 'pulse', 5, 80, { meter: '4/4', tempo: 80 }),
      rh('Quarter and half notes', 'read', 10, 80, { meter: '4/4', level: 1, tempo: 70, window: 'relaxed' }),
      rh('Adding eighth notes', 'read', 10, 80, { meter: '4/4', level: 2, tempo: 70, window: 'relaxed' }),
      rh('Three-four time', 'read', 10, 80, { meter: '3/4', level: 2, tempo: 76, window: 'relaxed' }),
      rh('Two bars at a time', 'read', 10, 75, { meter: '4/4', level: 2, bars: 2, tempo: 72, window: 'relaxed' }),
      rh('Rhythm by ear', 'ear', 10, 80, { meter: '4/4', level: 1, tempo: 80 }),
      rh('Dotted rhythms', 'read', 10, 75, { meter: '4/4', level: 3, tempo: 72, window: 'relaxed' }),
      rh('Rhythm by ear: eighth notes', 'ear', 10, 75, { meter: '4/4', level: 2, tempo: 80 }),
      rh('Standard timing window', 'read', 10, 75, { meter: '4/4', level: 3, tempo: 84, window: 'standard' }),
    ],
    bonus: [
      rh('Six-eight time', 'read', 10, 75, { meter: '6/8', level: 2, tempo: 72 }),
      rh('Strict timing', 'read', 10, 70, { meter: '4/4', level: 2, tempo: 84, window: 'strict' }),
      rh('Two-bar ear training', 'ear', 10, 70, { meter: '4/4', level: 3, bars: 2, tempo: 80 }),
    ],
  },
  {
    id: 'odd-meter-workshop',
    level: 'Advanced',
    primary: 'rhythm-lab',
    tagline: 'Read, tap and take dictation in 5/4, 5/8, 7/8 and other odd meters.',
    intro: 'The workshop starts with 5/4, then moves into 5/8 and 7/8, where beats have unequal lengths. You read and tap, keep a pulse in seven, recognise rhythms by ear, and write down rhythms you hear in odd meters.',
    forWho: ['Players who can read rhythms in 4/4 and want odd meters', 'Drummers, guitarists and keyboard players in progressive or folk styles'],
    notFor: ['Beginners (start with Rhythm Reading Foundations)'],
    lessons: [
      rh('Five-four, counted', 'read', 10, 80, { meter: '5/4', level: 2, tempo: 72, window: 'relaxed' }),
      rh('Five-eight', 'read', 10, 80, { meter: '5/8', level: 2, tempo: 72, window: 'relaxed' }),
      rh('Seven-eight', 'read', 10, 75, { meter: '7/8', level: 2, tempo: 72, window: 'relaxed' }),
      rh('Five-eight by ear', 'ear', 10, 75, { meter: '5/8', level: 2, tempo: 80 }),
      rh('Seven-eight by ear', 'ear', 10, 75, { meter: '7/8', level: 2, tempo: 80 }),
      rh('Harder rhythms in seven', 'read', 10, 70, { meter: '7/8', level: 3, tempo: 72 }),
      rh('A steady pulse in seven', 'pulse', 5, 80, { meter: '7/8', tempo: 90 }),
      rh('Two bars of five', 'read', 10, 70, { meter: '5/4', level: 3, bars: 2, tempo: 72 }),
      at('Rhythmic dictation in 5/8 and 7/8', 'rhythm', 5, 70, { meters: ['5/8', '7/8'], rlevel: 2, rbars: 1 }),
      at('Rhythmic dictation in mixed odd meters', 'rhythm', 5, 70, { meters: ['5/8', '7/8', '5/4'], rlevel: 3, rbars: 1 }),
    ],
    bonus: [
      at('Nine-eight and twelve-eight dictation', 'rhythm', 5, 70, { meters: ['9/8', '12/8'], rlevel: 3, rbars: 1 }),
      rh('Strict seven', 'read', 10, 65, { meter: '7/8', level: 3, tempo: 80, window: 'strict' }),
      rh('Five-eight at level 4', 'read', 10, 65, { meter: '5/8', level: 4, tempo: 72 }),
    ],
  },
  {
    id: 'steady-time-builder',
    level: 'Beginner',
    primary: 'rhythm-lab',
    tagline: 'Six lessons that tighten your timing, measured against the clock in your browser.',
    intro: 'Each lesson asks you to tap a steady pulse at a different tempo or meter and shows how early or late each tap was. The last lesson puts that steadiness to work reading quarter and eighth notes.',
    forWho: ['Players who rush or drag', 'Anyone who wants an objective measure of their timing'],
    notFor: ['Players looking for a full metronome app'],
    lessons: [
      rh('Pulse at 70 with subdivisions', 'pulse', 5, 80, { meter: '4/4', tempo: 70, subdivide: true }),
      rh('Pulse at 90', 'pulse', 5, 80, { meter: '4/4', tempo: 90 }),
      rh('Pulse at 110', 'pulse', 5, 80, { meter: '4/4', tempo: 110 }),
      rh('Pulse in three', 'pulse', 5, 80, { meter: '3/4', tempo: 90 }),
      rh('Pulse at 60 without subdivisions', 'pulse', 5, 75, { meter: '4/4', tempo: 60, subdivide: false }),
      rh('Read and tap quarters and eighths', 'read', 10, 75, { meter: '4/4', level: 2, tempo: 90 }),
    ],
    bonus: [
      rh('Pulse at 140', 'pulse', 5, 75, { meter: '4/4', tempo: 140 }),
      rh('Strict pulse', 'pulse', 5, 70, { meter: '4/4', tempo: 100, window: 'strict' }),
      rh('Pulse in six-eight', 'pulse', 5, 75, { meter: '6/8', tempo: 80 }),
    ],
  },
  {
    id: 'diatonic-harmony-course',
    level: 'Intermediate',
    primary: 'progression-lab',
    tagline: 'Roman numeral analysis and progressions by ear, in major and minor, from triads to seventh chords.',
    intro: 'Twelve lessons alternate between analysing written progressions and hearing them. Progressions grow from four chords in easy major keys to eight chords with inversions and seventh chords in more keys.',
    forWho: ['Theory students learning Roman numeral analysis', 'Songwriters who want to understand why progressions work'],
    notFor: ['Players who have not yet learned triads (start with Triads Everywhere)'],
    lessons: [
      pg('Roman numerals in major', 'analysis', 5, 80, { modes: 'major', keyLevel: 2, vocab: 'triads', length: 4 }),
      pg('Longer major progressions', 'analysis', 5, 80, { modes: 'major', keyLevel: 2, vocab: 'triads', length: 6 }),
      pg('Roman numerals in minor', 'analysis', 5, 75, { modes: 'minor', keyLevel: 2, vocab: 'triads', length: 4 }),
      pg('Major and minor mixed', 'analysis', 5, 75, { modes: 'both', keyLevel: 2, vocab: 'triads', length: 6 }),
      pg('Inversions and figures', 'analysis', 5, 70, { modes: 'both', keyLevel: 2, vocab: 'inversions', length: 4 }),
      pg('More keys', 'analysis', 5, 70, { modes: 'both', keyLevel: 4, vocab: 'inversions', length: 6 }),
      pg('Hearing major progressions', 'ear', 5, 75, { modes: 'major', keyLevel: 2, vocab: 'triads', length: 4 }),
      pg('Hearing minor progressions', 'ear', 5, 70, { modes: 'minor', keyLevel: 2, vocab: 'triads', length: 4 }),
      pg('Six-chord progressions by ear', 'ear', 5, 65, { modes: 'both', keyLevel: 2, vocab: 'triads', length: 6 }),
      pg('Seventh chords in analysis', 'analysis', 5, 70, { modes: 'both', keyLevel: 2, vocab: 'sevenths', length: 4 }),
      pg('Seventh chords by ear', 'ear', 5, 65, { modes: 'major', keyLevel: 2, vocab: 'sevenths', length: 4 }),
      pg('Eight-chord progressions', 'analysis', 5, 65, { modes: 'both', keyLevel: 4, vocab: 'sevenths', length: 8 }),
    ],
    bonus: [
      pg('Analysis in every key', 'analysis', 5, 65, { modes: 'both', keyLevel: 7, vocab: 'sevenths', length: 8 }),
      pg('Eight chords by ear', 'ear', 5, 60, { modes: 'both', keyLevel: 2, vocab: 'triads', length: 8 }),
      pg('Inversions by ear', 'ear', 5, 60, { modes: 'both', keyLevel: 2, vocab: 'inversions', length: 6 }),
    ],
  },
  {
    id: 'four-part-writing',
    level: 'Advanced',
    primary: 'progression-lab',
    tagline: 'Write four-part harmony that is checked against the voice-leading rules as you go.',
    intro: 'You realise progressions in soprano, alto, tenor and bass, and every answer is checked for parallel fifths and octaves, spacing, range and resolution. Lessons add minor keys, inversions, seventh chords and longer progressions, then turn off the live warnings.',
    forWho: ['Harmony and theory students practising part-writing', 'Arrangers and composers who want smoother voice leading'],
    notFor: ['Players new to chords and Roman numerals (start with Diatonic Harmony Course)'],
    lessons: [
      pg('Your first four-part progression', 'voice', 3, 70, { modes: 'major', keyLevel: 2, vocab: 'triads', length: 4, showWarnings: true }),
      pg('Four-part writing in minor', 'voice', 3, 70, { modes: 'minor', keyLevel: 2, vocab: 'triads', length: 4, showWarnings: true }),
      pg('Six-chord progressions', 'voice', 3, 70, { modes: 'major', keyLevel: 2, vocab: 'triads', length: 6, showWarnings: true }),
      pg('Six chords in minor', 'voice', 3, 70, { modes: 'minor', keyLevel: 2, vocab: 'triads', length: 6, showWarnings: true }),
      pg('Writing with inversions', 'voice', 3, 65, { modes: 'major', keyLevel: 2, vocab: 'inversions', length: 4, showWarnings: true }),
      pg('Inversions in minor', 'voice', 3, 65, { modes: 'minor', keyLevel: 2, vocab: 'inversions', length: 4, showWarnings: true }),
      pg('More keys', 'voice', 3, 65, { modes: 'both', keyLevel: 4, vocab: 'inversions', length: 6, showWarnings: true }),
      pg('Seventh chords in four parts', 'voice', 3, 60, { modes: 'major', keyLevel: 2, vocab: 'sevenths', length: 4, showWarnings: true }),
      pg('Live warnings off', 'voice', 3, 65, { modes: 'both', keyLevel: 2, vocab: 'triads', length: 6, showWarnings: false }),
      pg('Analysis check: inversions', 'analysis', 5, 75, { modes: 'both', keyLevel: 2, vocab: 'inversions', length: 6 }),
      pg('Hearing what you write', 'ear', 5, 65, { modes: 'both', keyLevel: 2, vocab: 'inversions', length: 4 }),
      pg('Eight-chord progressions', 'voice', 3, 60, { modes: 'both', keyLevel: 4, vocab: 'inversions', length: 8, showWarnings: true }),
    ],
    bonus: [
      pg('Seventh chords in minor', 'voice', 3, 60, { modes: 'minor', keyLevel: 2, vocab: 'sevenths', length: 4, showWarnings: true }),
      pg('Every key', 'voice', 3, 60, { modes: 'both', keyLevel: 7, vocab: 'inversions', length: 6, showWarnings: true }),
      pg('Eight chords with sevenths, warnings off', 'voice', 3, 55, { modes: 'both', keyLevel: 4, vocab: 'sevenths', length: 8, showWarnings: false }),
    ],
  },
  {
    id: 'hearing-progressions',
    level: 'Intermediate',
    primary: 'progression-lab',
    tagline: 'Recognise chord qualities and whole progressions by ear, in major and minor.',
    intro: 'The course begins with single chords, major or minor and then all four triads, before moving to complete progressions. Progressions grow longer and add inversions and seventh chords, and the tempo slows down where the material gets harder.',
    forWho: ['Players who want to work out songs by ear', 'Theory students preparing for harmonic dictation'],
    notFor: ['Complete beginners to ear training (start with Major & Minor Ear Starter)'],
    lessons: [
      ch('Major or minor chord', 'quality', 10, 85, { types: ['maj', 'min'], inversions: [0], earPlay: 'block' }),
      ch('All four triad qualities', 'quality', 10, 75, { types: TRIADS, inversions: [0] }),
      pg('Four chords in major', 'ear', 5, 75, { modes: 'major', keyLevel: 2, vocab: 'triads', length: 4 }),
      pg('Four chords in minor', 'ear', 5, 70, { modes: 'minor', keyLevel: 2, vocab: 'triads', length: 4 }),
      pg('Major and minor mixed', 'ear', 5, 70, { modes: 'both', keyLevel: 2, vocab: 'triads', length: 4 }),
      pg('Six chords at a slower tempo', 'ear', 5, 70, { modes: 'major', keyLevel: 2, vocab: 'triads', length: 6, tempo: 60 }),
      pg('Six chords in minor', 'ear', 5, 65, { modes: 'minor', keyLevel: 2, vocab: 'triads', length: 6, tempo: 60 }),
      pg('Hearing inversions', 'ear', 5, 65, { modes: 'major', keyLevel: 2, vocab: 'inversions', length: 4 }),
      pg('Hearing seventh chords in context', 'ear', 5, 65, { modes: 'major', keyLevel: 2, vocab: 'sevenths', length: 4 }),
      ch('Seventh-chord quality by ear', 'quality', 10, 70, { types: SEVENTHS, inversions: [0] }),
      pg('Six chords with sevenths', 'ear', 5, 60, { modes: 'both', keyLevel: 2, vocab: 'sevenths', length: 6, tempo: 60 }),
    ],
    bonus: [
      pg('Eight-chord progressions', 'ear', 5, 60, { modes: 'both', keyLevel: 2, vocab: 'triads', length: 8 }),
      pg('Faster tempo with inversions', 'ear', 5, 60, { modes: 'both', keyLevel: 2, vocab: 'inversions', length: 6, tempo: 96 }),
      at('Secondary dominants', 'secondary', 5, 65),
    ],
  },
  {
    id: 'jazz-chord-spelling',
    level: 'Intermediate',
    primary: 'jazz-harmony',
    tagline: 'Spell every jazz chord symbol, from seventh chords to thirteenths and altered dominants.',
    intro: 'One chord family per lesson: sevenths, sixths, ninths, elevenths, thirteenths and altered dominants, first from natural roots and then from any root. The last lessons mix families together.',
    forWho: ['Players reading jazz lead sheets', 'Arrangers who want chord symbols to be automatic'],
    notFor: ['Players who do not yet know seventh chords (start with Seventh Chord Essentials)'],
    lessons: [
      jz('Seventh chords', 'spell', 10, 85, { families: ['sevenths'], roots: 'natural' }),
      jz('Sixth chords', 'spell', 10, 85, { families: ['sixths'], roots: 'natural' }),
      jz('Sevenths and sixths from any root', 'spell', 10, 80, { families: ['sevenths', 'sixths'], roots: 'all' }),
      jz('Ninth chords', 'spell', 10, 80, { families: ['ninths'], roots: 'natural' }),
      jz('Ninths from any root', 'spell', 10, 75, { families: ['ninths'], roots: 'all' }),
      jz('Eleventh chords', 'spell', 10, 75, { families: ['elevenths'], roots: 'natural' }),
      jz('Thirteenth chords', 'spell', 10, 75, { families: ['thirteenths'], roots: 'natural' }),
      jz('Altered dominants', 'spell', 10, 70, { families: ['altered'], roots: 'natural' }),
      jz('Extended chords mixed', 'spell', 10, 70, { families: ['ninths', 'elevenths', 'thirteenths'], roots: 'all' }),
      jz('Every family', 'spell', 20, 70, { families: ['sevenths', 'sixths', 'ninths', 'elevenths', 'thirteenths', 'altered'], roots: 'all' }),
    ],
    bonus: [
      jz('Shell voicings', 'voicing', 10, 75, { voicing: 'shell', roots: 'natural' }),
      jz('Altered dominants from any root', 'spell', 10, 65, { families: ['altered'], roots: 'all' }),
      jz('Rootless A voicings', 'voicing', 10, 70, { voicing: 'A', roots: 'natural' }),
    ],
  },
  {
    id: 'two-five-one-workout',
    level: 'Intermediate',
    primary: 'jazz-harmony',
    tagline: 'The ii–V–I progression in all twelve keys, major and minor, with shell and rootless voicings.',
    intro: 'You play ii–V–I progressions and build their voicings, starting with shell voicings in easy keys and moving to rootless A and B voicings in every key. Minor ii–V–i progressions follow, and the final lessons mix everything.',
    forWho: ['Jazz pianists and guitarists learning to comp', 'Players who know their seventh chords and want them in every key'],
    notFor: ['Players new to seventh chords (start with Seventh Chord Essentials)'],
    lessons: [
      jz('Major ii–V–I in natural keys', 'twofive', 10, 80, { twoFiveMode: 'major', voicing: 'shell', roots: 'natural' }),
      jz('Shell voicings in every key', 'twofive', 10, 75, { twoFiveMode: 'major', voicing: 'shell', roots: 'all' }),
      jz('Build shell voicings', 'voicing', 10, 80, { voicing: 'shell', roots: 'natural' }),
      jz('Shell voicings from any root', 'voicing', 10, 75, { voicing: 'shell', roots: 'all' }),
      jz('Type A rootless voicings', 'voicing', 10, 75, { voicing: 'A', roots: 'natural' }),
      jz('Type B rootless voicings', 'voicing', 10, 75, { voicing: 'B', roots: 'natural' }),
      jz('ii–V–I with A voicings', 'twofive', 10, 75, { twoFiveMode: 'major', voicing: 'A', roots: 'all' }),
      jz('Minor ii–V–i', 'twofive', 10, 75, { twoFiveMode: 'minor', voicing: 'shell', roots: 'natural' }),
      jz('Minor ii–V–i in every key', 'twofive', 10, 70, { twoFiveMode: 'minor', voicing: 'shell', roots: 'all' }),
      jz('Major and minor mixed', 'twofive', 10, 70, { twoFiveMode: 'both', voicing: 'A', roots: 'all' }),
      jz('B voicings from any root', 'voicing', 10, 70, { voicing: 'B', roots: 'all' }),
      jz('The full workout', 'twofive', 20, 70, { twoFiveMode: 'both', voicing: 'B', roots: 'all' }),
    ],
    bonus: [
      jz('Fast ii–V–I', 'twofive', 10, 70, { twoFiveMode: 'both', voicing: 'A', roots: 'all', tempo: 160 }),
      jz('Spell the chords of the ii–V–I', 'spell', 10, 75, { families: ['sevenths', 'ninths'], roots: 'all' }),
      jz('Hear the dominant’s colour', 'extension', 10, 65, { extensions: ['9', 'b9', '#9', '13'] }),
    ],
  },
  {
    id: 'jazz-ear-extensions',
    level: 'Advanced',
    primary: 'jazz-harmony',
    tagline: 'Hear jazz chord qualities and name the extensions and alterations on top.',
    intro: 'The course trains two skills: recognising chord families by ear, from seventh chords to altered dominants, and naming the extension you hear on a dominant chord. Extensions are introduced in pairs that are easy to confuse.',
    forWho: ['Jazz players transcribing chords', 'Arrangers and composers who want to hear upper extensions'],
    notFor: ['Players new to ear training (start with Interval Ear Bootcamp)'],
    lessons: [
      jz('Seventh-chord quality by ear', 'quality', 10, 80, { families: ['sevenths'] }),
      jz('Sevenths and sixths by ear', 'quality', 10, 75, { families: ['sevenths', 'sixths'] }),
      jz('Ninths by ear', 'quality', 10, 70, { families: ['sevenths', 'ninths'] }),
      jz('Natural 9 or flat 9', 'extension', 10, 80, { extensions: ['9', 'b9'] }),
      jz('Adding the sharp 9', 'extension', 10, 75, { extensions: ['9', 'b9', '#9'] }),
      jz('Thirteenths', 'extension', 10, 75, { extensions: ['9', '13'] }),
      jz('Natural 13 or flat 13', 'extension', 10, 70, { extensions: ['13', 'b13'] }),
      jz('Sharp 11', 'extension', 10, 70, { extensions: ['9', '#11', '13'] }),
      jz('All six extensions', 'extension', 20, 65, { extensions: ['9', 'b9', '#9', '#11', '13', 'b13'] }),
      jz('Altered chords by ear', 'quality', 10, 65, { families: ['sevenths', 'altered'] }),
      jz('Elevenths and thirteenths by ear', 'quality', 10, 60, { families: ['elevenths', 'thirteenths'] }),
      jz('Every family by ear', 'quality', 20, 60, { families: ['sevenths', 'sixths', 'ninths', 'elevenths', 'thirteenths', 'altered'] }),
    ],
    bonus: [
      jz('Extensions in a guitar tone', 'extension', 10, 60, { extensions: ['9', 'b9', '#9', '#11', '13', 'b13'], tone: 'guitar' }),
      jz('Every family from any root', 'quality', 20, 60, { families: ['sevenths', 'sixths', 'ninths', 'elevenths', 'thirteenths', 'altered'], roots: 'all' }),
      jz('Altered extensions only', 'extension', 10, 65, { extensions: ['b9', '#9', 'b13'] }),
    ],
  },
  {
    id: 'melodic-dictation-starter',
    level: 'Intermediate',
    primary: 'melodic-dictation',
    tagline: 'Hear short melodies and write them on the staff, from two bars in C major to four bars in other keys.',
    intro: 'The first lesson asks for pitches only. Then rhythm is added, melodies get longer, other major keys and wider leaps appear, and later lessons move to three-four and six-eight time, the bass clef and fewer replays.',
    forWho: ['Theory students practising dictation', 'Players who want to write down the melodies they hear'],
    notFor: ['Anyone who cannot yet read rhythm notation (start with Rhythm Reading Foundations)'],
    lessons: [
      md('Two bars in C, pitches only', 'pitch', 5, 70, { bars: 2, keyMode: 'C', level: 1, replays: 5, firstNote: true, cadence: true }),
      md('Two bars in C with rhythm', 'full', 5, 70, { bars: 2, keyMode: 'C', level: 1, replays: 5 }),
      md('Three bars in C', 'full', 5, 65, { bars: 3, keyMode: 'C', level: 1, replays: 5 }),
      md('Other major keys', 'full', 5, 65, { bars: 2, keyMode: 'major', keyLevel: 2, level: 1, replays: 5 }),
      md('Four bars in major', 'full', 5, 60, { bars: 4, keyMode: 'major', keyLevel: 2, level: 1, replays: 5 }),
      md('Wider leaps', 'full', 5, 60, { bars: 2, keyMode: 'major', keyLevel: 2, level: 2, replays: 5 }),
      md('Three-four time', 'full', 5, 60, { bars: 3, keyMode: 'major', keyLevel: 2, level: 1, meter: '3/4', replays: 5 }),
      md('Bass clef', 'full', 5, 65, { bars: 2, keyMode: 'C', level: 1, clef: 'bass', replays: 5 }),
      md('Three replays', 'full', 5, 60, { bars: 2, keyMode: 'major', keyLevel: 2, level: 1, replays: 3 }),
      md('A wider range', 'full', 5, 55, { bars: 4, keyMode: 'major', keyLevel: 2, level: 2, range: 'tenth', replays: 5 }),
      md('Six-eight time', 'full', 5, 55, { bars: 2, keyMode: 'major', keyLevel: 2, level: 1, meter: '6/8', replays: 5 }),
      md('Four bars at level 2', 'full', 5, 55, { bars: 4, keyMode: 'major', keyLevel: 4, level: 2, replays: 5 }),
    ],
    bonus: [
      md('Four bars across a twelfth', 'full', 5, 50, { bars: 4, keyMode: 'major', keyLevel: 2, level: 2, range: 'twelfth', replays: 5 }),
      md('No first note given', 'full', 5, 50, { bars: 2, keyMode: 'major', keyLevel: 2, level: 1, firstNote: false, replays: 5 }),
      md('Level 3 melodies', 'full', 5, 50, { bars: 4, keyMode: 'major', keyLevel: 2, level: 3, replays: 5 }),
    ],
  },
  {
    id: 'minor-key-dictation',
    level: 'Advanced',
    primary: 'melodic-dictation',
    tagline: 'Melodic dictation in minor keys, with the raised sixth and seventh degrees that make minor tricky.',
    intro: 'You start with pitch-only dictation in minor keys, then add rhythm, longer phrases, leaps, other meters and the bass clef. Later lessons mix major and minor in any key, widen the range and cut the number of replays.',
    forWho: ['Students who are comfortable with major-key dictation', 'Musicians preparing for advanced aural tests'],
    notFor: ['Beginners to dictation (start with Melodic Dictation Starter)'],
    lessons: [
      md('Minor keys, pitches only', 'pitch', 5, 65, { bars: 2, keyMode: 'minor', keyLevel: 2, level: 1, replays: 5 }),
      md('Minor keys with rhythm', 'full', 5, 60, { bars: 2, keyMode: 'minor', keyLevel: 2, level: 1, replays: 5 }),
      md('Three bars in minor', 'full', 5, 60, { bars: 3, keyMode: 'minor', keyLevel: 2, level: 1, replays: 5 }),
      md('Four bars in minor', 'full', 5, 55, { bars: 4, keyMode: 'minor', keyLevel: 2, level: 1, replays: 5 }),
      md('Leaps in minor', 'full', 5, 55, { bars: 2, keyMode: 'minor', keyLevel: 2, level: 2, replays: 5 }),
      md('Minor in three-four', 'full', 5, 55, { bars: 3, keyMode: 'minor', keyLevel: 2, level: 1, meter: '3/4', replays: 5 }),
      md('Bass clef in minor', 'full', 5, 55, { bars: 2, keyMode: 'minor', keyLevel: 2, level: 1, clef: 'bass', replays: 5 }),
      md('More minor keys', 'full', 5, 55, { bars: 2, keyMode: 'minor', keyLevel: 4, level: 2, replays: 5 }),
      md('Major or minor, any key', 'full', 5, 50, { bars: 2, keyMode: 'any', keyLevel: 4, level: 2, replays: 5 }),
      md('Six-eight in minor', 'full', 5, 50, { bars: 2, keyMode: 'minor', keyLevel: 2, level: 1, meter: '6/8', replays: 5 }),
      md('A wider range in minor', 'full', 5, 50, { bars: 4, keyMode: 'minor', keyLevel: 2, level: 2, range: 'tenth', replays: 5 }),
      md('Four bars, three replays', 'full', 5, 50, { bars: 4, keyMode: 'minor', keyLevel: 2, level: 2, replays: 3 }),
    ],
    bonus: [
      md('Level 3 minor melodies', 'full', 5, 50, { bars: 4, keyMode: 'minor', keyLevel: 2, level: 3, replays: 5 }),
      md('Four bars across a twelfth in minor', 'full', 5, 45, { bars: 4, keyMode: 'minor', keyLevel: 2, level: 2, range: 'twelfth', replays: 3 }),
      at('Two-voice dictation', 'twovoice', 5, 50, { tvLength: 6, firstGiven: true }),
    ],
  },
  {
    id: 'advanced-ear-intensive',
    level: 'Advanced',
    primary: 'atelier',
    tagline: 'Compound intervals, seventh chords in every inversion, secondary dominants, modulations and two-voice dictation.',
    intro: 'Fourteen lessons work through the hardest aural material in the practice room: intervals wider than an octave, all five seventh chords in every inversion, secondary dominants and modulations heard in context, and dictation of two voices at once.',
    forWho: ['Advanced students preparing for demanding aural work', 'Musicians who find the Foundations material too easy'],
    notFor: ['Anyone still learning simple intervals (start with Interval Ear Bootcamp)'],
    lessons: [
      at('Ninths and tenths', 'compound', 10, 75, { compound: ['m9', 'M9', 'm10', 'M10'], cdir: 'ascending', register: 'low' }),
      at('Elevenths and twelfths', 'compound', 10, 75, { compound: ['P11', 'A11', 'P12'], cdir: 'ascending', register: 'low' }),
      at('Thirteenths to the double octave', 'compound', 10, 70, { compound: ['m13', 'M13', 'm14', 'M14', 'P15'], cdir: 'ascending', register: 'low' }),
      at('All compound intervals, ascending', 'compound', 20, 70, { compound: ALL_CMP, cdir: 'ascending', register: 'low' }),
      at('Descending compound intervals', 'compound', 20, 65, { compound: ALL_CMP, cdir: 'descending', register: 'low' }),
      at('Compound intervals together', 'compound', 20, 60, { compound: ALL_CMP, cdir: 'harmonic', register: 'low' }),
      at('Major 7 or dominant 7', 'sevenths', 10, 80, { seventhTypes: ['maj7', 'dom7'], inversions: [0] }),
      at('Minor 7 or half-diminished', 'sevenths', 10, 75, { seventhTypes: ['min7', 'hdim7'], inversions: [0] }),
      at('All five sevenths, root position', 'sevenths', 10, 70, { seventhTypes: SEVENTHS, inversions: [0] }),
      at('Sevenths in first inversion', 'sevenths', 10, 65, { seventhTypes: SEVENTHS, inversions: [0, 1] }),
      at('Sevenths in every inversion', 'sevenths', 20, 60, { seventhTypes: SEVENTHS, inversions: [0, 1, 2, 3] }),
      at('Secondary dominants', 'secondary', 10, 65),
      at('Modulations', 'modulation', 10, 60),
      at('Two-voice dictation', 'twovoice', 5, 55, { tvLength: 6, firstGiven: true }),
    ],
    bonus: [
      at('Compound intervals in the middle register', 'compound', 20, 65, { compound: ALL_CMP, cdir: 'mixed', register: 'mid' }),
      at('Longer two-voice dictation', 'twovoice', 5, 50, { tvLength: 8, firstGiven: true }),
      at('Sevenths with two replays', 'sevenths', 20, 55, { seventhTypes: SEVENTHS, inversions: [0, 1, 2, 3], replays: 2 }),
    ],
  },
  {
    id: 'complete-foundations-course',
    level: 'Beginner',
    primary: 'scale-explorer',
    includesTools: ['note-reader', 'interval-trainer', 'scale-explorer', 'chord-builder', 'rhythm-lab'],
    tagline: 'A 24-lesson course through notes, intervals, scales, chords and rhythm, plus full access to all five Foundations tools.',
    intro: 'The course is the guided route through the Foundations material, in six units of four lessons. Your key also unlocks all five Foundations tools in full, so you can practise freely with any settings between lessons.',
    forWho: ['Beginners who want a clear path through the basics', 'Returning players who want to rebuild their foundations in order'],
    notFor: ['Players who already own the Foundations Bundle and want only free practice'],
    lessons: [
      ...unit('Notes', [
        nr('Treble clef, middle of the staff', 'staff', 20, 85, { clef: 'treble', trebleLow: 'E4', trebleHigh: 'F5' }),
        nr('Bass clef, middle of the staff', 'staff', 20, 85, { clef: 'bass', bassLow: 'G2', bassHigh: 'A3' }),
        nr('Keyboard notes', 'keyboard', 20, 85, { accidentals: true }),
        nr('Fretboard, bass strings', 'fretboard', 20, 80, { strings: [0, 1], fretLow: 0, fretHigh: 12 }),
      ]),
      ...unit('Intervals', [
        iv('Thirds, fifths and octaves', 'ascending', 20, 85, { intervals: ['M3', 'P5', 'P8'] }),
        iv('Major or minor third', 'ascending', 20, 85, { intervals: ['m3', 'M3'] }),
        iv('Fourths, fifths and sixths', 'ascending', 20, 80, { intervals: ['P4', 'P5', 'm6', 'M6'] }),
        iv('All intervals, ascending', 'ascending', 30, 75, { intervals: ALL_IV }),
      ]),
      ...unit('Scales', [
        sc('Build major scales', 'build', 10, 85, { scales: ['major'], keyLevel: 2 }),
        sc('Build minor scales', 'build', 10, 85, { scales: ['naturalMinor', 'harmonicMinor'], keyLevel: 2 }),
        sc('Pentatonic scales', 'build', 10, 85, { scales: ['majorPentatonic', 'minorPentatonic'], keyLevel: 2 }),
        sc('Scales by ear', 'ear', 10, 75, { scales: FIVE_SCALES, keyLevel: 2 }),
      ]),
      ...unit('Chords', [
        ch('Spell major and minor triads', 'spell', 10, 85, { types: ['maj', 'min'], inversions: [0], roots: 'natural' }),
        ch('All four triads on the keyboard', 'build-kb', 10, 80, { types: TRIADS, inversions: [0], roots: 'natural' }),
        ch('Triad quality by ear', 'quality', 10, 75, { types: TRIADS, inversions: [0] }),
        ch('Seventh chords', 'spell', 10, 75, { types: ['maj7', 'dom7', 'min7'], inversions: [0], roots: 'natural' }),
      ]),
      ...unit('Rhythm', [
        rh('A steady pulse', 'pulse', 5, 80, { meter: '4/4', tempo: 80 }),
        rh('Quarter and eighth notes', 'read', 10, 80, { meter: '4/4', level: 2, tempo: 72, window: 'relaxed' }),
        rh('Three-four time', 'read', 10, 75, { meter: '3/4', level: 2, tempo: 76, window: 'relaxed' }),
        rh('Rhythm by ear', 'ear', 10, 75, { meter: '4/4', level: 2, tempo: 80 }),
      ]),
      ...unit('Review', [
        nr('Grand staff with sharps and flats', 'staff', 30, 80, { clef: 'both', accidentals: true }),
        iv('All intervals, descending', 'descending', 30, 70, { intervals: ALL_IV }),
        sc('Scales in more keys', 'build', 20, 80, { scales: FIVE_SCALES, keyLevel: 4 }),
        ch('Triads in every key and inversion', 'build-kb', 20, 75, { types: TRIADS, inversions: [0, 1, 2], roots: 'all' }),
      ]),
    ],
    bonus: [
      nr('Find it on any string', 'find-string', 30, 80, { strings: ALL_STRINGS, fretLow: 0, fretHigh: 12 }),
      iv('All intervals, together', 'harmonic', 30, 70, { intervals: ALL_IV }),
      rh('Dotted rhythms', 'read', 10, 70, { meter: '4/4', level: 3, tempo: 72 }),
    ],
  },
  {
    id: 'complete-musicianship-program',
    level: 'Advanced',
    primary: 'atelier',
    includesTools: ['note-reader', 'interval-trainer', 'scale-explorer', 'chord-builder', 'rhythm-lab', 'progression-lab', 'jazz-harmony', 'melodic-dictation', 'atelier'],
    tagline: 'A 32-lesson program from foundations to advanced aural skills, plus full access to all nine tools.',
    intro: 'Eight units of four lessons take you from reading and intervals through harmony, voice leading, jazz chords, dictation and advanced ear training. Your key also unlocks every tool in the practice room in full, Foundations and Studio Editions alike.',
    forWho: ['Serious students who want one structured path through everything the practice room offers', 'Teachers who want to see every tool and exercise'],
    notFor: ['Beginners who only want the basics (see Complete Foundations Course)'],
    lessons: [
      ...unit('Reading', [
        nr('Grand staff with sharps and flats', 'staff', 30, 85, { clef: 'both', accidentals: true }),
        nr('Staff to keyboard', 'staff-keyboard', 20, 85, { clef: 'both' }),
        nr('The whole fretboard', 'fretboard', 30, 80, { strings: ALL_STRINGS, fretLow: 0, fretHigh: 12, accidentals: true }),
        rh('Dotted rhythms', 'read', 10, 75, { meter: '4/4', level: 3, tempo: 76 }),
      ]),
      ...unit('Intervals and scales', [
        iv('All intervals, mixed directions', 'mixed', 30, 80, { intervals: ALL_IV }),
        sc('All seven modes', 'build', 20, 80, { scales: MODES, keyLevel: 4 }),
        sc('Scales by ear', 'ear', 20, 70, { scales: FIVE_SCALES, keyLevel: 2 }),
        sc('Mode degrees', 'degrees', 20, 75, { scales: MODES, keyLevel: 4 }),
      ]),
      ...unit('Chords', [
        ch('Triads in every key and inversion', 'build-kb', 20, 80, { types: TRIADS, inversions: [0, 1, 2], roots: 'all' }),
        ch('Seventh chords from any root', 'spell', 20, 80, { types: SEVENTHS, inversions: [0], roots: 'all' }),
        ch('Triad quality by ear', 'quality', 20, 75, { types: TRIADS, inversions: [0, 1, 2] }),
        ch('Seventh chords by ear', 'quality', 10, 70, { types: SEVENTHS, inversions: [0] }),
      ]),
      ...unit('Harmony', [
        pg('Roman numeral analysis', 'analysis', 5, 75, { modes: 'both', keyLevel: 4, vocab: 'inversions', length: 6 }),
        pg('Progressions by ear', 'ear', 5, 65, { modes: 'both', keyLevel: 2, vocab: 'triads', length: 6 }),
        pg('Seventh chords in analysis', 'analysis', 5, 70, { modes: 'both', keyLevel: 4, vocab: 'sevenths', length: 8 }),
        pg('Seventh chords by ear', 'ear', 5, 60, { modes: 'major', keyLevel: 2, vocab: 'sevenths', length: 4 }),
      ]),
      ...unit('Voice leading', [
        pg('Four parts in major', 'voice', 3, 70, { modes: 'major', keyLevel: 2, vocab: 'triads', length: 4 }),
        pg('Four parts in minor', 'voice', 3, 65, { modes: 'minor', keyLevel: 2, vocab: 'triads', length: 6 }),
        pg('Four parts with inversions', 'voice', 3, 65, { modes: 'both', keyLevel: 2, vocab: 'inversions', length: 6 }),
        pg('Four parts with sevenths', 'voice', 3, 60, { modes: 'both', keyLevel: 2, vocab: 'sevenths', length: 4 }),
      ]),
      ...unit('Jazz harmony', [
        jz('Every chord family spelled', 'spell', 20, 75, { families: ['sevenths', 'sixths', 'ninths', 'elevenths', 'thirteenths', 'altered'], roots: 'all' }),
        jz('ii–V–I in every key', 'twofive', 10, 70, { twoFiveMode: 'both', voicing: 'A', roots: 'all' }),
        jz('Rootless voicings', 'voicing', 10, 70, { voicing: 'B', roots: 'all' }),
        jz('Extensions by ear', 'extension', 20, 65, { extensions: ['9', 'b9', '#9', '#11', '13', 'b13'] }),
      ]),
      ...unit('Dictation', [
        md('Two bars in major', 'full', 5, 65, { bars: 2, keyMode: 'major', keyLevel: 2, level: 1 }),
        md('Four bars in major', 'full', 5, 55, { bars: 4, keyMode: 'major', keyLevel: 2, level: 2 }),
        md('Minor keys', 'full', 5, 55, { bars: 2, keyMode: 'minor', keyLevel: 2, level: 2 }),
        at('Rhythmic dictation in odd meters', 'rhythm', 5, 65, { meters: ['5/8', '7/8', '6/8'], rlevel: 3 }),
      ]),
      ...unit('Advanced ear', [
        at('Compound intervals', 'compound', 20, 65, { compound: ALL_CMP, cdir: 'mixed' }),
        at('Seventh chords in every inversion', 'sevenths', 20, 60, { seventhTypes: SEVENTHS, inversions: [0, 1, 2, 3] }),
        at('Secondary dominants and modulations', 'secondary', 10, 65),
        at('Two-voice dictation', 'twovoice', 5, 50, { tvLength: 8, firstGiven: true }),
      ]),
    ],
    bonus: [
      at('Modulations', 'modulation', 10, 60),
      md('Level 3 melodies in any key', 'full', 5, 45, { bars: 4, keyMode: 'any', keyLevel: 4, level: 3 }),
      pg('Four parts in every key, warnings off', 'voice', 3, 55, { modes: 'both', keyLevel: 7, vocab: 'inversions', length: 8, showWarnings: false }),
    ],
  },
];

export const COURSE_BY_ID = Object.fromEntries(COURSES.map((c) => [c.id, c]));

/* ------------------------------------------------------------ descriptions */
const EXERCISE_NAMES = {
  'note-reader': { staff: 'Staff notes', fretboard: 'Fretboard notes', 'find-string': 'Find it on the string', keyboard: 'Keyboard notes', 'staff-keyboard': 'Staff to keyboard' },
  'interval-trainer': { ascending: 'Ascending intervals', descending: 'Descending intervals', harmonic: 'Harmonic intervals', mixed: 'Mixed intervals' },
  'scale-explorer': { build: 'Build the scale', ear: 'Scale by ear', degrees: 'Scale degrees', fretboard: 'Fretboard patterns' },
  'chord-builder': { 'build-kb': 'Build on the keyboard', 'build-fb': 'Build on the fretboard', spell: 'Spell the chord', quality: 'Quality by ear', inversion: 'Inversion by ear' },
  'rhythm-lab': { read: 'Read and tap', pulse: 'Steady pulse', ear: 'Rhythm by ear' },
  'progression-lab': { analysis: 'Roman numeral analysis', ear: 'Progressions by ear', voice: 'Voice leading' },
  'jazz-harmony': { spell: 'Spell the chord', extension: 'Extensions by ear', quality: 'Chord quality by ear', twofive: 'ii–V–I in every key', voicing: 'Build the voicing' },
  'melodic-dictation': { full: 'Melodic dictation', pitch: 'Pitch-only dictation' },
  atelier: { compound: 'Compound intervals', sevenths: 'Seventh chords by ear', secondary: 'Secondary dominants', modulation: 'Modulations', twovoice: 'Two-voice dictation', rhythm: 'Rhythmic dictation' },
};
export const TOOL_NAMES = {
  'note-reader': 'Note Reader', 'interval-trainer': 'Interval Ear Trainer', 'scale-explorer': 'Scale & Mode Explorer', 'chord-builder': 'Chord Builder',
  'rhythm-lab': 'Rhythm Lab', 'progression-lab': 'Progression Lab', 'jazz-harmony': 'Jazz Harmony Studio', 'melodic-dictation': 'Melodic Dictation Studio', atelier: 'Atelier Edition',
};
const IV_NAMES = { m2: 'm2', M2: 'M2', m3: 'm3', M3: 'M3', P4: 'P4', A4: 'tritone', P5: 'P5', m6: 'm6', M6: 'M6', m7: 'm7', M7: 'M7', P8: 'octave' };
const SCALE_NAMES = { major: 'major', naturalMinor: 'natural minor', harmonicMinor: 'harmonic minor', melodicMinor: 'melodic minor', dorian: 'Dorian', phrygian: 'Phrygian', lydian: 'Lydian', mixolydian: 'Mixolydian', locrian: 'Locrian', majorPentatonic: 'major pentatonic', minorPentatonic: 'minor pentatonic', blues: 'blues', majorBlues: 'major blues' };
const CHORD_NAMES = { maj: 'major', min: 'minor', dim: 'diminished', aug: 'augmented', maj7: 'major 7', dom7: 'dominant 7', min7: 'minor 7', hdim7: 'half-diminished 7', dim7: 'diminished 7' };
const KEYS = { 2: 'keys with up to 2 sharps or flats', 4: 'keys with up to 4 sharps or flats', 7: 'every key' };
const STRING_NAMES = ['low E', 'A', 'D', 'G', 'B', 'high E'];
const list = (arr) => (arr.length <= 2 ? arr.join(' and ') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]);

export function exerciseName(lesson) {
  return (EXERCISE_NAMES[lesson.tool] || {})[lesson.s.exercise] || lesson.s.exercise;
}

/** A one-line, plain description of what a lesson's settings ask for. */
export function describeLesson(l) {
  const s = l.s;
  const parts = [];
  switch (l.tool) {
    case 'note-reader':
      if (s.exercise === 'staff' || s.exercise === 'staff-keyboard') {
        const clef = s.clef || 'treble';
        if (clef === 'both') parts.push('treble and bass clef');
        else if (clef === 'bass') parts.push(`bass clef${s.bassLow ? `, ${s.bassLow}–${s.bassHigh}` : ''}`);
        else parts.push(`treble clef${s.trebleLow ? `, ${s.trebleLow}–${s.trebleHigh}` : ''}`);
      } else if (s.exercise === 'fretboard' || s.exercise === 'find-string') {
        const st = s.strings || ALL_STRINGS;
        parts.push(st.length === 6 ? 'all strings' : `${list(st.map((i) => STRING_NAMES[i]))} string${st.length > 1 ? 's' : ''}`);
        parts.push(s.fretLow ? `frets ${s.fretLow}–${s.fretHigh}` : `open to fret ${s.fretHigh ?? 12}`);
      }
      parts.push(s.accidentals ? 'with sharps and flats' : 'natural notes');
      break;
    case 'interval-trainer':
      parts.push(list((s.intervals || ALL_IV).map((i) => IV_NAMES[i])));
      if (s.register && s.register !== 'mid') parts.push(`${s.register} register`);
      break;
    case 'scale-explorer':
      parts.push(list((s.scales || []).map((x) => SCALE_NAMES[x])));
      parts.push(KEYS[s.keyLevel || 4]);
      if (s.exercise === 'fretboard') parts.push(s.patterns === 'nps' ? 'three notes per string' : 'box patterns');
      break;
    case 'chord-builder': {
      parts.push(list((s.types || []).map((x) => CHORD_NAMES[x])));
      const inv = s.inversions || [0];
      parts.push(inv.length === 1 && inv[0] === 0 ? 'root position' : 'root position and inversions');
      if (s.roots === 'all') parts.push('any root');
      break;
    }
    case 'rhythm-lab':
      parts.push(`${s.meter || '4/4'}`);
      if (s.exercise !== 'pulse') parts.push(`level ${s.level || 2}`);
      parts.push(`${s.tempo || 80} beats per minute`);
      if (s.bars === 2) parts.push('two bars');
      if (s.window && s.window !== 'standard') parts.push(`${s.window} timing`);
      break;
    case 'progression-lab':
      parts.push(s.modes === 'both' ? 'major and minor' : `${s.modes || 'major'} keys`);
      parts.push({ triads: 'triads', inversions: 'triads with inversions', sevenths: 'with seventh chords' }[s.vocab || 'triads']);
      parts.push(`${s.length || 4} chords`);
      if (s.exercise === 'voice' && s.showWarnings === false) parts.push('no live warnings');
      break;
    case 'jazz-harmony':
      if (s.exercise === 'extension') parts.push(list((s.extensions || []).map((e) => e.replace('b', '♭').replace('#', '♯'))));
      else if (s.exercise === 'voicing' || s.exercise === 'twofive') {
        parts.push({ shell: 'shell voicings', A: 'rootless A voicings', B: 'rootless B voicings' }[s.voicing || 'A']);
        if (s.exercise === 'twofive') parts.push(s.twoFiveMode === 'both' ? 'major and minor' : (s.twoFiveMode || 'major'));
      } else parts.push(list((s.families || []).map((f) => f)));
      parts.push(s.roots === 'natural' ? 'natural roots' : 'any root');
      break;
    case 'melodic-dictation':
      parts.push(`${s.bars || 2} bars`);
      parts.push({ C: 'C major', major: 'major keys', minor: 'minor keys', any: 'major or minor keys' }[s.keyMode || 'C']);
      parts.push(s.meter || '4/4');
      if (s.clef === 'bass') parts.push('bass clef');
      parts.push(`level ${s.level || 1}`);
      parts.push(`${s.replays === 99 ? 'unlimited' : (s.replays || 3)} replays`);
      break;
    case 'atelier':
      if (s.exercise === 'compound') parts.push(list(s.compound || ALL_CMP), s.cdir || 'mixed');
      else if (s.exercise === 'sevenths') parts.push(list((s.seventhTypes || SEVENTHS).map((x) => CHORD_NAMES[x])), (s.inversions || [0]).length > 1 ? 'with inversions' : 'root position');
      else if (s.exercise === 'twovoice') parts.push(`${s.tvLength || 8} notes per voice`);
      else if (s.exercise === 'rhythm') parts.push(list(s.meters || []));
      else if (s.exercise === 'secondary') parts.push('name the applied dominant in a progression');
      else if (s.exercise === 'modulation') parts.push('hear where a progression moves');
      if (s.replays) parts.push(`${s.replays === 99 ? 'unlimited' : s.replays} replays`);
      break;
    default:
  }
  return parts.filter(Boolean).join(' · ');
}

/** Lessons available to a buyer: the main lessons, plus the bonus lessons if they bought that add-on. */
export function courseLessons(course, addons = []) {
  const main = course.lessons.map((l, i) => ({ ...l, key: String(i + 1), n: i + 1, bonus: false }));
  const extra = addons.includes('bonus') ? (course.bonus || []).map((l, i) => ({ ...l, key: 'b' + (i + 1), n: i + 1, bonus: true })) : [];
  return main.concat(extra);
}

/** Tools a course's lessons use, in order of first appearance. */
export function courseTools(course) {
  return [...new Set(course.lessons.concat(course.bonus || []).map((l) => l.tool))];
}
