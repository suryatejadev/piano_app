import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TimerDoneOverlay } from './TimerDoneOverlay';
import { SharedTimerControl } from './SharedTimerControl';

interface EarTrainingCard {
  rootMidi: number;
  rootPitchClass: number;
  targetMidi: number;
  targetPitchClass: number;
}

interface EarTrainingSettings {
  naturals: boolean;
  accidentals: boolean;
  minRootMidi: number;
  maxRootMidi: number;
}

const CHROMATIC_LABELS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NATURAL_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11];
const ROOT_RANGE_OPTIONS = Array.from({ length: (83 - 48) + 1 }, (_, i) => 48 + i); // C3..B5

const DEFAULT_SETTINGS: EarTrainingSettings = {
  naturals: true,
  accidentals: false,
  minRootMidi: 60, // C4
  maxRootMidi: 71, // B4
};

const pitchClassLabel = (pitchClass: number): string => {
  return CHROMATIC_LABELS[((pitchClass % 12) + 12) % 12];
};

const midiLabel = (midi: number): string => {
  const label = pitchClassLabel(midi % 12);
  const octave = Math.floor(midi / 12) - 1;
  return `${label}${octave}`;
};

const getAllowedPitchClasses = (settings: EarTrainingSettings): number[] => {
  const allowed = new Set<number>();

  if (settings.naturals) {
    NATURAL_PITCH_CLASSES.forEach(pc => allowed.add(pc));
  }

  if (settings.accidentals) {
    for (let pc = 0; pc < 12; pc += 1) {
      if (!NATURAL_PITCH_CLASSES.includes(pc)) {
        allowed.add(pc);
      }
    }
  }

  // Fallback to naturals if user turns both off.
  if (allowed.size === 0) {
    NATURAL_PITCH_CLASSES.forEach(pc => allowed.add(pc));
  }

  return Array.from(allowed).sort((a, b) => a - b);
};

const getRootCandidates = (settings: EarTrainingSettings): number[] => {
  const allowedPitchClasses = getAllowedPitchClasses(settings);
  const roots: number[] = [];

  for (let midi = settings.minRootMidi; midi <= settings.maxRootMidi; midi += 1) {
    if (allowedPitchClasses.includes(midi % 12)) {
      roots.push(midi);
    }
  }

  return roots;
};

const midiToFrequency = (midi: number): number => {
  return 440 * Math.pow(2, (midi - 69) / 12);
};

const createCard = (settings: EarTrainingSettings, fixedRootMidi?: number): EarTrainingCard => {
  const rootCandidates = getRootCandidates(settings);
  const fallbackRoot = settings.minRootMidi;
  const selectedRootMidi =
    fixedRootMidi && rootCandidates.includes(fixedRootMidi)
      ? fixedRootMidi
      : (rootCandidates[Math.floor(Math.random() * rootCandidates.length)] ?? fallbackRoot);

  const rootPitchClass = selectedRootMidi % 12;

  const allowedPitchClasses = getAllowedPitchClasses(settings);
  const targetCandidates = allowedPitchClasses.filter(pc => pc !== rootPitchClass);
  const targetPitchClass =
    targetCandidates[Math.floor(Math.random() * targetCandidates.length)] ?? rootPitchClass;

  const rootOctaveBase = Math.floor(selectedRootMidi / 12) * 12;
  const targetMidi = rootOctaveBase + targetPitchClass;

  return {
    rootMidi: selectedRootMidi,
    rootPitchClass,
    targetMidi,
    targetPitchClass,
  };
};

