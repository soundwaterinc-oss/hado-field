// brush.ts — persistent additive brush layer edited by drag (dig) / Shift+drag (raise).
import { stampGaussian } from "./phyllotaxis";

export class Brush {
  readonly layer: Float32Array;
  constructor(private N: number) {
    this.layer = new Float32Array(N * N);
  }

  // x,y in 0..1. radius normalized. depth signed. raise flips sign.
  paint(x: number, y: number, radius: number, depth: number, raise: boolean): void {
    const rad = Math.ceil(radius * this.N * 2.5);
    const sig2 = 2 * (radius * this.N) * (radius * this.N);
    const amp = (raise ? Math.abs(depth) : -Math.abs(depth)) * 0.15;
    stampGaussian(this.layer, this.N, x * this.N, y * this.N, rad, sig2, amp);
  }

  clear(): void { this.layer.fill(0); }
}
