// mutate.ts — slow acoustic→geometry feedback. rms→growth/well, centroid→angle drift,
// flux→cell split/merge. All low-passed. feedAmount masters depth; runaway guard.
import type { AnalysisFeature } from "../core/features";
import type { ParamState } from "../core/params";
import { PARAMS } from "../core/params";

export class Mutator {
  private acc = 0;
  private rmsLP = 0;
  private centLP = 1000;
  private fluxLP = 0;
  private prevFlux = 0;
  private wellBase = -1;
  private loudSeconds = 0;
  warning = "";
  onWarn: ((msg: string) => void) | null = null;
  onRebake: (() => void) | null = null;

  private clampParam(name: keyof typeof PARAMS, v: number): number {
    const def = PARAMS[name];
    if (def.kind === "number") return Math.min(def.max, Math.max(def.min, v));
    return v;
  }

  // called each frame; internally throttled to mutateRate.
  update(dt: number, a: AnalysisFeature, p: ParamState): void {
    if (p.freeze as boolean) return;
    const feed = p.feedAmount as number;
    if (feed <= 0) return;

    // low-pass features (time constant = mutateSmooth)
    const tau = p.mutateSmooth as number;
    const k = 1 - Math.exp(-dt / Math.max(0.1, tau));
    const rmsDb = 20 * Math.log10(Math.max(1e-6, a.rms));
    this.rmsLP += k * (rmsDb - this.rmsLP);
    this.centLP += k * (a.centroid - this.centLP);
    this.fluxLP += k * (a.flux - this.fluxLP);

    // runaway guard: sustained loudness halves feedAmount
    if (rmsDb > -6) { this.loudSeconds += dt; } else { this.loudSeconds = 0; }
    if (this.loudSeconds > 5) {
      p.feedAmount = (p.feedAmount as number) * 0.5;
      this.loudSeconds = 0;
      this.warning = "runaway guard: feedAmount halved";
      this.onWarn?.(this.warning);
    }

    this.acc += dt;
    const period = 1 / (p.mutateRate as number);
    if (this.acc < period) return;
    this.acc = 0;
    this.apply(p, feed);
  }

  private apply(p: ParamState, feed: number): void {
    let rebake = false;
    if (this.wellBase < 0) this.wellBase = p.wellDepth as number;

    // rms → growth + well deepening
    const rmsTarget = p.rmsTarget as number;
    const over = this.rmsLP - rmsTarget;
    if (over > 0) {
      const grow = feed * Math.min(1, over / 12);
      p.lsysIterations = this.clampParam("lsysIterations",
        Math.round((p.lsysIterations as number) + (grow > 0.5 ? 1 : 0)));
      p.wellDepth = this.clampParam("wellDepth", (p.wellDepth as number) * (1 + 0.1 * feed));
      rebake = true;
    } else {
      p.wellDepth = this.clampParam("wellDepth", (p.wellDepth as number) * (1 - 0.05 * feed));
      rebake = true;
    }

    // centroid → golden-angle drift
    const centTarget = p.centTarget as number;
    const drift = ((this.centLP - centTarget) / centTarget) * 3 * feed;
    p.angleOffset = this.clampParam("angleOffset",
      (p.angleOffset as number) + Math.max(-0.5, Math.min(0.5, drift)) * 0.1);
    rebake = true;

    // flux spike → cell split; calm → merge
    const spike = this.fluxLP - this.prevFlux;
    this.prevFlux = this.fluxLP;
    if (spike > this.fluxLP * 0.5 && this.fluxLP > 0.01) {
      p.cellCount = this.clampParam("cellCount", (p.cellCount as number) + 1);
      rebake = true;
    } else if (spike < -this.fluxLP * 0.5) {
      p.cellCount = this.clampParam("cellCount", (p.cellCount as number) - 1);
      rebake = true;
    }

    if (rebake) this.onRebake?.();
  }
}
