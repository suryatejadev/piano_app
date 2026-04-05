import React from 'react';

const PRESET_TIMER_MINUTES = [1, 3, 5, 10, 15];

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
  const effectiveTimer = PRESET_TIMER_MINUTES.includes(timerMinutes) ? timerMinutes : 5;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        Timer
      </label>
      <select
        id={id}
        value={effectiveTimer}
        onChange={e => setTimerMinutes(parseInt(e.target.value, 10))}
        disabled={disabled}
        className="rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-800"
      >
        {PRESET_TIMER_MINUTES.map(min => (
          <option key={min} value={min}>
            {min} min
          </option>
        ))}
      </select>
    </div>
  );
};
