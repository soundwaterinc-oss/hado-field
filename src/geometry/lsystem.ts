// lsystem.ts — F→F[+F]F[−F]F turtle → branch segments rasterised as wall ridges
// (positive potential) via a smooth distance falloff.
import type { ParamState } from "../core/params";

interface Seg { x0: number; y0: number; x1: number; y1: number }

function expand(iterations: number): string {
  let s = "F";
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const ch of s) next += ch === "F" ? "F[+F]F[-F]F" : ch;
    s = next;
  }
  return s;
}

function turtle(str: string, angleDeg: number): Seg[] {
  const segs: Seg[] = [];
  const stack: { x: number; y: number; a: number }[] = [];
  let x = 0.5, y = 0.05, a = Math.PI / 2; // start bottom-centre, pointing up
  const ang = (angleDeg * Math.PI) / 180;
  // step length shrinks with total F count so the plant fits the box
  const nF = (str.match(/F/g) || []).length;
  const len = 0.9 / Math.sqrt(nF);
  for (const ch of str) {
    switch (ch) {
      case "F": {
        const nx = x + len * Math.cos(a), ny = y + len * Math.sin(a);
        segs.push({ x0: x, y0: y, x1: nx, y1: ny });
        x = nx; y = ny; break;
      }
      case "+": a += ang; break;
      case "-": a -= ang; break;
      case "[": stack.push({ x, y, a }); break;
      case "]": { const s = stack.pop()!; x = s.x; y = s.y; a = s.a; break; }
    }
  }
  return segs;
}

export function buildLsys(out: Float32Array, N: number, p: ParamState): void {
  out.fill(0);
  const iters = Math.round(p.lsysIterations as number);
  const segs = turtle(expand(iters), p.branchAngle as number);
  const half = (p.wallWidth as number) * N;
  const height = p.wallHeight as number;
  const r = Math.ceil(half + 2);
  for (const s of segs) {
    rasterSeg(out, N, s.x0 * N, s.y0 * N, s.x1 * N, s.y1 * N, half, height, r);
  }
}

function rasterSeg(
  out: Float32Array, N: number, ax: number, ay: number, bx: number, by: number,
  half: number, height: number, r: number,
): void {
  const minX = Math.max(0, Math.floor(Math.min(ax, bx) - r));
  const maxX = Math.min(N - 1, Math.ceil(Math.max(ax, bx) + r));
  const minY = Math.max(0, Math.floor(Math.min(ay, by) - r));
  const maxY = Math.min(N - 1, Math.ceil(Math.max(ay, by) + r));
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let t = ((x - ax) * dx + (y - ay) * dy) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + t * dx, py = ay + t * dy;
      const d = Math.hypot(x - px, y - py);
      const v = height * Math.max(0, 1 - d / half);
      if (v > out[y * N + x]) out[y * N + x] = v; // ridge = max blend
    }
  }
}
