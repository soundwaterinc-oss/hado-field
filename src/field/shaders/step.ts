// step.ts — leapfrog/Visscher symplectic step. Two stages per substep:
//   stage 0: update I from ∇²R and V·R    stage 1: update R from ∇²I and V·I
// ψ stored as RG32F (R=real, G=imag). V as R32F. 5-point Laplacian, reflect/absorb.
export const STEP_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec2 outPsi;              // RG = (R, I)
uniform sampler2D uPsi;       // current (R,I)
uniform sampler2D uV;         // potential
uniform int uN;
uniform float uDt;
uniform float uDamping;
uniform int uStage;           // 0=update I, 1=update R
uniform int uAbsorb;          // 1 => imaginary absorbing border

ivec2 clampC(ivec2 c){ return clamp(c, ivec2(0), ivec2(uN-1)); }

void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec2 psi = texelFetch(uPsi, c, 0).rg;
  float V  = texelFetch(uV, c, 0).r;
  float dx = 1.0 / float(uN);
  float inv2 = 1.0 / (dx*dx);

  // Absorbing border: extra damping in a 12px imaginary shell.
  float absorb = 0.0;
  if (uAbsorb == 1){
    float edge = float(min(min(c.x, c.y), min(uN-1-c.x, uN-1-c.y)));
    float shell = 12.0;
    if (edge < shell){ float t = (shell-edge)/shell; absorb = t*t*4.0; }
  }

  if (uStage == 0){
    // ∇²R using neighbour real parts
    float rc = psi.r;
    float rl = texelFetch(uPsi, clampC(c+ivec2(-1,0)),0).r;
    float rr = texelFetch(uPsi, clampC(c+ivec2( 1,0)),0).r;
    float rd = texelFetch(uPsi, clampC(c+ivec2(0,-1)),0).r;
    float ru = texelFetch(uPsi, clampC(c+ivec2(0, 1)),0).r;
    float lapR = (rl+rr+rd+ru - 4.0*rc)*inv2;
    float HR = -0.5*lapR + V*rc;          // H applied to R
    float Inew = psi.g - uDt*HR;          // I(t+dt/2) = I - dt*H R
    Inew *= (1.0 - uDamping - uDt*absorb);
    outPsi = vec2(psi.r, Inew);
  } else {
    // ∇²I using neighbour imaginary parts (already advanced this substep)
    float ic = psi.g;
    float il = texelFetch(uPsi, clampC(c+ivec2(-1,0)),0).g;
    float ir = texelFetch(uPsi, clampC(c+ivec2( 1,0)),0).g;
    float id = texelFetch(uPsi, clampC(c+ivec2(0,-1)),0).g;
    float iu = texelFetch(uPsi, clampC(c+ivec2(0, 1)),0).g;
    float lapI = (il+ir+id+iu - 4.0*ic)*inv2;
    float HI = -0.5*lapI + V*ic;
    float Rnew = psi.r + uDt*HI;           // R(t+dt) = R + dt*H I
    Rnew *= (1.0 - uDamping - uDt*absorb);
    outPsi = vec2(Rnew, psi.g);
  }
}`;
