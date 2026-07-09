// params.ts — single source of truth for all parameters (drives UI, preset, TD send)
import { SCALE_IDS } from "../audio/scales";
export type ParamTab = "PERFORM" | "GEO" | "FIELD" | "SOUND" | "SEQ" | "MUTATE" | "IO" | "INFO";

export interface NumberParam {
  kind: "number";
  tab: ParamTab;
  label: string;
  min: number;
  max: number;
  def: number;
  step?: number;
  unit?: string;
}
export interface EnumParam {
  kind: "enum";
  tab: ParamTab;
  label: string;
  options: readonly string[];
  def: string;
}
export interface BoolParam {
  kind: "bool";
  tab: ParamTab;
  label: string;
  def: boolean;
}
export type ParamDef = NumberParam | EnumParam | BoolParam;

// Helper constructors keep the table below terse.
const n = (
  tab: ParamTab, label: string, min: number, max: number, def: number,
  step?: number, unit?: string,
): NumberParam => ({ kind: "number", tab, label, min, max, def, step, unit });
const e = (tab: ParamTab, label: string, options: readonly string[], def: string): EnumParam =>
  ({ kind: "enum", tab, label, options, def });
const b = (tab: ParamTab, label: string, def: boolean): BoolParam =>
  ({ kind: "bool", tab, label, def });