export const EarTrainingBoard: React.FC<{ timerMinutes: number; setTimerMinutes: (mins: number) => void }> = ({
  timerMinutes,
  setTimerMinutes,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<EarTrainingSettings>(DEFAULT_SETTINGS);
  const [card, setCard] = useState<EarTrainingCard>(() => createCard(DEFAULT_SETTINGS));
  const [feedback, setFeedback] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [showTimerDone, setShowTimerDone] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sequenceProgress, setSequenceProgress] = useState(0);

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

  const playCardSequence = useCallback(async (cardToPlay: EarTrainingCard) => {
    try {
      const ctx = ensureAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      setIsPlaying(true);

      const now = ctx.currentTime + 0.05;
      const toneDuration = 0.55;

      // Pattern: root, target, root.
      playTone(ctx, cardToPlay.rootMidi, now, toneDuration);
      playTone(ctx, cardToPlay.targetMidi, now + 0.8, toneDuration);
      playTone(ctx, cardToPlay.rootMidi, now + 1.6, toneDuration);

      window.setTimeout(() => setIsPlaying(false), 2200);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to play audio');
      setIsPlaying(false);
    }
  }, [playTone]);

  const playExercise = useCallback(async () => {
    if (isPlaying) return;
    await playCardSequence(card);
  }, [card, isPlaying, playCardSequence]);

  const nextExercise = useCallback(() => {
    if (timeUp) return;
    setCard(createCard(settings));
    setSequenceProgress(0);
    setFeedback('');
  }, [timeUp, settings]);

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

  const submitAnswer = useCallback((degree: number) => {
    if (timeUp) {
      if (showTimerDone) return; // block input during the 3s overlay window
      // overlay dismissed: reset and start fresh
      setCorrectCount(0);
      setWrongCount(0);
      setElapsedSeconds(0);
      setTimeUp(false);
      setShowTimerDone(false);
      setSequenceProgress(0);
      setFeedback('');
      setCard(createCard(settings));
      setHasStarted(true);
      return;
    }

    if (!hasStarted) {
      setHasStarted(true);
    }

    const expectedSequence = [card.rootPitchClass, card.targetPitchClass, card.rootPitchClass];
    const expected = expectedSequence[sequenceProgress];

    const selectedPitchClass = degree - 1;

    if (selectedPitchClass === expected) {
      const nextProgress = sequenceProgress + 1;
      if (nextProgress >= expectedSequence.length) {
        const nextCard = createCard(settings, card.rootMidi);
        setCorrectCount(prev => prev + 1);
        setFeedback('Correct sequence! Playing next...');
        // Keep same root, generate a new interval.
        setCard(nextCard);
        setSequenceProgress(0);
        void playCardSequence(nextCard);
      } else {
        setSequenceProgress(nextProgress);
        setFeedback(`Good. ${nextProgress}/3 notes matched.`);
      }
    } else {
      setWrongCount(prev => prev + 1);
      setSequenceProgress(0);
      setFeedback('Incorrect. Restart sequence.');
    }
  }, [timeUp, showTimerDone, hasStarted, card, sequenceProgress, settings, playCardSequence]);

  useEffect(() => {
    setCard(prev => createCard(settings, prev.rootMidi));
    setSequenceProgress(0);
    setFeedback('');
  }, [settings]);

  useEffect(() => {
    const keyToPitchClass: Record<string, number> = {
      c: 0,
      d: 2,
      e: 4,
      f: 5,
      g: 7,
      a: 9,
      b: 11,
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const pitchClass = keyToPitchClass[key];
      if (pitchClass === undefined) return;

      event.preventDefault();
      submitAnswer(pitchClass + 1);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [submitAnswer]);

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
          aria-label="Close ear training settings"
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

            <div className="pt-2 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Root Note Range</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="w-12 text-sm text-gray-600">Min</label>
                  <select
                    value={settings.minRootMidi}
                    onChange={e => {
                      const min = parseInt(e.target.value, 10);
                      setSettings(prev => ({
                        ...prev,
                        minRootMidi: min,
                        maxRootMidi: Math.max(min, prev.maxRootMidi),
                      }));
                    }}
                    className="flex-1 rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-800"
                  >
                    {ROOT_RANGE_OPTIONS.map(midi => (
                      <option key={`min-${midi}`} value={midi}>
                        {midiLabel(midi)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-12 text-sm text-gray-600">Max</label>
                  <select
                    value={settings.maxRootMidi}
                    onChange={e => {
                      const max = parseInt(e.target.value, 10);
                      setSettings(prev => ({
                        ...prev,
                        minRootMidi: Math.min(prev.minRootMidi, max),
                        maxRootMidi: max,
                      }));
                    }}
                    className="flex-1 rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-800"
                  >
                    {ROOT_RANGE_OPTIONS.map(midi => (
                      <option key={`max-${midi}`} value={midi}>
                        {midiLabel(midi)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

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
                id="ear-timer-select"
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
            <div className="text-3xl font-bold text-gray-800">Play Back The Pattern</div>
            <div className="text-sm text-gray-500 mt-2">
              Listen to note-note-note, then enter the same 3 notes in order.
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-8">
            {getAllowedPitchClasses(settings).map(pitchClass => (
              <button
                key={pitchClass}
                onClick={() => submitAnswer(pitchClass + 1)}
                disabled={timeUp}
                className="px-3 py-3 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded font-semibold text-gray-800 text-sm transition"
              >
                {pitchClassLabel(pitchClass)}
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
              onClick={playExercise}
              disabled={timeUp}
              className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition"
            >
              {isPlaying ? 'Playing...' : 'Play Exercise'}
            </button>
            <button
              onClick={nextExercise}
              className="flex-1 px-6 py-3 bg-slate-900 hover:bg-black disabled:bg-gray-400 text-white font-bold rounded-lg transition"
              disabled={timeUp}
            >
              Next Exercise
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
