import type { Note, Difficulty } from '../types';
import { Clef } from '../types';
import { getKeyNotes } from './scaleManager';
import { midiToNote, keyUsesFlats } from './midiNoteMap';

// --- Interval weights (in scale degrees) ---
// Positive = up, negative = down. Weights determine selection probability.
const INTERVAL_WEIGHTS: [number, number][] = [
  [-2, 0.12],
  [-1, 0.23],
  [1, 0.23],
  [2, 0.12],
  [-3, 0.06],
  [3, 0.06],
  [-4, 0.04],
  [4, 0.04],
  [-5, 0.02],
  [5, 0.02],
  [-7, 0.01],
  [7, 0.01],
  // Octave jumps (rare)
  [-8, 0.005],
  [8, 0.005],
];

// Phrase contour types
type Contour = 'ascending' | 'descending' | 'arch' | 'valley';

interface GeneratorState {
  scaleNotes: number[]; // sorted MIDI numbers for the scale within range
  anchorIndex: number; // current index into scaleNotes around which we generate
  phraseRemaining: number; // notes left in current phrase
  phraseContour: Contour;
  phraseStep: number; // current step within phrase
  phraseLength: number; // total length of current phrase
  lastInterval: number; // last interval used (for jump recovery)
  previousMotif: number[] | null; // previous phrase's scale indices for motif repetition
}

const CONTOURS: Contour[] = ['ascending', 'descending', 'arch', 'valley'];
const ANCHOR_WINDOW = 7; // scale degrees on each side of anchor
const POSITION_SHIFT_CHANCE = 0.10;
const MOTIF_REPEAT_CHANCE = 0.20;

function weightedChoice(weights: [number, number][]): number {
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [value, weight] of weights) {
    r -= weight;
    if (r <= 0) return value;
  }
  return weights[0][0];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getRange(difficulty: Difficulty): { min: number; max: number } {
  if (difficulty.clef === Clef.BASS) {
    return { min: difficulty.bassMinNoteNumber, max: difficulty.bassMaxNoteNumber };
  }
  if (difficulty.clef === Clef.TREBLE || difficulty.clef === Clef.ALTO) {
    return { min: difficulty.trebleMinNoteNumber, max: difficulty.trebleMaxNoteNumber };
  }
  // Grand staff: use full span
  return {
    min: Math.min(difficulty.bassMinNoteNumber, difficulty.trebleMinNoteNumber),
    max: Math.max(difficulty.bassMaxNoteNumber, difficulty.trebleMaxNoteNumber),
  };
}

function buildScaleArray(difficulty: Difficulty): number[] {
  const allNotes = getKeyNotes(difficulty.keyRoot, difficulty.keyMode, difficulty.includeAccidentals);
  const { min, max } = getRange(difficulty);
  return allNotes.filter(n => n >= min && n <= max).sort((a, b) => a - b);
}

