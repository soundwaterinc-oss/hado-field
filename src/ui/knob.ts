// knob.ts — one control per param. Number = vertical-drag knob; enum = select;
// bool = toggle. Double-click a knob resets to default.
import { PARAMS, type ParamName, type ParamState } from "../core/params";

export type OnChange = (name: ParamName) => void;

export function makeControl(name: ParamName, state: ParamState, onChange: OnChange): HTMLElement {
  const def = PARAMS[name];
  if (def.kind === "number") return numberKnob(name, state, onChange);
  if (def.kind === "enum") return enumSelect(name, state, onChange);
  return boolToggle(name, state, onChange);
}

function fmt(v: number, unit?: string): string {
  const s = Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(3);
  return unit ? `${s}${unit}` : s;
}

function numberKnob(name: ParamName, state: ParamState, onChange: OnChange): HTMLElement {
  const def = PARAMS[name];
  if (def.kind !== "number") throw new Error("not number");
  const wrap = document.createElement("div");
  wrap.className = "ctl";
  const label = document.createElement("label");
  const val = document.createElement("span");
  val.className = "v";
  label.innerHTML = `<span>${def.label}</span>`;
  label.appendChild(val);
  const knob = document.createElement("div");
  knob.className = "knob";
  const fill = document.createElement("div");
  fill.className = "fill";
  knob.appendChild(fill);
  wrap.append(label, knob);

  const refresh = (): void => {
    const v = state[name] as number;
    val.textContent = fmt(v, def.unit);
    fill.style.width = `${((v - def.min) / (def.max - def.min)) * 100}%`;
  };
  refresh();

  let dragging = false, startY = 0, startV = 0;
  const onMove = (e: PointerEvent): void => {
    if (!dragging) return;
    const range = def.max - def.min;
    let v = startV - ((e.clientY - startY) / 180) * range;
    const step = def.step ?? range / 100;
    v = Math.round(v / step) * step;
    v = Math.min(def.max, Math.max(def.min, v));
    state[name] = v;
    refresh();
    onChange(name);
  };
  const up = (): void => { dragging = false; window.removeEventListener("pointermove", onMove); };
  knob.addEventListener("pointerdown", (e) => {
    dragging = true; startY = e.clientY; startV = state[name] as number;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", up, { once: true });
  });
  knob.addEventListener("dblclick", () => { state[name] = def.def; refresh(); onChange(name); });
  wrap.title = name;
  (wrap as HTMLElement & { refresh?: () => void }).refresh = refresh;
  return wrap;
}

function enumSelect(name: ParamName, state: ParamState, onChange: OnChange): HTMLElement {
  const def = PARAMS[name];
  if (def.kind !== "enum") throw new Error("not enum");
  const wrap = document.createElement("div");
  wrap.className = "ctl";
  const label = document.createElement("label");
  label.innerHTML = `<span>${def.label}</span>`;
  const sel = document.createElement("select");
  sel.className = "enumsel";
  for (const o of def.options) {
    const opt = document.createElement("option");
    opt.value = o; opt.textContent = o;
    sel.appendChild(opt);
  }
  sel.value = state[name] as string;
  sel.addEventListener("change", () => { state[name] = sel.value; onChange(name); });
  wrap.append(label, sel);
  (wrap as HTMLElement & { refresh?: () => void }).refresh = () => { sel.value = state[name] as string; };
  return wrap;
}

function boolToggle(name: ParamName, state: ParamState, onChange: OnChange): HTMLElement {
  const def = PARAMS[name];
  const wrap = document.createElement("div");
  wrap.className = "ctl";
  const btn = document.createElement("div");
  btn.className = "bool";
  btn.innerHTML = `<div class="box"></div><span>${def.label}</span>`;
  const refresh = (): void => { btn.classList.toggle("on", state[name] as boolean); };
  refresh();
  btn.addEventListener("click", () => { state[name] = !(state[name] as boolean); refresh(); onChange(name); });
  wrap.appendChild(btn);
  (wrap as HTMLElement & { refresh?: () => void }).refresh = refresh;
  return wrap;
}
