// phyllotaxis.ts — golden-angle seed points → gaussian wells (negative potential).
import type { ParamState } from "../core/params";

const GOLDEN_DEG = 137.507;

export function buildPhyllo(out: Float32Array, N: number, p: ParamState): void {
  out.fill(0);
  const count = p.seedCount as number;
  const depth = p.wellDepth as number;
  const radius = p.wellRadius as number;
  const angleOff = ((GOLDEN_DEG + (p.angleOffset as number)) * Math.PI) / 180;
  const c = 0.45 / Math.sqrt(count); // scale so outer seeds fit the box
  const sig2 = (radius * N) * (radius * N) * 2;
  const rad = Math.ceil(radius * N * 3);
  for (let k = 0; k < count; k++) {
    const r = c * Math.sqrt(k);
    const a = k * angleOff;
    const px = (0.5 + r * Math.cos(a)) * N;
    const py = (0.5 + r * Math.sin(a)) * N;
    stampGaussian(out, N, px, py, rad, sig2, -depth);
  }
}

export function stampGaussian(
  out: Float32Array, N: number, px: number, py: number,
  rad: number, sig2: number, amp: number,
): void {
  const x0 = Math.max(0, Math.floor(px - rad)), x1 = Math.min(N - 1, Math.ceil(px + rad));
  const y0 = Math.max(0, Math.floor(py - rad)), y1 = Math.min(N - 1, Math.ceil(py + rad));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - px, dy = y - py;
      out[y * N + x] += amp * Math.exp(-(dx * dx + dy * dy) / sig2);
    }
  }
}
