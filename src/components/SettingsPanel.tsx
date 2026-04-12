import React from 'react';
import type { Difficulty } from '../types';
import { KeyMode, Clef } from '../types';

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
  const handleResetDefaults = () => {
    onDifficultyChange({
      tempo: 'medium',
      showAnswer: false,
      includeAccidentals: false,
      showOnScreenKeyboard: false,
      trebleMinNoteNumber: 60,
      trebleMaxNoteNumber: 72,
      bassMinNoteNumber: 48,
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

        <div className="flex flex-wrap gap-2">
          {([
            { label: 'C', root: 'C', mode: KeyMode.MAJOR },
            { label: 'G', root: 'G', mode: KeyMode.MAJOR },
            { label: 'F', root: 'F', mode: KeyMode.MAJOR },
            { label: 'D', root: 'D', mode: KeyMode.MAJOR },
            { label: 'Cm', root: 'C', mode: KeyMode.MINOR },
          ] as const).map(({ label, root, mode }) => (
            <button
              key={label}
              onClick={() => onDifficultyChange({ keyRoot: root, keyMode: mode })}
              disabled={disabled}
              className={`px-4 py-2 rounded font-medium transition text-sm ${
                difficulty.keyRoot === root && difficulty.keyMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {label}
            </button>
          ))}
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
