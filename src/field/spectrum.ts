// spectrum.ts — autocorrelation C(t)=Σ ψ*(0)·ψ(t) → radix-2 FFT → eigen-energy peaks.
// Energies map to partial frequencies. Computed from the 64×64 reduced R,I.
import type { QuantumField } from "./schrodinger";
import type { ModeFeature } from "../core/features";

const RING = 4096;
const DECIMATE = 4; // sample every 4 sim frames

export class Spectrum {
  private snap0: Float32Array | null = null; // (R,I) reference at reset
  private reRing = new Float32Array(RING);
  private imRing = new Float32Array(RING);
  private head = 0;
  private filled = 0;
  private frameCount = 0;
  private lastFFT = 0;

  private power = new Float32Array(RING / 2);
  private rawModes: { E: number; mag: number }[] = [];
  // smoothed outputs
  private smoothF: number[] = [];
  private smoothA: number[] = [];

  snapshot(field: QuantumField): void {
    const data = field.reducedData;
    this.snap0 = new Float32Array(data.length / 4 * 2);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 2) {
      this.snap0[j] = data[i + 1];
      this.snap0[j + 1] = data[i + 2];
    }
    this.head = 0; this.filled = 0; this.frameCount = 0;
    this.reRing.fill(0); this.imRing.fill(0);
  }

  // Accumulate one autocorrelation sample from current reduced field.
  accumulate(field: QuantumField): void {
    if (!this.snap0) this.snapshot(field);
    if (this.frameCount++ % DECIMATE !== 0) return;
    const data = field.reducedData;
    const s0 = this.snap0!;
    let cr = 0, ci = 0;
    for (let i = 0, j = 0; i < data.length; i += 4, j += 2) {
      const R = data[i + 1], I = data[i + 2];
      const R0 = s0[j], I0 = s0[j + 1];
      // ψ*(0)·ψ(t) = (R0 - iI0)(R + iI)
      cr += R0 * R + I0 * I;
      ci += R0 * I - I0 * R;
    }
    this.reRing[this.head] = cr;
    this.imRing[this.head] = ci;
    this.head = (this.head + 1) % RING;
    if (this.filled < RING) this.filled++;
  }

  // Call ~1/s. Runs FFT over the ring, picks K peaks, maps to frequencies.
  update(nowMs: number, modeCount: number, fRoot: number, warp: number): ModeFeature[] {
    if (nowMs - this.lastFFT > 1000 && this.filled > 256) {
      this.lastFFT = nowMs;
      this.runFFT();
      this.pickPeaks(modeCount);
    }
    return this.mapModes(modeCount, fRoot, warp);
  }

  private runFFT(): void {
    // Copy ring into linear time order with Hann window.
    const re = new Float32Array(RING);
    const im = new Float32Array(RING);
    for (let i = 0; i < RING; i++) {
      const src = (this.head + i) % RING;
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (RING - 1));
      re[i] = this.reRing[src] * w;
      im[i] = this.imRing[src] * w;
    }
    fftRadix2(re, im);
    for (let i = 0; i < RING / 2; i++) {
      this.power[i] = re[i] * re[i] + im[i] * im[i];
    }
  }

  private pickPeaks(k: number): void {
    const peaks: { E: number; mag: number }[] = [];
    const P = this.power;
    for (let i = 2; i < P.length - 2; i++) {
      if (P[i] > P[i - 1] && P[i] >= P[i + 1] && P[i] > P[i - 2] && P[i] > P[i + 2]) {
        peaks.push({ E: i, mag: Math.sqrt(P[i]) });
      }
    }
    peaks.sort((a, b) => b.mag - a.mag);
    this.rawModes = peaks.slice(0, Math.max(1, k)).sort((a, b) => a.E - b.E);
  }

  private mapModes(modeCount: number, fRoot: number, warp: number): ModeFeature[] {
    const out: ModeFeature[] = [];
    if (this.rawModes.length === 0) {
      // Fallback harmonic series until first FFT lands.
      for (let n = 0; n < modeCount; n++) {
        out.push({ n: n + 1, f: fRoot * (n + 1), a: 1 / (n + 1), E: n + 1 });
      }
      return out;
    }
    const E1 = this.rawModes[0].E || 1;
    let maxMag = 1e-9;
    for (const m of this.rawModes) if (m.mag > maxMag) maxMag = m.mag;
    for (let n = 0; n < Math.min(modeCount, this.rawModes.length); n++) {
      const m = this.rawModes[n];
      let f = fRoot * Math.pow(m.E / E1, warp);
      f = Math.min(8000, Math.max(30, f));
      const a = m.mag / maxMag;
      // 200ms LPF smoothing on f and a
      this.smoothF[n] = this.smoothF[n] === undefined ? f : this.smoothF[n] + 0.2 * (f - this.smoothF[n]);
      this.smoothA[n] = this.smoothA[n] === undefined ? a : this.smoothA[n] + 0.2 * (a - this.smoothA[n]);
      out.push({ n: n + 1, f: this.smoothF[n], a: this.smoothA[n], E: m.E });
    }
    return out;
  }
}

// In-place iterative radix-2 FFT (RING must be a power of two).
function fftRadix2(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}
