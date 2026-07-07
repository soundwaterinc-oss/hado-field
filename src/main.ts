// main.ts — startup + rAF loop. Wires field ⇄ features ⇄ audio/io, geometry, feedback, UI.
import "./ui/style.css";
import { defaultState, defaultSettings, type ParamName } from "./core/params";
import { features } from "./core/features";
import { MeasureClock } from "./core/clock";
import {
  BUILTIN_PRESETS, loadUserPresets, saveUserPreset, applyPreset,
  exportJSON, importJSON,
} from "./core/preset";
import { QuantumField } from "./field/schrodinger";
import { Probes } from "./field/probes";
import { Spectrum } from "./field/spectrum";
import { Potential } from "./geometry/potential";
import { AudioEngine } from "./audio/engine";
import { Mutator } from "./feedback/mutate";
import { MidiOut } from "./io/midi";
import { TdBridge } from "./io/tdBridge";
import { HadoUI, type UIHooks } from "./ui/layout";

const state = defaultState();
const settings = defaultSettings();
const clock = new MeasureClock();

// forward declarations assigned after UI creates the canvas
let field: QuantumField;
let potential: Potential;
const spectrum = new Spectrum();
const probes = new Probes();
const audio = new AudioEngine();
const mutator = new Mutator();
const midi = new MidiOut();
const td = new TdBridge();

function rebakeGeometry(): void {
  field.uploadV(potential.bake(state));
}

function relayoutProbes(): void {
  probes.layout(state.probeCount as number);
}

// ── observation: collapse + strike + note-out + event ─────────────────────
function observe(x: number, y: number): void {
  const N = field.gridSize;
  const ix = Math.min(N - 1, Math.max(0, Math.floor(x * N)));
  const iy = Math.min(N - 1, Math.max(0, Math.floor(y * N)));
  const localV = potential.V[iy * N + ix];
  const mag = field.sampleMag(x, y);

  field.collapse(x, y, state.collapseSharpness as number);

  // pitch from local well depth + nearest spectral mode
  const modes = features.modes;
  const depth = Math.max(0, -localV);
  let base = (state.fRoot as number) * Math.pow(2, (0.6 - depth) * 2);
  let nearest = 0, bestD = Infinity;
  modes.forEach((m, i) => { const d = Math.abs(m.f - base); if (d < bestD) { bestD = d; nearest = i; } });
  base = modes[nearest]?.f ?? base;

  const velocity = Math.min(1, Math.max(0.05, Math.sqrt(mag) * 6));
  const pitch = audio.mid.strike(base, velocity, state);
  midi.noteOn(pitch, velocity, state.strikeDecay as number, state.midiCh as number);

  features.collapse = { x, y, localV, nearestMode: nearest };
  td.sendEvent("collapse", { x, y, pitch, vel: velocity });
}

// CDF sample landing point from reduced |ψ|² (SEQ-fired observations).
function cdfSample(): [number, number] {
  const R = field.reducedSize;
  const data = field.reducedData;
  let total = 0;
  for (let i = 0; i < R * R; i++) total += data[i * 4];
  if (total <= 1e-9) return [0.5, 0.5];
  let r = Math.random() * total;
  for (let i = 0; i < R * R; i++) {
    r -= data[i * 4];
    if (r <= 0) {
      const cx = (i % R) + 0.5, cy = Math.floor(i / R) + 0.5;
      return [cx / R, cy / R];
    }
  }
  return [0.5, 0.5];
}

// ── UI hooks ───────────────────────────────────────────────────────────
const GEO_PARAMS = new Set<ParamName>([
  "geoMode", "geoModeA", "geoModeB", "seedCount", "angleOffset", "wellDepth", "wellRadius",
  "lsysIterations", "branchAngle", "lsysSeed", "cellCount", "relax", "wallWidth",
  "wallHeight", "geoMix",
]);

