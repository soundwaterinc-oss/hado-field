// fx.ts — shared send FX: drive(waveshaper) → ping-pong delay → generated-IR reverb → limiter.
import type { ParamState } from "../core/params";

function makeDriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(n);
  const k = amount * 60;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

// Exponentially decaying noise IR (stereo).
function makeReverbIR(ctx: AudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.max(1, Math.floor(seconds * rate));
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
  }
  return buf;
}

export class FxChain {
  readonly input: GainNode;      // FX send bus
  readonly output: GainNode;     // to analyser/limiter
  private drive: WaveShaperNode;
  private delayL: DelayNode;
  private delayR: DelayNode;
  private fbL: GainNode;
  private fbR: GainNode;
  private convolver: ConvolverNode;
  private wet: GainNode;
  private dry: GainNode;
  private limiter: DynamicsCompressorNode;
  private lastReverbSize = -1;

  constructor(private ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.drive = ctx.createWaveShaper();
    this.drive.curve = makeDriveCurve(0);
    this.drive.oversample = "2x";

    // ping-pong delay
    this.delayL = ctx.createDelay(2);
    this.delayR = ctx.createDelay(2);
    this.fbL = ctx.createGain();
    this.fbR = ctx.createGain();
    const panL = ctx.createStereoPanner(); panL.pan.value = -0.7;
    const panR = ctx.createStereoPanner(); panR.pan.value = 0.7;
    this.input.connect(this.drive);
    this.drive.connect(this.delayL);
    this.delayL.connect(this.fbL); this.fbL.connect(this.delayR);
    this.delayR.connect(this.fbR); this.fbR.connect(this.delayL);
    this.delayL.connect(panL); this.delayR.connect(panR);

    // reverb
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = makeReverbIR(ctx, 3);
    this.wet = ctx.createGain();
    this.dry = ctx.createGain();
    const reverbIn = ctx.createGain();
    this.drive.connect(reverbIn);
    panL.connect(reverbIn); panR.connect(reverbIn);
    reverbIn.connect(this.convolver);
    this.convolver.connect(this.wet);
    reverbIn.connect(this.dry);

    // limiter
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.ratio.value = 20;
    this.limiter.threshold.value = -3;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.15;
    this.wet.connect(this.limiter);
    this.dry.connect(this.limiter);
    this.limiter.connect(this.output);
  }

  update(p: ParamState): void {
    this.drive.curve = makeDriveCurve(p.drive as number);
    const dt = (p.delayTime as number) / 1000;
    this.delayL.delayTime.value = dt;
    this.delayR.delayTime.value = dt;
    this.fbL.gain.value = p.delayFb as number;
    this.fbR.gain.value = p.delayFb as number;
    const mix = p.reverbMix as number;
    this.wet.gain.value = mix;
    this.dry.gain.value = 1 - mix * 0.5;
    const size = p.reverbSize as number;
    if (Math.abs(size - this.lastReverbSize) > 0.05) {
      this.lastReverbSize = size;
      this.convolver.buffer = makeReverbIR(this.ctx, size);
    }
  }
}
