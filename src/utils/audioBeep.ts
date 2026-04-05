/**
 * Play a beep sound to notify the user
 * @param duration Duration in milliseconds (default: 200)
 * @param frequency Frequency in Hz (default: 800)
 * @param volume Volume 0-1 (default: 0.3)
 */
export const playBeep = async (
  duration: number = 200,
  frequency: number = 800,
  volume: number = 0.3
): Promise<void> => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    const now = ctx.currentTime;
    const durationSecs = duration / 1000;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.linearRampToValueAtTime(volume, now + durationSecs - 0.04);
    gain.gain.linearRampToValueAtTime(0, now + durationSecs);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + durationSecs);

    ctx.close();
  } catch {
    // Silently fail if audio context unavailable
  }
};
