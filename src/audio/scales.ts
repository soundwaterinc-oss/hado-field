// scales.ts — pitch quantisation for collapse strikes.
type Scale = "chromatic" | "penta" | "just" | "gamelan";

// semitone offsets within an octave (just/gamelan are cents-derived, in semitone units)
const TABLES: Record<Scale, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  penta: [0, 2, 4, 7, 9],
  just: [0, 2.04, 3.86, 4.98, 7.02, 8.84, 10.88], // major just intonation
  gamelan: [0, 2.3, 4.8, 7.1, 9.7], // stretched slendro-ish
};

// Quantise a frequency to the nearest scale degree, then transpose semitones.
export function scaleQuantize(freq: number, scale: string, transpose: number): number {
  const table = TABLES[(scale as Scale)] ?? TABLES.penta;
  const ref = 55; // A1 anchor
  const semis = 12 * Math.log2(freq / ref);
  const oct = Math.floor(semis / 12);
  const within = semis - oct * 12;
  let best = table[0], bestD = Infinity;
  for (const t of table) {
    const d = Math.abs(within - t);
    if (d < bestD) { bestD = d; best = t; }
  }
  const q = oct * 12 + best + transpose;
  return ref * Math.pow(2, q / 12);
}
