// scales.ts — pitch quantisation for collapse strikes. Semitone offsets within an octave
// (fractional for microtonal maqam / gamelan). A world set incl. Ryukyu (Okinawa).
const TABLES: Record<string, number[]> = {
  // ── basics / West ──
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  penta: [0, 2, 4, 7, 9],
  minorPent: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  wholeTone: [0, 2, 4, 6, 8, 10],
  just: [0, 2.04, 3.86, 4.98, 7.02, 8.84, 10.88], // major just intonation
  // ── Japan / Ryukyu ──
  ryukyu: [0, 4, 5, 7, 11],       // 琉球音階 (Okinawa) C E F G B
  yo: [0, 2, 5, 7, 9],            // 陽/民謡
  insen: [0, 1, 5, 7, 10],
  hirajoshi: [0, 2, 3, 7, 8],
  iwato: [0, 1, 5, 6, 10],
  kumoi: [0, 2, 3, 7, 9],
  // ── India (raga, 12-TET approx) ──
  bhairav: [0, 1, 4, 5, 7, 8, 11],
  yaman: [0, 2, 4, 6, 7, 9, 11],
  todi: [0, 1, 3, 6, 7, 8, 11],
  bhairavi: [0, 1, 3, 5, 7, 8, 10],
  // ── Maqam / Persia (neutral steps) ──
  rast: [0, 2, 3.5, 5, 7, 9, 10.5],
  hijaz: [0, 1, 4, 5, 7, 8, 10],
  bayati: [0, 1.5, 3, 5, 7, 8, 10],
  saba: [0, 1.5, 3, 4, 7, 8, 10],
  // ── Gamelan (microtonal) ──
  slendro: [0, 2.4, 4.8, 7.2, 9.6],
  gamelan: [0, 2.3, 4.8, 7.1, 9.7],
  pelog: [0, 1.2, 2.7, 5.4, 6.7, 7.85, 9.45],
  // ── Africa / Balkan / Iberia ──
  tizita: [0, 2, 4, 7, 9],
  hungarianMinor: [0, 2, 3, 6, 7, 8, 11],
  doubleHarmonic: [0, 1, 4, 5, 7, 8, 11],
  phrygianDom: [0, 1, 4, 5, 7, 8, 10],
};

export const SCALE_IDS = Object.keys(TABLES);

// Quantise a frequency to the nearest scale degree, then transpose semitones.
export function scaleQuantize(freq: number, scale: string, transpose: number): number {
  const table = TABLES[scale] ?? TABLES.penta;
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
