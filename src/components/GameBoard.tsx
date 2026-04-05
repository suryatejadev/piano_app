import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameState } from '../hooks/useGameState';
import { TimerDoneOverlay } from './TimerDoneOverlay';
import { midiToNote } from '../utils/midiNoteMap';
import { StaffDisplay } from './StaffDisplay';
import { StatsDisplay } from './StatsDisplay';
import { SettingsPanel } from './SettingsPanel';
import { MidiConnectionStatus } from './MidiConnectionStatus';
import { SharedTimerControl } from './SharedTimerControl';
import { getKeyNotes } from '../utils/scaleManager';
import type { MidiNoteEvent, Note } from '../types';
import type { UseMidiReturn } from '../hooks/useMidi';

/**
 * Main game board component that orchestrates all game components
 */
export const GameBoard: React.FC<{ timerMinutes: number; setTimerMinutes: (mins: number) => void; midi: UseMidiReturn }> = ({
  timerMinutes,
  setTimerMinutes,
  midi,
}) => {
  const gameState = useGameState();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showTimerDone, setShowTimerDone] = useState(false);
  const timerRefId = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeMidiRef = useRef<(() => void) | null>(null);
  const hasTriggeredAutoResetRef = useRef(false);

  const handleOnScreenInput = (note: Note) => {
    if (!gameState.state.gameActive) {
      if (showTimerDone) return; // block input during the 3s overlay window
      if (hasTriggeredAutoResetRef.current) {
        hasTriggeredAutoResetRef.current = false;
        gameState.resetStats();
      }
      gameState.startGame();
      return;
    }
    gameState.handleNotePlay(note);
  };

  // Update stats timer
  useEffect(() => {
    if (gameState.state.gameActive) {
      timerRefId.current = setInterval(() => {
        gameState.updateTimerTick();
      }, 1000);
    }

    return () => {
      if (timerRefId.current) clearInterval(timerRefId.current);
    };
  }, [gameState.state.gameActive, gameState.updateTimerTick]);

  // Handle MIDI note input
  useEffect(() => {
    // Subscribe to MIDI note events
    const callback = (event: MidiNoteEvent) => {
      if (!gameState.state.gameActive) {
        if (showTimerDone) return; // block input during the 3s overlay window
        if (hasTriggeredAutoResetRef.current) {
          hasTriggeredAutoResetRef.current = false;
          gameState.resetStats();
        }
        gameState.startGame();
        return;
      }

      const playedNote = midiToNote(event.noteNumber, gameState.state.difficulty.clef);
      if (playedNote) {
        gameState.handleNotePlay(playedNote);
      }
    };

    unsubscribeMidiRef.current = midi.onNote(callback);

    return () => {
      if (unsubscribeMidiRef.current) {
        unsubscribeMidiRef.current();
      }
    };
  }, [
    midi.onNote,
    gameState.state.gameActive,
    gameState.state.difficulty.clef,
    gameState.handleNotePlay,
  ]);

  // Update MIDI connection status in game state
  useEffect(() => {
    gameState.setMidiConnected(midi.isConnected);
  }, [midi.isConnected, gameState.setMidiConnected]);

  // Stop the game automatically when timer reaches the selected duration.
  useEffect(() => {
    if (!gameState.state.gameActive) return;

    const timerLimitSeconds = timerMinutes * 60;
    if (gameState.state.stats.elapsedSeconds >= timerLimitSeconds) {
      gameState.stopGame();
    }
  }, [
    gameState.state.gameActive,
    gameState.state.stats.elapsedSeconds,
    timerMinutes,
    gameState.stopGame,
  ]);

  // Show overlay when game stops due to timer
  useEffect(() => {
    const isGameStopped = !gameState.state.gameActive;
    const isTimeUp = gameState.state.stats.elapsedSeconds >= timerMinutes * 60 - 1;

    if (!isGameStopped || !isTimeUp || hasTriggeredAutoResetRef.current) {
      return;
    }

    hasTriggeredAutoResetRef.current = true;
    setShowTimerDone(true);
  }, [gameState.state.gameActive, gameState.state.stats.elapsedSeconds, timerMinutes]);

  const handleDismissTimerDone = useCallback(() => {
    setShowTimerDone(false);
  }, []);

  // Build on-screen note buttons from the current key, respecting note range
  const scaleNotes: Note[] = getKeyNotes(gameState.state.difficulty.keyRoot, gameState.state.difficulty.keyMode, gameState.state.difficulty.includeAccidentals)
    .map(midi => midiToNote(midi, gameState.state.difficulty.clef))
    .filter((n): n is Note => {
      if (!n) return false;

      const d = gameState.state.difficulty;
      if (d.clef === 'TREBLE' || d.clef === 'ALTO') {
        return n.midiNumber >= d.trebleMinNoteNumber && n.midiNumber <= d.trebleMaxNoteNumber;
      }
      if (d.clef === 'BASS') {
        return n.midiNumber >= d.bassMinNoteNumber && n.midiNumber <= d.bassMaxNoteNumber;
      }
      return (
        (n.midiNumber >= d.trebleMinNoteNumber && n.midiNumber <= d.trebleMaxNoteNumber) ||
        (n.midiNumber >= d.bassMinNoteNumber && n.midiNumber <= d.bassMaxNoteNumber)
      );
    });

  const handleStopGame = () => {
    gameState.stopGame();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <TimerDoneOverlay show={showTimerDone} onDismiss={handleDismissTimerDone} />
      {settingsOpen && (
        <button
          onClick={() => setSettingsOpen(false)}
          aria-label="Close settings"
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
          <div className="p-4 overflow-y-auto">
            <SettingsPanel
              difficulty={gameState.state.difficulty}
              onDifficultyChange={gameState.updateDifficulty}
              disabled={gameState.state.gameActive}
            />
          </div>
        </div>
      </aside>

      <div className="max-w-6xl mx-auto">
        {/* MIDI Connection Status */}
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

        {/* Main content area */}
        <div className="mb-8">
          <div className="relative min-w-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="px-4 py-2 rounded-md bg-slate-900 hover:bg-black text-white font-semibold transition"
                >
                  Configure
                </button>

                <SharedTimerControl
                  id="timer-select"
                  timerMinutes={timerMinutes}
                  setTimerMinutes={setTimerMinutes}
                  disabled={gameState.state.gameActive}
                />
              </div>

              <div className="w-full sm:w-auto sm:max-w-[440px]">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-300 p-3 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Your Stats</h2>
                  <StatsDisplay stats={gameState.state.stats} />
                </div>
              </div>
            </div>

            <div>
            <StaffDisplay
              currentNote={gameState.state.currentNote}
              noteQueue={gameState.state.noteQueue}
              clef={gameState.state.difficulty.clef}
              showAnswer={gameState.state.difficulty.showAnswer}
              feedbackMessage={gameState.state.feedbackMessage}
              lastPlayedNote={gameState.state.lastPlayedNote}
              showWrongNote={gameState.state.feedbackMessage.includes('Try again')}
            />
            </div>

            {/* Game Control Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={gameState.resetStats}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition"
              >
                Reset Stats
              </button>
              {gameState.state.gameActive && (
                <button
                  onClick={handleStopGame}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
                >
                  Stop Game
                </button>
              )}
            </div>

            {/* On-screen note buttons for debugging without MIDI */}
            {gameState.state.difficulty.showOnScreenKeyboard && (
              <div className="mt-6">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 text-center">
                  On-screen keyboard (debug)
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {scaleNotes.map(note => (
                    <button
                      key={note.midiNumber}
                      onClick={() => handleOnScreenInput(note)}
                      className="px-3 py-2 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded font-semibold text-gray-800 text-sm transition"
                    >
                      {note.name}
                      {note.isSharp ? '♯' : note.isFlat ? '♭' : ''}
                      <span className="text-xs text-gray-400 ml-0.5">{note.octave}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="border-t border-gray-300 pt-4 text-center text-sm text-gray-600">
          <p>
            {gameState.state.gameActive
              ? '🎮 Game in progress - Play a note below or use your MIDI keyboard!'
              : '⏸️ Game paused - Press any note on your keyboard (or on-screen keyboard) to begin'}
          </p>
        </div>
      </div>
    </div>
  );
};
