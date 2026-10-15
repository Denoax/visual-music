import { hashCell, starLifeGain } from "./lighting-recipes.mjs";
export const STAR_LAYER = Object.freeze({
  cellSize: 72,
  radiusCells: 3,
  lifetime: 6,
  fadeIn: 1.1,
  fadeOut: 1.3,
  maxRadius: 0.3,
  maxDistance: 330,
});
export function nearStar(cx, cz, index) {
  const n = index * 9,
    r = hashCell(cx, cz, n),
    tier = index % 4 < 2 ? "near" : index % 4 === 2 ? "mid" : "far";
  return {
    id: `${cx}:${cz}:${index}`,
    x: (cx + hashCell(cx, cz, n + 1)) * 72,
    z: (cz + hashCell(cx, cz, n + 2)) * 72,
    y:
      tier === "near"
        ? 33 + 18 * hashCell(cx, cz, n + 3)
        : tier === "mid"
          ? 51 + 20 * hashCell(cx, cz, n + 3)
          : 71 + 23.875 * hashCell(cx, cz, n + 3),
    radius:
      tier === "near"
        ? 0.16 + 0.14 * hashCell(cx, cz, n + 4)
        : tier === "mid"
          ? 0.12 + 0.09 * hashCell(cx, cz, n + 4)
          : 0.075 + 0.07 * hashCell(cx, cz, n + 4),
    phase: hashCell(cx, cz, n + 5) * STAR_LAYER.lifetime,
    tier,
    r,
  };
}
export function nearStarLife(seconds, phase) {
  const age =
    (((seconds + phase) % STAR_LAYER.lifetime) + STAR_LAYER.lifetime) %
    STAR_LAYER.lifetime;
  return starLifeGain(age, {
    lifetime: STAR_LAYER.lifetime,
    fadeIn: STAR_LAYER.fadeIn,
    fadeOut: STAR_LAYER.fadeOut,
  });
}
