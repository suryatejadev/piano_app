import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TimerDoneOverlay } from './TimerDoneOverlay';
import { SharedTimerControl } from './SharedTimerControl';
import type { MidiNoteEvent } from '../types';
import type { UseMidiReturn } from '../hooks/useMidi';

/* ─── Types ──────────────────────────────────────────────── */

type ScaleModeId = 'twoHand1Oct' | 'chordScales' | 'chordInversions' | 'pentatonic';

interface ModeConfig {
  enabled: boolean;
  scales: { major: boolean; minor: boolean };
  notes: { naturals: boolean; accidentals: boolean };
}

interface ScalesSettings {
  modes: Record<ScaleModeId, ModeConfig>;
}

interface ScaleCard {
  label: string;
  rootNote: string;
  modeId: ScaleModeId;
  scaleType: 'major' | 'minor';
  expectedMidi: number[];
  noteLabels: string[];
  ascLen: number; // length of ascending portion
}

/* ─── Constants ──────────────────────────────────────────── */

const MODE_META: { id: ScaleModeId; label: string }[] = [
  { id: 'twoHand1Oct', label: '2 Hand 1 Octave' },
  { id: 'chordScales', label: '2 Hands Chord Scales' },
  { id: 'chordInversions', label: 'Chord Inversions 2 Octaves' },
  { id: 'pentatonic', label: 'Pentatonic' },
];

const NATURAL_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ACCIDENTAL_ROOTS = ['Db', 'Eb', 'F#', 'Ab', 'Bb'];
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const INTERVALS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  majorChord: [0, 4, 7],
  minorChord: [0, 3, 7],
};

const DEFAULT_SETTINGS: ScalesSettings = {
  modes: {
    twoHand1Oct: { enabled: true, scales: { major: true, minor: true }, notes: { naturals: true, accidentals: false } },
    chordScales: { enabled: true, scales: { major: true, minor: false }, notes: { naturals: true, accidentals: false } },
    chordInversions: { enabled: true, scales: { major: true, minor: false }, notes: { naturals: true, accidentals: false } },
    pentatonic: { enabled: true, scales: { major: true, minor: false }, notes: { naturals: true, accidentals: false } },
  },
};

/* ─── Helpers ────────────────────────────────────────────── */

function rootToMidi(root: string, octave: number): number {
  let idx = CHROMATIC_SHARP.indexOf(root);
  if (idx === -1) idx = CHROMATIC_FLAT.indexOf(root);
  return (octave + 1) * 12 + idx;
}

function midiToLabel(midi: number, useFlats: boolean): string {
  const names = useFlats ? CHROMATIC_FLAT : CHROMATIC_SHARP;
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
}

function buildSequence(rootMidi: number, intervals: number[], octaves: number): { notes: number[]; ascLen: number } {
  const ascending: number[] = [];
  for (let oct = 0; oct < octaves; oct++) {
    for (const interval of intervals) ascending.push(rootMidi + oct * 12 + interval);
  }
  ascending.push(rootMidi + octaves * 12); // top note
  const descending = [...ascending].reverse().slice(1);
  return { notes: [...ascending, ...descending], ascLen: ascending.length };
}

function generateCard(settings: ScalesSettings, prevLabel?: string): ScaleCard | null {
  const enabled = (Object.entries(settings.modes) as [ScaleModeId, ModeConfig][]).filter(([, c]) => c.enabled);
  if (enabled.length === 0) return null;

  for (let attempt = 0; attempt < 20; attempt++) {
    const [modeId, cfg] = enabled[Math.floor(Math.random() * enabled.length)];

    const scaleTypes: ('major' | 'minor')[] = [];
    if (cfg.scales.major) scaleTypes.push('major');
    if (cfg.scales.minor) scaleTypes.push('minor');
    if (scaleTypes.length === 0) continue;
    const scaleType = scaleTypes[Math.floor(Math.random() * scaleTypes.length)];

    const roots: string[] = [];
    if (cfg.notes.naturals) roots.push(...NATURAL_ROOTS);
    if (cfg.notes.accidentals) roots.push(...ACCIDENTAL_ROOTS);
    if (roots.length === 0) continue;
    const rootNote = roots[Math.floor(Math.random() * roots.length)];

    const useFlats = FLAT_KEYS.has(rootNote);
    const rootMidi = rootToMidi(rootNote, 4);

    let intervals: number[];
    let octaves: number;
    switch (modeId) {
      case 'twoHand1Oct':
        intervals = INTERVALS[scaleType];
        octaves = 1;
        break;
      case 'chordScales':
        intervals = INTERVALS[scaleType + 'Chord'];
        octaves = 1;
        break;
      case 'chordInversions':
        intervals = INTERVALS[scaleType + 'Chord'];
        octaves = 2;
        break;
      case 'pentatonic':
        intervals = INTERVALS[scaleType + 'Pentatonic'];
        octaves = 1;
        break;
    }

    const { notes: expectedMidi, ascLen } = buildSequence(rootMidi, intervals, octaves);
    const noteLabels = expectedMidi.map(m => midiToLabel(m, useFlats));
    const modeLabel = MODE_META.find(m => m.id === modeId)!.label;
    const label = `${rootNote} ${scaleType === 'major' ? 'Major' : 'Minor'} — ${modeLabel}`;

    if (label === prevLabel && enabled.length > 1) continue;

    return { label, rootNote, modeId, scaleType, expectedMidi, noteLabels, ascLen };
  }
  return null;
}

