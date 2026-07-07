// macroDrone.ts — eigen-mode drone: sine bank (+light FM) driven by spectrum modes.
import type { ModeFeature } from "../core/features";
import type { ParamState } from "../core/params";

interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
  mod: OscillatorNode;
  modGain: GainNode;
  pan: StereoPannerNode;
  active: boolean;
}

export class MacroDrone {
  private voices: Voice[] = [];
  constructor(private ctx: AudioContext, private out: GainNode, maxModes = 16) {
    for (let n = 0; n < maxModes; n++) this.voices.push(this.makeVoice(n));
  }

  private makeVoice(n: number): Voice {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    modGain.gain.value = 0;
    mod.connect(modGain);
    modGain.connect(osc.frequency);
    const pan = ctx.createStereoPanner();
    pan.pan.value = n % 2 === 0 ? -0.6 : 0.6;
    osc.connect(gain);
    gain.connect(pan);
    pan.connect(this.out);
    osc.start();
    mod.start();
    return { osc, gain, mod, modGain, pan, active: true };
  }

  update(modes: ModeFeature[], p: ParamState): void {
    const now = this.ctx.currentTime;
    const glide = p.partialGlide as number;
    const level = p.droneLevel as number;
    const fm = p.fmAmount as number;
    const count = Math.min(this.voices.length, p.modeCount as number);
    for (let i = 0; i < this.voices.length; i++) {
      const v = this.voices[i];
      const m = modes[i];
      if (i < count && m) {
        const f = Math.min(8000, Math.max(20, m.f));
        v.osc.frequency.setTargetAtTime(f, now, glide * 0.3);
        v.mod.frequency.setTargetAtTime(f * 2, now, glide * 0.3);
        v.modGain.gain.setTargetAtTime(f * fm, now, glide * 0.3);
        const g = (m.a * level) / Math.sqrt(count);
        v.gain.gain.setTargetAtTime(g, now, glide * 0.3);
      } else {
        v.gain.gain.setTargetAtTime(0, now, 0.1);
      }
    }
  }
}
