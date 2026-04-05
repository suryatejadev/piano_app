import React from 'react';
import type { Difficulty } from '../types';
import { KeyMode, Clef } from '../types';
import { getMidiNote } from '../utils/midiNoteMap';

interface SettingsPanelProps {
  difficulty: Difficulty;
  onDifficultyChange: (newDifficulty: Partial<Difficulty>) => void;
  disabled?: boolean;
}

/**
 * Component for game difficulty settings
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  difficulty,
  onDifficultyChange,
  disabled = false,
}) => {
  const handleClefChange = (clef: Clef) => {
    onDifficultyChange({ clef });
  };

  const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-300 space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Settings</h2>

      {/* Key Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Key (Major / Minor)
        </label>
        
        <div className="flex gap-2 mb-3">
          {(['MAJOR', 'MINOR'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => onDifficultyChange({ keyMode: mode === 'MAJOR' ? KeyMode.MAJOR : KeyMode.MINOR })}
              disabled={disabled}
              className={`flex-1 px-3 py-2 rounded font-medium transition text-sm ${
                difficulty.keyMode === (mode === 'MAJOR' ? KeyMode.MAJOR : KeyMode.MINOR)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {CHROMATIC_NOTES.map(note => (
            <button
              key={note}
              onClick={() => onDifficultyChange({ keyRoot: note })}
              disabled={disabled}
              className={`px-3 py-2 rounded font-medium transition text-sm ${
                difficulty.keyRoot === note
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {note}
            </button>
          ))}
        </div>
      </div>

      {/* Clef Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Clef
        </label>
        <div className="flex gap-3">
          {[Clef.TREBLE, Clef.BASS].map(clef => (
            <button
              key={clef}
              onClick={() => handleClefChange(clef)}
              disabled={disabled}
              className={`px-4 py-2 rounded font-medium transition ${
                difficulty.clef === clef
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {clef.charAt(0) + clef.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Show Answer Toggle */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={difficulty.showAnswer}
            onChange={e => onDifficultyChange({ showAnswer: e.target.checked })}
            disabled={disabled}
            className="w-5 h-5 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Show Answer</span>
        </label>
      </div>

      {/* Include Accidentals Toggle */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={difficulty.includeAccidentals}
            onChange={e =>
              onDifficultyChange({
                includeAccidentals: e.target.checked,
              })
            }
            disabled={disabled}
            className="w-5 h-5 rounded"
          />
          <span className="text-sm font-medium text-gray-700">
            Include Sharps & Flats
          </span>
        </label>
      </div>

      {/* Show On-screen Keyboard Toggle */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={difficulty.showOnScreenKeyboard}
            onChange={e => onDifficultyChange({ showOnScreenKeyboard: e.target.checked })}
            disabled={disabled}
            className="w-5 h-5 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Show On-screen Keyboard</span>
        </label>
      </div>

      {/* Note Range Selection */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Note Range
        </label>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-600">Minimum Note</span>
              <span className="text-sm font-semibold text-gray-800">
                {getMidiNote(difficulty.minNoteNumber)?.noteName}{getMidiNote(difficulty.minNoteNumber)?.octave}
              </span>
            </div>
            <input
              type="range"
              min="36"
              max={difficulty.maxNoteNumber}
              value={difficulty.minNoteNumber}
              onChange={e => onDifficultyChange({ minNoteNumber: parseInt(e.target.value) })}
              disabled={disabled}
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">C3 — {getMidiNote(difficulty.maxNoteNumber)?.noteName}{getMidiNote(difficulty.maxNoteNumber)?.octave}</div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-600">Maximum Note</span>
              <span className="text-sm font-semibold text-gray-800">
                {getMidiNote(difficulty.maxNoteNumber)?.noteName}{getMidiNote(difficulty.maxNoteNumber)?.octave}
              </span>
            </div>
            <input
              type="range"
              min={difficulty.minNoteNumber}
              max="96"
              value={difficulty.maxNoteNumber}
              onChange={e => onDifficultyChange({ maxNoteNumber: parseInt(e.target.value) })}
              disabled={disabled}
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">{getMidiNote(difficulty.minNoteNumber)?.noteName}{getMidiNote(difficulty.minNoteNumber)?.octave} — C7</div>
          </div>
        </div>
      </div>
    </div>
  );
};