function findClosestIndex(scaleNotes: number[], midiNumber: number): number {
  let best = 0;
  let bestDist = Math.abs(scaleNotes[0] - midiNumber);
  for (let i = 1; i < scaleNotes.length; i++) {
    const dist = Math.abs(scaleNotes[i] - midiNumber);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function initGeneratorState(difficulty: Difficulty): GeneratorState {
  const scaleNotes = buildScaleArray(difficulty);
  // Start anchor at the center of the range
  const anchorIndex = Math.floor(scaleNotes.length / 2);
  return {
    scaleNotes,
    anchorIndex,
    phraseRemaining: 0,
    phraseContour: 'ascending',
    phraseStep: 0,
    phraseLength: 0,
    lastInterval: 0,
    previousMotif: null,
  };
}

function startNewPhrase(gs: GeneratorState): void {
  gs.phraseLength = 3 + Math.floor(Math.random() * 6); // 3-8 notes
  gs.phraseRemaining = gs.phraseLength;
  gs.phraseStep = 0;
  gs.phraseContour = CONTOURS[Math.floor(Math.random() * CONTOURS.length)];
}

function getDirectionBias(gs: GeneratorState): number {
  const { phraseContour, phraseStep, phraseLength } = gs;
  const progress = phraseLength > 1 ? phraseStep / (phraseLength - 1) : 0.5;

  switch (phraseContour) {
    case 'ascending': return 1;
    case 'descending': return -1;
    case 'arch': return progress < 0.5 ? 1 : -1;
    case 'valley': return progress < 0.5 ? -1 : 1;
    default: return 1;
  }
}

function applyBoundaryGravity(
  currentIndex: number,
  scaleLength: number,
  interval: number,
): number {
  // If we're near the top, discourage going further up
  const topThreshold = scaleLength - 3;
  const bottomThreshold = 2;

  if (currentIndex >= topThreshold && interval > 0) {
    // Flip direction with high probability
    return Math.random() < 0.8 ? -Math.abs(interval) : interval;
  }
  if (currentIndex <= bottomThreshold && interval < 0) {
    return Math.random() < 0.8 ? Math.abs(interval) : interval;
  }
  return interval;
}

function pickInterval(gs: GeneratorState, currentIndex: number): number {
  const directionBias = getDirectionBias(gs);

  // Build biased weights: if direction is "up", favour positive intervals
  const biasedWeights: [number, number][] = INTERVAL_WEIGHTS.map(([interval, weight]) => {
    const sameDirection = (interval > 0 && directionBias > 0) || (interval < 0 && directionBias < 0);
    return [interval, sameDirection ? weight * 2.0 : weight * 0.5];
  });

  let interval = weightedChoice(biasedWeights);

  // Jump recovery: if last interval was a 5th+ jump, force stepwise in opposite direction
  if (Math.abs(gs.lastInterval) >= 5) {
    const recoveryDir = gs.lastInterval > 0 ? -1 : 1;
    interval = recoveryDir * (Math.random() < 0.5 ? 1 : 2);
  }

  // Boundary gravity
  interval = applyBoundaryGravity(currentIndex, gs.scaleNotes.length, interval);

  // Anchor window: discourage straying too far from anchor
  const targetIndex = currentIndex + interval;
  const distFromAnchor = Math.abs(targetIndex - gs.anchorIndex);
  if (distFromAnchor > ANCHOR_WINDOW) {
    // Pull back toward anchor
    const pullDirection = targetIndex > gs.anchorIndex ? -1 : 1;
    interval = pullDirection * Math.min(Math.abs(interval), 2);
  }

  return interval;
}

function maybeShiftAnchor(gs: GeneratorState): void {
  if (Math.random() < POSITION_SHIFT_CHANCE) {
    const shift = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.floor(Math.random() * 3)); // ±2-4
    gs.anchorIndex = clamp(
      gs.anchorIndex + shift,
      ANCHOR_WINDOW,
      gs.scaleNotes.length - ANCHOR_WINDOW - 1,
    );
  }
}

function generateNextIndex(gs: GeneratorState, currentIndex: number): number {
  // Start new phrase if needed
  if (gs.phraseRemaining <= 0) {
    startNewPhrase(gs);
    maybeShiftAnchor(gs);
  }

  const interval = pickInterval(gs, currentIndex);
  const nextIndex = clamp(currentIndex + interval, 0, gs.scaleNotes.length - 1);

  gs.lastInterval = interval;
  gs.phraseStep++;
  gs.phraseRemaining--;

  return nextIndex;
}

function noteFromIndex(gs: GeneratorState, index: number, clef: Clef, preferFlats: boolean, keyRoot: string, keyMode: string): Note | null {
  const midiNumber = gs.scaleNotes[index];
  if (midiNumber === undefined) return null;
  // For grand staff, pick the appropriate clef based on note position
  const noteClef = clef === Clef.GRAND
    ? (midiNumber >= 60 ? Clef.TREBLE : Clef.BASS)
    : clef;
  return midiToNote(midiNumber, noteClef, preferFlats, keyRoot, keyMode);
}

export function buildMelodicNoteQueue(difficulty: Difficulty, count = 10): Note[] {
  const gs = initGeneratorState(difficulty);
  const preferFlats = keyUsesFlats(difficulty.keyRoot, difficulty.keyMode);
  if (gs.scaleNotes.length < 3) {
    // Fallback: not enough notes in range, return what we can
    return gs.scaleNotes
      .slice(0, count)
      .map(midi => midiToNote(midi, difficulty.clef, preferFlats, difficulty.keyRoot, difficulty.keyMode))
      .filter(Boolean) as Note[];
  }

  const notes: Note[] = [];
  let currentIndex = gs.anchorIndex;

  // Generate first note
  const firstNote = noteFromIndex(gs, currentIndex, difficulty.clef, preferFlats, difficulty.keyRoot, difficulty.keyMode);
  if (firstNote) notes.push(firstNote);
  startNewPhrase(gs);

  while (notes.length < count) {
    // Motif repetition: replay previous phrase transposed
    if (
      gs.phraseRemaining <= 0 &&
      gs.previousMotif &&
      gs.previousMotif.length > 0 &&
      Math.random() < MOTIF_REPEAT_CHANCE
    ) {
      const transposition = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.floor(Math.random() * 2)); // ±2-3
      for (const relIdx of gs.previousMotif) {
        if (notes.length >= count) break;
        const idx = clamp(relIdx + transposition, 0, gs.scaleNotes.length - 1);
        const note = noteFromIndex(gs, idx, difficulty.clef, preferFlats, difficulty.keyRoot, difficulty.keyMode);
        if (note && note.midiNumber !== notes[notes.length - 1]?.midiNumber) {
          notes.push(note);
          currentIndex = idx;
        }
      }
      gs.previousMotif = null; // don't repeat the same motif twice in a row
      continue;
    }

    // Track phrase indices for potential motif repetition
    const phraseIndices: number[] = [];

    // Generate phrase
    if (gs.phraseRemaining <= 0) {
      // Save current phrase for potential motif use
      startNewPhrase(gs);
      maybeShiftAnchor(gs);
    }

    while (gs.phraseRemaining > 0 && notes.length < count) {
      const nextIndex = generateNextIndex(gs, currentIndex);
      const note = noteFromIndex(gs, nextIndex, difficulty.clef, preferFlats, difficulty.keyRoot, difficulty.keyMode);
      if (note && note.midiNumber !== notes[notes.length - 1]?.midiNumber) {
        notes.push(note);
        phraseIndices.push(nextIndex);
        currentIndex = nextIndex;
      } else if (note) {
        // If same as last note, nudge by 1
        const nudged = clamp(nextIndex + (Math.random() < 0.5 ? 1 : -1), 0, gs.scaleNotes.length - 1);
        const nudgedNote = noteFromIndex(gs, nudged, difficulty.clef, preferFlats, difficulty.keyRoot, difficulty.keyMode);
        if (nudgedNote && nudgedNote.midiNumber !== notes[notes.length - 1]?.midiNumber) {
          notes.push(nudgedNote);
          phraseIndices.push(nudged);
          currentIndex = nudged;
        }
      }
    }

    if (phraseIndices.length > 0) {
      gs.previousMotif = phraseIndices;
    }
  }

  return notes.slice(0, count);
}

