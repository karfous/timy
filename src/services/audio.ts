import { PhaseType } from '../types/timer';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Call on user interaction (e.g. clicking Start) to unlock Web Audio API on mobile/desktop browsers.
   */
  public unlock(): void {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    durationMs: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.22,
    delayMs = 0
  ): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const startTime = ctx.currentTime + delayMs / 1000;
    const durationSec = durationMs / 1000;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainPeak, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.02);
  }

  /**
   * Plays a crisp short countdown beep at 5, 4, 3, 2, 1 seconds remaining before each new round/finish.
   */
  public playCountdownBeep(secondsRemaining: number): void {
    if (secondsRemaining < 1 || secondsRemaining > 5) return;
    // Slightly higher pitch on the final 1-second mark to build anticipation
    const freq = secondsRemaining === 1 ? 740 : 660;
    this.playTone(freq, 95, 'triangle', 0.24);
  }

  /**
   * Plays a distinct transition tone when entering a new phase (Work, Break, or Simple).
   */
  public playRoundStartBeep(phaseType: PhaseType): void {
    if (phaseType === 'work' || phaseType === 'simple') {
      // Energetic high tone for starting work
      this.playTone(880, 260, 'sine', 0.3);
      this.playTone(1174.66, 200, 'triangle', 0.2, 90);
    } else if (phaseType === 'break') {
      // Calming two-note descending chime for break
      this.playTone(659.25, 160, 'sine', 0.24, 0);
      this.playTone(523.25, 240, 'sine', 0.24, 140);
    } else {
      // Prep phase start
      this.playTone(587.33, 140, 'sine', 0.2);
    }
  }

  /**
   * Plays celebratory 3-note ascending chime when workout completes.
   */
  public playWorkoutCompleteBeep(): void {
    this.playTone(587.33, 160, 'sine', 0.26, 0);    // D5
    this.playTone(783.99, 160, 'sine', 0.26, 150);  // G5
    this.playTone(1046.5, 380, 'triangle', 0.3, 300); // C6
  }
}

export const soundEngine = new SoundEngine();
