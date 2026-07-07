// potential.ts — composite geometry (mode A/B crossfade) + brush → normalized V texture.
// Wells negative, walls positive. Provides vmax for the field's dt clamp.
import { buildPhyllo } from "./phyllotaxis";
import { buildLsys } from "./lsystem";
import { buildVoro } from "./voronoi";
import { Brush } from "./brush";
import type { ParamState } from "../core/params";

type Mode = "PHYLLO" | "LSYS" | "VORO";

export class Potential {
  readonly V: Float32Array;
  private bufA: Float32Array;
  private bufB: Float32Array;
  readonly brush: Brush;
  vmax = 1;

  constructor(private N: number) {
    this.V = new Float32Array(N * N);
    this.bufA = new Float32Array(N * N);
    this.bufB = new Float32Array(N * N);
    this.brush = new Brush(N);
  }

  private buildMode(buf: Float32Array, mode: Mode, p: ParamState): void {
    if (mode === "PHYLLO") buildPhyllo(buf, this.N, p);
    else if (mode === "LSYS") buildLsys(buf, this.N, p);
    else buildVoro(buf, this.N, p);
  }

  // Full rebake. Returns the V array (upload handled by caller).
  bake(p: ParamState): Float32Array {
    const geoMode = p.geoMode as string;
    if (geoMode === "HYBRID") {
      this.buildMode(this.bufA, p.geoModeA as Mode, p);
      this.buildMode(this.bufB, p.geoModeB as Mode, p);
      const mix = p.geoMix as number;
      for (let i = 0; i < this.V.length; i++) {
        this.V[i] = this.bufA[i] * (1 - mix) + this.bufB[i] * mix;
      }
    } else {
      this.buildMode(this.V, geoMode as Mode, p);
    }
    // add brush layer
    let max = 1e-6;
    for (let i = 0; i < this.V.length; i++) {
      this.V[i] += this.brush.layer[i];
      const a = Math.abs(this.V[i]);
      if (a > max) max = a;
    }
    this.vmax = max;
    return this.V;
  }
}
