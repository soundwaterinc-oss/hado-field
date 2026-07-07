// schrodinger.ts — WebGL2 quantum field: Visscher ping-pong, downsample readback,
// packet injection, collapse, render. Domain [0,1]², reflect/absorb boundaries.
import { getGL, compile, makeTarget, fullscreenVAO, VERT, type Target } from "./gl";
import { STEP_FRAG } from "./shaders/step";
import { RENDER_FRAG } from "./shaders/render";
import { REDUCE_FRAG } from "./shaders/reduce";
import { COLLAPSE_FRAG, INJECT_FRAG } from "./shaders/collapse";
import type { ParamState } from "../core/params";

const REDUCED = 64;

export class QuantumField {
  readonly gl: WebGL2RenderingContext;
  private N: number;
  private a: Target;
  private b: Target;
  private V: Target;
  private reduced: Target;
  private vao: WebGLVertexArrayObject;
  private progStep: WebGLProgram;
  private progRender: WebGLProgram;
  private progReduce: WebGLProgram;
  private progCollapse: WebGLProgram;
  private progInject: WebGLProgram;

  // CPU-side reduced field: [mag2, R, I, 1] × 64×64, refreshed each frame.
  readonly reducedData = new Float32Array(REDUCED * REDUCED * 4);
  private normScale = 1; // brightness normalisation (1/max mag2)
  private totalSumSq = 1;
  private stepCounter = 0;

  constructor(canvas: HTMLCanvasElement, gridSize: number) {
    this.gl = getGL(canvas);
    this.N = gridSize;
    const gl = this.gl;
    this.vao = fullscreenVAO(gl);
    this.a = makeTarget(gl, this.N, this.N, gl.RG32F, gl.RG, null, gl.LINEAR);
    this.b = makeTarget(gl, this.N, this.N, gl.RG32F, gl.RG, null, gl.LINEAR);
    this.V = makeTarget(gl, this.N, this.N, gl.R32F, gl.RED);
    this.reduced = makeTarget(gl, REDUCED, REDUCED, gl.RGBA32F, gl.RGBA);
    this.progStep = compile(gl, VERT, STEP_FRAG);
    this.progRender = compile(gl, VERT, RENDER_FRAG);
    this.progReduce = compile(gl, VERT, REDUCE_FRAG);
    this.progCollapse = compile(gl, VERT, COLLAPSE_FRAG);
    this.progInject = compile(gl, VERT, INJECT_FRAG);
  }

  get gridSize(): number { return this.N; }

