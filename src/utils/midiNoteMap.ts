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
 * Accidentals are deterministically represented as sharp or flat based on MIDI number
 */
export const midiToNote = (midiNumber: number, clef: Clef = Clef.TREBLE): Note | null => {
  const midiMap = getMidiNote(midiNumber);
  if (!midiMap) return null;

  const { noteName, octave } = midiMap;
  let displayNoteName = noteName;
  
  // Convert sharps to their enharmonic flat equivalents based on MIDI number parity
  const sharpToFlatMap: Record<string, string> = {
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab',
    'A#': 'Bb',
  };
  
  // Use flats for odd MIDI numbers, sharps for even (ensures variety and consistency)
  if (noteName in sharpToFlatMap && midiNumber % 2 === 1) {
    displayNoteName = sharpToFlatMap[noteName as keyof typeof sharpToFlatMap];
  }
  
  const isSharp = displayNoteName.includes('#');
  const isFlat = displayNoteName.includes('b');
  const baseNoteName = displayNoteName.replace('#', '').replace('b', '');

  const staffPositionMap = {
    [Clef.TREBLE]: midiMap.staffPosition.treble,
    [Clef.BASS]: midiMap.staffPosition.bass,
    [Clef.GRAND]: midiMap.staffPosition.treble,
    [Clef.ALTO]: midiMap.staffPosition.alto,
  };

  const staffPosition = staffPositionMap[clef];

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
