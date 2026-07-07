// preset.ts — named presets (localStorage) + JSON export/import of full state.
import { PARAMS, defaultState, type ParamName, type ParamState } from "./params";

const LS_KEY = "hado.presets.v1";

export interface Preset {
  name: string;
  params: Partial<Record<ParamName, number | string | boolean>>;
}

export const BUILTIN_PRESETS: Preset[] = [
  {
    name: "Garden",
    params: { geoMode: "PHYLLO", seedCount: 55, wellDepth: 0.6, warp: 0.7,
      feedAmount: 0.35, reverbMix: 0.3, grainDensity: 24 },
  },
  {
    name: "Lattice",
    params: { geoMode: "LSYS", lsysIterations: 4, branchAngle: 22, wallHeight: 0.8,
      fRoot: 82, warp: 1.0, droneLevel: 0.5, feedAmount: 0.25 },
  },
  {
    name: "Cells",
    params: { geoMode: "VORO", cellCount: 48, relax: 3, wallWidth: 0.01,
      fRoot: 44, warp: 0.55, grainDensity: 36, feedAmount: 0.4, reverbMix: 0.4 },
  },
];

export function loadUserPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Preset[]) : [];
  } catch {
    return [];
  }
}

export function saveUserPreset(name: string, state: ParamState): void {
  const presets = loadUserPresets().filter((p) => p.name !== name);
  presets.push({ name, params: { ...state } });
  localStorage.setItem(LS_KEY, JSON.stringify(presets));
}

export function deleteUserPreset(name: string): void {
  const presets = loadUserPresets().filter((p) => p.name !== name);
  localStorage.setItem(LS_KEY, JSON.stringify(presets));
}

// Apply a preset onto a fresh default so missing keys fall back cleanly.
export function applyPreset(preset: Preset): ParamState {
  const state = defaultState();
  for (const key of Object.keys(preset.params) as ParamName[]) {
    if (key in PARAMS) state[key] = preset.params[key]!;
  }
  return state;
}

export function exportJSON(state: ParamState): string {
  return JSON.stringify({ format: "hado-preset-1", params: state }, null, 2);
}

export function importJSON(text: string): ParamState {
  const parsed = JSON.parse(text) as { params?: Record<string, unknown> };
  const state = defaultState();
  const src = parsed.params ?? {};
  for (const key of Object.keys(PARAMS) as ParamName[]) {
    if (key in src) state[key] = src[key] as number | string | boolean;
  }
  return state;
}
