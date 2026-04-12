import type { MidiNoteMap, Note } from '../types';
import { Clef } from '../types';

// Complete MIDI note mapping (0-127)
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Create full MIDI note map
export const createMidiNoteMap = (): Map<number, MidiNoteMap> => {
  const map = new Map<number, MidiNoteMap>();

  const letterOffsets: Record<string, number> = {
    C: 0,
    D: 1,
    E: 2,
    F: 3,
    G: 4,
    A: 5,
    B: 6,
  };

  const getDiatonicIndex = (noteName: string, octave: number): number => {
    const base = noteName.replace('#', '').replace('b', '');
    const index = letterOffsets[base];
    if (index === undefined) {
      throw new Error(`Invalid note name: ${noteName}`);
    }
    return octave * 7 + index;
  };

  const trebleRef = getDiatonicIndex('E', 4); // E4 on bottom line
  const bassRef = getDiatonicIndex('G', 2); // G2 on bottom line
  const altoRef = getDiatonicIndex('F', 3); // F3 on bottom line

  for (let midiNumber = 0; midiNumber < 128; midiNumber++) {
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteIndex = midiNumber % 12;
    const noteName = NOTE_NAMES[noteIndex];

    // A4 = 440Hz, A is MIDI note 69
    const frequency = 440 * Math.pow(2, (midiNumber - 69) / 12);

    const naturalIndex = getDiatonicIndex(noteName, octave);
    const treblePosition = naturalIndex - trebleRef;
    const bassPosition = naturalIndex - bassRef;
    const altoPosition = naturalIndex - altoRef;

    map.set(midiNumber, {
      noteNumber: midiNumber,
      noteName,
      octave,
      frequency,
      staffPosition: {
        treble: treblePosition,
        bass: bassPosition,
        alto: altoPosition,
      },
    });
  }

  return map;
};

export const midiNoteMapInstance = createMidiNoteMap();

/**
 * Get note information from MIDI number
 */
export const getMidiNote = (midiNumber: number): MidiNoteMap | undefined => {
  return midiNoteMapInstance.get(midiNumber);
};

/**
 * Get MIDI number from note name and octave
 * @param noteName - e.g., "C", "C#", "D", "D#", etc.
 * @param octave - MIDI octave (0-8)
 */
export const getMidiNumber = (noteName: string, octave: number): number => {
  const noteIndex = NOTE_NAMES.indexOf(noteName);
  if (noteIndex === -1) {
    throw new Error(`Invalid note name: ${noteName}`);
  }
  if (octave < 0 || octave > 8) {
    throw new Error(`Invalid octave: ${octave}`);
  }
  return (octave + 1) * 12 + noteIndex;
};

/**
 * Convert MIDI note to Note object
 * When preferFlats is true, accidentals render as flats (Ab, Bb, etc.).
 * When false, they render as sharps (G#, A#, etc.).
 * When undefined, falls back to MIDI-number parity heuristic.
 * When keyRoot/keyMode are provided, accidentals covered by the key signature
 * are suppressed (no ♯/♭ shown) and positioned on the correct letter's staff line.
 */
export const midiToNote = (
  midiNumber: number,
  clef: Clef = Clef.TREBLE,
  preferFlats?: boolean,
  keyRoot?: string,
  keyMode?: string,
): Note | null => {
  const midiMap = getMidiNote(midiNumber);
  if (!midiMap) return null;

  const { noteName, octave } = midiMap;
  let displayNoteName = noteName;
  
  const sharpToFlatMap: Record<string, string> = {
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab',
    'A#': 'Bb',
  };

  const isAccidentalNote = noteName in sharpToFlatMap;
  const noteClass = midiNumber % 12;

  // Check if this accidental is covered by the key signature
  let suppressAccidental = false;
  let isFlatSpelling = false;

  if (isAccidentalNote && keyRoot && keyMode) {
    const keySig = getKeySignatureAccidentals(keyRoot, keyMode);
    if (keySig.classes.has(noteClass)) {
      suppressAccidental = true;
      if (keySig.type === 'flat') {
        displayNoteName = sharpToFlatMap[noteName as keyof typeof sharpToFlatMap];
        isFlatSpelling = true;
      }
      // For sharp key sigs, keep the sharp name (position is already correct)
    }
  }

  // If not suppressed by key sig, apply preferFlats logic
  if (isAccidentalNote && !suppressAccidental) {
    const useFlat = preferFlats !== undefined ? preferFlats : (midiNumber % 2 === 1);
    if (useFlat) {
      displayNoteName = sharpToFlatMap[noteName as keyof typeof sharpToFlatMap];
      isFlatSpelling = true;
    }
  }
  
  const isSharp = suppressAccidental ? false : displayNoteName.includes('#');
  const isFlat = suppressAccidental ? false : displayNoteName.includes('b');
  const baseNoteName = displayNoteName.replace('#', '').replace('b', '');

  const staffPositionMap = {
    [Clef.TREBLE]: midiMap.staffPosition.treble,
    [Clef.BASS]: midiMap.staffPosition.bass,
    [Clef.GRAND]: midiMap.staffPosition.treble,
    [Clef.ALTO]: midiMap.staffPosition.alto,
  };

  // When using flat spelling, the midiMap position is based on the sharp note (e.g. G for G#)
  // but we need the flat letter's position (e.g. A for Ab), which is +1 diatonic step
  let staffPosition = staffPositionMap[clef];
  if (isFlatSpelling) {
    staffPosition += 1;
  }

  return {
    name: baseNoteName,
    octave,
    midiNumber,
    isSharp,
    isFlat,
    staffPosition,
    ledgerLine: Math.abs(staffPosition) > 5 ? Math.ceil(Math.abs(staffPosition) / 2) : undefined,
  };
};

