import React from 'react';
import type { Difficulty } from '../types';
import { Scale, Clef } from '../types';
import { getScaleDisplayName } from '../utils/scaleManager';

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
  const handleTempoChange = (tempo: 'slow' | 'medium' | 'fast') => {
    const durationMap = {
      slow: 3000,
      medium: 2000,
      fast: 1000,
    };
    onDifficultyChange({ tempo, displayDurationMs: durationMap[tempo] });
  };

  const handleScaleChange = (scale: Scale) => {
    onDifficultyChange({ scale });
  };

  const handleClefChange = (clef: Clef) => {
    onDifficultyChange({ clef });
  };

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-300 space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Settings</h2>

      {/* Tempo Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Tempo / Display Speed
        </label>
        <div className="flex gap-3">
          {(['slow', 'medium', 'fast'] as const).map(tempo => (
            <button
              key={tempo}
              onClick={() => handleTempoChange(tempo)}
              disabled={disabled}
              className={`px-4 py-2 rounded font-medium transition ${
                difficulty.tempo === tempo
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tempo.charAt(0).toUpperCase() + tempo.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Scale Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Scale
        </label>
        <div className="flex gap-3">
          {[Scale.C_MAJOR, Scale.A_MINOR].map(scale => (
            <button
              key={scale}
              onClick={() => handleScaleChange(scale)}
              disabled={disabled}
              className={`px-4 py-2 rounded font-medium transition ${
                difficulty.scale === scale
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {getScaleDisplayName(scale)}
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
          {[Clef.TREBLE, Clef.BASS, Clef.ALTO].map(clef => (
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
    </div>
  );
};
