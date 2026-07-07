// analyser.ts — RMS / spectral centroid / spectral flux from a tap before the limiter.
import type { AnalysisFeature } from "../core/features";

export class Analyser {
  private node: AnalyserNode;
  private freq: Float32Array<ArrayBuffer>;
  private time: Float32Array<ArrayBuffer>;
  private prevMag: Float32Array<ArrayBuffer>;
  private last = 0;
  out: AnalysisFeature = { rms: 0, centroid: 0, flux: 0 };

  constructor(ctx: AudioContext) {
    this.node = ctx.createAnalyser();
    this.node.fftSize = 2048;
    this.node.smoothingTimeConstant = 0.4;
    this.freq = new Float32Array(this.node.frequencyBinCount);
    this.time = new Float32Array(this.node.fftSize);
    this.prevMag = new Float32Array(this.node.frequencyBinCount);
    this.sampleRate = ctx.sampleRate;
  }
  private sampleRate: number;

  get input(): AnalyserNode { return this.node; }

  // Call each frame; internally throttled to ~30Hz.
  update(nowMs: number): void {
    if (nowMs - this.last < 33) return;
    this.last = nowMs;
    this.node.getFloatTimeDomainData(this.time);
    this.node.getFloatFrequencyData(this.freq);

    let sumSq = 0;
    for (let i = 0; i < this.time.length; i++) sumSq += this.time[i] * this.time[i];
    this.out.rms = Math.sqrt(sumSq / this.time.length);

    let num = 0, den = 0, flux = 0;
    const binHz = this.sampleRate / this.node.fftSize;
    for (let i = 0; i < this.freq.length; i++) {
      const mag = Math.pow(10, this.freq[i] / 20); // dB → linear
      num += i * binHz * mag;
      den += mag;
      const d = mag - this.prevMag[i];
      if (d > 0) flux += d;
      this.prevMag[i] = mag;
    }
    this.out.centroid = den > 1e-9 ? num / den : 0;
    this.out.flux = flux;
  }
}
