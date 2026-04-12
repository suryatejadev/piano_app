import React from 'react';

interface SharedTimerControlProps {
  id: string;
  timerMinutes: number;
  setTimerMinutes: (minutes: number) => void;
  disabled: boolean;
}

export const SharedTimerControl: React.FC<SharedTimerControlProps> = ({
  id,
  timerMinutes,
  setTimerMinutes,
  disabled,
}) => {
  const totalSeconds = Math.round(timerMinutes * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  const handleMinsChange = (newMins: number) => {
    const clamped = Math.max(0, Math.min(99, newMins));
    setTimerMinutes(clamped + secs / 60);
  };

  const handleSecsChange = (newSecs: number) => {
    const clamped = Math.max(0, Math.min(59, newSecs));
    setTimerMinutes(mins + clamped / 60);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`${id}-mins`} className="text-sm font-medium text-gray-700">
        Timer
      </label>
      <input
        id={`${id}-mins`}
        type="number"
        min={0}
        max={99}
        value={mins}
        onChange={e => handleMinsChange(parseInt(e.target.value, 10) || 0)}
        disabled={disabled}
        className="w-14 rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-800 text-center"
      />
      <span className="text-sm text-gray-600">min</span>
      <input
        id={`${id}-secs`}
        type="number"
        min={0}
        max={59}
        value={secs}
        onChange={e => handleSecsChange(parseInt(e.target.value, 10) || 0)}
        disabled={disabled}
        className="w-14 rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-800 text-center"
      />
      <span className="text-sm text-gray-600">sec</span>
    </div>
  );
};
