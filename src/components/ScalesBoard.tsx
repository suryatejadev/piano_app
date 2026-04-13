import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TimerDoneOverlay } from './TimerDoneOverlay';
import { SharedTimerControl } from './SharedTimerControl';
import type { MidiNoteEvent } from '../types';
import type { UseMidiReturn } from '../hooks/useMidi';

interface ScaleCard {
  rootNote: string;
  mode: 'Major' | 'Minor' | 'Major Pentatonic' | 'Minor Pentatonic' | 'Major Chord' | 'Minor Chord';
  hand: 'left' | 'right' | 'both';
  octaves: 1 | 2;
}

const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const MODES = ['Major', 'Minor', 'Major Pentatonic', 'Minor Pentatonic'] as const;
const CHORD_MODES = ['Major Chord', 'Minor Chord'] as const;
const HANDS = ['left', 'right', 'both'] as const;
const OCTAVES = [1, 2] as const;

const createScaleCard = (): ScaleCard => {
  // ~25% chance of a chord card
  if (Math.random() < 0.25) {
    return {
      rootNote: ROOTS[Math.floor(Math.random() * ROOTS.length)],
      mode: CHORD_MODES[Math.floor(Math.random() * CHORD_MODES.length)],
      hand: 'both',
      octaves: 1,
    };
  }
  const mode = MODES[Math.floor(Math.random() * MODES.length)];
  const isPentatonic = mode.includes('Pentatonic');
  return {
    rootNote: ROOTS[Math.floor(Math.random() * ROOTS.length)],
    mode,
    hand: HANDS[Math.floor(Math.random() * HANDS.length)],
    octaves: isPentatonic ? 1 : OCTAVES[Math.floor(Math.random() * OCTAVES.length)],
  };
};

export const ScalesBoard: React.FC<{ timerMinutes: number; setTimerMinutes: (mins: number) => void; midi: UseMidiReturn; onSessionComplete?: (r: { section: string; correct_count: number; wrong_count: number; duration_seconds: number }) => void }> = ({
  timerMinutes,
  setTimerMinutes,
  midi,
  onSessionComplete,
}) => {
  const [card, setCard] = useState<ScaleCard>(() => createScaleCard());
  const [scalesCompleted, setScalesCompleted] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [showTimerDone, setShowTimerDone] = useState(false);
  const [feedback, setFeedback] = useState('');

  const roundDurationSeconds = timerMinutes * 60;
  const unsubscribeMidiRef = useRef<(() => void) | null>(null);

  const totalCount = useMemo(() => scalesCompleted, [scalesCompleted]);

  // Listen for C1 (MIDI 24) to advance to next scale
  useEffect(() => {
    const callback = (event: MidiNoteEvent) => {
      if (timeUp) {
        if (showTimerDone) return; // block input during the 3s overlay window
        // overlay dismissed: reset and start fresh
        setScalesCompleted(0);
        setElapsedSeconds(0);
        setTimeUp(false);
        setFeedback('');
        setCard(createScaleCard());
        setHasStarted(true);
        return;
      }

      // Timer starts when user presses any MIDI key for the first time.
      if (!hasStarted) {
        setHasStarted(true);
      }

      // C1 advances to next scale card.
      if (event.noteNumber === 24) {
        setScalesCompleted(prev => prev + 1);
        setCard(createScaleCard());
        setFeedback('');
      }
    };

    unsubscribeMidiRef.current = midi.onNote(callback);

    return () => {
      if (unsubscribeMidiRef.current) {
        unsubscribeMidiRef.current();
      }
    };
  }, [midi, hasStarted, timeUp, showTimerDone]);

  // Auto-reset and beep when timer expires
  useEffect(() => {
    if (!timeUp) return;
    setShowTimerDone(true);
    onSessionComplete?.({ section: 'scales', correct_count: scalesCompleted, wrong_count: 0, duration_seconds: elapsedSeconds });
  }, [timeUp]);

  const handleDismissTimerDone = useCallback(() => {
    setShowTimerDone(false);
  }, []);

  // Timer logic
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

  const handleSkip = () => {
    if (timeUp) return;

    if (!hasStarted) {
      setHasStarted(true);
    }

    setScalesCompleted(prev => prev + 1);
    setCard(createScaleCard());
    setFeedback('');
  };

  const resetSession = () => {
    setScalesCompleted(0);
    setElapsedSeconds(0);
    setHasStarted(false);
    setTimeUp(false);
    setShowTimerDone(false);
    setFeedback('');
    setCard(createScaleCard());
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <TimerDoneOverlay show={showTimerDone} onDismiss={handleDismissTimerDone} />
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <SharedTimerControl
                id="scales-timer-select"
                timerMinutes={timerMinutes}
                setTimerMinutes={setTimerMinutes}
                disabled={hasStarted && !timeUp}
              />
            </div>

            <div className="w-full sm:w-auto sm:max-w-[440px]">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-300 p-3 shadow-sm">
                <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Your Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-slate-100 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
                    <div className="text-xs text-gray-600 mt-1">Scales Played</div>
                  </div>

                  <div className="text-center">
                    <div className={`text-2xl font-bold ${timeUp ? 'text-red-600' : 'text-orange-600'}`}>
                      {formatTime(elapsedSeconds)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Time</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {totalCount > 0
                        ? ((totalCount * 60) / Math.max(elapsedSeconds, 1)).toFixed(1)
                        : '0.0'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Per Minute</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-8 shadow-sm">
          <div className="text-center mb-12">
            <div className="text-5xl font-bold text-slate-900 mb-4">
              Play {card.rootNote} {card.mode}
            </div>
            <div className="text-2xl text-slate-600 mb-6">
              with <span className="font-bold text-blue-600">{card.hand}</span> hand on{' '}
              <span className="font-bold text-green-600">{card.octaves}</span>{' '}
              {card.octaves === 1 ? 'octave' : 'octaves'}
            </div>
            <div className="text-sm text-gray-500">Press C1 on MIDI or click Next to advance</div>
          </div>

          <div className="text-center mb-8">
            <div className={`text-lg font-semibold ${feedback.includes("Time's up") ? 'text-red-600' : 'text-gray-700'}`}>
              {feedback}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSkip}
              disabled={timeUp}
              className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition"
            >
              Next Scale (Skip)
            </button>
            <button
              onClick={resetSession}
              className="flex-1 px-6 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-lg transition"
            >
              Reset Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
