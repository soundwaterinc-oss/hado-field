// reduce.ts — downsample ψ to 64×64 storing (|ψ|², R, I) per block-average.
// One readPixels of this target per frame feeds probes, spectrum, CDF and norm.
export const REDUCE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;                 // (mag2, R, I, 1)
uniform sampler2D uPsi;
uniform int uN;
uniform int uBlock;            // N/64 (1,2 or 4)

void main(){
  ivec2 o = ivec2(gl_FragCoord.xy) * uBlock;
  vec2 acc = vec2(0.0);
  float mag = 0.0;
  int count = 0;
  for (int j=0;j<4;j++){
    for (int i=0;i<4;i++){
      if (i<uBlock && j<uBlock){
        vec2 p = texelFetch(uPsi, o+ivec2(i,j), 0).rg;
        acc += p; mag += dot(p,p); count++;
      }
    }
  }
  float inv = 1.0/float(count);
  frag = vec4(mag*inv, acc.x*inv, acc.y*inv, 1.0);
}`;
