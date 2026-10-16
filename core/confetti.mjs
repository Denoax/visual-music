import { smooth5 } from "./opening-layers.mjs";
const random = (i) => {
  let h = Math.imul((i + 1) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
/** Six deterministic paper cohorts arrive across the upper viewport in .94s.
 * Sample only from presented confetti age: seeks/pause never create emitters.
 * Each piece fades in and dies by 3.82s; later births have shorter lives so the
 * entire shower settles before the existing four-second canvas/RAF cutoff.
 * x/y are viewport fractions; dimensions are CSS pixels. No textures/dependency.
 */
export function confettiAt(age, { reduced = false, count = 36 } = {}) {
  if (reduced || !Number.isFinite(age) || age < 0 || age >= 4) return [];
  const pieces = [],
    total = Math.min(48, Math.max(0, Math.floor(count)));
  for (let i = 0; i < total; i++) {
    const seed = i * 9,
      cohort = i % 6,
      birth = cohort * 0.18 + random(seed) * 0.04;
    const death = 3.5 + random(seed + 1) * 0.32;
    if (age < birth || age >= death) continue;
    const elapsed = age - birth,
      column = (Math.floor(i / 6) * 5 + cohort * 2) % 8;
    const x = (column + 0.5 + (random(seed + 2) - 0.5) * 0.55) / 8;
    const drift = (random(seed + 3) - 0.5) * 0.035;
    const flutter =
      Math.sin(elapsed * 3 + random(seed + 4) * Math.PI * 2) *
      0.008 *
      smooth5(elapsed / 0.25);
    pieces.push({
      id: i,
      x: x + drift * elapsed + flutter,
      y:
        -0.045 +
        random(seed + 5) * 0.11 +
        (0.09 + random(seed + 6) * 0.07) * elapsed +
        0.17 * elapsed * elapsed,
      rotation:
        random(seed + 7) * 360 + (random(seed + 8) - 0.5) * 170 * elapsed,
      width: 3 + random(seed + 4) * 4,
      height: 2.5,
      opacity:
        smooth5(elapsed / 0.16) *
        (1 - smooth5((age - (death - 0.55)) / 0.55)) *
        0.65,
      colour: ["#91dce5", "#c3b5e8", "#f0d4a3", "#d9e4ec"][i % 4],
    });
  }
  return pieces;
}
