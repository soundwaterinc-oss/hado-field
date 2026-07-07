// midCollapse.ts — modal strike voice (6 bandpass resonators, circular-membrane ratios).
// Pooled polyphony (8), oldest-steal. Triggered by observation/collapse.
import type { ParamState } from "../core/params";
import { scaleQuantize } from "./scales";

const RATIOS = [1, 2.76, 5.4, 8.93, 13.34, 18.64];
const POLY = 8;

interface StrikeVoice {
  bands: BiquadFilterNode[];
  amp: GainNode;
  startedAt: number;
  free: boolean;
}

export class MidCollapse {
  private voices: StrikeVoice[] = [];
  private noiseBuf: AudioBuffer;

  constructor(private ctx: AudioContext, private out: GainNode) {
    this.noiseBuf = this.makeNoise();
    for (let i = 0; i < POLY; i++) this.voices.push(this.makeVoice());
  }

  private makeNoise(): AudioBuffer {
    const len = Math.floor(this.ctx.sampleRate * 0.05);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    return buf;
  }

  private makeVoice(): StrikeVoice {
    const amp = this.ctx.createGain();
    amp.gain.value = 0;
    amp.connect(this.out);
    const bands: BiquadFilterNode[] = [];
    for (let i = 0; i < RATIOS.length; i++) {
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 40;
      bp.connect(amp);
      bands.push(bp);
    }
    return { bands, amp, startedAt: -1, free: true };
  }

  private alloc(): StrikeVoice {
    const free = this.voices.find((v) => v.free);
    if (free) return free;
    // steal oldest
    let oldest = this.voices[0];
    for (const v of this.voices) if (v.startedAt < oldest.startedAt) oldest = v;
    return oldest;
  }

  // Returns the quantised pitch actually played (for MIDI note-out).
  strike(baseFreq: number, velocity: number, p: ParamState): number {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const pitch = scaleQuantize(baseFreq, p.scaleQuantize as string, p.transpose as number);
    const tone = p.strikeTone as number;
    const decay = p.strikeDecay as number;
    const v = this.alloc();
    v.free = false;
    v.startedAt = now;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    for (let i = 0; i < v.bands.length; i++) {
      const bp = v.bands[i];
      // stretched ratio: exponent tone warps the modal series
      const ratio = Math.pow(RATIOS[i], tone);
      bp.frequency.setValueAtTime(Math.min(16000, pitch * ratio), now);
      bp.Q.setValueAtTime(40 + i * 12, now);
      src.connect(bp);
    }
    const level = (p.strikeLevel as number) * velocity;
    v.amp.gain.cancelScheduledValues(now);
    v.amp.gain.setValueAtTime(0, now);
    v.amp.gain.linearRampToValueAtTime(level, now + 0.002);
    v.amp.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.05, decay));
    src.start(now);
    src.stop(now + Math.max(0.05, decay) + 0.05);
    src.onended = () => { v.free = true; };
    return pitch;
  }
}