export const PARAMS = {
  // ── PERFORM ──────────────────────────────────────────────────────────
  masterGain: n("PERFORM", "master gain", 0, 1.5, 0.9, 0.01),

  // ── GEO ──────────────────────────────────────────────────────────────
  geoMode: e("GEO", "geo mode", ["PHYLLO", "LSYS", "VORO", "HYBRID"], "PHYLLO"),
  geoModeA: e("GEO", "hybrid A", ["PHYLLO", "LSYS", "VORO"], "PHYLLO"),
  geoModeB: e("GEO", "hybrid B", ["PHYLLO", "LSYS", "VORO"], "VORO"),
  seedCount: n("GEO", "seeds", 8, 256, 55, 1),
  angleOffset: n("GEO", "angle offset", -3, 3, 0, 0.01, "°"),
  wellDepth: n("GEO", "well depth", 0, 1, 0.6, 0.01),
  wellRadius: n("GEO", "well radius", 0.01, 0.1, 0.03, 0.001),
  lsysIterations: n("GEO", "L iterations", 1, 5, 3, 1),
  branchAngle: n("GEO", "branch angle", 15, 40, 25.7, 0.1, "°"),
  lsysSeed: n("GEO", "L seed", 1, 9999, 1, 1),
  cellCount: n("GEO", "cells", 8, 128, 32, 1),
  relax: n("GEO", "Lloyd relax", 0, 8, 2, 1),
  wallWidth: n("GEO", "wall width", 0.005, 0.04, 0.012, 0.001),
  wallHeight: n("GEO", "wall height", 0, 1, 0.7, 0.01),
  geoMix: n("GEO", "geo mix", 0, 1, 0, 0.01),
  brushRadius: n("GEO", "brush radius", 0.01, 0.1, 0.04, 0.001),
  brushDepth: n("GEO", "brush depth", -1, 1, -0.5, 0.01),

  // ── FIELD ────────────────────────────────────────────────────────────
  packetX: n("FIELD", "packet x", 0, 1, 0.5, 0.001),
  packetY: n("FIELD", "packet y", 0, 1, 0.5, 0.001),
  packetWidth: n("FIELD", "packet width", 0.02, 0.2, 0.08, 0.001),
  px: n("FIELD", "momentum x", -40, 40, 8, 0.1),
  py: n("FIELD", "momentum y", -40, 40, 0, 0.1),
  substeps: n("FIELD", "substeps", 1, 32, 8, 1),
  damping: n("FIELD", "damping", 0, 0.02, 0.002, 0.0001),
  boundary: e("FIELD", "boundary", ["reflect", "absorb"], "reflect"),
  gamma: n("FIELD", "gamma", 0.3, 1.5, 0.7, 0.01),
  hueShift: n("FIELD", "hue shift", 0, 360, 0, 1, "°"),
  vOverlay: n("FIELD", "V overlay", 0, 1, 0.3, 0.01),

  // ── SOUND ────────────────────────────────────────────────────────────
  modeCount: n("SOUND", "modes", 1, 16, 8, 1),
  fRoot: n("SOUND", "f root", 30, 400, 55, 1, "Hz"),
  warp: n("SOUND", "warp", 0.3, 2.0, 0.7, 0.01),
  partialGlide: n("SOUND", "partial glide", 0.05, 2, 0.4, 0.01, "s"),
  droneLevel: n("SOUND", "drone level", 0, 1, 0.5, 0.01),
  fmAmount: n("SOUND", "fm amount", 0, 0.3, 0.05, 0.001),
  collapseSharpness: n("SOUND", "collapse σ", 0.01, 0.15, 0.05, 0.001),
  strikeDecay: n("SOUND", "strike decay", 0.1, 4, 1.2, 0.01, "s"),
  strikeTone: n("SOUND", "strike tone", 0.5, 2, 1, 0.01),
  strikeLevel: n("SOUND", "strike level", 0, 1, 0.6, 0.01),
  probeCount: n("SOUND", "probes", 4, 32, 12, 1),
  grainDensity: n("SOUND", "grain density", 0, 60, 20, 1),
  grainSize: n("SOUND", "grain size", 10, 200, 60, 1, "ms"),
  grainJitter: n("SOUND", "grain jitter", 0, 1, 0.3, 0.01),
  grainLevel: n("SOUND", "grain level", 0, 1, 0.35, 0.01),
  grainSrc: e("SOUND", "grain src", ["sine", "noise"], "sine"),
  drive: n("SOUND", "drive", 0, 1, 0, 0.01),
  delayTime: n("SOUND", "delay time", 20, 1200, 300, 1, "ms"),
  delayFb: n("SOUND", "delay fb", 0, 0.85, 0.35, 0.01),
  reverbSize: n("SOUND", "reverb size", 1, 8, 3, 0.1, "s"),
  reverbMix: n("SOUND", "reverb mix", 0, 1, 0.25, 0.01),
  fxSendMacro: n("SOUND", "fx send macro", 0, 1, 0.3, 0.01),
  fxSendMid: n("SOUND", "fx send mid", 0, 1, 0.3, 0.01),
  fxSendMicro: n("SOUND", "fx send micro", 0, 1, 0.3, 0.01),

  // ── SEQ ──────────────────────────────────────────────────────────────
  bpm: n("SEQ", "bpm", 40, 200, 92, 1),
  measureMode: e("SEQ", "measure mode", ["STEP", "POISSON", "MIX"], "STEP"),
  poissonRate: n("SEQ", "poisson rate", 0.2, 8, 1, 0.1, "Hz"),
  poissonAmount: n("SEQ", "poisson amt", 0, 1, 0, 0.01),
  scaleQuantize: e("SEQ", "scale", SCALE_IDS, "penta"),
  transpose: n("SEQ", "transpose", -24, 24, 0, 1),

  // ── MUTATE ───────────────────────────────────────────────────────────
  feedAmount: n("MUTATE", "feed amount", 0, 1, 0.3, 0.01),
  mutateRate: n("MUTATE", "mutate rate", 0.1, 2, 0.5, 0.01, "Hz"),
  mutateSmooth: n("MUTATE", "mutate smooth", 1, 10, 4, 0.1, "s"),
  rmsTarget: n("MUTATE", "rms target", -48, 0, -18, 0.5, "dB"),
  centTarget: n("MUTATE", "cent target", 200, 4000, 1000, 10, "Hz"),
  freeze: b("MUTATE", "freeze", false),

  // ── IO ───────────────────────────────────────────────────────────────
  midiEnable: b("IO", "midi enable", false),
  midiCh: n("IO", "midi ch", 1, 16, 1, 1),
  wsRate: n("IO", "ws rate", 10, 60, 30, 1, "fps"),
  sendField: b("IO", "send field", false),
  fieldRate: n("IO", "field rate", 5, 30, 15, 1, "fps"),
} as const satisfies Record<string, ParamDef>;

export type ParamName = keyof typeof PARAMS;

// Concrete runtime value store, initialised to defaults.
export type ParamValue = number | string | boolean;
export type ParamState = Record<ParamName, ParamValue>;

export function defaultState(): ParamState {
  const s = {} as ParamState;
  for (const key of Object.keys(PARAMS) as ParamName[]) {
    s[key] = PARAMS[key].def;
  }
  return s;
}

// Non-parameter runtime settings that live outside the knob table.
export interface Settings {
  gridSize: number; // 256 or 128 (perf fallback)
  wsUrl: string;
  midiDeviceId: string;
}
export function defaultSettings(): Settings {
  return { gridSize: 256, wsUrl: "ws://localhost:9980", midiDeviceId: "" };
}
