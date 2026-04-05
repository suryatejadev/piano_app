import React from 'react';
import type { Stats } from '../types';

interface StatsDisplayProps {
  stats: Stats;
}

/**
 * Component to display game statistics
 */
export const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats }) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const accuracy = stats.totalNotes > 0 
    ? Math.round((stats.correctHits / stats.totalNotes) * 100) 
    : 0;

  return (
    <div className="flex gap-8 justify-center p-6 bg-slate-100 rounded-lg">
      <div className="text-center">
        <div className="text-4xl font-bold text-blue-600">{stats.correctHits}</div>
        <div className="text-sm text-gray-600 mt-2">Correct Hits</div>
      </div>

      <div className="text-center">
        <div className="text-4xl font-bold text-green-600">{stats.streak}</div>
        <div className="text-sm text-gray-600 mt-2">Current Streak</div>
        {stats.maxStreak > 0 && (
          <div className="text-xs text-gray-500 mt-1">Max: {stats.maxStreak}</div>
        )}
      </div>

      <div className="text-center">
        <div className="text-4xl font-bold text-purple-600">{accuracy}%</div>
        <div className="text-sm text-gray-600 mt-2">Accuracy</div>
        {stats.totalNotes > 0 && (
          <div className="text-xs text-gray-500 mt-1">{stats.totalNotes} notes</div>
        )}
      </div>

      <div className="text-center">
        <div className="text-4xl font-bold text-orange-600">
          {formatTime(stats.elapsedSeconds)}
        </div>
        <div className="text-sm text-gray-600 mt-2">Time</div>
      </div>
    </div>
  );
};
