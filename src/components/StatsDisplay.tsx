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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-100 rounded-lg">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{stats.correctHits}</div>
        <div className="text-xs text-gray-600 mt-1">Correct Hits</div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{stats.streak}</div>
        <div className="text-xs text-gray-600 mt-1">Current Streak</div>
        {stats.maxStreak > 0 && (
          <div className="text-xs text-gray-500 mt-1">Max: {stats.maxStreak}</div>
        )}
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">{accuracy}%</div>
        <div className="text-xs text-gray-600 mt-1">Accuracy</div>
        {stats.totalNotes > 0 && (
          <div className="text-xs text-gray-500 mt-1">{stats.totalNotes} notes</div>
        )}
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold text-orange-600">
          {formatTime(stats.elapsedSeconds)}
        </div>
        <div className="text-xs text-gray-600 mt-1">Time</div>
      </div>
    </div>
  );
};
