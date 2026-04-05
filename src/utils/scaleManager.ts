import { Scale, Clef } from '../types';
import type { Note } from '../types';
import { getMidiNumber, midiToNote } from './midiNoteMap';

// Define notes in each scale (using MIDI numbers for treble clef)
export const SCALE_DEFINITIONS: Record<Scale, number[]> = {
  [Scale.C_MAJOR]: [
    getMidiNumber('C', 3), // C3
    getMidiNumber('D', 3),
    getMidiNumber('E', 3),
    getMidiNumber('F', 3),
    getMidiNumber('G', 3),
    getMidiNumber('A', 3),
    getMidiNumber('B', 3),
    getMidiNumber('C', 4),
    getMidiNumber('D', 4),
    getMidiNumber('E', 4),
    getMidiNumber('F', 4),
    getMidiNumber('G', 4),
    getMidiNumber('A', 4),
    getMidiNumber('B', 4),
    getMidiNumber('C', 5),
  ],
  [Scale.A_MINOR]: [
    getMidiNumber('A', 2),
    getMidiNumber('B', 2),
    getMidiNumber('C', 3),
    getMidiNumber('D', 3),
    getMidiNumber('E', 3),
    getMidiNumber('F', 3),
    getMidiNumber('G', 3),
    getMidiNumber('A', 3),
    getMidiNumber('B', 3),
    getMidiNumber('C', 4),
    getMidiNumber('D', 4),
    getMidiNumber('E', 4),
    getMidiNumber('F', 4),
    getMidiNumber('G', 4),
    getMidiNumber('A', 4),
  ],
};

/**
 * Get all MIDI notes for a given scale
 */
export const getScaleNotes = (scale: Scale): number[] => {
  return SCALE_DEFINITIONS[scale] || [];
};

/**
 * Get a random note from the specified scale
 */
export const getRandomScaleNote = (
  scale: Scale,
  clef: Clef = Clef.TREBLE,
): Note | null => {
  const midiNumbers = getScaleNotes(scale);
  if (midiNumbers.length === 0) return null;

  const randomMidiNumber = midiNumbers[Math.floor(Math.random() * midiNumbers.length)];
  return midiToNote(randomMidiNumber, clef);
};

/**
 * Get multiple random notes from a scale
 */
export const getRandomScaleNotes = (
  scale: Scale,
  count: number,
  clef: Clef = Clef.TREBLE,
): Note[] => {
  const notes: Note[] = [];
  for (let i = 0; i < count; i++) {
    const note = getRandomScaleNote(scale, clef);
    if (note) notes.push(note);
  }
  return notes;
};

/**
 * Check if a MIDI note is in the specified scale
 */
export const isNoteInScale = (midiNumber: number, scale: Scale): boolean => {
  const scaleNotes = getScaleNotes(scale);
  // Allow any octave transposition of the note
  const noteClassInScale = scaleNotes.some(note => note % 12 === midiNumber % 12);
  return noteClassInScale;
};

/**
 * Get scale display name
 */
export const getScaleDisplayName = (scale: Scale): string => {
  const names: Record<Scale, string> = {
    [Scale.C_MAJOR]: 'C Major',
    [Scale.A_MINOR]: 'A Minor',
  };
  return names[scale] || 'Unknown Scale';
};

/**
 * Get scale description
 */
export const getScaleDescription = (scale: Scale): string => {
  const descriptions: Record<Scale, string> = {
    [Scale.C_MAJOR]: 'No sharps or flats - natural notes only',
    [Scale.A_MINOR]: 'Relative minor to C Major',
  };
  return descriptions[scale] || '';
};
