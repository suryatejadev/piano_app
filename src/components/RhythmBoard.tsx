import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TimerDoneOverlay } from './TimerDoneOverlay';
import { SharedTimerControl } from './SharedTimerControl';

// --- Types ---

type NoteValue =
  | 'whole' | 'half' | 'dottedHalf' | 'quarter' | 'dottedQuarter' | 'eighth'
  | 'halfRest' | 'quarterRest' | 'eighthRest';

interface RhythmEvent { value: NoteValue; dur: number; }

interface RhythmSettings { bpm: number; }

// --- Constants ---

const DEFAULT_SETTINGS: RhythmSettings = { bpm: 80 };

const DUR: Record<NoteValue, number> = {
  whole: 8, half: 4, dottedHalf: 6, quarter: 2, dottedQuarter: 3, eighth: 1,
  halfRest: 4, quarterRest: 2, eighthRest: 1,
};

const ev = (v: NoteValue): RhythmEvent => ({ value: v, dur: DUR[v] });
const isRest = (v: NoteValue) => v.endsWith('Rest');

// All patterns sum to 8 eighth notes (one bar of 4/4)
const PATTERNS: RhythmEvent[][] = [
  // Tier 1: quarters / halves / whole
  [ev('quarter'), ev('quarter'), ev('quarter'), ev('quarter')],
  [ev('half'), ev('quarter'), ev('quarter')],
  [ev('quarter'), ev('quarter'), ev('half')],
  [ev('half'), ev('half')],
  [ev('whole')],
  [ev('quarter'), ev('half'), ev('quarter')],
  [ev('dottedHalf'), ev('quarter')],
  // Tier 2: eighth notes
  [ev('eighth'), ev('eighth'), ev('quarter'), ev('quarter'), ev('quarter')],
  [ev('quarter'), ev('eighth'), ev('eighth'), ev('quarter'), ev('quarter')],
  [ev('quarter'), ev('quarter'), ev('eighth'), ev('eighth'), ev('quarter')],
  [ev('quarter'), ev('quarter'), ev('quarter'), ev('eighth'), ev('eighth')],
  [ev('eighth'), ev('eighth'), ev('eighth'), ev('eighth'), ev('quarter'), ev('quarter')],
  [ev('eighth'), ev('eighth'), ev('quarter'), ev('eighth'), ev('eighth'), ev('quarter')],
  [ev('eighth'), ev('eighth'), ev('eighth'), ev('eighth'), ev('eighth'), ev('eighth'), ev('eighth'), ev('eighth')],
  // Tier 3: dotted rhythms
  [ev('dottedQuarter'), ev('eighth'), ev('quarter'), ev('quarter')],
  [ev('quarter'), ev('dottedQuarter'), ev('eighth'), ev('quarter')],
  [ev('quarter'), ev('quarter'), ev('dottedQuarter'), ev('eighth')],
  [ev('dottedQuarter'), ev('eighth'), ev('dottedQuarter'), ev('eighth')],
  // Tier 4: rests
  [ev('quarter'), ev('quarterRest'), ev('quarter'), ev('quarter')],
  [ev('quarterRest'), ev('quarter'), ev('quarter'), ev('quarter')],
  [ev('quarter'), ev('quarter'), ev('quarterRest'), ev('quarter')],
  [ev('eighthRest'), ev('eighth'), ev('quarter'), ev('quarter'), ev('quarter')],
];

const GRID_LABELS = ['1', '&', '2', '&', '3', '&', '4', '&'];

// --- Helpers ---

interface GridCell { label: string; type: 'onset' | 'hold' | 'rest'; }

const getCountingGrid = (pattern: RhythmEvent[]): GridCell[] => {
  const cells: GridCell[] = Array.from({ length: 8 }, (_, i) => ({
    label: GRID_LABELS[i], type: 'hold' as const,
  }));
  let pos = 0;
  for (const e of pattern) {
    for (let i = 0; i < e.dur && pos + i < 8; i++) {
      if (isRest(e.value)) {
        cells[pos + i] = { label: GRID_LABELS[pos + i], type: 'rest' };
      } else if (i === 0) {
        cells[pos + i] = { label: GRID_LABELS[pos + i], type: 'onset' };
      }
      // else stays 'hold'
    }
    pos += e.dur;
  }
  return cells;
};