  // ── V upload ───────────────────────────────────────────────────────────
  uploadV(data: Float32Array): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.V.tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.N, this.N, gl.RED, gl.FLOAT, data);
  }

  // ── auto dt from stability bound ─────────────────────────────────────────
  autoDt(vmax: number): number {
    const dx = 1 / this.N;
    const bound = (dx * dx) / (2 + (vmax * dx * dx) / 2);
    return 0.8 * bound;
  }

  private drawTo(target: Target | null): void {
    const gl = this.gl;
    if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); gl.viewport(0, 0, target.w, target.h); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ── inject / reset ───────────────────────────────────────────────────────
  inject(p: ParamState, replace: boolean): void {
    const gl = this.gl;
    gl.useProgram(this.progInject);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.a.tex);
    gl.uniform1i(gl.getUniformLocation(this.progInject, "uPsi"), 0);
    gl.uniform2f(gl.getUniformLocation(this.progInject, "uCenter"), p.packetX as number, p.packetY as number);
    gl.uniform1f(gl.getUniformLocation(this.progInject, "uWidth"), p.packetWidth as number);
    gl.uniform2f(gl.getUniformLocation(this.progInject, "uK"), p.px as number, p.py as number);
    gl.uniform1i(gl.getUniformLocation(this.progInject, "uReplace"), replace ? 1 : 0);
    this.drawTo(this.b);
    [this.a, this.b] = [this.b, this.a];
    this.normalizeNow();
  }

  reset(p: ParamState): void {
    // Clear then inject a single packet.
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.a.fbo);
    gl.viewport(0, 0, this.N, this.N);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.inject(p, true);
    this.stepCounter = 0;
  }

  // ── simulation frame ─────────────────────────────────────────────────────
  step(p: ParamState, vmax: number): void {
    const gl = this.gl;
    const substeps = p.substeps as number;
    const dt = this.autoDt(vmax);
    const damping = p.damping as number;
    const absorb = (p.boundary as string) === "absorb" ? 1 : 0;
    gl.useProgram(this.progStep);
    const uPsi = gl.getUniformLocation(this.progStep, "uPsi");
    const uV = gl.getUniformLocation(this.progStep, "uV");
    gl.uniform1i(gl.getUniformLocation(this.progStep, "uN"), this.N);
    gl.uniform1f(gl.getUniformLocation(this.progStep, "uDt"), dt);
    gl.uniform1f(gl.getUniformLocation(this.progStep, "uDamping"), damping);
    gl.uniform1i(gl.getUniformLocation(this.progStep, "uAbsorb"), absorb);
    const uStage = gl.getUniformLocation(this.progStep, "uStage");
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.V.tex);
    gl.uniform1i(uV, 1);

    for (let s = 0; s < substeps; s++) {
      for (let stage = 0; stage < 2; stage++) {
        gl.useProgram(this.progStep);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.a.tex);
        gl.uniform1i(uPsi, 0);
        gl.uniform1i(uStage, stage);
        this.drawTo(this.b);
        [this.a, this.b] = [this.b, this.a];
      }
      this.stepCounter++;
    }
    this.refreshReduced();
    if (this.stepCounter % 100 < substeps) this.normalizeFromReduced();
  }

  // Downsample + readback (single readPixels/frame, 64×64).
  private refreshReduced(): void {
    const gl = this.gl;
    gl.useProgram(this.progReduce);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.a.tex);
    gl.uniform1i(gl.getUniformLocation(this.progReduce, "uPsi"), 0);
    gl.uniform1i(gl.getUniformLocation(this.progReduce, "uN"), this.N);
    gl.uniform1i(gl.getUniformLocation(this.progReduce, "uBlock"), this.N / REDUCED);
    this.drawTo(this.reduced);
    gl.readPixels(0, 0, REDUCED, REDUCED, gl.RGBA, gl.FLOAT, this.reducedData);

    // Track brightness normalisation and total probability.
    let maxMag = 1e-9, sum = 0;
    for (let i = 0; i < this.reducedData.length; i += 4) {
      const m = this.reducedData[i];
      if (m > maxMag) maxMag = m;
      sum += m;
    }
    this.normScale = 1 / maxMag;
    this.totalSumSq = sum; // per-cell mag2 sum (block-averaged) — used for renorm ratio
  }

  private normalizeFromReduced(): void {
    // Keep total probability ≈ constant by rescaling ψ.
    if (this.totalSumSq <= 1e-12) return;
    const target = REDUCED * REDUCED * 0.02; // arbitrary stable reference
    const factor = Math.sqrt(target / this.totalSumSq);
    if (Math.abs(factor - 1) < 0.001) return;
    this.scalePsi(Math.min(2, Math.max(0.5, factor)));
  }

  private normalizeNow(): void {
    this.refreshReduced();
    this.normalizeFromReduced();
  }

  private scalePsi(factor: number): void {
    const gl = this.gl;
    gl.useProgram(this.progCollapse);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.a.tex);
    gl.uniform1i(gl.getUniformLocation(this.progCollapse, "uPsi"), 0);
    gl.uniform2f(gl.getUniformLocation(this.progCollapse, "uPos"), 0.5, 0.5);
    gl.uniform1f(gl.getUniformLocation(this.progCollapse, "uSigma"), 1e6); // g≈1 everywhere
    gl.uniform1f(gl.getUniformLocation(this.progCollapse, "uScale"), factor);
    this.drawTo(this.b);
    [this.a, this.b] = [this.b, this.a];
  }

  // ── collapse (observation) ───────────────────────────────────────────────
  collapse(x: number, y: number, sigma: number): void {
    const gl = this.gl;
    gl.useProgram(this.progCollapse);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.a.tex);
    gl.uniform1i(gl.getUniformLocation(this.progCollapse, "uPsi"), 0);
    gl.uniform2f(gl.getUniformLocation(this.progCollapse, "uPos"), x, y);
    gl.uniform1f(gl.getUniformLocation(this.progCollapse, "uSigma"), sigma);
    gl.uniform1f(gl.getUniformLocation(this.progCollapse, "uScale"), 1);
    this.drawTo(this.b);
    [this.a, this.b] = [this.b, this.a];
    this.normalizeNow();
  }

  // ── render to screen ─────────────────────────────────────────────────────
  render(p: ParamState, vw: number, vh: number): void {
    const gl = this.gl;
    gl.useProgram(this.progRender);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.a.tex);
    gl.uniform1i(gl.getUniformLocation(this.progRender, "uPsi"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.V.tex);
    gl.uniform1i(gl.getUniformLocation(this.progRender, "uV"), 1);
    gl.uniform1f(gl.getUniformLocation(this.progRender, "uGamma"), p.gamma as number);
    gl.uniform1f(gl.getUniformLocation(this.progRender, "uHueShift"), p.hueShift as number);
    gl.uniform1f(gl.getUniformLocation(this.progRender, "uVOverlay"), p.vOverlay as number);
    gl.uniform1f(gl.getUniformLocation(this.progRender, "uScale"), this.normScale);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, vw, vh);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Sample |ψ|² at reduced-grid coordinate (0..1) via nearest lookup.
  sampleMag(x: number, y: number): number {
    const ix = Math.min(REDUCED - 1, Math.max(0, Math.floor(x * REDUCED)));
    const iy = Math.min(REDUCED - 1, Math.max(0, Math.floor(y * REDUCED)));
    return this.reducedData[(iy * REDUCED + ix) * 4];
  }

  get reducedSize(): number { return REDUCED; }
}
