// voronoi.ts — d3-delaunay cells with Lloyd relaxation; boundaries = barrier walls,
// each cell floor gets a tiny random offset (±5%) so tunnelling speeds differ.
import { Delaunay } from "d3-delaunay";
import type { ParamState } from "../core/params";

// deterministic PRNG so relaxation/offsets are reproducible per seed
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildVoro(out: Float32Array, N: number, p: ParamState): void {
  out.fill(0);
  const count = p.cellCount as number;
  const relax = Math.round(p.relax as number);
  const rng = mulberry32(((p.lsysSeed as number) * 2654435761) >>> 0);
  let pts = new Float64Array(count * 2);
  for (let i = 0; i < count; i++) { pts[i * 2] = rng(); pts[i * 2 + 1] = rng(); }

  const bounds: [number, number, number, number] = [0, 0, 1, 1];
  let delaunay = new Delaunay(pts);
  let voronoi = delaunay.voronoi(bounds);
  for (let it = 0; it < relax; it++) {
    const next = new Float64Array(count * 2);
    for (let i = 0; i < count; i++) {
      const poly = voronoi.cellPolygon(i);
      if (!poly) { next[i * 2] = pts[i * 2]; next[i * 2 + 1] = pts[i * 2 + 1]; continue; }
      const c = centroid(poly);
      next[i * 2] = c[0]; next[i * 2 + 1] = c[1];
    }
    pts = next;
    delaunay = new Delaunay(pts);
    voronoi = delaunay.voronoi(bounds);
  }

  // Cell floor offsets.
  for (let i = 0; i < count; i++) {
    const off = (rng() - 0.5) * 0.1 * (p.wellDepth as number); // ±5%
    const poly = voronoi.cellPolygon(i);
    if (poly) fillPoly(out, N, poly, off);
  }

  // Boundaries: rasterise every cell edge as a wall.
  const half = (p.wallWidth as number) * N;
  const height = p.wallHeight as number;
  const r = Math.ceil(half + 2);
  for (let i = 0; i < count; i++) {
    const poly = voronoi.cellPolygon(i);
    if (!poly) continue;
    for (let j = 0; j < poly.length - 1; j++) {
      const [x0, y0] = poly[j], [x1, y1] = poly[j + 1];
      rasterEdge(out, N, x0 * N, y0 * N, x1 * N, y1 * N, half, height, r);
    }
  }
}

function centroid(poly: [number, number][]): [number, number] {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[i + 1];
    const cross = x0 * y1 - x1 * y0;
    a += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-9) return poly[0];
  return [cx / (6 * a), cy / (6 * a)];
}

function fillPoly(out: Float32Array, N: number, poly: [number, number][], val: number): void {
  let minY = 1, maxY = 0;
  for (const [, y] of poly) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const y0 = Math.max(0, Math.floor(minY * N)), y1 = Math.min(N - 1, Math.ceil(maxY * N));
  for (let y = y0; y <= y1; y++) {
    const yc = (y + 0.5) / N;
    const xs: number[] = [];
    for (let i = 0; i < poly.length - 1; i++) {
      const [xa, ya] = poly[i], [xb, yb] = poly[i + 1];
      if ((ya <= yc && yb > yc) || (yb <= yc && ya > yc)) {
        xs.push(xa + ((yc - ya) / (yb - ya)) * (xb - xa));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.floor(xs[k] * N)), xb = Math.min(N - 1, Math.ceil(xs[k + 1] * N));
      for (let x = xa; x <= xb; x++) out[y * N + x] += val;
    }
  }
}

function rasterEdge(
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
      if (v > out[y * N + x]) out[y * N + x] = v;
    }
  }
}
