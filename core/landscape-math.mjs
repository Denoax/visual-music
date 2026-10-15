// Original bounded scheduling/placement aid. Existing audio + camera own time.
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const smooth = (x) => {
  const q = clamp01(x);
  return q * q * q * (q * (q * 6 - 15) + 10);
};
export function envelope(t, start, end, attack = 3, release = 4) {
  if (!(end > start && attack > 0 && release > 0))
    throw new RangeError("Invalid phrase");
  return (
    smooth((t - start) / attack) * (1 - smooth((t - end + release) / release))
  );
}
export function segmentDistanceXZ(p, a, b) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    n = dx * dx + dz * dz;
  const u = n ? clamp01(((p.x - a.x) * dx + (p.z - a.z) * dz) / n) : 0;
  return Math.hypot(p.x - a.x - u * dx, p.z - a.z - u * dz);
}
// Conservative rectangular-foot bounding disk. Covers every mesh vertex in XZ,
// including corners, not only the most visually prominent mountain peak.
export function footprintRadius(width, depth, scale = 1) {
  return 0.5 * Math.hypot(width, depth) * Math.abs(scale);
}
// Use this for an asymmetric asset such as the folded fin; width/2 alone
// would under-bound support when its AABB is offset from the model origin.
export function boundsRadius(min, max, scale = 1) {
  return (
    Math.hypot(
      Math.max(Math.abs(min[0]), Math.abs(max[0])),
      Math.max(Math.abs(min[2]), Math.abs(max[2])),
    ) * Math.abs(scale)
  );
}
export function safeToPlace(center, radius, path, guard = 70) {
  if (path.length < 2 || radius < 0 || guard < 0) return false;
  for (let i = 1; i < path.length; i++)
    if (segmentDistanceXZ(center, path[i - 1], path[i]) < radius + guard)
      return false;
  return true;
}
// A whole-object fade reaches zero OUTSIDE its support. It is an appearance
// safeguard, not a proof of all future user steering or physical collision.
export function proximityGain(center, radius, eye, zeroGap = 38, fullGap = 95) {
  const gap = Math.hypot(center.x - eye.x, center.z - eye.z) - radius;
  return smooth((gap - zeroGap) / (fullGap - zeroGap));
}
export function footprintMask(x, z, anchor, width, depth, angle = 0) {
  const dx = x - anchor.x,
    dz = z - anchor.z,
    c = Math.cos(angle),
    s = Math.sin(angle);
  const lx = (dx * c - dz * s) / (width * 0.5),
    lz = (dx * s + dz * c) / (depth * 0.5);
  return 1 - smooth((Math.max(Math.abs(lx), Math.abs(lz)) - 0.8) / 0.2);
}
export function reduceFloorGate(originalGate, mask, gain, amount = 0.78) {
  return (
    clamp01(originalGate) *
    (1 - clamp01(mask) * clamp01(gain) * clamp01(amount))
  );
}
