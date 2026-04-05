import React from 'react';
import type { MidiDevice } from '../types';

interface MidiConnectionStatusProps {
  isSupported: boolean;
  isConnected: boolean;
  selectedDevice: MidiDevice | null;
  devices: MidiDevice[];
  error: string | null;
  onConnect: (deviceId: string) => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}

/**
 * Component to display MIDI connection status and device selection
 */
export const MidiConnectionStatus: React.FC<MidiConnectionStatusProps> = ({
  isSupported,
  isConnected,
  selectedDevice,
  devices,
  error,
  onConnect,
  onDisconnect,
  onRefresh,
}) => {
  if (!isSupported) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 rounded-lg text-red-800">
        <p className="font-bold">⚠️ Web MIDI Not Supported</p>
        <p className="text-sm mt-2">
          Your browser doesn't support Web MIDI API. Try Chrome, Edge, or Opera.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-lg text-yellow-800">
        <p className="font-bold">⚠️ MIDI Error</p>
        <p className="text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (isConnected && selectedDevice) {
    return (
      <div className="p-4 bg-green-100 border border-green-400 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <div>
              <p className="font-bold text-green-800">MIDI Connected</p>
              <p className="text-sm text-green-700">{selectedDevice.name}</p>
            </div>
          </div>
          <button
            onClick={onDisconnect}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium text-sm transition"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-100 border border-blue-400 rounded-lg">
      <p className="font-bold text-blue-800 mb-3">🎹 Connect MIDI Keyboard</p>

      {devices.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-blue-700">No MIDI devices found.</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition"
          >
            Refresh Devices
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-blue-700 mb-2">Available devices:</p>
          <div className="space-y-2">
            {devices.map(device => (
              <button
                key={device.id}
                onClick={() => onConnect(device.id)}
                className="w-full px-4 py-2 bg-white hover:bg-blue-50 text-blue-800 rounded border border-blue-300 font-medium text-sm transition text-left"
              >
                {device.name}
                {device.manufacturer && <span className="text-gray-600"> - {device.manufacturer}</span>}
              </button>
            ))}
          </div>
          <button
            onClick={onRefresh}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition"
          >
            Refresh Devices
          </button>
        </div>
      )}
    </div>
  );
};
