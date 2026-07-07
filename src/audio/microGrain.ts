// microGrain.ts — probe-driven granular layer. |ψ|² sets grain rate; nearest mode sets
// pitch; phase-gradient direction sets pan. Short grains get frequency jitter.
import type { ModeFeature, ProbeFeature } from "../core/features";
import type { ParamState } from "../core/params";

export class MicroGrain {
  private noiseBuf: AudioBuffer;
  constructor(private ctx: AudioContext, private out: GainNode) {
    this.noiseBuf = this.makeNoise();
  }

  private makeNoise(): AudioBuffer {
    const len = Math.floor(this.ctx.sampleRate * 0.3);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // called each frame with dt seconds
  update(dt: number, probes: ProbeFeature[], modes: ModeFeature[], p: ParamState): void {
    if (modes.length === 0) return;
    const maxDensity = p.grainDensity as number;
    if (maxDensity <= 0) return;
    const level = p.grainLevel as number;
    const useNoise = (p.grainSrc as string) === "noise";
    // normalise |ψ|² across probes
    let maxP = 1e-9;
    for (const pr of probes) if (pr.p > maxP) maxP = pr.p;
    for (const pr of probes) {
      const density = maxDensity * (pr.p / maxP);
      if (Math.random() < density * dt) {
        this.spawn(pr, modes, p, level, useNoise);
      }
    }
  }

  private spawn(pr: ProbeFeature, modes: ModeFeature[], p: ParamState, level: number, noise: boolean): void {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const sizeMs = p.grainSize as number;
    const dur = sizeMs / 1000;
    const jitter = p.grainJitter as number;

    // nearest mode by probe radius → octave up
    const m = modes[Math.min(modes.length - 1, Math.floor(pr.x * modes.length))] ?? modes[0];
    // shorter grains ⇒ more frequency uncertainty
    const uncert = (1 - sizeMs / 200) * jitter;
    const detune = 1 + (Math.random() * 2 - 1) * 0.06 * uncert;
    const freq = Math.min(12000, m.f * 2 * detune);

    const amp = ctx.createGain();
    amp.gain.value = 0;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.max(-1, Math.min(1, Math.cos(pr.gradAngle)));
    amp.connect(pan);
    pan.connect(this.out);

    let src: AudioScheduledSourceNode;
    if (noise) {
      const bs = ctx.createBufferSource();
      bs.buffer = this.noiseBuf;
      bs.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 8;
      bs.connect(bp); bp.connect(amp);
      src = bs;
    } else {
      const osc = ctx.createOscillator();
      osc.type = "sine"; osc.frequency.value = freq;
      osc.connect(amp);
      src = osc;
    }

    // Hann envelope
    const g = level * 0.5;
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(g, now + dur * 0.5);
    amp.gain.linearRampToValueAtTime(0, now + dur);
    src.start(now);
    src.stop(now + dur + 0.02);
    src.onended = () => { amp.disconnect(); pan.disconnect(); };
  }
}
