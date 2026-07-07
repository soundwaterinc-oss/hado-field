// layout.ts — assembles tabs + square canvas + 16 steps + macro column + meters,
// and the IO/preset panels. Owns the DOM; main.ts supplies behaviour via hooks.
import { PARAMS, type ParamName, type ParamState, type ParamTab } from "../core/params";
import { makeControl } from "./knob";
import type { MeasureClock } from "../core/clock";

const TABS: ParamTab[] = ["GEO", "FIELD", "SOUND", "SEQ", "MUTATE", "IO"];
const MACROS: ParamName[] = ["droneLevel", "feedAmount", "collapseSharpness", "reverbMix"];

export interface UIHooks {
  onParamChange: (name: ParamName) => void;
  onObserve: (x: number, y: number) => void;
  onBrush: (x: number, y: number, raise: boolean) => void;
  onReset: () => void;
  onToggleSeq: () => void;
  presetSave: (name: string) => void;
  presetLoad: (name: string) => void;
  presetList: () => string[];
  exportJSON: () => void;
  importJSON: (text: string) => void;
  midiEnable: () => void;
  midiSelect: (id: string) => void;
  midiDevices: () => { id: string; name: string }[];
  tdConnect: (url: string) => void;
  tdDisconnect: () => void;
}

type Refreshable = HTMLElement & { refresh?: () => void };

export class HadoUI {
  canvas: HTMLCanvasElement;
  private stepEls: HTMLElement[] = [];
  private controls: Refreshable[] = [];
  private meterBar: HTMLElement;
  private hud: HTMLElement;
  private warnEl: HTMLElement;
  private tdStatus!: HTMLElement;
  private midiSel!: HTMLSelectElement;
  private presetSel!: HTMLSelectElement;

  constructor(
    root: HTMLElement, private state: ParamState,
    private clock: MeasureClock, private hooks: UIHooks,
  ) {
    root.innerHTML = "";
    const left = div("left");
    const right = div("right");
    root.append(left, right);

    // tabs bar
    const tabsbar = div("tabsbar");
    const panels: Record<string, HTMLElement> = {};
    const tabBtns: HTMLElement[] = [];
    left.appendChild(tabsbar);

    // stage
    const stage = div("stage");
    this.canvas = document.createElement("canvas");
    this.canvas.id = "glcanvas";
    this.hud = div("hud");
    this.warnEl = div("warn");
    stage.append(this.canvas, this.hud, this.warnEl);

    // panels (built per tab, hidden over the stage area as overlays via tab switch)
    const panelHost = div("panelhost");
    panelHost.style.cssText = "flex:0 0 auto;max-height:38vh;overflow:hidden;";
    for (const tab of TABS) {
      const panel = document.createElement("div");
      panel.className = "panel" + (tab === "IO" ? " io" : tab === "MUTATE" ? " mutate" : "");
      this.buildPanel(panel, tab);
      panels[tab] = panel;
      panelHost.appendChild(panel);

      const btn = div("tabbtn");
      btn.textContent = tab;
      btn.addEventListener("click", () => {
        for (const b of tabBtns) b.classList.remove("active");
        btn.classList.add("active");
        for (const p of Object.values(panels)) p.classList.remove("active");
        panel.classList.add("active");
      });
      tabBtns.push(btn);
      tabsbar.appendChild(btn);
    }

    left.append(panelHost, stage, this.buildSteps());
    tabBtns[0].classList.add("active");
    panels.GEO.classList.add("active");

    // right column: macros + meter + presets
    this.meterBar = div("bar");
    this.buildRight(right);

    this.bindCanvas();
  }

  private buildPanel(panel: HTMLElement, tab: ParamTab): void {
    for (const key of Object.keys(PARAMS) as ParamName[]) {
      if (PARAMS[key].tab !== tab) continue;
      const c = makeControl(key, this.state, this.hooks.onParamChange) as Refreshable;
      this.controls.push(c);
      panel.appendChild(c);
    }
    if (tab === "IO") this.buildIO(panel);
    if (tab === "SEQ") this.buildSeqExtras(panel);
  }

  private buildSeqExtras(panel: HTMLElement): void {
    const note = div("status");
    note.textContent = "Space=play/stop · click canvas=observe · R=reset · F=freeze";
    panel.appendChild(note);
  }

  private buildIO(panel: HTMLElement): void {
    // MIDI
    const midiWrap = div("ctl");
    const midiBtn = button("enable midi", () => {
      this.hooks.midiEnable();
      setTimeout(() => this.refreshMidiDevices(), 400);
    });
    this.midiSel = document.createElement("select");
    this.midiSel.className = "enumsel";
    this.midiSel.addEventListener("change", () => this.hooks.midiSelect(this.midiSel.value));
    midiWrap.append(labelEl("MIDI out"), midiBtn, this.midiSel);
    panel.appendChild(midiWrap);

    // TD bridge
    const tdWrap = div("ctl");
    const url = document.createElement("input");
    url.className = "txt"; url.value = "ws://localhost:9980";
    const row = div("row");
    row.append(
      button("connect", () => this.hooks.tdConnect(url.value)),
      button("disconnect", () => this.hooks.tdDisconnect()),
    );
    this.tdStatus = div("status");
    this.tdStatus.textContent = "TD: idle (dormant)";
    tdWrap.append(labelEl("TouchDesigner bridge"), url, row, this.tdStatus);
    panel.appendChild(tdWrap);

    const ccInfo = div("status");
    ccInfo.innerHTML = "CC20 rms · CC21 centroid · CC22–29 mode1–8 amp";
    panel.appendChild(ccInfo);
  }

