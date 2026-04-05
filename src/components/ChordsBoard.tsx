import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MidiConnectionStatus } from './MidiConnectionStatus';
import { TimerDoneOverlay } from './TimerDoneOverlay';
import { getStaffPosition } from '../utils/midiNoteMap';
import type { MidiNoteEvent } from '../types';
import type { UseMidiReturn } from '../hooks/useMidi';
import { Clef } from '../types';

type ChordQuality = 'major' | 'minor';
type ChordQuestionType = 'play' | 'identify';

interface ChordCard {
  type: ChordQuestionType;
  root: string;
  quality: ChordQuality;
  chordName: string;
  pitchClasses: number[];
  displayMidis: number[];
  prompt: string;
  options?: string[];
}

interface ChordsSettings {
  naturals: boolean;
  accidentals: boolean;
  playMode: boolean;
  identifyMode: boolean;
  showOnScreenKeyboard: boolean;
}

const DEFAULT_SETTINGS: ChordsSettings = {
  naturals: true,
  accidentals: false,
  playMode: true,
  identifyMode: true,
  showOnScreenKeyboard: true,
};

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NATURAL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ACCIDENTAL_NOTES = ['C#', 'D#', 'F#', 'G#', 'A#'];

const pitchClassLabel = (pitchClass: number): string => {
  return CHROMATIC_NOTES[((pitchClass % 12) + 12) % 12];
};

const chordLabel = (root: string, quality: ChordQuality): string => `${root} ${quality}`;

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const getAllowedRoots = (settings: ChordsSettings): string[] => {
  const roots: string[] = [];
  if (settings.naturals) roots.push(...NATURAL_NOTES);
  if (settings.accidentals) roots.push(...ACCIDENTAL_NOTES);
  return roots.length > 0 ? roots : [...CHROMATIC_NOTES];
};

const createChordPitchClasses = (rootPitchClass: number, quality: ChordQuality): number[] => {
  const third = quality === 'major' ? 4 : 3;
  return [
    rootPitchClass,
    (rootPitchClass + third) % 12,
    (rootPitchClass + 7) % 12,
  ];
};

const createDisplayMidis = (rootPitchClass: number, quality: ChordQuality): number[] => {
  const rootMidi = 60 + rootPitchClass;
  const third = quality === 'major' ? 4 : 3;
  return [rootMidi, rootMidi + third, rootMidi + 7];
};

const generateChordCard = (settings: ChordsSettings): ChordCard => {
  const roots = getAllowedRoots(settings);
  const types: ChordQuestionType[] = [];
  if (settings.playMode) types.push('play');
  if (settings.identifyMode) types.push('identify');
  const questionTypes = types.length > 0 ? types : (['play', 'identify'] as ChordQuestionType[]);

  const root = roots[Math.floor(Math.random() * roots.length)];
  const quality: ChordQuality = Math.random() < 0.5 ? 'major' : 'minor';
  const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
  const rootPitchClass = CHROMATIC_NOTES.indexOf(root);
  const pitchClasses = createChordPitchClasses(rootPitchClass, quality);
  const displayMidis = createDisplayMidis(rootPitchClass, quality);
  const name = chordLabel(root, quality);

  if (type === 'play') {
    return {
      type,
      root,
      quality,
      chordName: name,
      pitchClasses,
      displayMidis,
      prompt: `Play ${root} ${quality}`,
    };
  }

  const allChoices = roots.flatMap(r => [
    chordLabel(r, 'major'),
    chordLabel(r, 'minor'),
  ]);

  const distractors = shuffle(allChoices.filter(choice => choice !== name)).slice(0, 9);
  const options = shuffle([name, ...distractors]);

  return {
    type,
    root,
    quality,
    chordName: name,
    pitchClasses,
    displayMidis,
    prompt: 'Identify this chord from the staff',
    options,
  };
};

const renderChordStaff = (midis: number[]) => {
  const STAFF_WIDTH = 700;
  const STAFF_HEIGHT = 220;
  const MARGIN = 40;
  const LINE_SPACING = 24;
  const STAFF_TOP = MARGIN + 30;
  const staffLines = [0, 1, 2, 3, 4].map(i => STAFF_TOP + i * LINE_SPACING);
  const NOTE_X = STAFF_WIDTH / 2;

  const noteY = (staffPosition: number) => {
    const lineYIndex = 4 - staffPosition / 2;
    return STAFF_TOP + lineYIndex * LINE_SPACING;
  };

  return (
    <svg
      viewBox={`0 0 ${STAFF_WIDTH} ${STAFF_HEIGHT}`}
      width="100%"
      className="w-full h-[250px] border border-gray-200 rounded"
    >
      {staffLines.map((y, i) => (
        <line
          key={`staff-line-${i}`}
          x1={MARGIN}
          y1={y}
          x2={STAFF_WIDTH - MARGIN}
          y2={y}
          stroke="black"
          strokeWidth="1.5"
        />
      ))}

      <line
        x1={MARGIN}
        y1={staffLines[0]}
        x2={MARGIN}
        y2={staffLines[4]}
        stroke="black"
        strokeWidth="2"
      />
      <line
        x1={STAFF_WIDTH - MARGIN}
        y1={staffLines[0]}
        x2={STAFF_WIDTH - MARGIN}
        y2={staffLines[4]}
        stroke="black"
        strokeWidth="2"
      />

      <text
        x={MARGIN + 30}
        y={staffLines[3] + 8}
        fontSize="60"
        fontWeight="bold"
        fill="#111827"
        textAnchor="middle"
      >
        𝄞
      </text>

      {midis.map((midi, idx) => {
        const pos = getStaffPosition(midi, Clef.TREBLE) ?? 0;
        const y = noteY(pos);
        const x = NOTE_X + (idx - 1) * 20;

        return (
          <g key={`chord-note-${midi}-${idx}`}>
            <ellipse cx={x} cy={y} rx="10" ry="12" fill="#111827" stroke="#111827" strokeWidth="1" />
            <line x1={x + 10} y1={y} x2={x + 10} y2={y - 35} stroke="#111827" strokeWidth="2" />
          </g>
        );
      })}
    </svg>
  );
};

