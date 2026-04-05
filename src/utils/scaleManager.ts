import { KeyMode, Clef } from '../types';
import type { Note } from '../types';
import { getMidiNumber, midiToNote } from './midiNoteMap';

// Chromatic notes in order
const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Interval patterns (in semitones) for major and minor scales
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

/**
 * Generate a major or minor scale starting from a root note
 */
export const generateKeyNotes = (rootNote: string, mode: KeyMode): number[] => {
  const rootIndex = CHROMATIC_NOTES.indexOf(rootNote);
  if (rootIndex === -1) {
    console.error(`Invalid root note: ${rootNote}`);
    return [];
  }

  const intervals = mode === KeyMode.MAJOR ? MAJOR_INTERVALS : MINOR_INTERVALS;
  const notes: number[] = [];

  // Generate notes for 3 octaves (C4 to C6 range)
  for (let octave = 4; octave <= 6; octave++) {
    for (const interval of intervals) {
      const noteIndex = (rootIndex + interval) % 12;
      const noteName = CHROMATIC_NOTES[noteIndex];
      const midiNum = getMidiNumber(noteName, octave);
      notes.push(midiNum);
    }
  }

  return notes;
};

/**
 * Get all MIDI notes for a given key, optionally including accidentals
 */
export const getKeyNotes = (keyRoot: string, keyMode: KeyMode, includeAccidentals: boolean = false): number[] => {
  const baseNotes = generateKeyNotes(keyRoot, keyMode);
  
  if (!includeAccidentals) {
    return baseNotes;
  }

  // Add all chromatic notes (sharps/flats) between the natural notes
  const notesWithAccidentals: number[] = [];
  for (let i = 0; i < baseNotes.length; i++) {
    notesWithAccidentals.push(baseNotes[i]);
    
    // Check if there's a next note and if there's room for accidentals
    if (i < baseNotes.length - 1) {
      const currentNote = baseNotes[i];
      const nextNote = baseNotes[i + 1];
      
      // Add all semitones between current and next note
      for (let semitone = currentNote + 1; semitone < nextNote; semitone++) {
        notesWithAccidentals.push(semitone);
      }
    }
  }
  
  return notesWithAccidentals;
};

/**
 * Get all MIDI notes for a given scale, optionally including accidentals (legacy)
 */
export const getScaleNotes = (scale: string, includeAccidentals: boolean = false): number[] => {
  // For legacy support, map old scale names to key root/mode
  const scaleMap: Record<string, {keyRoot: string, keyMode: KeyMode}> = {
    'C_MAJOR': { keyRoot: 'C', keyMode: KeyMode.MAJOR },
    'A_MINOR': { keyRoot: 'A', keyMode: KeyMode.MINOR },
  };
  
  const scaleConfig = scaleMap[scale];
  if (!scaleConfig) {
    return [];
  }
  
  return getKeyNotes(scaleConfig.keyRoot, scaleConfig.keyMode, includeAccidentals);
};

/**
 * Get a random note from the specified key
 */
export const getRandomKeyNote = (
  keyRoot: string,
  keyMode: KeyMode,
  clef: Clef = Clef.TREBLE,
  includeAccidentals: boolean = false,
): Note | null => {
  const midiNumbers = getKeyNotes(keyRoot, keyMode, includeAccidentals);
  if (midiNumbers.length === 0) return null;

  const randomMidiNumber = midiNumbers[Math.floor(Math.random() * midiNumbers.length)];
  return midiToNote(randomMidiNumber, clef);
};

/**
 * Get a random note from the specified scale (legacy)
 */
export const getRandomScaleNote = (
  scale: string,
  clef: Clef = Clef.TREBLE,
  includeAccidentals: boolean = false,
): Note | null => {
  const midiNumbers = getScaleNotes(scale, includeAccidentals);
  if (midiNumbers.length === 0) return null;

  const randomMidiNumber = midiNumbers[Math.floor(Math.random() * midiNumbers.length)];
  return midiToNote(randomMidiNumber, clef);
};

