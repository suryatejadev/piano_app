import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TimerDoneOverlay } from './TimerDoneOverlay';

interface EarTrainingCard {
  tonicMidi: number;
  degree: number;
  targetMidi: number;
}

const NATURAL_ROOTS = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B pitch classes
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const DEGREE_LABELS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const midiToFrequency = (midi: number): number => {
  return 440 * Math.pow(2, (midi - 69) / 12);
};

const createCard = (): EarTrainingCard => {
  const rootPitchClass = NATURAL_ROOTS[Math.floor(Math.random() * NATURAL_ROOTS.length)];
  const tonicMidi = 60 + rootPitchClass; // around C4 region
  const degree = Math.floor(Math.random() * 7) + 1;
  const targetMidi = tonicMidi + MAJOR_SCALE_INTERVALS[degree - 1];

  return {
    tonicMidi,
    degree,
    targetMidi,
  };
};

export const EarTrainingBoard: React.FC<{ timerMinutes: number; setTimerMinutes: (mins: number) => void }> = ({
  timerMinutes,
  setTimerMinutes,
}) => {
  const [card, setCard] = useState<EarTrainingCard>(() => createCard());
  const [feedback, setFeedback] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [showTimerDone, setShowTimerDone] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const roundDurationSeconds = timerMinutes * 60;

  const totalCount = useMemo(() => correctCount + wrongCount, [correctCount, wrongCount]);

  const ensureAudioContext = (): AudioContext => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      throw new Error('Web Audio API not supported');
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }

    return audioContextRef.current;
  };

  const playTone = useCallback((ctx: AudioContext, midi: number, startTime: number, duration: number) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = midiToFrequency(midi);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gain.gain.linearRampToValueAtTime(0.15, startTime + duration - 0.04);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }, []);

  const playExercise = useCallback(async () => {
    if (isPlaying) return;

    try {
      const ctx = ensureAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      setIsPlaying(true);

      const now = ctx.currentTime + 0.05;
      const toneDuration = 0.55;

      // Basic FET-style pattern: tonic, target, tonic.
      playTone(ctx, card.tonicMidi, now, toneDuration);
      playTone(ctx, card.targetMidi, now + 0.8, toneDuration);
      playTone(ctx, card.tonicMidi, now + 1.6, toneDuration);

      window.setTimeout(() => setIsPlaying(false), 2200);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to play audio');
      setIsPlaying(false);
    }
  }, [card, isPlaying, playTone]);

  const nextCard = useCallback(() => {
    if (timeUp) return;
    setCard(createCard());
    setFeedback('');
  }, [timeUp]);

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
    setShowTimerDone(true);
  }, [timeUp]);

  const handleDismissTimerDone = useCallback(() => {
    setShowTimerDone(false);
  }, []);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const submitAnswer = (degree: number) => {
    if (timeUp) {
      // Any button press after timer: reset and start fresh without counting the click
      setCorrectCount(0);
      setWrongCount(0);
      setElapsedSeconds(0);
      setTimeUp(false);
      setShowTimerDone(false);
      setFeedback('');
      setCard(createCard());
      setHasStarted(true);
      return;
    }

    if (!hasStarted) {
      setHasStarted(true);
    }

    if (degree === card.degree) {
      setCorrectCount(prev => prev + 1);
      setFeedback(`Correct! ${DEGREE_LABELS[degree - 1]}`);
      setTimeout(() => {
        setCard(createCard());
        setFeedback('');
      }, 450);
    } else {
      setWrongCount(prev => prev + 1);
      setFeedback(`Incorrect. You selected ${DEGREE_LABELS[degree - 1]}.`);
    }
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
              <button
                onClick={playExercise}
                disabled={isPlaying || timeUp}
                className="px-4 py-2 rounded-md bg-slate-900 hover:bg-black disabled:bg-gray-400 text-white font-semibold transition"
              >
                {isPlaying ? 'Playing...' : 'Play Exercise'}
              </button>

              <div className="flex items-center gap-2">
                <label htmlFor="ear-timer-select" className="text-sm font-medium text-gray-700">
                  Timer
                </label>
                <select
                  id="ear-timer-select"
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
                    <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
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

        <div className="bg-white rounded-lg border border-gray-300 p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="text-3xl font-bold text-gray-800">Which note did you hear?</div>
            <div className="text-sm text-gray-500 mt-2">Use Play Exercise and pick C-D-E-F-G-A-B.</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
            {DEGREE_LABELS.map((label, idx) => (
              <button
                key={label}
                onClick={() => submitAnswer(idx + 1)}
                disabled={timeUp}
                className="px-3 py-3 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded font-semibold text-gray-800 text-sm transition"
              >
                {idx + 1}. {label}
              </button>
            ))}
          </div>

          <div className="text-center mb-8">
            <div
              className={`text-lg font-semibold ${
                feedback.startsWith('Correct')
                  ? 'text-green-600'
                  : feedback.startsWith('Incorrect') || feedback.includes("Time's up")
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
              Next Exercise
            </button>
            <button
              onClick={() => {
                setCorrectCount(0);
                setWrongCount(0);
                setElapsedSeconds(0);
                setHasStarted(false);
                setTimeUp(false);
                setShowTimerDone(false);
                setFeedback('');
                setCard(createCard());
              }}
              className="flex-1 px-6 py-3 bg-slate-900 hover:bg-black disabled:bg-gray-400 text-white font-bold rounded-lg transition"
              disabled={timeUp}
            >
              Reset Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