export const ChordsBoard: React.FC<{ timerMinutes: number; setTimerMinutes: (mins: number) => void; midi: UseMidiReturn }> = ({
  timerMinutes,
  setTimerMinutes,
  midi,
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

  const roundDurationSeconds = timerMinutes * 60;

  const resetSession = useCallback(() => {
    setCorrectCount(0);
    setWrongCount(0);
    setElapsedSeconds(0);
    setHasStarted(false);
    setTimeUp(false);
    setShowTimerDone(false);
    setFeedback('');
    setCard(generateChordCard(settings));
    attemptedPitchClassesRef.current.clear();
  }, [settings]);

  const nextCard = useCallback(() => {
    if (timeUp) return;
    setCard(generateChordCard(settings));
    setFeedback('');
    attemptedPitchClassesRef.current.clear();
  }, [settings, timeUp]);

  useEffect(() => {
    setCard(generateChordCard(settings));
    setFeedback('');
    attemptedPitchClassesRef.current.clear();
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
  }, [timeUp]);

  const handleDismissTimerDone = useCallback(() => {
    setShowTimerDone(false);
  }, []);

  const registerInput = useCallback((playedPitchClass: number, source: 'midi' | 'onscreen') => {
    if (timeUp) {
      if (showTimerDone) return; // block input during the 3s overlay window
      // overlay dismissed: reset and start fresh
      resetSession();
      setHasStarted(true);
      return;
    }

    if (card.type === 'identify') {
      if (source === 'midi') {
        setFeedback('Use the chord options below for this question.');
      }
      return;
    }

    if (!hasStarted) {
      setHasStarted(true);
    }

    if (card.pitchClasses.includes(playedPitchClass)) {
      attemptedPitchClassesRef.current.add(playedPitchClass);
      const nextCount = attemptedPitchClassesRef.current.size;

      if (nextCount >= card.pitchClasses.length) {
        setCorrectCount(c => c + 1);
        setFeedback('Correct!');
        attemptedPitchClassesRef.current.clear();
        setTimeout(() => {
          setCard(generateChordCard(settings));
          setFeedback('');
        }, 500);
      } else {
        setFeedback(`Good. ${nextCount}/${card.pitchClasses.length} notes entered.`);
      }
    } else {
      setWrongCount(w => w + 1);
      attemptedPitchClassesRef.current.clear();
      setFeedback(`Incorrect: ${pitchClassLabel(playedPitchClass)} is not in the chord.`);
    }
  }, [timeUp, card, hasStarted, settings]);

  const handleIdentifyChoice = (choice: string) => {
    if (card.type !== 'identify') return;

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

    if (choice === card.chordName) {
      setCorrectCount(c => c + 1);
      setFeedback(`Correct! ${choice}`);
      setTimeout(() => {
        setCard(generateChordCard(settings));
        setFeedback('');
      }, 500);
    } else {
      setWrongCount(w => w + 1);
      setFeedback(`Incorrect: ${choice}`);
    }
  };

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
                checked={settings.playMode}
                onChange={e => setSettings(prev => ({ ...prev, playMode: e.target.checked }))}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Play Chord</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.identifyMode}
                onChange={e => setSettings(prev => ({ ...prev, identifyMode: e.target.checked }))}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Identify from Sheet</span>
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
                <label htmlFor="chords-timer-select" className="text-sm font-medium text-gray-700">
                  Timer
                </label>
                <select
                  id="chords-timer-select"
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
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-gray-800">{card.prompt}</div>
            {card.type === 'play' && (
              <div className="text-sm text-gray-500 mt-2">Enter all chord tones</div>
            )}
          </div>

          {card.type === 'identify' && (
            <div className="mb-8 space-y-4">
              {renderChordStaff(card.displayMidis)}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(card.options ?? []).map(option => (
                  <button
                    key={option}
                    onClick={() => handleIdentifyChoice(option)}
                    disabled={timeUp}
                    className="px-3 py-2 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded font-semibold text-gray-800 text-sm transition"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          {card.type === 'play' && settings.showOnScreenKeyboard && (
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
