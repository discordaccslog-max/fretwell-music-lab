<?php
// Server-side product catalogue — the single source of truth for prices at checkout.
// Mirrors js/products.js. Never trust client-sent prices.

$PRODUCTS = [
    'note-reader'        => ['name' => 'Note Reader: Staff & Fretboard Trainer', 'price' => 10, 'addons' => []],
    'interval-trainer'   => ['name' => 'Interval Ear Trainer',                   'price' => 14, 'addons' => []],
    'scale-explorer'     => ['name' => 'Scale & Mode Explorer',                  'price' => 16, 'addons' => []],
    'chord-builder'      => ['name' => 'Chord Builder & Ear Trainer',            'price' => 19, 'addons' => []],
    'rhythm-lab'         => ['name' => 'Rhythm Lab',                             'price' => 22, 'addons' => []],
    'foundations-bundle'  => ['name' => 'Foundations Bundle',                     'price' => 49, 'addons' => []],
    'progression-lab'    => ['name' => 'Progression Lab: Harmony & Voice Leading','price' => 35, 'addons' => []],
    'jazz-harmony'       => ['name' => 'Jazz Harmony Studio',                    'price' => 45, 'addons' => []],
    'melodic-dictation'  => ['name' => 'Melodic Dictation Studio',               'price' => 55, 'addons' => []],
    'atelier'            => ['name' => 'Atelier Edition: Advanced Aural Skills',  'price' => 75, 'addons' => []],

    // Courses (with optional add-on prices)
    'treble-clef-sprint'          => ['name' => 'Treble Clef Sprint',              'price' => 20, 'addons' => ['planner' => 2, 'guide' => 3, 'bonus' => 4]],
    'bass-clef-sprint'            => ['name' => 'Bass Clef Sprint',                'price' => 20, 'addons' => ['planner' => 2, 'guide' => 3, 'bonus' => 4, 'export' => 1]],
    'fretboard-map'               => ['name' => 'Fretboard Map',                   'price' => 24, 'addons' => ['planner' => 2, 'guide' => 3, 'bonus' => 5]],
    'piano-keys-fluency'          => ['name' => 'Piano Keys Fluency',              'price' => 22, 'addons' => ['planner' => 1, 'guide' => 2, 'bonus' => 3, 'export' => 1]],
    'interval-ear-bootcamp'       => ['name' => 'Interval Ear Bootcamp',           'price' => 29, 'addons' => ['planner' => 2, 'guide' => 3, 'bonus' => 4, 'export' => 2]],
    'major-minor-ear'             => ['name' => 'Major & Minor Ear Starter',       'price' => 25, 'addons' => ['planner' => 1, 'guide' => 2, 'bonus' => 4]],
    'scale-workout-guitar'        => ['name' => 'Scale Workout for Guitar',        'price' => 32, 'addons' => ['planner' => 2, 'guide' => 3, 'bonus' => 5, 'export' => 2]],
    'modes-made-clear'            => ['name' => 'Modes Made Clear',                'price' => 36, 'addons' => ['planner' => 2, 'guide' => 3, 'bonus' => 5]],
    'pentatonic-blues-path'       => ['name' => 'Pentatonic & Blues Path',         'price' => 27, 'addons' => ['planner' => 1, 'guide' => 2, 'bonus' => 3, 'export' => 1]],
    'triads-everywhere'           => ['name' => 'Triads Everywhere',               'price' => 30, 'addons' => ['planner' => 2, 'guide' => 3, 'bonus' => 4, 'export' => 2]],
    'seventh-chord-essentials'    => ['name' => 'Seventh Chord Essentials',        'price' => 38, 'addons' => ['planner' => 2, 'guide' => 4, 'bonus' => 5, 'export' => 2]],
    'rhythm-reading-foundations'  => ['name' => 'Rhythm Reading Foundations',       'price' => 26, 'addons' => ['planner' => 1, 'guide' => 2, 'bonus' => 3]],
    'odd-meter-workshop'          => ['name' => 'Odd Meter Workshop',              'price' => 42, 'addons' => ['planner' => 2, 'guide' => 3, 'bonus' => 5, 'export' => 2]],
    'steady-time-builder'         => ['name' => 'Steady Time Builder',             'price' => 21, 'addons' => ['planner' => 1, 'guide' => 2, 'bonus' => 3, 'export' => 1]],
    'diatonic-harmony-course'     => ['name' => 'Diatonic Harmony Course',         'price' => 55, 'addons' => ['planner' => 2, 'guide' => 4, 'bonus' => 5, 'export' => 3]],
    'four-part-writing'           => ['name' => 'Four-Part Writing Workshop',      'price' => 68, 'addons' => ['planner' => 2, 'guide' => 4, 'bonus' => 5, 'export' => 3]],
    'hearing-progressions'        => ['name' => 'Hearing Chord Progressions',      'price' => 48, 'addons' => ['planner' => 2, 'guide' => 3, 'bonus' => 5, 'export' => 2]],
    'jazz-chord-spelling'         => ['name' => 'Jazz Chord Spelling Drills',      'price' => 40, 'addons' => ['planner' => 1, 'guide' => 3, 'bonus' => 4, 'export' => 2]],
    'two-five-one-workout'        => ['name' => 'ii–V–I Workout in Every Key',    'price' => 50, 'addons' => ['planner' => 2, 'guide' => 3, 'bonus' => 5, 'export' => 2]],
    'jazz-ear-extensions'         => ['name' => 'Jazz Ear: Extensions & Alterations','price' => 58, 'addons' => ['planner' => 2, 'guide' => 4, 'bonus' => 5, 'export' => 3]],
    'melodic-dictation-starter'   => ['name' => 'Melodic Dictation Starter',       'price' => 45, 'addons' => ['planner' => 2, 'guide' => 3, 'bonus' => 5, 'export' => 2]],
    'minor-key-dictation'         => ['name' => 'Minor-Key Dictation',             'price' => 62, 'addons' => ['planner' => 2, 'guide' => 4, 'bonus' => 5, 'export' => 3]],
    'advanced-ear-intensive'      => ['name' => 'Advanced Ear Intensive',          'price' => 78, 'addons' => ['planner' => 2, 'guide' => 4, 'bonus' => 5, 'export' => 3]],
    'complete-foundations-course'  => ['name' => 'Complete Foundations Course',     'price' => 95, 'addons' => ['planner' => 3, 'guide' => 4, 'bonus' => 5, 'export' => 3]],
    'complete-musicianship-program'=> ['name' => 'Complete Musicianship Program', 'price' => 145, 'addons' => ['planner' => 3, 'guide' => 5, 'bonus' => 5, 'export' => 4]],
];

function lookup_product($id) {
    global $PRODUCTS;
    return isset($PRODUCTS[$id]) ? $PRODUCTS[$id] : null;
}

function calc_line_total($id, $addon_ids = []) {
    $p = lookup_product($id);
    if (!$p) return 0;
    $total = $p['price'];
    foreach ($addon_ids as $a) {
        if (isset($p['addons'][$a])) {
            $total += $p['addons'][$a];
        }
    }
    return $total;
}