const hooks: UIHooks = {
  onParamChange: (name) => {
    if (GEO_PARAMS.has(name)) rebakeGeometry();
    if (name === "probeCount") relayoutProbes();
  },
  onObserve: (x, y) => { void audio.resume(); observe(x, y); },
  onBrush: (x, y, raise) => {
    potential.brush.paint(x, y, state.brushRadius as number, state.brushDepth as number, raise);
    rebakeGeometry();
  },
  onReset: () => { field.reset(state); spectrum.snapshot(field); },
  onToggleSeq: () => clock.toggle(),
  presetSave: (n) => saveUserPreset(n, state),
  presetLoad: (n) => {
    const all = [...BUILTIN_PRESETS, ...loadUserPresets()];
    const p = all.find((x) => x.name === n);
    if (!p) return;
    Object.assign(state, applyPreset(p));
    ui.refreshAll(); rebakeGeometry(); relayoutProbes();
  },
  presetList: () => [...BUILTIN_PRESETS, ...loadUserPresets()].map((p) => p.name),
  exportJSON: () => {
    const blob = new Blob([exportJSON(state)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "hado-preset.json"; a.click();
  },
  importJSON: (text) => {
    try { Object.assign(state, importJSON(text)); ui.refreshAll(); rebakeGeometry(); relayoutProbes(); }
    catch { ui.setWarn("import failed"); }
  },
  midiEnable: () => { void midi.enable(); },
  midiSelect: (id) => midi.select(id),
  midiDevices: () => midi.devices,
  tdConnect: (url) => { settings.wsUrl = url; td.connect(url); },
  tdDisconnect: () => td.disconnect(),
};

const root = document.getElementById("app")!;
const ui = new HadoUI(root, state, clock, hooks);

// now the canvas exists → build field + geometry
field = new QuantumField(ui.canvas, settings.gridSize);
potential = new Potential(field.gridSize);
rebakeGeometry();
field.reset(state);
spectrum.snapshot(field);
relayoutProbes();

// wire clock + feedback callbacks
clock.onStep = (i) => ui.setStepCursor(i);
clock.onMeasure = () => { const [x, y] = cdfSample(); observe(x, y); };
mutator.onRebake = () => rebakeGeometry();
mutator.onWarn = (m) => ui.setWarn(m);
td.onStatus = (s) => ui.setTdStatus(`TD: ${s}`, s === "open" ? "ok" : s === "error" ? "err" : "");

// resume audio on first interaction
const kickAudio = (): void => { void audio.resume(); };
window.addEventListener("pointerdown", kickAudio, { once: true });
window.addEventListener("keydown", kickAudio, { once: true });

// keyboard
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); clock.toggle(); }
  else if (e.key === "r" || e.key === "R") { field.reset(state); spectrum.snapshot(field); }
  else if (e.key === "f" || e.key === "F") { state.freeze = !(state.freeze as boolean); ui.refreshAll(); }
});

// ── canvas sizing (square, fit stage) ─────────────────────────────────────
function resize(): void {
  const stage = ui.canvas.parentElement!;
  const s = Math.min(stage.clientWidth, stage.clientHeight) - 8;
  const px = Math.max(64, s);
  ui.canvas.style.width = px + "px";
  ui.canvas.style.height = px + "px";
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ui.canvas.width = Math.floor(px * dpr);
  ui.canvas.height = Math.floor(px * dpr);
}
window.addEventListener("resize", resize);
resize();

// ── main loop ─────────────────────────────────────────────────────────────
let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  field.step(state, potential.vmax);
  spectrum.accumulate(field);
  features.t = now / 1000;
  features.modes = spectrum.update(now, state.modeCount as number, state.fRoot as number, state.warp as number);
  probes.sample(field, features.probes);

  clock.tick(dt, state);

  audio.update(dt, features, state, now);
  mutator.update(dt, features.analysis, state);

  midi.sendCC(features, state, now);
  td.sendState(features, state, now);
  td.sendField(field.reducedData, state, now);

  field.render(state, ui.canvas.width, ui.canvas.height);

  ui.setMeter(features.analysis.rms);
  ui.setHud(`${field.gridSize}² · modes ${features.modes.length} · ${clock.running ? "▶" : "■"}${state.freeze ? " · FROZEN" : ""}`);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