const pickPattern = (prevIndex: number): number => {
  let idx: number;
  do { idx = Math.floor(Math.random() * PATTERNS.length); } while (idx === prevIndex && PATTERNS.length > 1);
  return idx;
};

// --- Notation SVG ---

const RhythmNotation: React.FC<{ pattern: RhythmEvent[] }> = ({ pattern }) => {
  const W = 600, H = 140, STAFF_Y = 70;
  const SX = 90, EX = 555;
  const SLOT = (EX - SX) / 8;

  interface NP { x: number; noteEv: RhythmEvent; pos: number; idx: number; }
  const notes: NP[] = [];
  let pos = 0;
  for (let i = 0; i < pattern.length; i++) {
    notes.push({ x: SX + pos * SLOT + 18, noteEv: pattern[i], pos, idx: i });
    pos += pattern[i].dur;
  }

  // Beam groups: consecutive eighths within same beat
  const runs: number[][] = [];
  let run: number[] = [];
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].noteEv.value === 'eighth') { run.push(i); }
    else { if (run.length > 0) { runs.push(run); run = []; } }
  }
  if (run.length > 0) runs.push(run);

  const beamGroups: number[][] = [];
  for (const r of runs) {
    let sub: number[] = [];
    for (const idx of r) {
      if (sub.length > 0 && Math.floor(notes[idx].pos / 2) !== Math.floor(notes[sub[sub.length - 1]].pos / 2)) {
        if (sub.length >= 2) beamGroups.push(sub);
        sub = [];
      }
      sub.push(idx);
    }
    if (sub.length >= 2) beamGroups.push(sub);
  }
  const beamedSet = new Set(beamGroups.flat());

  const RX = 8, RY = 6, STEM_H = 32;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-2xl mx-auto" style={{ height: 140 }}>
      {/* Staff line */}
      <line x1={60} y1={STAFF_Y} x2={EX + 15} y2={STAFF_Y} stroke="black" strokeWidth="1.5" />
      {/* Barlines */}
      <line x1={60} y1={STAFF_Y - 24} x2={60} y2={STAFF_Y + 24} stroke="black" strokeWidth="2" />
      <line x1={EX + 15} y1={STAFF_Y - 24} x2={EX + 15} y2={STAFF_Y + 24} stroke="black" strokeWidth="2" />
      {/* Time signature */}
      <text x={72} y={STAFF_Y - 4} fontSize="18" fontWeight="bold" fill="black" textAnchor="middle">4</text>
      <text x={72} y={STAFF_Y + 16} fontSize="18" fontWeight="bold" fill="black" textAnchor="middle">4</text>

      {notes.map(({ x, noteEv, idx }) => {
        if (isRest(noteEv.value)) {
          if (noteEv.value === 'quarterRest') {
            return (
              <path key={idx}
                d={`M${x - 3},${STAFF_Y - 12} L${x + 5},${STAFF_Y - 4} L${x - 5},${STAFF_Y + 4} L${x + 3},${STAFF_Y + 12}`}
                stroke="black" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            );
          }
          if (noteEv.value === 'halfRest') {
            return <rect key={idx} x={x - 7} y={STAFF_Y - 10} width={14} height={7} fill="black" />;
          }
          if (noteEv.value === 'eighthRest') {
            return (
              <g key={idx}>
                <circle cx={x + 1} cy={STAFF_Y - 3} r={2.5} fill="black" />
                <line x1={x} y1={STAFF_Y - 2} x2={x + 4} y2={STAFF_Y + 10} stroke="black" strokeWidth="2" />
              </g>
            );
          }
          return null;
        }

        const filled = noteEv.value !== 'whole' && noteEv.value !== 'half' && noteEv.value !== 'dottedHalf';
        const hasStem = noteEv.value !== 'whole';
        const dotted = noteEv.value.startsWith('dotted');
        const stemX = x + RX;
        const stemTop = STAFF_Y - STEM_H;

        return (
          <g key={idx}>
            <ellipse cx={x} cy={STAFF_Y} rx={RX} ry={RY}
              fill={filled ? 'black' : 'white'} stroke="black" strokeWidth="1.5"
              transform={`rotate(-10 ${x} ${STAFF_Y})`} />
            {hasStem && (
              <line x1={stemX} y1={STAFF_Y - 2} x2={stemX} y2={stemTop} stroke="black" strokeWidth="1.5" />
            )}
            {noteEv.value === 'eighth' && !beamedSet.has(idx) && (
              <path d={`M${stemX},${stemTop} Q${stemX + 10},${stemTop + 10} ${stemX + 2},${stemTop + 18}`}
                stroke="black" strokeWidth="1.5" fill="none" />
            )}
            {dotted && <circle cx={x + RX + 6} cy={STAFF_Y - 2} r={2.5} fill="black" />}
          </g>
        );
      })}

      {/* Beams */}
      {beamGroups.map((group, gi) => {
        const first = notes[group[0]];
        const last = notes[group[group.length - 1]];
        const y = STAFF_Y - STEM_H;
        return (
          <line key={`beam-${gi}`}
            x1={first.x + RX} y1={y} x2={last.x + RX} y2={y}
            stroke="black" strokeWidth="3.5" />
        );
      })}
    </svg>
  );
};

