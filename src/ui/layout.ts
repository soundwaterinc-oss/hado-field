// layout.ts — assembles tabs + square canvas + 16 steps + macro column + meters,
// and the IO/preset panels. Owns the DOM; main.ts supplies behaviour via hooks.
import { PARAMS, type ParamName, type ParamState, type ParamTab } from "../core/params";
import { makeControl } from "./knob";
import type { MeasureClock } from "../core/clock";
import { t, getLang, toggleLang } from "../core/i18n";

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

type Refreshable = HTMLElement & { refresh?: () => void; relabel?: () => void };

export class HadoUI {
  canvas: HTMLCanvasElement;
  private root!: HTMLElement;
  private langBtn!: HTMLElement;
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
    this.root = root;
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
    panelHost.style.cssText = "flex:0 0 auto;max-height:40vh;overflow-y:auto;";
    for (const tab of TABS) {
      const panel = document.createElement("div");
      panel.className = "panel" + (tab === "IO" ? " io" : tab === "MUTATE" ? " mutate" : "");
      this.buildPanel(panel, tab);
      panels[tab] = panel;
      panelHost.appendChild(panel);

      const btn = div("tabbtn");
      btn.dataset.i18n = "tab." + tab;
      btn.textContent = t("tab." + tab);
      btn.addEventListener("click", () => {
        for (const b of tabBtns) b.classList.remove("active");
        btn.classList.add("active");
        for (const p of Object.values(panels)) p.classList.remove("active");
        panel.classList.add("active");
      });
      tabBtns.push(btn);
      tabsbar.appendChild(btn);
    }
    // language toggle (shows the language you'd switch to)
    this.langBtn = div("tabbtn lang");
    this.langBtn.textContent = getLang() === "EN" ? "日本語" : "EN";
    this.langBtn.addEventListener("click", () => {
      toggleLang();
      this.langBtn.textContent = getLang() === "EN" ? "日本語" : "EN";
      this.applyLanguage();
    });
    tabsbar.appendChild(this.langBtn);

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
    note.dataset.i18n = "seqNote";
    note.textContent = t("seqNote");
    panel.appendChild(note);
  }

  private buildIO(panel: HTMLElement): void {
    // MIDI
    const midiWrap = div("ctl");
    const midiBtn = button("enableMidi", () => {
      this.hooks.midiEnable();
      setTimeout(() => this.refreshMidiDevices(), 400);
    });
    this.midiSel = document.createElement("select");
    this.midiSel.className = "enumsel";
    this.midiSel.addEventListener("change", () => this.hooks.midiSelect(this.midiSel.value));
    midiWrap.append(labelEl("midiOut"), midiBtn, this.midiSel);
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
    tdWrap.append(labelEl("tdBridge"), url, row, this.tdStatus);
    panel.appendChild(tdWrap);

    const ccInfo = div("status");
    ccInfo.dataset.i18n = "ccInfo";
    ccInfo.textContent = t("ccInfo");
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
    right.appendChild(header("macros"));
    for (const m of MACROS) {
      const c = makeControl(m, this.state, this.hooks.onParamChange) as Refreshable;
      this.controls.push(c);
      right.appendChild(c);
    }
    const meter = div("meter");
    meter.appendChild(this.meterBar);
    right.append(header("output"), meter);

    // presets
    this.presetSel = document.createElement("select");
    this.presetSel.className = "enumsel";
    this.refreshPresets();
    this.presetSel.addEventListener("change", () => this.hooks.presetLoad(this.presetSel.value));
    const nameIn = document.createElement("input");
    nameIn.className = "txt"; nameIn.dataset.i18nPh = "presetName"; nameIn.placeholder = t("presetName");
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
    right.append(header("presets"), this.presetSel, nameIn, row1, row2, importInput);
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
  applyLanguage(): void {
    this.root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n!);
    });
    this.root.querySelectorAll<HTMLInputElement>("[data-i18n-ph]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPh!);
    });
    for (const c of this.controls) c.relabel?.();
  }
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
function button(id: string, on: () => void): HTMLElement {
  const b = document.createElement("button"); b.className = "btn";
  b.dataset.i18n = id; b.textContent = t(id);
  b.addEventListener("click", on); return b;
}
function labelEl(id: string): HTMLElement {
  const l = document.createElement("label");
  const s = document.createElement("span"); s.dataset.i18n = id; s.textContent = t(id);
  l.appendChild(s); return l;
}
function header(id: string): HTMLElement {
  const h = document.createElement("h4"); h.dataset.i18n = id; h.textContent = t(id); return h;
}
