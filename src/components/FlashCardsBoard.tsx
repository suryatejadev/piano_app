import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MidiConnectionStatus } from './MidiConnectionStatus';
import { TimerDoneOverlay } from './TimerDoneOverlay';
import { SharedTimerControl } from './SharedTimerControl';
import type { MidiNoteEvent } from '../types';
import type { UseMidiReturn } from '../hooks/useMidi';
import { KeyMode } from '../types';

interface FlashCard {
  prompt: string;
  targetNote: string;
  targetPitchClass: number;
}

interface FlashCardSettings {
  naturals: boolean;
  scaleMath: boolean;
  intervals: boolean;
  showOnScreenKeyboard: boolean;
}

const DEFAULT_SETTINGS: FlashCardSettings = {
  naturals: true,
  scaleMath: true,
  intervals: true,
  showOnScreenKeyboard: false,
};

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NATURAL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// Major scale intervals in semitones from root
const MAJOR_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
// Minor scale intervals in semitones from root (natural minor)
const MINOR_SEMITONES = [0, 2, 3, 5, 7, 8, 10];

// Weighted scale selection: important keys appear more often
const WEIGHTED_SCALES: Array<{ root: string; mode: KeyMode; label: string; weight: number }> = [
  { root: 'C', mode: KeyMode.MAJOR, label: 'C major', weight: 5 },
  { root: 'G', mode: KeyMode.MAJOR, label: 'G major', weight: 4 },
  { root: 'F', mode: KeyMode.MAJOR, label: 'F major', weight: 4 },
  { root: 'D', mode: KeyMode.MAJOR, label: 'D major', weight: 3 },
  { root: 'C', mode: KeyMode.MINOR, label: 'C minor', weight: 3 },
];

// Scale degrees to ask about (skip 1, it's obvious). Weight important degrees higher.
const WEIGHTED_DEGREES: Array<{ degree: number; weight: number }> = [
  { degree: 3, weight: 5 }, // most important — defines major/minor
  { degree: 5, weight: 5 }, // dominant
  { degree: 4, weight: 4 }, // subdominant
  { degree: 7, weight: 3 }, // leading tone
  { degree: 2, weight: 3 },
  { degree: 6, weight: 3 },
];

// Common intervals for interval math questions
const WEIGHTED_INTERVALS: Array<{ amount: number; weight: number }> = [
  { amount: 1, weight: 3 },
  { amount: 2, weight: 5 },
  { amount: 3, weight: 5 },
  { amount: 4, weight: 3 },
  { amount: 5, weight: 3 },
];

function weightedPick<T>(items: Array<T & { weight: number }>): T {
  const total = items.reduce((s, item) => s + item.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[0];
}

// Sharp-to-flat mapping
const SHARP_TO_FLAT: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};

// Keys that use flats in their spelling
const FLAT_SCALE_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);
const FLAT_MINOR_ROOTS = new Set(['D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab']);

function usesFlats(root: string, mode: KeyMode): boolean {
  if (mode === KeyMode.MINOR) return FLAT_MINOR_ROOTS.has(root);
  return FLAT_SCALE_ROOTS.has(root);
}

function noteNameFromPitchClass(pitchClass: number, preferFlat: boolean): string {
  const pc = ((pitchClass % 12) + 12) % 12;
  const name = CHROMATIC_NOTES[pc];
  if (preferFlat && name in SHARP_TO_FLAT) {
    return SHARP_TO_FLAT[name];
  }
  return name;
}

const pitchClassFromName = (name: string): number => {
  // Handle flats by converting to sharp equivalent
  const flatToSharp: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  };
  const normalized = flatToSharp[name] || name;
  return CHROMATIC_NOTES.indexOf(normalized);
};

const pitchClassLabel = (pitchClass: number): string => {
  return CHROMATIC_NOTES[((pitchClass % 12) + 12) % 12];
};

const naturalStep = (root: string, steps: number): string => {
  const rootIndex = NATURAL_NOTES.indexOf(root);
  const nextIndex = ((rootIndex + steps) % NATURAL_NOTES.length + NATURAL_NOTES.length) % NATURAL_NOTES.length;
  return NATURAL_NOTES[nextIndex];
};

const getAllowedRoots = (settings: FlashCardSettings): string[] => {
  const roots: string[] = [];
  if (settings.naturals) roots.push(...NATURAL_NOTES);
  return roots.length > 0 ? roots : [...NATURAL_NOTES];
};

