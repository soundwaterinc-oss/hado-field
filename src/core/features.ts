// features.ts — the ONLY contract between field and audio/io. Nothing in audio/ or
// io/ imports field/ or geometry/ directly; they subscribe to this bus instead.
export interface ModeFeature { n: number; f: number; a: number; E: number }
export interface ProbeFeature { x: number; y: number; p: number; gradAngle: number }
export interface CollapseFeature { x: number; y: number; localV: number; nearestMode: number }
export interface AnalysisFeature { rms: number; centroid: number; flux: number }

export interface HadoFeatures {
  t: number;
  modes: ModeFeature[];
  probes: ProbeFeature[];
  collapse?: CollapseFeature;
  analysis: AnalysisFeature;
}

type Handler<T> = (payload: T) => void;

// Minimal typed event bus. Field publishes 'frame' each rAF, 'collapse' on observation.
// Audio publishes 'analysis' back (the reverse flow into feedback lives here too).
export interface BusEvents {
  frame: HadoFeatures;
  collapse: CollapseFeature;
  analysis: AnalysisFeature;
  mutate: { target: string; value: number };
}

export class FeatureBus {
  private handlers: { [K in keyof BusEvents]: Set<Handler<BusEvents[K]>> } = {
    frame: new Set(), collapse: new Set(), analysis: new Set(), mutate: new Set(),
  };

  on<K extends keyof BusEvents>(ev: K, h: Handler<BusEvents[K]>): () => void {
    this.handlers[ev].add(h);
    return () => this.handlers[ev].delete(h);
  }

  emit<K extends keyof BusEvents>(ev: K, payload: BusEvents[K]): void {
    for (const h of this.handlers[ev]) h(payload);
  }
}

// Live snapshot the whole app reads from (single mutable object, no per-frame alloc).
export const features: HadoFeatures = {
  t: 0,
  modes: [],
  probes: [],
  analysis: { rms: 0, centroid: 0, flux: 0 },
};