// --- Metronome ---

const playClick = (ctx: AudioContext, time: number, accent: boolean) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = accent ? 1000 : 800;
  gain.gain.setValueAtTime(accent ? 0.3 : 0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.08);
};

// --- Component ---

export const RhythmBoard: React.FC<{ timerMinutes: number; setTimerMinutes: (m: number) => void; onSessionComplete?: (r: { section: string; correct_count: number; wrong_count: number; duration_seconds: number }) => void }> = ({
  timerMinutes,
  setTimerMinutes,
  onSessionComplete,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<RhythmSettings>(DEFAULT_SETTINGS);
  const [patternIndex, setPatternIndex] = useState(() => Math.floor(Math.random() * PATTERNS.length));
  const [showAnswer, setShowAnswer] = useState(false);
  const [patternsCount, setPatternsCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [showTimerDone, setShowTimerDone] = useState(false);
  const [metronomePlaying, setMetronomePlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const metronomeRef = useRef<number | null>(null);
  const nextBeatRef = useRef(0);
  const beatCountRef = useRef(0);

  const pattern = PATTERNS[patternIndex];
  const countingGrid = getCountingGrid(pattern);
  const roundDurationSeconds = timerMinutes * 60;

  const ensureAudio = (): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const stopMetronome = useCallback(() => {
    if (metronomeRef.current) {
      clearInterval(metronomeRef.current);
      metronomeRef.current = null;
    }
    setMetronomePlaying(false);
    setCurrentBeat(-1);
  }, []);

  const startMetronome = useCallback(async () => {
    const ctx = ensureAudio();
    if (ctx.state === 'suspended') await ctx.resume();

    const beatDur = 60 / settings.bpm;
    beatCountRef.current = 0;
    nextBeatRef.current = ctx.currentTime + 0.1;

    const tick = () => {
      const beat = beatCountRef.current % 4;
      playClick(ctx, nextBeatRef.current, beat === 0);
      setCurrentBeat(beat);
      nextBeatRef.current += beatDur;
      beatCountRef.current++;
    };

    tick();
    metronomeRef.current = window.setInterval(tick, beatDur * 1000);
    setMetronomePlaying(true);
  }, [settings.bpm]);

  const toggleMetronome = useCallback(() => {
    if (metronomePlaying) {
      stopMetronome();
    } else {
      if (!hasStarted) setHasStarted(true);
      void startMetronome();
    }
  }, [metronomePlaying, hasStarted, startMetronome, stopMetronome]);

  const nextPattern = useCallback(() => {
    if (timeUp) {
      if (showTimerDone) return;
      // Reset session
      setPatternsCount(0);
      setElapsedSeconds(0);
      setTimeUp(false);
      setShowTimerDone(false);
      setPatternIndex(prev => pickPattern(prev));
      setShowAnswer(false);
      setHasStarted(true);
      return;
    }
    setPatternsCount(c => c + 1);
    setPatternIndex(prev => pickPattern(prev));
    setShowAnswer(false);
    if (!hasStarted) setHasStarted(true);
  }, [timeUp, showTimerDone, hasStarted]);

  // Timer
  useEffect(() => {
    if (timeUp || !hasStarted) return;
    const id = setInterval(() => {
      setElapsedSeconds(prev => {
        if (prev >= roundDurationSeconds - 1) {
          setTimeUp(true);
          return roundDurationSeconds;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timeUp, hasStarted, roundDurationSeconds]);

  useEffect(() => {
    if (timeUp) {
      stopMetronome();
      setShowTimerDone(true);
      onSessionComplete?.({ section: 'rhythm', correct_count: patternsCount, wrong_count: 0, duration_seconds: elapsedSeconds });
    }
  }, [timeUp, stopMetronome]);

  const handleDismissTimerDone = useCallback(() => setShowTimerDone(false), []);

  // Cleanup
  useEffect(() => () => {
    if (metronomeRef.current) clearInterval(metronomeRef.current);
    audioCtxRef.current?.close().catch(() => {});
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <TimerDoneOverlay show={showTimerDone} onDismiss={handleDismissTimerDone} />

      {settingsOpen && (
        <button
          onClick={() => setSettingsOpen(false)}
          aria-label="Close rhythm settings"
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

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tempo (BPM)</label>
              <input
                type="number"
                min={40}
                max={200}
                value={settings.bpm}
                onChange={e => {
                  const val = parseInt(e.target.value) || 80;
                  setSettings(prev => ({ ...prev, bpm: Math.max(40, Math.min(200, val)) }));
                }}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800"
              />
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
        {/* Header */}
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
                id="rhythm-timer"
                timerMinutes={timerMinutes}
                setTimerMinutes={setTimerMinutes}
                disabled={hasStarted && !timeUp}
              />
            </div>

            <div className="w-full sm:w-auto sm:max-w-[440px]">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-300 p-3 shadow-sm">
                <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Your Stats</h2>
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-100 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{patternsCount}</div>
                    <div className="text-xs text-gray-600 mt-1">Patterns</div>
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

        {/* Main card */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 shadow-sm">
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-gray-800">Clap This Rhythm</div>
            <div className="text-sm text-gray-500 mt-1">
              Say the counting out loud and clap on each note onset
            </div>
          </div>

          {/* Notation */}
          <div className="mb-6">
            <RhythmNotation pattern={pattern} />
          </div>

          {/* Metronome controls + beat indicator */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={toggleMetronome}
              disabled={timeUp}
              className={`px-5 py-2 rounded-lg font-bold transition ${
                metronomePlaying
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {metronomePlaying ? 'Stop Metronome' : `Start Metronome (${settings.bpm} BPM)`}
            </button>
          </div>

          {metronomePlaying && (
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map(beat => (
                <div
                  key={beat}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-75 ${
                    currentBeat === beat
                      ? 'bg-blue-600 text-white scale-110'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {beat + 1}
                </div>
              ))}
            </div>
          )}

          {/* Show/Hide Answer */}
          <div className="mb-6">
            <button
              onClick={() => setShowAnswer(v => !v)}
              className="w-full px-4 py-2 rounded-lg font-semibold transition bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300"
            >
              {showAnswer ? 'Hide Answer' : 'Show Answer'}
            </button>
          </div>

          {/* Counting strip */}
          {showAnswer && (
            <div className="mb-6">
              <div className="flex justify-center gap-1">
                {countingGrid.map((cell, i) => (
                  <div
                    key={i}
                    className={`w-12 h-14 rounded flex flex-col items-center justify-center text-sm font-bold transition ${
                      cell.type === 'onset'
                        ? 'bg-blue-600 text-white'
                        : cell.type === 'rest'
                          ? 'bg-red-100 text-red-400 line-through'
                          : 'bg-gray-100 text-gray-300'
                    }`}
                  >
                    <span>{cell.label}</span>
                    {cell.type === 'onset' && <span className="text-xs mt-0.5">clap</span>}
                    {cell.type === 'rest' && <span className="text-xs mt-0.5">—</span>}
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-gray-500 mt-2">
                Blue = say &amp; clap &middot; Gray = hold &middot; Red = rest (silence)
              </p>
            </div>
          )}

          {/* Next button */}
          <div className="flex gap-3">
            <button
              onClick={nextPattern}
              className="flex-1 px-6 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-lg transition"
            >
              Next Pattern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
