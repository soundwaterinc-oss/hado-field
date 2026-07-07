// engine.ts — AudioContext graph: [macro,mid,micro] → bus gains → FX send + dry → analyser → out.
import type { HadoFeatures } from "../core/features";
import type { ParamState } from "../core/params";
import { FxChain } from "./fx";
import { MacroDrone } from "./macroDrone";
import { MidCollapse } from "./midCollapse";
import { MicroGrain } from "./microGrain";
import { Analyser } from "./analyser";

export class AudioEngine {
  readonly ctx: AudioContext;
  readonly macro: MacroDrone;
  readonly mid: MidCollapse;
  readonly micro: MicroGrain;
  readonly analyser: Analyser;
  private fx: FxChain;
  private master: GainNode;
  private busMacro: GainNode;
  private busMid: GainNode;
  private busMicro: GainNode;
  private sendMacro: GainNode;
  private sendMid: GainNode;
  private sendMicro: GainNode;
  started = false;

  constructor() {
    this.ctx = new AudioContext({ sampleRate: 48000, latencyHint: "interactive" });
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.fx = new FxChain(this.ctx);
    this.analyser = new Analyser(this.ctx);

    // buses
    this.busMacro = this.ctx.createGain();
    this.busMid = this.ctx.createGain();
    this.busMicro = this.ctx.createGain();
    this.sendMacro = this.ctx.createGain();
    this.sendMid = this.ctx.createGain();
    this.sendMicro = this.ctx.createGain();

    for (const [bus, send] of [
      [this.busMacro, this.sendMacro], [this.busMid, this.sendMid], [this.busMicro, this.sendMicro],
    ] as [GainNode, GainNode][]) {
      bus.connect(this.master);       // dry path
      bus.connect(send);              // fx send
      send.connect(this.fx.input);
    }
    this.fx.output.connect(this.master);
    this.master.connect(this.analyser.input);
    this.analyser.input.connect(this.ctx.destination);

    this.macro = new MacroDrone(this.ctx, this.busMacro);
    this.mid = new MidCollapse(this.ctx, this.busMid);
    this.micro = new MicroGrain(this.ctx, this.busMicro);
  }

  async resume(): Promise<void> {
    if (this.ctx.state !== "running") await this.ctx.resume();
    this.started = true;
  }

  // per-frame parameter + feature push
  update(dt: number, features: HadoFeatures, p: ParamState, nowMs: number): void {
    if (!this.started) return;
    this.fx.update(p);
    this.sendMacro.gain.value = p.fxSendMacro as number;
    this.sendMid.gain.value = p.fxSendMid as number;
    this.sendMicro.gain.value = p.fxSendMicro as number;
    this.macro.update(features.modes, p);
    this.micro.update(dt, features.probes, features.modes, p);
    this.analyser.update(nowMs);
    features.analysis = this.analyser.out;
  }
}
