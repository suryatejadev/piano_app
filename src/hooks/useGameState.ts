import { useState, useCallback } from 'react';
import type { GameState, Note, Stats, Difficulty } from '../types';
import { Clef, KeyMode } from '../types';
import { getRandomKeyNote } from '../utils/scaleManager';

const DEFAULT_DIFFICULTY: Difficulty = {
  tempo: 'medium',
  showAnswer: false,
  includeAccidentals: false,
  showOnScreenKeyboard: true,
  minNoteNumber: 69, // A4
  maxNoteNumber: 96, // C7
  keyRoot: 'C',
  keyMode: KeyMode.MAJOR,
  clef: Clef.TREBLE,
  displayDurationMs: 2000,
};

const DEFAULT_STATS: Stats = {
  totalNotes: 0,
  correctHits: 0,
  streak: 0,
  maxStreak: 0,
  startTime: 0,
  elapsedSeconds: 0,
};

const DEFAULT_STATE: GameState = {
  currentNote: null,
  noteQueue: [],
  stats: DEFAULT_STATS,
  difficulty: DEFAULT_DIFFICULTY,
  midiConnected: false,
  midiDevices: [],
  selectedMidiDevice: null,
  gameActive: false,
  lastPlayedNote: null,
  feedbackMessage: '',
};

const buildNoteQueue = (difficulty: Difficulty, count = 10): Note[] => {
  const notes: Note[] = [];
  let attempts = 0;
  const maxAttempts = count * 100; // Prevent infinite loops
  
  while (notes.length < count && attempts < maxAttempts) {
    const note = getRandomKeyNote(difficulty.keyRoot, difficulty.keyMode, difficulty.clef, difficulty.includeAccidentals);
    if (note && note.midiNumber >= difficulty.minNoteNumber && note.midiNumber <= difficulty.maxNoteNumber) {
      notes.push(note);
    }
    attempts++;
  }
  return notes;
};

export interface UseGameStateReturn {
  state: GameState;
  startGame: () => void;
  stopGame: () => void;
  handleNotePlay: (playedNote: Note) => boolean;
  updateDifficulty: (newDifficulty: Partial<Difficulty>) => void;
  resetStats: () => void;
  updateTimerTick: () => void;
  setMidiConnected: (connected: boolean) => void;
}

/**
 * Hook to manage game state and logic
 */
export const useGameState = (): UseGameStateReturn => {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);

  /**
   * Start the game
   */
  const startGame = useCallback(() => {
    setState(prevState => {
      const queue = buildNoteQueue(prevState.difficulty, 11);
      const [nextNote, ...remaining] = queue;
      return {
        ...prevState,
        gameActive: true,
        currentNote: nextNote || null,
        noteQueue: remaining,
        stats: {
          ...DEFAULT_STATS,
          startTime: Date.now(),
        },
        lastPlayedNote: null,
        feedbackMessage: '',
      };
    });
    setGameStartTime(Date.now());
  }, []);

  /**
   * Stop the game
   */
  const stopGame = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      gameActive: false,
    }));
    setGameStartTime(null);
  }, []);

  /**
   * Handle a note being played on the MIDI keyboard
   * Returns true if the note was correct
   */
  const handleNotePlay = useCallback((playedNote: Note): boolean => {
    if (!state.currentNote || !state.gameActive) return false;

    const isCorrect = state.currentNote.midiNumber === playedNote.midiNumber;

    setState(prevState => {
      const newStats = { ...prevState.stats };
      newStats.totalNotes += 1;

      let nextNote = prevState.currentNote;
      let nextQueue = prevState.noteQueue;

      if (isCorrect) {
        newStats.correctHits += 1;
        newStats.streak += 1;
        if (newStats.streak > newStats.maxStreak) {
          newStats.maxStreak = newStats.streak;
        }

        const [nextFromQueue, ...remaining] = prevState.noteQueue;
        let generated = getRandomKeyNote(prevState.difficulty.keyRoot, prevState.difficulty.keyMode, prevState.difficulty.clef, prevState.difficulty.includeAccidentals);
        // Keep generating until we get a note within the range
        let attempts = 0;
        while (generated && (generated.midiNumber < prevState.difficulty.minNoteNumber || generated.midiNumber > prevState.difficulty.maxNoteNumber) && attempts < 100) {
          generated = getRandomKeyNote(prevState.difficulty.keyRoot, prevState.difficulty.keyMode, prevState.difficulty.clef, prevState.difficulty.includeAccidentals);
          attempts++;
        }
        nextNote = nextFromQueue || generated;
        nextQueue = [...remaining, generated].filter(Boolean) as Note[];
      } else {
        newStats.streak = 0;
      }

      return {
        ...prevState,
        currentNote: nextNote,
        noteQueue: nextQueue,
        stats: newStats,
        lastPlayedNote: playedNote,
        feedbackMessage: isCorrect ? 'Correct! 🎉' : 'Try again!',
      };
    });

    return isCorrect;
  }, [state.currentNote, state.gameActive]);

  /**
   * Update difficulty settings
   */
  const updateDifficulty = useCallback((newDifficulty: Partial<Difficulty>) => {
    setState(prevState => ({
      ...prevState,
      difficulty: {
        ...prevState.difficulty,
        ...newDifficulty,
      },
    }));
  }, []);

  /**
   * Reset stats to default
   */
  const resetStats = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      stats: DEFAULT_STATS,
      currentNote: null,
      noteQueue: [],
      lastPlayedNote: null,
      feedbackMessage: '',
    }));
    setGameStartTime(null);
  }, []);

  /**
   * Update elapsed time (called on timer tick)
   */
  const updateTimerTick = useCallback(() => {
    if (gameStartTime && state.gameActive) {
      const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
      setState(prevState => ({
        ...prevState,
        stats: {
          ...prevState.stats,
          elapsedSeconds: elapsed,
        },
      }));
    }
  }, [gameStartTime, state.gameActive]);

  /**
   * Set MIDI connection status
   */
  const setMidiConnected = useCallback((connected: boolean) => {
    setState(prevState => ({
      ...prevState,
      midiConnected: connected,
    }));
  }, []);

  return {
    state,
    startGame,
    stopGame,
    handleNotePlay,
    updateDifficulty,
    resetStats,
    updateTimerTick,
    setMidiConnected,
  };
};