/**
 * Get the set of MIDI note classes (0-11) that are accidentals in the key signature.
 */
// Sharp order: F# C# G# D# A# E# B#
const SHARP_ORDER_CLASSES = [6, 1, 8, 3, 10, 5, 0];
// Flat order: Bb Eb Ab Db Gb Cb Fb
const FLAT_ORDER_CLASSES = [10, 3, 8, 1, 6, 0, 5];

const SHARP_KEY_COUNT: Record<string, number> = {
  'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7,
};
const FLAT_KEY_COUNT: Record<string, number> = {
  'C': 0, 'F': 1, 'Bb': 2, 'Eb': 3, 'Ab': 4, 'Db': 5, 'Gb': 6, 'Cb': 7,
};
const MINOR_TO_MAJOR_MAP: Record<string, string> = {
  'A': 'C', 'E': 'G', 'B': 'D', 'F#': 'A', 'C#': 'E', 'G#': 'B', 'D#': 'F#', 'A#': 'C#',
  'D': 'F', 'G': 'Bb', 'C': 'Eb', 'F': 'Ab', 'Bb': 'Db', 'Eb': 'Gb', 'Ab': 'Cb',
};

function getKeySignatureAccidentals(keyRoot: string, keyMode: string): { classes: Set<number>; type: 'sharp' | 'flat' | 'none' } {
  const majorKey = keyMode === 'MINOR' ? (MINOR_TO_MAJOR_MAP[keyRoot] || 'C') : keyRoot;
  if (majorKey in SHARP_KEY_COUNT && SHARP_KEY_COUNT[majorKey] > 0) {
    const count = SHARP_KEY_COUNT[majorKey];
    return { classes: new Set(SHARP_ORDER_CLASSES.slice(0, count)), type: 'sharp' };
  }
  if (majorKey in FLAT_KEY_COUNT && FLAT_KEY_COUNT[majorKey] > 0) {
    const count = FLAT_KEY_COUNT[majorKey];
    return { classes: new Set(FLAT_ORDER_CLASSES.slice(0, count)), type: 'flat' };
  }
  return { classes: new Set(), type: 'none' };
}

/**
 * Determine whether a key uses flats for accidentals
 */
const FLAT_MAJOR_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']);
const FLAT_MINOR_ROOTS = new Set(['D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab']);

export const keyUsesFlats = (keyRoot: string, keyMode: string): boolean => {
  if (keyMode === 'MINOR') return FLAT_MINOR_ROOTS.has(keyRoot);
  return FLAT_MAJOR_KEYS.has(keyRoot);
};

/**
 * Get the display name of a note (e.g., "C#4", "Db4")
 */
export const getNoteDisplayName = (note: Note, useFlat = false): string => {
  let accidental = '';
  if (note.isSharp) {
    accidental = useFlat ? 'b' : '#';
  }
  return `${note.name}${accidental}${note.octave}`;
};

/**
 * Get staff position from MIDI number
 */
export const getStaffPosition = (midiNumber: number, clef: Clef): number | null => {
  const midiMap = getMidiNote(midiNumber);
  if (!midiMap) return null;

  const positionMap = {
    [Clef.TREBLE]: midiMap.staffPosition.treble,
    [Clef.BASS]: midiMap.staffPosition.bass,
    [Clef.GRAND]: midiMap.staffPosition.treble,
    [Clef.ALTO]: midiMap.staffPosition.alto,
  };

  return positionMap[clef];
};

/**
 * Get treble clef range for a specific scale
 * C major: C3 (MIDI 36) to C6 (MIDI 84)
 * A minor: A2 (MIDI 33) to A5 (MIDI 81)
 */
export const getTrebleClefRange = (): { min: number; max: number } => {
  return {
    min: getMidiNumber('C', 3), // MIDI 36
    max: getMidiNumber('C', 6), // MIDI 84
  };
};

/**
 * Check if a MIDI note is in treble clef range
 */
export const isInTrebleRange = (midiNumber: number): boolean => {
  const range = getTrebleClefRange();
  return midiNumber >= range.min && midiNumber <= range.max;
};
