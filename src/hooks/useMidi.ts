import { useEffect, useState, useCallback } from 'react';
import type { MidiDevice, MidiNoteEvent } from '../types';
import { midiManager } from '../utils/midiManager';

export interface UseMidiReturn {
  isSupported: boolean;
  isInitialized: boolean;
  isConnected: boolean;
  devices: MidiDevice[];
  selectedDevice: MidiDevice | null;
  error: string | null;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => void;
  onNote: (callback: (event: MidiNoteEvent) => void) => () => void;
  refreshDevices: () => void;
}

/**
 * Hook to manage MIDI device connection and input
 */
export const useMidi = (): UseMidiReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<MidiDevice | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize MIDI on mount
  useEffect(() => {
    const initMidi = async () => {
      try {
        const hasSupport = navigator?.requestMIDIAccess !== undefined;
        setIsSupported(hasSupport);

        if (!hasSupport) {
          setError('Web MIDI API not supported in this browser');
          return;
        }

        await midiManager.initialize();
        setIsInitialized(true);
        setError(null);

        // Get initial list of devices
        const availableDevices = midiManager.getAvailableInputDevices();
        setDevices(availableDevices);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        setIsSupported(false);
      }
    };

    initMidi();
  }, []);

  const connect = useCallback(async (deviceId: string) => {
    try {
      midiManager.connectToDevice(deviceId);
      const connectedDevice = midiManager.getConnectedDevice();
      setSelectedDevice(connectedDevice);
      setIsConnected(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    midiManager.disconnect();
    setSelectedDevice(null);
    setIsConnected(false);
  }, []);

  const onNote = useCallback((callback: (event: MidiNoteEvent) => void) => {
    return midiManager.onNote(callback);
  }, []);

  const refreshDevices = useCallback(() => {
    const availableDevices = midiManager.getAvailableInputDevices();
    setDevices(availableDevices);
  }, []);

  return {
    isSupported,
    isInitialized,
    isConnected,
    devices,
    selectedDevice,
    error,
    connect,
    disconnect,
    onNote,
    refreshDevices,
  };
};
