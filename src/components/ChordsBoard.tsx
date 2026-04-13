import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MidiConnectionStatus } from './MidiConnectionStatus';
import { TimerDoneOverlay } from './TimerDoneOverlay';
import { SharedTimerControl } from './SharedTimerControl';
import type { MidiNoteEvent } from '../types';
import type { UseMidiReturn } from '../hooks/useMidi';

type ChordQuality = 'major' | 'minor' | 'dom7' | 'maj7';
type CardType = 'major' | 'minor' | 'dom7' | 'maj7' | 'ii-V-I';

interface ProgressionStep {
  chordName: string;
  pitchClasses: number[];
}

interface ChordCard {
  root: string;
  quality: ChordQuality;
  chordName: string;
  pitchClasses: number[];
  displayMidis: number[];
  prompt: string;
  progression?: ProgressionStep[];
}

interface ChordsSettings {
  accidentals: boolean;
  showOnScreenKeyboard: boolean;
}

const DEFAULT_SETTINGS: ChordsSettings = {
  accidentals: false,
  showOnScreenKeyboard: true,
};

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NATURAL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ACCIDENTAL_NOTES = ['C#', 'D#', 'F#', 'G#', 'A#'];

const pitchClassLabel = (pitchClass: number): string => {
  return CHROMATIC_NOTES[((pitchClass % 12) + 12) % 12];
};

const chordLabel = (root: string, quality: ChordQuality): string => {
  switch (quality) {
    case 'major': return `${root} major`;
    case 'minor': return `${root} minor`;
    case 'dom7': return `${root}7`;
    case 'maj7': return `${root}maj7`;
  }
};

const WEIGHTED_CARD_TYPES: Array<{ type: CardType; weight: number }> = [
  { type: 'major', weight: 5 },
  { type: 'minor', weight: 5 },
  { type: 'ii-V-I', weight: 3 },
  { type: 'dom7', weight: 2 },
  { type: 'maj7', weight: 2 },
];

function weightedPickCardType(): CardType {
  const total = WEIGHTED_CARD_TYPES.reduce((s, q) => s + q.weight, 0);
  let r = Math.random() * total;
  for (const q of WEIGHTED_CARD_TYPES) {
    r -= q.weight;
    if (r <= 0) return q.type;
  }
  return 'major';
}

const getAllowedRoots = (settings: ChordsSettings): string[] => {
  const roots = [...NATURAL_NOTES];
  if (settings.accidentals) roots.push(...ACCIDENTAL_NOTES);
  return roots;
};

const createChordPitchClasses = (rootPitchClass: number, quality: ChordQuality): number[] => {
  switch (quality) {
    case 'major':
      return [rootPitchClass, (rootPitchClass + 4) % 12, (rootPitchClass + 7) % 12];
    case 'minor':
      return [rootPitchClass, (rootPitchClass + 3) % 12, (rootPitchClass + 7) % 12];
    case 'dom7':
      return [rootPitchClass, (rootPitchClass + 4) % 12, (rootPitchClass + 7) % 12, (rootPitchClass + 10) % 12];
    case 'maj7':
      return [rootPitchClass, (rootPitchClass + 4) % 12, (rootPitchClass + 7) % 12, (rootPitchClass + 11) % 12];
  }
};

const createDisplayMidis = (rootPitchClass: number, quality: ChordQuality): number[] => {
  const rootMidi = 60 + rootPitchClass;
  switch (quality) {
    case 'major':
      return [rootMidi, rootMidi + 4, rootMidi + 7];
    case 'minor':
      return [rootMidi, rootMidi + 3, rootMidi + 7];
    case 'dom7':
      return [rootMidi, rootMidi + 4, rootMidi + 7, rootMidi + 10];
    case 'maj7':
      return [rootMidi, rootMidi + 4, rootMidi + 7, rootMidi + 11];
  }
};

const generateChordCard = (settings: ChordsSettings, prevChordName?: string): ChordCard => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const card = generateChordCardInner(settings);
    if (card.chordName !== prevChordName || attempt === 9) return card;
  }
  return generateChordCardInner(settings);
};

const generateChordCardInner = (settings: ChordsSettings): ChordCard => {
  const roots = getAllowedRoots(settings);
  const cardType = weightedPickCardType();

  if (cardType === 'ii-V-I') {
    // Pick the "I" root, build ii-V-I triads
    const iRoot = roots[Math.floor(Math.random() * roots.length)];
    const iRootPc = CHROMATIC_NOTES.indexOf(iRoot);
    const iiRootPc = (iRootPc + 2) % 12;
    const vRootPc = (iRootPc + 7) % 12;
    const iiName = `${CHROMATIC_NOTES[iiRootPc]}m`;
    const vName = CHROMATIC_NOTES[vRootPc];
    const iName = iRoot;

    const progression: ProgressionStep[] = [
      { chordName: iiName, pitchClasses: createChordPitchClasses(iiRootPc, 'minor') },
      { chordName: vName, pitchClasses: createChordPitchClasses(vRootPc, 'major') },
      { chordName: iName, pitchClasses: createChordPitchClasses(iRootPc, 'major') },
    ];

    return {
      root: iRoot,
      quality: 'major',
      chordName: `ii-V-I in ${iRoot}`,
      pitchClasses: progression[0].pitchClasses,
      displayMidis: [],
      prompt: `ii-V-I in ${iRoot}`,
      progression,
    };
  }

  const root = roots[Math.floor(Math.random() * roots.length)];
  const quality = cardType as ChordQuality;
  const rootPitchClass = CHROMATIC_NOTES.indexOf(root);
  const pitchClasses = createChordPitchClasses(rootPitchClass, quality);
  const displayMidis = createDisplayMidis(rootPitchClass, quality);
  const name = chordLabel(root, quality);

  return {
    root,
    quality,
    chordName: name,
    pitchClasses,
    displayMidis,
    prompt: `Play ${name}`,
  };
};

