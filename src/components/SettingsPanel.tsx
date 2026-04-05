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
  const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NOTE_RANGE_MIN = 24; // C1
  const NOTE_RANGE_MAX = 96; // C7

  const midiOptions = Array.from(
    { length: NOTE_RANGE_MAX - NOTE_RANGE_MIN + 1 },
    (_, i) => NOTE_RANGE_MIN + i,
  );

  const trebleMinOptions = midiOptions.filter(n => n <= difficulty.trebleMaxNoteNumber);
  const trebleMaxOptions = midiOptions.filter(n => n >= difficulty.trebleMinNoteNumber);
  const bassMinOptions = midiOptions.filter(n => n <= difficulty.bassMaxNoteNumber);
  const bassMaxOptions = midiOptions.filter(n => n >= difficulty.bassMinNoteNumber);

  const getNoteLabel = (midiNumber: number): string => {
    const note = getMidiNote(midiNumber);
    return note ? `${note.noteName}${note.octave}` : `${midiNumber}`;
  };

  const handleTrebleMinChange = (value: number) => {
    onDifficultyChange({
      trebleMinNoteNumber: value,
      trebleMaxNoteNumber: Math.max(value, difficulty.trebleMaxNoteNumber),
    });
  };

  const handleTrebleMaxChange = (value: number) => {
    onDifficultyChange({
      trebleMinNoteNumber: Math.min(value, difficulty.trebleMinNoteNumber),
      trebleMaxNoteNumber: value,
    });
  };

  const handleBassMinChange = (value: number) => {
    onDifficultyChange({
      bassMinNoteNumber: value,
      bassMaxNoteNumber: Math.max(value, difficulty.bassMaxNoteNumber),
    });
  };

  const handleBassMaxChange = (value: number) => {
    onDifficultyChange({
      bassMinNoteNumber: Math.min(value, difficulty.bassMinNoteNumber),
      bassMaxNoteNumber: value,
    });
  };

  const handleResetDefaults = () => {
    onDifficultyChange({
      tempo: 'medium',
      showAnswer: false,
      includeAccidentals: false,
      showOnScreenKeyboard: false,
      trebleMinNoteNumber: 57,
      trebleMaxNoteNumber: 84,
      bassMinNoteNumber: 45,
      bassMaxNoteNumber: 60,
      keyRoot: 'C',
      keyMode: KeyMode.MAJOR,
      clef: Clef.TREBLE,
      displayDurationMs: 2000,
    });
  };

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-300 space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Settings</h2>

      {/* Staff */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Staff
        </label>
        <div className="flex gap-3">
          {[Clef.TREBLE, Clef.BASS, Clef.GRAND].map(clef => (
            <button
              key={clef}
              onClick={() => onDifficultyChange({ clef })}
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

      {/* Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Key
        </label>

        <div className="flex gap-2 mb-3">
          {[KeyMode.MAJOR, KeyMode.MINOR].map(mode => (
            <button
              key={mode}
              onClick={() => onDifficultyChange({ keyMode: mode })}
              disabled={disabled}
              className={`flex-1 px-3 py-2 rounded font-medium transition text-sm ${
                difficulty.keyMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {mode === KeyMode.MAJOR ? 'Major' : 'Minor'}
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

      {/* Notes */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Notes
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Treble Min</label>
            <select
              value={difficulty.trebleMinNoteNumber}
              onChange={e => handleTrebleMinChange(parseInt(e.target.value, 10))}
              disabled={disabled}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
            >
              {trebleMinOptions.map(midi => (
                <option key={`treble-min-${midi}`} value={midi} className="text-black">
                  {getNoteLabel(midi)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Treble Max</label>
            <select
              value={difficulty.trebleMaxNoteNumber}
              onChange={e => handleTrebleMaxChange(parseInt(e.target.value, 10))}
              disabled={disabled}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
            >
              {trebleMaxOptions.map(midi => (
                <option key={`treble-max-${midi}`} value={midi} className="text-black">
                  {getNoteLabel(midi)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Bass Min</label>
            <select
              value={difficulty.bassMinNoteNumber}
              onChange={e => handleBassMinChange(parseInt(e.target.value, 10))}
              disabled={disabled}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
            >
              {bassMinOptions.map(midi => (
                <option key={`bass-min-${midi}`} value={midi} className="text-black">
                  {getNoteLabel(midi)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Bass Max</label>
            <select
              value={difficulty.bassMaxNoteNumber}
              onChange={e => handleBassMaxChange(parseInt(e.target.value, 10))}
              disabled={disabled}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
            >
              {bassMaxOptions.map(midi => (
                <option key={`bass-max-${midi}`} value={midi} className="text-black">
                  {getNoteLabel(midi)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Misc */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Misc
        </label>

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

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={difficulty.includeAccidentals}
            onChange={e => onDifficultyChange({ includeAccidentals: e.target.checked })}
            disabled={disabled}
            className="w-5 h-5 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Include Sharps & Flats</span>
        </label>

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

        <button
          onClick={handleResetDefaults}
          disabled={disabled}
          className={`w-full px-4 py-2 rounded font-medium transition text-sm ${
            disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};
