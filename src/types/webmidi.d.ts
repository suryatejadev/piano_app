// Web MIDI API type definitions
declare namespace WebMidi {
  interface MIDIOptions {
    sysex?: boolean;
    software?: boolean;
  }

  interface MIDIMessageEvent extends Event {
    readonly data: Uint8Array;
    readonly timeStamp: number;
  }

  interface MIDIInput extends MIDIPort {
    onmidimessage: ((event: MIDIMessageEvent) => void) | null;
  }

  interface MIDIOutput extends MIDIPort {
    send(data: Uint8Array, timestamp?: number): void;
  }

  interface MIDIPort extends EventTarget {
    readonly id: string;
    readonly manufacturer?: string;
    readonly name?: string;
    readonly type: 'input' | 'output';
    readonly version?: string;
    readonly state: 'connected' | 'disconnected';
    readonly connection: 'open' | 'closed' | 'pending';
    open(): Promise<MIDIPort>;
    close(): Promise<void>;
    onstatechange: ((event: Event) => void) | null;
  }

  interface MIDIAccess extends EventTarget {
    readonly inputs: Map<string, MIDIInput>;
    readonly outputs: Map<string, MIDIOutput>;
    readonly sysexEnabled: boolean;
    onstatechange: ((event: Event) => void) | null;
  }
}

interface Navigator {
  requestMIDIAccess(
    options?: WebMidi.MIDIOptions,
  ): Promise<WebMidi.MIDIAccess>;
}
