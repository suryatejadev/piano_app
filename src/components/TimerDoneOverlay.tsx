import React, { useEffect } from 'react';

interface TimerDoneOverlayProps {
  show: boolean;
  onDismiss: () => void;
}

export const TimerDoneOverlay: React.FC<TimerDoneOverlayProps> = ({ show, onDismiss }) => {
  useEffect(() => {
    if (!show) return;
    const id = setTimeout(onDismiss, 3000);
    return () => clearTimeout(id);
  }, [show, onDismiss]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="text-center px-14 py-10 bg-white/90 rounded-2xl shadow-2xl">
        <div className="text-6xl mb-4">🎉</div>
        <div className="text-4xl font-bold text-green-600">Timer is Done!</div>
        <div className="text-sm text-gray-500 mt-4">Press any key to start a new session</div>
      </div>
    </div>
  );
};
