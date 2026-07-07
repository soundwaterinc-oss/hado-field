// clock.ts — measurement clock: STEP (16-step BPM), POISSON (mean-rate), MIX.
// Emits "measure" ticks; the app turns a tick into an observation/collapse.
import type { ParamState } from "./params";

export class MeasureClock {
  private acc = 0; // seconds accumulated toward next step
  private stepIndex = 0;
  steps: boolean[] = Array(16).fill(false);
  stepProb: number[] = Array(16).fill(1);
  running = false;
  onStep: ((index: number) => void) | null = null;
  onMeasure: (() => void) | null = null;

  constructor() {
    // A sparse default pattern so STEP mode is audible immediately.
    [0, 4, 8, 12].forEach((i) => (this.steps[i] = true));
  }

  toggle(on?: boolean): void {
    this.running = on ?? !this.running;
    if (this.running) this.acc = 0;
  }

  // dt in seconds. Reads live params for mode/bpm/rates.
  tick(dt: number, p: ParamState): void {
    if (!this.running) return;
    const mode = p.measureMode as string;
    if (mode === "POISSON") {
      const rate = p.poissonRate as number;
      // Homogeneous Poisson: probability rate*dt of a measurement this frame.
      if (Math.random() < rate * dt) this.fire();
      return;
    }
    // STEP / MIX share the 16-step grid.
    const stepDur = 60 / (p.bpm as number) / 4; // 16th notes
    this.acc += dt;
    while (this.acc >= stepDur) {
      this.acc -= stepDur;
      this.advanceStep(p, mode);
    }
  }

  private advanceStep(p: ParamState, mode: string): void {
    const i = this.stepIndex;
    this.onStep?.(i);
    let hit = this.steps[i] && Math.random() < this.stepProb[i];
    if (mode === "MIX") {
      // Poisson jitter sprinkled on top of the grid.
      const amt = p.poissonAmount as number;
      if (!hit && Math.random() < amt * 0.25) hit = true;
    }
    if (hit) this.fire();
    this.stepIndex = (i + 1) % 16;
  }

  private fire(): void {
    this.onMeasure?.();
  }
}
