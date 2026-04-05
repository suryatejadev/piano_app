import type { MidiDevice, MidiNoteEvent } from '../types';

export type MidiNoteCallback = (event: MidiNoteEvent) => void;

/**
 * Manages MIDI device connection and note input
 */
export class MidiManager {
  private midiAccess: WebMidi.MIDIAccess | null = null;
  private inputDevice: WebMidi.MIDIInput | null = null;
  private noteCallbacks: Set<MidiNoteCallback> = new Set();
  private isInitialized = false;

  /**
   * Initialize MIDI access
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (!navigator.requestMIDIAccess) {
        throw new Error('Web MIDI API is not supported in this browser');
      }

      this.midiAccess = await navigator.requestMIDIAccess();
      this.isInitialized = true;
      console.log('Web MIDI API initialized');
    } catch (error) {
      console.error('Failed to initialize Web MIDI API:', error);
      throw error;
    }
  }

  /**
   * Get list of available MIDI input devices
   */
  getAvailableInputDevices(): MidiDevice[] {
    if (!this.midiAccess) return [];

    const devices: MidiDevice[] = [];
    const inputs = this.midiAccess.inputs.values();

    for (let input of inputs) {
      devices.push({
        id: input.id,
        name: input.name || 'Unknown Device',
        manufacturer: input.manufacturer,
        type: 'input',
      });
    }

    return devices;
  }

  /**
   * Connect to a MIDI input device
   */
  connectToDevice(deviceId: string): void {
    if (!this.midiAccess) {
      throw new Error('MIDI not initialized');
    }

    const input = this.midiAccess.inputs.get(deviceId);
    if (!input) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }

    // Disconnect from previous device if any
    if (this.inputDevice) {
      this.inputDevice.onmidimessage = null;
    }

    this.inputDevice = input as WebMidi.MIDIInput;
    this.inputDevice.onmidimessage = this.handleMidiMessage.bind(this);
    console.log(`Connected to MIDI device: ${input.name}`);
  }

  /**
   * Disconnect from current device
   */
  disconnect(): void {
    if (this.inputDevice) {
      this.inputDevice.onmidimessage = null;
      this.inputDevice = null;
      console.log('Disconnected from MIDI device');
    }
  }

  /**
   * Check if a device is currently connected
   */
  isConnected(): boolean {
    return this.inputDevice !== null;
  }

  /**
   * Get currently connected device
   */
  getConnectedDevice(): MidiDevice | null {
    if (!this.inputDevice) return null;

    return {
      id: this.inputDevice.id,
      name: this.inputDevice.name || 'Unknown Device',
      manufacturer: this.inputDevice.manufacturer,
      type: 'input',
    };
  }

  /**
   * Register a callback for note events
   */
  onNote(callback: MidiNoteCallback): () => void {
    this.noteCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.noteCallbacks.delete(callback);
    };
  }

  /**
   * Handle incoming MIDI messages
   */
  private handleMidiMessage(event: WebMidi.MIDIMessageEvent): void {
    const [status, data1, data2] = event.data;

    // 0x90 = Note On, 0x80 = Note Off
    // data1 = note number, data2 = velocity
    const isNoteOn = (status & 0xf0) === 0x90 && data2 > 0; // velocity must be > 0

    if (isNoteOn) {
      const noteEvent: MidiNoteEvent = {
        noteNumber: data1,
        velocity: data2,
        timestamp: event.timeStamp,
      };

      // Call all registered callbacks
      this.noteCallbacks.forEach(callback => {
        try {
          callback(noteEvent);
        } catch (error) {
          console.error('Error in MIDI note callback:', error);
        }
      });
    }
  }

  /**
   * Request permission to access MIDI devices (if needed)
   */
  async requestPermission(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch (error) {
      console.error('MIDI permission denied:', error);
      return false;
    }
  }
}

// Export singleton instance
export const midiManager = new MidiManager();
