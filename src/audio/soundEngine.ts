/**
 * Procedural Web Audio API Sound Engine for MUSIC REALMS
 * Zero external audio files, 100% reliable, zero 404s.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMusicEnabled: boolean = true;
  private isSfxEnabled: boolean = true;
  private masterVolume: number = 0.7;
  private musicVolumeNode: GainNode | null = null;
  private sfxVolumeNode: GainNode | null = null;
  private isBgmPlaying: boolean = false;
  private bgmIntervalId: number | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.musicVolumeNode = this.ctx.createGain();
      this.musicVolumeNode.gain.setValueAtTime(this.isMusicEnabled ? this.masterVolume * 0.45 : 0, this.ctx.currentTime);
      this.musicVolumeNode.connect(this.ctx.destination);

      this.sfxVolumeNode = this.ctx.createGain();
      this.sfxVolumeNode.gain.setValueAtTime(this.isSfxEnabled ? this.masterVolume * 0.7 : 0, this.ctx.currentTime);
      this.sfxVolumeNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMusicEnabled(enabled: boolean) {
    this.isMusicEnabled = enabled;
    if (this.musicVolumeNode && this.ctx) {
      this.musicVolumeNode.gain.setTargetAtTime(enabled ? this.masterVolume * 0.45 : 0, this.ctx.currentTime, 0.05);
    }
    if (enabled && !this.isBgmPlaying) {
      this.startBgm();
    }
  }

  public setSfxEnabled(enabled: boolean) {
    this.isSfxEnabled = enabled;
    if (this.sfxVolumeNode && this.ctx) {
      this.sfxVolumeNode.gain.setTargetAtTime(enabled ? this.masterVolume * 0.7 : 0, this.ctx.currentTime, 0.05);
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx) {
      if (this.musicVolumeNode) {
        this.musicVolumeNode.gain.setTargetAtTime(this.isMusicEnabled ? this.masterVolume * 0.45 : 0, this.ctx.currentTime, 0.05);
      }
      if (this.sfxVolumeNode) {
        this.sfxVolumeNode.gain.setTargetAtTime(this.isSfxEnabled ? this.masterVolume * 0.7 : 0, this.ctx.currentTime, 0.05);
      }
    }
  }

  public getMusicEnabled() {
    return this.isMusicEnabled;
  }

  public getSfxEnabled() {
    return this.isSfxEnabled;
  }

  public getMasterVolume() {
    return this.masterVolume;
  }

  /**
   * Start procedural fantasy adventure BGM:
   * Upbeat pentatonic chord arpeggios, gentle marimba/harp timbre, warm bass.
   */
  public startBgm() {
    if (this.isBgmPlaying) return;
    this.initContext();
    this.isBgmPlaying = true;

    // Musical progression in C major / Lydian fantasy mode (C - G - Am - F)
    const melodyScale = [
      523.25, // C5
      587.33, // D5
      659.25, // E5
      783.99, // G5
      880.00, // A5
      1046.50 // C6
    ];

    const bassNotes = [130.81, 196.00, 220.00, 174.61]; // C3, G3, A3, F3
    let step = 0;

    const playStep = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.musicVolumeNode) return;
      if (!this.isMusicEnabled) return;

      const now = this.ctx.currentTime;
      const measure = Math.floor(step / 8) % bassNotes.length;
      const subStep = step % 8;

      // Bass note on downbeats
      if (subStep === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassNotes[measure], now);

        bassGain.gain.setValueAtTime(0.2, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        bassOsc.connect(bassGain);
        bassGain.connect(this.musicVolumeNode);
        bassOsc.start(now);
        bassOsc.stop(now + 0.85);
      }

      // Melody bell / marimba arpeggio on eighth notes
      if (Math.random() > 0.15) {
        const noteIdx = (step * 2 + Math.floor(Math.random() * 3)) % melodyScale.length;
        const freq = melodyScale[noteIdx];

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = subStep % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        // Chime envelope
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.musicVolumeNode);
        osc.start(now);
        osc.stop(now + 0.4);
      }

      step++;
    };

    // 130 BPM eighth notes ≈ 230ms per step
    this.bgmIntervalId = window.setInterval(playStep, 230);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  // --- Sound Effects ---

  public playFootstep() {
    if (!this.isSfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxVolumeNode) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 + Math.random() * 40, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxVolumeNode);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playJump() {
    if (!this.isSfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxVolumeNode) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxVolumeNode);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playInteract() {
    if (!this.isSfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxVolumeNode) return;

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.15, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxVolumeNode!);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  }

  public playStationUnlock() {
    if (!this.isSfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxVolumeNode) return;

    const now = this.ctx.currentTime;
    // Radiant ascending fanfare
    const freqs = [392.00, 440.00, 493.88, 587.33, 783.99, 987.77];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.2, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxVolumeNode!);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.45);
    });
  }

  public playCompleteFanfare() {
    if (!this.isSfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxVolumeNode) return;

    const now = this.ctx.currentTime;
    // Major triumphant chord (C5, E5, G5, C6)
    const chord = [523.25, 659.25, 783.99, 1046.50];
    chord.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxVolumeNode!);
      osc.start(now);
      osc.stop(now + 1.25);
    });
  }

  public playNotePitch(note: 'G' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F') {
    this.initContext();
    if (!this.ctx || !this.sfxVolumeNode) return;

    const pitchMap: Record<string, number> = {
      'C': 261.63,
      'D': 293.66,
      'E': 329.63,
      'F': 349.23,
      'G': 392.00,
      'A': 440.00,
      'B': 493.88
    };

    const freq = pitchMap[note] || 440;
    const now = this.ctx.currentTime;

    // Rich harmonic synth combining fundamental and 2nd harmonic
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxVolumeNode);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.95);
    osc2.stop(now + 0.95);
  }

  public playFeedbackSubmit() {
    if (!this.isSfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxVolumeNode) return;

    const now = this.ctx.currentTime;
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66];
    pentatonic.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.18, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxVolumeNode!);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.55);
    });
  }

  public playButtonClick() {
    if (!this.isSfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxVolumeNode) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxVolumeNode);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playCorrect() {
    if (!this.isSfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxVolumeNode) return;

    const now = this.ctx.currentTime;
    [587.33, 880.00].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.16, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxVolumeNode!);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  }

  public playWrong() {
    if (!this.isSfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxVolumeNode) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxVolumeNode);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playGathering() {
    if (!this.isSfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxVolumeNode) return;

    const now = this.ctx.currentTime;
    // Celestial harp arpeggio ascending rapidly (C5, E5, G5, B5, C6, E6)
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.18, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.9);

      osc.connect(gain);
      gain.connect(this.sfxVolumeNode!);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.95);
    });
  }
}

export const soundEngine = new SoundEngine();