  private buildSteps(): HTMLElement {
    const steps = div("steps");
    for (let i = 0; i < 16; i++) {
      const s = div("step");
      const p = div("p");
      s.appendChild(p);
      const refresh = (): void => {
        s.classList.toggle("on", this.clock.steps[i]);
        p.textContent = this.clock.steps[i] ? this.clock.stepProb[i].toFixed(2).slice(1) : "";
      };
      s.addEventListener("click", () => { this.clock.steps[i] = !this.clock.steps[i]; refresh(); });
      // long-press cycles probability
      let t = 0;
      s.addEventListener("pointerdown", () => {
        t = window.setTimeout(() => {
          const cyc = [0.25, 0.5, 0.75, 1.0];
          const idx = cyc.indexOf(this.clock.stepProb[i]);
          this.clock.stepProb[i] = cyc[(idx + 1) % cyc.length];
          this.clock.steps[i] = true; refresh();
        }, 450);
      });
      s.addEventListener("pointerup", () => clearTimeout(t));
      refresh();
      this.stepEls.push(s);
      steps.appendChild(s);
    }
    return steps;
  }

  private buildRight(right: HTMLElement): void {
    const macroHead = document.createElement("h4");
    macroHead.textContent = "MACROS";
    right.appendChild(macroHead);
    for (const m of MACROS) {
      const c = makeControl(m, this.state, this.hooks.onParamChange) as Refreshable;
      this.controls.push(c);
      right.appendChild(c);
    }
    const meterHead = document.createElement("h4");
    meterHead.textContent = "OUTPUT";
    const meter = div("meter");
    meter.appendChild(this.meterBar);
    right.append(meterHead, meter);

    // presets
    const presetHead = document.createElement("h4");
    presetHead.textContent = "PRESETS";
    this.presetSel = document.createElement("select");
    this.presetSel.className = "enumsel";
    this.refreshPresets();
    this.presetSel.addEventListener("change", () => this.hooks.presetLoad(this.presetSel.value));
    const nameIn = document.createElement("input");
    nameIn.className = "txt"; nameIn.placeholder = "preset name";
    const row1 = div("row");
    row1.append(
      button("save", () => { if (nameIn.value) { this.hooks.presetSave(nameIn.value); this.refreshPresets(); } }),
      button("export", () => this.hooks.exportJSON()),
    );
    const importInput = document.createElement("input");
    importInput.type = "file"; importInput.accept = ".json"; importInput.style.display = "none";
    importInput.addEventListener("change", async () => {
      const f = importInput.files?.[0];
      if (f) this.hooks.importJSON(await f.text());
    });
    const row2 = div("row");
    row2.append(button("import", () => importInput.click()));
    right.append(presetHead, this.presetSel, nameIn, row1, row2, importInput);
  }

  private bindCanvas(): void {
    const toXY = (e: PointerEvent): [number, number] => {
      const r = this.canvas.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
    };
    let down = false, moved = false, shift = false;
    this.canvas.addEventListener("pointerdown", (e) => {
      down = true; moved = false; shift = e.shiftKey;
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (!down) return;
      moved = true;
      const [x, y] = toXY(e);
      this.hooks.onBrush(x, y, shift);
    });
    this.canvas.addEventListener("pointerup", (e) => {
      const [x, y] = toXY(e);
      if (!moved) this.hooks.onObserve(x, y);
      down = false;
    });
  }

  // ── live updates from main ────────────────────────────────────────────
  setMeter(rms: number): void { this.meterBar.style.width = `${Math.min(100, rms * 300)}%`; }
  setHud(text: string): void { this.hud.textContent = text; }
  setWarn(text: string): void { this.warnEl.textContent = text; }
  setTdStatus(text: string, cls = ""): void { this.tdStatus.textContent = text; this.tdStatus.className = "status " + cls; }
  setStepCursor(i: number): void {
    this.stepEls.forEach((s, k) => s.classList.toggle("cursor", k === i));
  }
  refreshAll(): void { for (const c of this.controls) c.refresh?.(); }
  refreshMidiDevices(): void {
    const devs = this.hooks.midiDevices();
    this.midiSel.innerHTML = "";
    for (const d of devs) {
      const o = document.createElement("option");
      o.value = d.id; o.textContent = d.name;
      this.midiSel.appendChild(o);
    }
  }
  private refreshPresets(): void {
    const list = this.hooks.presetList();
    this.presetSel.innerHTML = "";
    for (const n of list) {
      const o = document.createElement("option");
      o.value = n; o.textContent = n;
      this.presetSel.appendChild(o);
    }
  }
}

function div(cls: string): HTMLElement { const d = document.createElement("div"); d.className = cls; return d; }
function button(text: string, on: () => void): HTMLElement {
  const b = document.createElement("button"); b.className = "btn"; b.textContent = text;
  b.addEventListener("click", on); return b;
}
function labelEl(text: string): HTMLElement {
  const l = document.createElement("label"); l.innerHTML = `<span>${text}</span>`; return l;
}