export const ChordsBoard: React.FC<{ timerMinutes: number; setTimerMinutes: (mins: number) => void; midi: UseMidiReturn; onSessionComplete?: (r: { section: string; correct_count: number; wrong_count: number; duration_seconds: number }) => void }> = ({
  timerMinutes,
  setTimerMinutes,
  midi,
  onSessionComplete,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ChordsSettings>(DEFAULT_SETTINGS);
  const [card, setCard] = useState<ChordCard>(() => generateChordCard(DEFAULT_SETTINGS));
  const [feedback, setFeedback] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [showTimerDone, setShowTimerDone] = useState(false);
  const unsubscribeMidiRef = useRef<(() => void) | null>(null);
  const attemptedPitchClassesRef = useRef<Set<number>>(new Set());
  const [progressionStep, setProgressionStep] = useState(0);

  const roundDurationSeconds = timerMinutes * 60;

  const resetSession = useCallback(() => {
    setCorrectCount(0);
    setWrongCount(0);
    setElapsedSeconds(0);
    setHasStarted(false);
    setTimeUp(false);
    setShowTimerDone(false);
    setFeedback('');
    setCard(prev => generateChordCard(settings, prev.chordName));
    attemptedPitchClassesRef.current.clear();
    setProgressionStep(0);
  }, [settings]);

  const nextCard = useCallback(() => {
    if (timeUp) return;
    setCard(prev => generateChordCard(settings, prev.chordName));
    setFeedback('');
    attemptedPitchClassesRef.current.clear();
    setProgressionStep(0);
  }, [settings, timeUp]);

  useEffect(() => {
    setCard(prev => generateChordCard(settings, prev.chordName));
    setFeedback('');
    attemptedPitchClassesRef.current.clear();
    setProgressionStep(0);
  }, [settings]);

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
    onSessionComplete?.({ section: 'chords', correct_count: correctCount, wrong_count: wrongCount, duration_seconds: elapsedSeconds });
  }, [timeUp]);

  const handleDismissTimerDone = useCallback(() => {
    setShowTimerDone(false);
  }, []);

  const registerInput = useCallback((playedPitchClass: number, _source: 'midi' | 'onscreen') => {
    if (timeUp) {
      if (showTimerDone) return;
      resetSession();
      setHasStarted(true);
      return;
    }

    if (!hasStarted) {
      setHasStarted(true);
    }

    // Determine which pitch classes to check against
    const currentPitchClasses = card.progression
      ? card.progression[progressionStep].pitchClasses
      : card.pitchClasses;
    const currentChordName = card.progression
      ? card.progression[progressionStep].chordName
      : card.chordName;

    if (currentPitchClasses.includes(playedPitchClass)) {
      attemptedPitchClassesRef.current.add(playedPitchClass);
      const nextCount = attemptedPitchClassesRef.current.size;

      if (nextCount >= currentPitchClasses.length) {
        attemptedPitchClassesRef.current.clear();

        if (card.progression && progressionStep < card.progression.length - 1) {
          // Advance to next chord in progression
          const nextStep = progressionStep + 1;
          setProgressionStep(nextStep);
          setFeedback(`${currentChordName} done! Now play ${card.progression[nextStep].chordName}`);
        } else {
          // Single chord complete, or final progression step
          setCorrectCount(c => c + 1);
          setFeedback('Correct!');
          setTimeout(() => {
            setCard(prev => generateChordCard(settings, prev.chordName));
            setProgressionStep(0);
            setFeedback('');
          }, 500);
        }
      } else {
        setFeedback(`Good. ${nextCount}/${currentPitchClasses.length} notes entered.`);
      }
    } else {
      setWrongCount(w => w + 1);
      attemptedPitchClassesRef.current.clear();
      if (card.progression) {
        setProgressionStep(0);
        setFeedback(`Incorrect: ${pitchClassLabel(playedPitchClass)} is not in ${currentChordName}. Restart from ${card.progression[0].chordName}.`);
      } else {
        setFeedback(`Incorrect: ${pitchClassLabel(playedPitchClass)} is not in the chord.`);
      }
    }
  }, [timeUp, card, hasStarted, settings, showTimerDone, resetSession, progressionStep]);

  useEffect(() => {
    const callback = (event: MidiNoteEvent) => {
      registerInput(event.noteNumber % 12, 'midi');
    };

    unsubscribeMidiRef.current = midi.onNote(callback);

    return () => {
      if (unsubscribeMidiRef.current) {
        unsubscribeMidiRef.current();
      }
    };
  }, [midi, registerInput]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onScreenKeys = getAllowedRoots(settings);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <TimerDoneOverlay show={showTimerDone} onDismiss={handleDismissTimerDone} />
      {settingsOpen && (
        <button
          onClick={() => setSettingsOpen(false)}
          aria-label="Close chords settings"
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
                checked={settings.accidentals}
                onChange={e => setSettings(prev => ({ ...prev, accidentals: e.target.checked }))}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Include Accidentals</span>
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
                id="chords-timer-select"
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
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-gray-800">{card.prompt}</div>
            <div className="text-sm text-gray-500 mt-2">Enter all chord tones</div>
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
                      onClick={() => registerInput(pitchClass, 'onscreen')}
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
