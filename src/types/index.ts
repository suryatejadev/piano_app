// Enums for scales and clefs
export enum Scale {
  C_MAJOR = 'C_MAJOR',
  A_MINOR = 'A_MINOR',
}

export enum Clef {
  TREBLE = 'TREBLE',
  BASS = 'BASS',
  ALTO = 'ALTO',
}

// Note interface
export interface Note {
  name: string; // C, D, E, F, G, A, B
  octave: number; // 0-8 for MIDI range
  midiNumber: number; // 0-127
  isSharp: boolean;
  isFlat: boolean;
  staffPosition: number; // vertical position on staff (-6 to 6)
  ledgerLine?: number; // if > 5 or < -5, needs ledger lines
}

// Difficulty settings
export interface Difficulty {
  tempo: 'slow' | 'medium' | 'fast'; // affects display timing
  showAnswer: boolean; // show the note name/letter
  includeAccidentals: boolean; // include sharps and flats
  scale: Scale;
  clef: Clef;
  displayDurationMs: number; // milliseconds to display each note
}

// Game statistics
export interface Stats {
  totalNotes: number; // total notes displayed (or played)
  correctHits: number; // correct matches
  streak: number; // current consecutive correct answers
  maxStreak: number; // highest streak in session
  startTime: number; // timestamp when game started
  elapsedSeconds: number; // calculated from elapsed time
}

// MIDI device information
export interface MidiDevice {
  id: string;
  name: string;
  manufacturer?: string;
  type: 'input' | 'output';
}

// MIDI note event
export interface MidiNoteEvent {
  noteNumber: number; // MIDI note number 0-127
  velocity: number; // velocity 0-127
  timestamp: number; // DOMHighResTimeStamp
}

// Game context state
export interface GameState {
  currentNote: Note | null;
  noteQueue: Note[];
  stats: Stats;
  difficulty: Difficulty;
  midiConnected: boolean;
  midiDevices: MidiDevice[];
  selectedMidiDevice: MidiDevice | null;
  gameActive: boolean;
  lastPlayedNote: Note | null; // for visual feedback
  feedbackMessage: string; // "Correct!", "Try again", etc.
}

// Type for MIDI note mapping
export interface MidiNoteMap {
  noteNumber: number;
  noteName: string;
  octave: number;
  frequency: number;
  staffPosition: {
    treble: number;
    bass: number;
    alto: number;
  };
}
