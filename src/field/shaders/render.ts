// render.ts — visualise ψ: luminance = |ψ|² (gamma), hue = arg(ψ) (+hueShift),
// with a faint V contour overlay for the walls.
export const RENDER_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;
uniform sampler2D uPsi;
uniform sampler2D uV;
uniform float uGamma;
uniform float uHueShift;   // degrees
uniform float uVOverlay;
uniform float uScale;      // brightness normalisation (1/max|ψ|²)

vec3 hsv2rgb(vec3 c){
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz)*6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main(){
  vec2 psi = texture(uPsi, vUv).rg;
  float mag2 = dot(psi, psi);
  float lum = pow(clamp(mag2 * uScale, 0.0, 1.0), uGamma);
  float phase = atan(psi.g, psi.r);            // -pi..pi
  float hue = fract(phase/6.2831853 + 0.5 + uHueShift/360.0);
  vec3 col = hsv2rgb(vec3(hue, 0.72, lum));

  // Wall overlay: bright where V is positive (barriers) and edges of contours.
  float V = texture(uV, vUv).r;
  float wall = smoothstep(0.05, 0.5, V);
  col += uVOverlay * wall * vec3(0.10, 0.13, 0.16);
  // subtle well shading (negative V)
  col += uVOverlay * smoothstep(0.05, 0.6, -V) * vec3(0.02, 0.04, 0.06);

  frag = vec4(col, 1.0);
}`;
