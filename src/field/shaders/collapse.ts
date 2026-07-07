// collapse.ts — observation: multiply ψ by a Gaussian localized at (mx,my),
// plus a rescale pass. Normalisation factor comes from the CPU-side reduced sum.
export const COLLAPSE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec2 outPsi;
uniform sampler2D uPsi;
uniform vec2 uPos;      // 0..1
uniform float uSigma;   // gaussian width
uniform float uScale;   // renormalisation multiplier (applied same pass)

void main(){
  vec2 psi = texture(uPsi, vUv).rg;
  vec2 d = vUv - uPos;
  float g = exp(-dot(d,d)/(2.0*uSigma*uSigma));
  outPsi = psi * g * uScale;
}`;

// init.ts-style packet injection reused here to keep the file count down.
export const INJECT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec2 outPsi;
uniform sampler2D uPsi;
uniform vec2 uCenter;   // 0..1
uniform float uWidth;   // normalized gaussian sigma
uniform vec2 uK;        // momentum (px,py)
uniform int uReplace;   // 1 => overwrite, 0 => add (superpose)

void main(){
  vec2 d = vUv - uCenter;
  float env = exp(-dot(d,d)/(2.0*uWidth*uWidth));
  float phase = uK.x*vUv.x + uK.y*vUv.y;
  vec2 packet = env * vec2(cos(phase), sin(phase));
  vec2 base = (uReplace==1) ? vec2(0.0) : texture(uPsi, vUv).rg;
  outPsi = base + packet;
}`;
