// probes.ts — phyllotaxis-placed probe points sampling |ψ|² and local phase gradient
// from the 64×64 reduced field (no extra readPixels).
import type { QuantumField } from "./schrodinger";
import type { ProbeFeature } from "../core/features";

const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // ~137.5°

export class Probes {
  positions: { x: number; y: number }[] = [];

  layout(count: number): void {
    this.positions = [];
    for (let k = 0; k < count; k++) {
      const r = 0.42 * Math.sqrt(k / Math.max(1, count - 1));
      const a = k * GOLDEN;
      this.positions.push({ x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a) });
    }
  }

  sample(field: QuantumField, out: ProbeFeature[]): void {
    const R = field.reducedSize;
    const data = field.reducedData;
    out.length = 0;
    for (const pos of this.positions) {
      const ix = clamp(Math.floor(pos.x * R), 1, R - 2);
      const iy = clamp(Math.floor(pos.y * R), 1, R - 2);
      const idx = (iy * R + ix) * 4;
      const p = data[idx];
      // phase gradient from neighbouring R,I
      const ang = (dx: number, dy: number): number => {
        const j = ((iy + dy) * R + (ix + dx)) * 4;
        return Math.atan2(data[j + 2], data[j + 1]);
      };
      const gx = wrapDiff(ang(1, 0), ang(-1, 0));
      const gy = wrapDiff(ang(0, 1), ang(0, -1));
      out.push({ x: pos.x, y: pos.y, p, gradAngle: Math.atan2(gy, gx) });
    }
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
// smallest signed angular difference, keeps gradient continuous across ±π
function wrapDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}
