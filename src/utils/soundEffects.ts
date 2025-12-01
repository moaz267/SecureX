// Sound effects using Web Audio API

class SoundEffects {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3; // Master volume
      this.masterGain.connect(this.audioContext.destination);
    } catch (error) {
      console.error("Web Audio API not supported:", error);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  // Bit flip sound - quick digital beep
  playBitFlip(bitValue: number) {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Different frequencies for 0 and 1
    oscillator.frequency.value = bitValue === 1 ? 880 : 440; // A5 for 1, A4 for 0
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);
    oscillator.stop(now + 0.08);
  }

  // XOR operation sound - synthetic whoosh
  playXorOperation() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, now);
    filter.Q.value = 5;

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }

  // Character completion sound - pleasant chime
  playCompletionChime() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 - C major chord

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.frequency.value = freq;
      oscillator.type = "sine";

      const delay = index * 0.05;
      gainNode.gain.setValueAtTime(0, now + delay);
      gainNode.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain!);

      oscillator.start(now + delay);
      oscillator.stop(now + delay + 0.5);
    });
  }

  // Stage transition sound - soft whoosh
  playStageTransition() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(300, now);
    oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.2);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1500, now);

    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }

  // Encryption complete - triumphant sound
  playEncryptionComplete() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.frequency.value = freq;
      oscillator.type = "triangle";

      const delay = index * 0.08;
      gainNode.gain.setValueAtTime(0, now + delay);
      gainNode.gain.linearRampToValueAtTime(0.15, now + delay + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.6);

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain!);

      oscillator.start(now + delay);
      oscillator.stop(now + delay + 0.6);
    });
  }

  // Decryption complete - descending tones
  playDecryptionComplete() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const frequencies = [1046.5, 783.99, 659.25, 523.25]; // C6, G5, E5, C5 (descending)

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.frequency.value = freq;
      oscillator.type = "triangle";

      const delay = index * 0.08;
      gainNode.gain.setValueAtTime(0, now + delay);
      gainNode.gain.linearRampToValueAtTime(0.15, now + delay + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.6);

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain!);

      oscillator.start(now + delay);
      oscillator.stop(now + delay + 0.6);
    });
  }

  // Error sound
  playError() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.frequency.value = 200;
    oscillator.type = "sawtooth";

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }

  // Button click sound
  playClick() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);
    oscillator.stop(now + 0.05);
  }
}

// Singleton instance
export const soundEffects = new SoundEffects();