const generateFlashCard = (settings: FlashCardSettings): FlashCard => {
  const allowedQuestionTypes: Array<'scale' | 'interval'> = [];
  if (settings.scaleMath) allowedQuestionTypes.push('scale');
  if (settings.intervals) allowedQuestionTypes.push('interval');

  const questionTypes =
    allowedQuestionTypes.length > 0 ? allowedQuestionTypes : (['scale', 'interval'] as const);

  const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

  if (questionType === 'scale') {
    const scale = weightedPick(WEIGHTED_SCALES);
    const { degree } = weightedPick(WEIGHTED_DEGREES);
    const rootPc = CHROMATIC_NOTES.indexOf(scale.root);
    const semitones = scale.mode === KeyMode.MAJOR ? MAJOR_SEMITONES : MINOR_SEMITONES;
    const targetPc = (rootPc + semitones[degree - 1]) % 12;
    const preferFlat = usesFlats(scale.root, scale.mode);
    const targetNote = noteNameFromPitchClass(targetPc, preferFlat);

    const ordinal = degree === 2 ? '2nd' : degree === 3 ? '3rd' : `${degree}th`;

    return {
      prompt: `The ${ordinal} of ${scale.label}`,
      targetNote,
      targetPitchClass: targetPc,
    };
  }

  // Interval question: use only natural notes as base
  const roots = getAllowedRoots(settings);
  const base = roots[Math.floor(Math.random() * roots.length)];
  const { amount } = weightedPick(WEIGHTED_INTERVALS);
  const sign = Math.random() < 0.5 ? 1 : -1;
  const targetNote = naturalStep(base, sign * amount);
  const interval = amount + 1; // music intervals are 1-indexed (step of 1 = a 2nd)
  const intervalOrd = interval === 2 ? '2nd' : interval === 3 ? '3rd' : `${interval}th`;
  const direction = sign > 0 ? 'above' : 'below';

  return {
    prompt: `A ${intervalOrd} ${direction} ${base}`,
    targetNote,
    targetPitchClass: pitchClassFromName(targetNote),
  };
};