export function generateNextMelodicNote(
  difficulty: Difficulty,
  lastNote: Note,
  recentNotes: Note[],
): Note | null {
  const gs = initGeneratorState(difficulty);
  const preferFlats = keyUsesFlats(difficulty.keyRoot, difficulty.keyMode);
  if (gs.scaleNotes.length < 3) return null;

  const currentIndex = findClosestIndex(gs.scaleNotes, lastNote.midiNumber);
  gs.anchorIndex = clamp(currentIndex, ANCHOR_WINDOW, gs.scaleNotes.length - ANCHOR_WINDOW - 1);

  // Infer direction from recent notes to maintain phrase coherence
  if (recentNotes.length >= 2) {
    const last = recentNotes[recentNotes.length - 1].midiNumber;
    const prev = recentNotes[recentNotes.length - 2].midiNumber;
    const recentDirection = last > prev ? 1 : last < prev ? -1 : 0;
    // Bias the phrase contour to match recent direction
    if (recentDirection > 0) gs.phraseContour = 'ascending';
    else if (recentDirection < 0) gs.phraseContour = 'descending';
  }

  gs.phraseRemaining = 3; // mid-phrase context
  gs.phraseStep = 1;
  gs.phraseLength = 5;

  let attempts = 0;
  while (attempts < 50) {
    const nextIndex = generateNextIndex(gs, currentIndex);
    const note = noteFromIndex(gs, nextIndex, difficulty.clef, preferFlats, difficulty.keyRoot, difficulty.keyMode);
    if (note && note.midiNumber !== lastNote.midiNumber) {
      return note;
    }
    attempts++;
  }

  // Fallback: step up or down by 1
  const fallbackIndex = clamp(
    currentIndex + (Math.random() < 0.5 ? 1 : -1),
    0,
    gs.scaleNotes.length - 1,
  );
  return noteFromIndex(gs, fallbackIndex, difficulty.clef, preferFlats, difficulty.keyRoot, difficulty.keyMode);
}
