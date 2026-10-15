// Original proposal for a stable low camera with a SMALL rendered-ground
// clearance pocket. Integrate on canonical vertices before triangle sampling.
// This changes nearby rendered terrain; the source wave kernel stays intact.
import { smooth5 } from "./lighting-recipes.mjs";
export const PASSAGE = Object.freeze({
  eyeY: 5.4,
  clearance: 4.43,
  innerRadius: 6,
  outerRadius: 16,
  rounding: 0.12,
  physicalPitch: 3,
});
function positiveUpper(x, s) {
  if (x <= -s) return 0;
  if (x >= s) return x;
  return (x + s) ** 2 / (4 * s);
}
export function passageVertexHeight(
  rawHeight,
  x,
  z,
  camera,
  {
    eyeY = camera.eyeY ?? PASSAGE.eyeY,
    clearance = PASSAGE.clearance,
    innerRadius = PASSAGE.innerRadius,
    outerRadius = PASSAGE.outerRadius,
    rounding = PASSAGE.rounding,
  } = {},
) {
  if (
    !(
      innerRadius >= 3 * Math.SQRT2 &&
      outerRadius > innerRadius &&
      rounding > 0 &&
      clearance > 0
    )
  )
    throw new RangeError("Invalid clearance pocket");
  const d = Math.hypot(x - camera.x, z - camera.z),
    influence = 1 - smooth5((d - innerRadius) / (outerRadius - innerRadius));
  return (
    rawHeight -
    influence * positiveUpper(rawHeight - (eyeY - clearance), rounding)
  );
}
export function canonicalTriangle(x, z, pitch = 3) {
  const x0 = Math.floor(x / pitch) * pitch,
    z0 = Math.floor(z / pitch) * pitch,
    fx = (x - x0) / pitch,
    fz = (z - z0) / pitch;
  return fx + fz <= 1
    ? {
        vertices: [
          [x0, z0],
          [x0 + pitch, z0],
          [x0, z0 + pitch],
        ],
        weights: [1 - fx - fz, fx, fz],
      }
    : {
        vertices: [
          [x0 + pitch, z0 + pitch],
          [x0, z0 + pitch],
          [x0 + pitch, z0],
        ],
        weights: [fx + fz - 1, 1 - fx, 1 - fz],
      };
}