/* ─── Component ──────────────────────────────────────────── */

export const ScalesBoard: React.FC<{
  timerMinutes: number;
  setTimerMinutes: (mins: number) => void;
  midi: UseMidiReturn;
  onSessionComplete?: (r: { section: string; correct_count: number; wrong_count: number; duration_seconds: number }) => void;
}> = ({ timerMinutes, setTimerMinutes, midi, onSessionComplete }) => {
  const [settings, setSettings] = useState<ScalesSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [card, setCard] = useState<ScaleCard | null>(() => generateCard(DEFAULT_SETTINGS));
  const [noteIndex, setNoteIndex] = useState(0);
  const [noteStatuses, setNoteStatuses] = useState<('pending' | 'correct' | 'wrong')[]>([]);
  const [scalesCompleted, setScalesCompleted] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [showTimerDone, setShowTimerDone] = useState(false);

  const roundDurationSeconds = timerMinutes * 60;
  const prevLabelRef = useRef<string | undefined>(card?.label);

  // Regenerate card when settings change (skip initial render)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const next = generateCard(settings);
    setCard(next);
    if (next) prevLabelRef.current = next.label;
  }, [settings]);

  const advanceCard = useCallback(() => {
    const next = generateCard(settings, prevLabelRef.current);
    if (next) {
      prevLabelRef.current = next.label;
      setCard(next);
      setNoteIndex(0);
      setNoteStatuses(new Array(next.expectedMidi.length).fill('pending'));
    } else {
      setCard(null);
    }
  }, [settings]);

  // Reset note tracking when card changes
  useEffect(() => {
    if (card) {
      setNoteStatuses(new Array(card.expectedMidi.length).fill('pending'));
      setNoteIndex(0);
    }
  }, [card]);

  // MIDI input — check notes
  useEffect(() => {
    const callback = (event: MidiNoteEvent) => {
      if (timeUp) {
        if (showTimerDone) return;
        setScalesCompleted(0);
        setWrongCount(0);
        setElapsedSeconds(0);
        setTimeUp(false);
        advanceCard();
        setHasStarted(true);
        return;
      }

      if (!hasStarted) setHasStarted(true);
      if (!card) return;

      // C1 (MIDI 24) = skip
      if (event.noteNumber === 24) {
        setScalesCompleted(prev => prev + 1);
        advanceCard();
        return;
      }

      const expectedPitchClass = card.expectedMidi[noteIndex] % 12;
      const playedPitchClass = event.noteNumber % 12;

      if (playedPitchClass === expectedPitchClass) {
        setNoteStatuses(prev => {
          const next = [...prev];
          next[noteIndex] = 'correct';
          return next;
        });
        const nextIdx = noteIndex + 1;
        if (nextIdx >= card.expectedMidi.length) {
          setScalesCompleted(prev => prev + 1);
          advanceCard();
        } else {
          setNoteIndex(nextIdx);
        }
      } else {
        setWrongCount(prev => prev + 1);
        const idx = noteIndex;
        setNoteStatuses(prev => {
          const next = [...prev];
          next[idx] = 'wrong';
          return next;
        });
        setTimeout(() => {
          setNoteStatuses(prev => {
            const next = [...prev];
            if (next[idx] === 'wrong') next[idx] = 'pending';
            return next;
          });
        }, 400);
      }
    };

    const unsub = midi.onNote(callback);
    return () => unsub();
  }, [midi, hasStarted, timeUp, showTimerDone, card, noteIndex, advanceCard]);

  // Timer
  useEffect(() => {
    if (timeUp || !hasStarted) return;
    const id = setInterval(() => {
      setElapsedSeconds(prev => {
        if (prev >= roundDurationSeconds - 1) { setTimeUp(true); return roundDurationSeconds; }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timeUp, hasStarted, roundDurationSeconds]);

  // Timer done
  useEffect(() => {
    if (!timeUp) return;
    setShowTimerDone(true);
    onSessionComplete?.({ section: 'scales', correct_count: scalesCompleted, wrong_count: wrongCount, duration_seconds: elapsedSeconds });
  }, [timeUp]);

  const handleDismissTimerDone = useCallback(() => setShowTimerDone(false), []);

  const handleSkip = () => {
    if (timeUp) return;
    if (!hasStarted) setHasStarted(true);
    setScalesCompleted(prev => prev + 1);
    advanceCard();
  };

  const resetSession = () => {
    setScalesCompleted(0);
    setWrongCount(0);
    setElapsedSeconds(0);
    setHasStarted(false);
    setTimeUp(false);
    setShowTimerDone(false);
    advanceCard();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const updateMode = (modeId: ScaleModeId, fn: (c: ModeConfig) => ModeConfig) => {
    setSettings(prev => ({ ...prev, modes: { ...prev.modes, [modeId]: fn(prev.modes[modeId]) } }));
  };

  /* ─── Render ─── */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <TimerDoneOverlay show={showTimerDone} onDismiss={handleDismissTimerDone} />
      <div className="max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <SharedTimerControl
                id="scales-timer-select"
                timerMinutes={timerMinutes}
                setTimerMinutes={setTimerMinutes}
                disabled={hasStarted && !timeUp}
              />
              <button
                onClick={() => setShowSettings(s => !s)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border transition ${
                  showSettings ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Configure
              </button>
            </div>

            <div className="w-full sm:w-auto sm:max-w-[440px]">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-300 p-3 shadow-sm">
                <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Your Stats</h2>
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-100 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{scalesCompleted}</div>
                    <div className="text-xs text-gray-600 mt-1">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{wrongCount}</div>
                    <div className="text-xs text-gray-600 mt-1">Wrong Notes</div>
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

        {/* Settings panel */}
        {showSettings && (
          <div className="mb-6 bg-white rounded-lg border border-gray-300 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Configure Modes</h3>
            <div className="flex items-center gap-6 mb-4 text-xs text-gray-500 ml-6">
              <span className="w-14"></span>
              <span>Scales: <b>Major</b> / <b>Minor</b></span>
              <span>Notes: <b>Naturals</b> / <b>Accidentals</b></span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MODE_META.map(({ id: modeId, label }) => {
                const cfg = settings.modes[modeId];
                return (
                  <div
                    key={modeId}
                    className={`rounded-lg border p-4 transition ${
                      cfg.enabled ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 bg-gray-50/50 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={() => updateMode(modeId, c => ({ ...c, enabled: !c.enabled }))}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span className="font-semibold text-gray-800">{label}</span>
                    </label>
                    {cfg.enabled && (
                      <div className="ml-6 space-y-2 text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600 w-14">Scales:</span>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" checked={cfg.scales.major} onChange={() => updateMode(modeId, c => ({ ...c, scales: { ...c.scales, major: !c.scales.major } }))} className="w-3.5 h-3.5 accent-blue-600" />
                            Major
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" checked={cfg.scales.minor} onChange={() => updateMode(modeId, c => ({ ...c, scales: { ...c.scales, minor: !c.scales.minor } }))} className="w-3.5 h-3.5 accent-blue-600" />
                            Minor
                          </label>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600 w-14">Notes:</span>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" checked={cfg.notes.naturals} onChange={() => updateMode(modeId, c => ({ ...c, notes: { ...c.notes, naturals: !c.notes.naturals } }))} className="w-3.5 h-3.5 accent-blue-600" />
                            Naturals
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" checked={cfg.notes.accidentals} onChange={() => updateMode(modeId, c => ({ ...c, notes: { ...c.notes, accidentals: !c.notes.accidentals } }))} className="w-3.5 h-3.5 accent-blue-600" />
                            Accidentals
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main card */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 shadow-sm">
          {card ? (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-slate-900 mb-2">{card.label}</div>
                <div className="text-sm text-gray-500">Play the notes in order · Press C1 or click Skip to advance</div>
              </div>

              {/* Note sequence - hidden, only progress bar shown */}

              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2 mb-8">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: card.expectedMidi.length > 0 ? `${(noteIndex / card.expectedMidi.length) * 100}%` : '0%' }}
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSkip}
                  disabled={timeUp}
                  className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition disabled:opacity-50"
                >
                  Skip
                </button>
                <button
                  onClick={resetSession}
                  className="flex-1 px-6 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-lg transition"
                >
                  Reset Session
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-xl text-gray-600 mb-4">No modes enabled</div>
              <button
                onClick={() => setShowSettings(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
              >
                Open Configure
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
