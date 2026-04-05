import type { Note, MidiNoteEvent } from '../types';
import { Scale } from '../types';
import { getMidiNote, getNoteDisplayName } from './midiNoteMap';
import { isNoteInScale } from './scaleManager';

/**
 * Check if two notes are the same (exact match - same MIDI number)
 */
export const notesMatch = (note1: Note | null, note2: Note | null): boolean => {
  if (!note1 || !note2) return false;
  return note1.midiNumber === note2.midiNumber;
};

/**
 * Check if two notes are the same pitch class (ignoring octave)
 */
export const notePitchClassMatch = (note1: Note | null, note2: Note | null): boolean => {
  if (!note1 || !note2) return false;
  return note1.name === note2.name && note1.isSharp === note2.isSharp;
};

/**
 * Validate if a played MIDI note matches the target note
 * Uses strict mode: exact MIDI number match required
 */
export const validateNotePlay = (targetNote: Note, playedMidiNumber: number): boolean => {
  return targetNote.midiNumber === playedMidiNumber;
};

/**
 * Get feedback message based on validation
 */
export const getValidationFeedback = (
  isCorrect: boolean,
  targetNote: Note,
  playedNote: Note | null,
): string => {
  if (isCorrect) {
    return 'Correct! 🎉';
  }
  if (!playedNote) {
    return 'Please play a note';
  }
  return `Try again! You played ${getNoteDisplayName(playedNote)}, expected ${getNoteDisplayName(targetNote)}`;
};

/**
 * Convert MIDI note event to Note object
 * Returns null if MIDI note doesn't map to a valid note
 */
export const midiEventToNote = (event: MidiNoteEvent, clef: any): Note | null => {
  const midiMap = getMidiNote(event.noteNumber);
  if (!midiMap) return null;

  const { noteName, octave } = midiMap;
  const isSharp = noteName.includes('#');
  const isFlat = noteName.includes('b');
  const baseNoteName = noteName.replace('#', '').replace('b', '');

  const clefKey = clef.toString().toLowerCase();
  const staffPositionKey = clefKey === 'clef.treble' ? 'treble' : clefKey === 'clef.bass' ? 'bass' : 'alto';

  return {
    name: baseNoteName,
    octave,
    midiNumber: event.noteNumber,
    isSharp,
    isFlat,
    staffPosition: (midiMap.staffPosition as any)[staffPositionKey] || 0,
  };
};

/**
 * Filter valid note range for a scale
 * Removes MIDI notes that are outside the typical range for the scale
 */
export const isValidScaleNote = (midiNumber: number, scale: Scale): boolean => {
  return isNoteInScale(midiNumber, scale);
};

/**
 * Get a human-readable interval name between two notes
 */
export const getIntervalName = (note1: Note, note2: Note): string => {
  const semitones = Math.abs(note2.midiNumber - note1.midiNumber);
  const intervals: Record<number, string> = {
    0: 'Unison',
    1: 'Minor Second',
    2: 'Major Second',
    3: 'Minor Third',
    4: 'Major Third',
    5: 'Perfect Fourth',
    6: 'Tritone',
    7: 'Perfect Fifth',
    8: 'Minor Sixth',
    9: 'Major Sixth',
    10: 'Minor Seventh',
    11: 'Major Seventh',
    12: 'Octave',
  };
  return intervals[semitones % 12] || 'Unknown Interval';
};

/**
 * Check if note is within a reasonable playing range
 * Treble clef typically C3 to C6
 */
export const isInReasonableRange = (midiNumber: number): boolean => {
  return midiNumber >= 36 && midiNumber <= 84; // C3 to C6
};

/**
 * Get the note name with proper enharmonic spelling
 * @param midiNumber - MIDI note number
 * @param preferFlat - if true, prefer flats (Bb) over sharps (A#)
 */
export const getNoteNameWithEnharmonic = (midiNumber: number, preferFlat = false): string => {
  const midiMap = getMidiNote(midiNumber);
  if (!midiMap) return 'Unknown';

  const { noteName, octave } = midiMap;
  let displayName = noteName;

  // If we prefer flats but have sharps, convert
  if (preferFlat && noteName.includes('#')) {
    const flatMap = {
      'C#': 'Db',
      'D#': 'Eb',
      'F#': 'Gb',
      'G#': 'Ab',
      'A#': 'Bb',
    };
    displayName = flatMap[noteName as keyof typeof flatMap] || noteName;
  }

  return `${displayName}${octave}`;
};