export const FlashCardsBoard: React.FC<{ timerMinutes: number; setTimerMinutes: (mins: number) => void; midi: UseMidiReturn }> = ({
  timerMinutes,
  setTimerMinutes,
  midi,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<FlashCardSettings>(DEFAULT_SETTINGS);
  const [card, setCard] = useState<FlashCard>(() => generateFlashCard(DEFAULT_SETTINGS));
  const [feedback, setFeedback] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [showTimerDone, setShowTimerDone] = useState(false);
  const unsubscribeMidiRef = useRef<(() => void) | null>(null);

  const roundDurationSeconds = timerMinutes * 60;

  const resetSession = useCallback((nextSettings?: typeof settings) => {
    const s = nextSettings ?? settings;
    setCorrectCount(0);
    setWrongCount(0);
    setElapsedSeconds(0);
    setHasStarted(false);
    setTimeUp(false);
    setShowTimerDone(false);
    setFeedback('');
    setCard(generateFlashCard(s));
  }, [settings]);

  const handleAnswer = useCallback((playedPitchClass: number) => {
    if (timeUp) {
      if (showTimerDone) return; // block input during the 3s overlay window
      // overlay dismissed: reset and start fresh
      resetSession();
      setHasStarted(true);
      return;
    }

    if (!hasStarted) {
      setHasStarted(true);
    }

    const playedLabel = pitchClassLabel(playedPitchClass);
    const playedPc = ((playedPitchClass % 12) + 12) % 12;

    if (playedPc === card.targetPitchClass) {
      setCorrectCount(prev => prev + 1);
      setFeedback(`Correct! ${card.targetNote} is right.`);
      setTimeout(() => {
        setCard(generateFlashCard(settings));
        setFeedback('');
      }, 500);
    } else {
      setWrongCount(prev => prev + 1);
      setFeedback(`Incorrect: you played ${playedLabel}. Try again.`);
    }
  }, [timeUp, showTimerDone, hasStarted, card.targetNote, settings, resetSession]);

  const nextCard = useCallback(() => {
    if (timeUp) return;
    setCard(generateFlashCard(settings));
    setFeedback('');
  }, [settings, timeUp]);

  useEffect(() => {
    if (timeUp || !hasStarted) return;

    const intervalId = setInterval(() => {
      setElapsedSeconds(prev => {
        if (prev >= roundDurationSeconds - 1) {
          setTimeUp(true);
          setFeedback("Time's up!");
          return roundDurationSeconds;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeUp, hasStarted, roundDurationSeconds]);

  // Show overlay when timer expires
  useEffect(() => {
    if (!timeUp) return;
    setShowTimerDone(true);
  }, [timeUp]);

  const handleDismissTimerDone = useCallback(() => {
    setShowTimerDone(false);
  }, []);

  useEffect(() => {
    setCard(generateFlashCard(settings));
    setFeedback('');
  }, [settings]);

  useEffect(() => {
    const callback = (event: MidiNoteEvent) => {
      handleAnswer(event.noteNumber % 12);
    };

    unsubscribeMidiRef.current = midi.onNote(callback);

    return () => {
      if (unsubscribeMidiRef.current) {
        unsubscribeMidiRef.current();
      }
    };
  }, [midi, handleAnswer]);

  const onScreenKeys = CHROMATIC_NOTES;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <TimerDoneOverlay show={showTimerDone} onDismiss={handleDismissTimerDone} />
      {settingsOpen && (
        <button
          onClick={() => setSettingsOpen(false)}
          aria-label="Close flash card settings"
          className="fixed inset-0 z-40 bg-black/35"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-white border-r border-gray-300 shadow-2xl transform transition-transform duration-300 ${
          settingsOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Configure</h2>
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition"
            >
              Close
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.naturals}
                onChange={e => setSettings(prev => ({ ...prev, naturals: e.target.checked }))}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Naturals</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.scaleMath}
                onChange={e => setSettings(prev => ({ ...prev, scaleMath: e.target.checked }))}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Scale Math</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.intervals}
                onChange={e => setSettings(prev => ({ ...prev, intervals: e.target.checked }))}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Intervals</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showOnScreenKeyboard}
                onChange={e => setSettings(prev => ({ ...prev, showOnScreenKeyboard: e.target.checked }))}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Show On-screen Keyboard</span>
            </label>

            <button
              onClick={() => setSettings(DEFAULT_SETTINGS)}
              className="w-full px-4 py-2 rounded font-medium transition text-sm bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </aside>

      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-4 py-2 rounded-md bg-slate-900 hover:bg-black text-white font-semibold transition"
              >
                Configure
              </button>

              <SharedTimerControl
                id="flash-timer-select"
                timerMinutes={timerMinutes}
                setTimerMinutes={setTimerMinutes}
                disabled={hasStarted && !timeUp}
              />
            </div>

            <div className="w-full sm:w-auto sm:max-w-[440px]">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-300 p-3 shadow-sm">
                <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Your Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-100 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{correctCount}</div>
                    <div className="text-xs text-gray-600 mt-1">Correct</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{wrongCount}</div>
                    <div className="text-xs text-gray-600 mt-1">Incorrect</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{correctCount + wrongCount}</div>
                    <div className="text-xs text-gray-600 mt-1">Total</div>
                  </div>

                  <div className="text-center">
                    <div className={`text-2xl font-bold ${timeUp ? 'text-red-600' : 'text-orange-600'}`}>
                      {formatTime(elapsedSeconds)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <MidiConnectionStatus
            isSupported={midi.isSupported}
            isConnected={midi.isConnected}
            selectedDevice={midi.selectedDevice}
            devices={midi.devices}
            error={midi.error}
            onConnect={midi.connect}
            onDisconnect={midi.disconnect}
            onRefresh={midi.refreshDevices}
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="text-3xl font-bold text-gray-800">
              {card.prompt}
            </div>
          </div>

          <div className="text-center mb-8">
            <div
              className={`text-lg font-semibold ${
                feedback.startsWith('Correct')
                  ? 'text-green-600'
                  : feedback.startsWith('Incorrect')
                    ? 'text-red-600'
                    : 'text-gray-700'
              }`}
            >
              {feedback}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={nextCard}
              disabled={timeUp}
              className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition"
            >
              Next Card
            </button>
            <button
              onClick={() => resetSession()}
              className="flex-1 px-6 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-lg transition"
            >
              Reset Session
            </button>
          </div>

          {settings.showOnScreenKeyboard && (
            <div className="mt-6">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 text-center">
                On-screen keyboard
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {onScreenKeys.map(key => {
                  const pitchClass = CHROMATIC_NOTES.indexOf(key);
                  return (
                    <button
                      key={key}
                      onClick={() => handleAnswer(pitchClass)}
                      disabled={timeUp}
                      className="px-3 py-2 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded font-semibold text-gray-800 text-sm transition"
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
