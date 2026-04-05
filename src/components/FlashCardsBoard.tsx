import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MidiConnectionStatus } from './MidiConnectionStatus';
import { useMidi } from '../hooks/useMidi';
import { playBeep } from '../utils/audioBeep';
import type { MidiNoteEvent } from '../types';
import { KeyMode } from '../types';

interface FlashCard {
  prompt: string;
  targetPitchClass: number;
}

interface FlashCardSettings {
  naturals: boolean;
  accidentals: boolean;
  scaleMath: boolean;
  intervals: boolean;
  showOnScreenKeyboard: boolean;
}

const DEFAULT_SETTINGS: FlashCardSettings = {
  naturals: true,
  accidentals: false,
  scaleMath: true,
  intervals: true,
  showOnScreenKeyboard: false,
};

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NATURAL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ACCIDENTAL_NOTES = ['C#', 'D#', 'F#', 'G#', 'A#'];
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

const pitchClassLabel = (pitchClass: number): string => {
  return CHROMATIC_NOTES[((pitchClass % 12) + 12) % 12];
};

const getAllowedRoots = (settings: FlashCardSettings): string[] => {
  const roots: string[] = [];
  if (settings.naturals) roots.push(...NATURAL_NOTES);
  if (settings.accidentals) roots.push(...ACCIDENTAL_NOTES);
  return roots.length > 0 ? roots : [...CHROMATIC_NOTES];
};

const generateFlashCard = (settings: FlashCardSettings): FlashCard => {
  const roots = getAllowedRoots(settings);

  const allowedQuestionTypes: Array<'scale' | 'interval'> = [];
  if (settings.scaleMath) allowedQuestionTypes.push('scale');
  if (settings.intervals) allowedQuestionTypes.push('interval');

  const questionTypes =
    allowedQuestionTypes.length > 0 ? allowedQuestionTypes : (['scale', 'interval'] as const);

  const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

  if (questionType === 'scale') {
    const root = roots[Math.floor(Math.random() * roots.length)];
    const mode = Math.random() < 0.5 ? KeyMode.MAJOR : KeyMode.MINOR;
    const intervals = mode === KeyMode.MAJOR ? MAJOR_INTERVALS : MINOR_INTERVALS;
    const degree = Math.floor(Math.random() * 7) + 1;
    const rootPitchClass = CHROMATIC_NOTES.indexOf(root);
    const targetPitchClass = (rootPitchClass + intervals[degree - 1]) % 12;

    return {
      prompt: `${degree} of ${root} ${mode === KeyMode.MAJOR ? 'major' : 'minor'} is`,
      targetPitchClass,
    };
  }

  const base = roots[Math.floor(Math.random() * roots.length)];
  const amount = Math.floor(Math.random() * 4) + 1;
  const sign = Math.random() < 0.5 ? 1 : -1;
  const basePitchClass = CHROMATIC_NOTES.indexOf(base);
  const targetPitchClass = (basePitchClass + sign * amount + 120) % 12;

  return {
    prompt: `${base} ${sign > 0 ? '+' : '-'} ${amount} is`,
    targetPitchClass,
  };
};

export const FlashCardsBoard: React.FC<{ timerMinutes: number; setTimerMinutes: (mins: number) => void }> = ({
  timerMinutes,
  setTimerMinutes,
}) => {
  const midi = useMidi();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<FlashCardSettings>(DEFAULT_SETTINGS);
  const [card, setCard] = useState<FlashCard>(() => generateFlashCard(DEFAULT_SETTINGS));
  const [feedback, setFeedback] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const unsubscribeMidiRef = useRef<(() => void) | null>(null);

  const roundDurationSeconds = timerMinutes * 60;

  const handleAnswer = useCallback((playedPitchClass: number) => {
    if (timeUp) return;

    if (!hasStarted) {
      setHasStarted(true);
    }

    const playedLabel = pitchClassLabel(playedPitchClass);

    if (playedPitchClass === card.targetPitchClass) {
      setCorrectCount(prev => prev + 1);
      setFeedback(`Correct! ${playedLabel} is right.`);
      setTimeout(() => {
        setCard(generateFlashCard(settings));
        setFeedback('');
      }, 500);
    } else {
      setWrongCount(prev => prev + 1);
      setFeedback(`Incorrect: you played ${playedLabel}. Try again.`);
    }
  }, [timeUp, hasStarted, card.targetPitchClass, settings]);

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

  // Auto-reset and beep when timer expires
  useEffect(() => {
    if (!timeUp) return;

    const handleTimeUp = async () => {
      await playBeep(300, 600, 0.4);
      // Auto-reset after beep finishes
      setTimeout(() => {
        setCorrectCount(0);
        setWrongCount(0);
        setElapsedSeconds(0);
        setHasStarted(false);
        setTimeUp(false);
        setFeedback('');
        setCard(generateFlashCard(settings));
      }, 350);
    };

    handleTimeUp();
  }, [timeUp, settings]);

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

  const onScreenKeys = getAllowedRoots(settings);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
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
                checked={settings.accidentals}
                onChange={e => setSettings(prev => ({ ...prev, accidentals: e.target.checked }))}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Accidentals</span>
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

              <div className="flex items-center gap-2">
                <label htmlFor="flash-timer-select" className="text-sm font-medium text-gray-700">
                  Timer
                </label>
                <select
                  id="flash-timer-select"
                  value={timerMinutes}
                  onChange={e => setTimerMinutes(parseInt(e.target.value, 10))}
                  disabled={hasStarted && !timeUp}
                  className="rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-800"
                >
                  {[1, 3, 5, 10, 15].map(min => (
                    <option key={min} value={min}>
                      {min} min
                    </option>
                  ))}
                </select>
              </div>
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
              onClick={() => {
                setCorrectCount(0);
                setWrongCount(0);
                setElapsedSeconds(0);
                setHasStarted(false);
                setTimeUp(false);
                nextCard();
              }}
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
