import React, { useEffect, useRef } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useMidi } from '../hooks/useMidi';
import { midiToNote } from '../utils/midiNoteMap';
import { StaffDisplay } from './StaffDisplay';
import { StatsDisplay } from './StatsDisplay';
import { SettingsPanel } from './SettingsPanel';
import { MidiConnectionStatus } from './MidiConnectionStatus';
import type { MidiNoteEvent } from '../types';

/**
 * Main game board component that orchestrates all game components
 */
export const GameBoard: React.FC = () => {
  const gameState = useGameState();
  const midi = useMidi();
  const timerRefId = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeMidiRef = useRef<(() => void) | null>(null);

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
      if (!gameState.state.gameActive) return;

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

  const handleStartGame = () => {
    if (!midi.isConnected) {
      alert('Please connect a MIDI device first!');
      return;
    }
    gameState.startGame();
  };

  const handleStopGame = () => {
    gameState.stopGame();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎹 Piano Note Reader</h1>
          <p className="text-gray-600">Learn to read music notes on the treble clef</p>
        </div>

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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Left: Settings */}
          <div className="min-w-0">
            <SettingsPanel
              difficulty={gameState.state.difficulty}
              onDifficultyChange={gameState.updateDifficulty}
              disabled={gameState.state.gameActive}
            />
          </div>

          {/* Center: Staff Display */}
          <div className="min-w-0">
            <StaffDisplay
              currentNote={gameState.state.currentNote}
              noteQueue={gameState.state.noteQueue}
              clef={gameState.state.difficulty.clef}
              showAnswer={gameState.state.difficulty.showAnswer}
              feedbackMessage={gameState.state.feedbackMessage}
            />

            {/* Game Control Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              {!gameState.state.gameActive ? (
                <>
                  <button
                    onClick={handleStartGame}
                    disabled={!midi.isConnected}
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition"
                  >
                    Start Game
                  </button>
                  <button
                    onClick={gameState.resetStats}
                    className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition"
                  >
                    Reset Stats
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStopGame}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
                >
                  Stop Game
                </button>
              )}
            </div>
          </div>

          {/* Right: Stats */}
          <div>
            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Your Stats</h2>
              <StatsDisplay stats={gameState.state.stats} />
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="border-t border-gray-300 pt-4 text-center text-sm text-gray-600">
          <p>
            {gameState.state.gameActive
              ? '🎮 Game in progress - Play notes on your MIDI keyboard!'
              : '⏸️ Game paused - Connect a MIDI device and press "Start Game" to begin'}
          </p>
        </div>
      </div>
    </div>
  );
};
