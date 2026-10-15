/**
 * Independently authored support for a sphere above a continuous, piecewise
 * planar height field. No third-party reference implementation was copied.
 * Coordinates use {x,z,y}; the height field must match the rendered triangles.
 * Pure geometry only: not a completed Three.js cursor or GPU validation.
 */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function insideTriangle(x, z, a, b, c) {
  const det = (b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z);
  const u = ((x - a.x) * (c.z - a.z) - (z - a.z) * (c.x - a.x)) / det;
  const v = ((b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x)) / det;
  return u >= -1e-10 && v >= -1e-10 && u + v <= 1 + 1e-10;
}

/** Maximum of h(p)+sqrt(r*r-|p-centre|^2) on triangle intersect sphere disk. */
export function triangleSphereSupport(cx, cz, radius, triangle) {
  const [a, b, c] = triangle;
  const dx1 = b.x - a.x, dz1 = b.z - a.z;
  const dx2 = c.x - a.x, dz2 = c.z - a.z;
  const det = dx1 * dz2 - dx2 * dz1;
  if (Math.abs(det) < 1e-14) throw new Error('Degenerate projected triangle');
  if (!(radius > 0) || !Number.isFinite(radius)) throw new Error('Positive radius required');
  const gx = ((b.y - a.y) * dz2 - (c.y - a.y) * dz1) / det;
  const gz = (dx1 * (c.y - a.y) - dx2 * (b.y - a.y)) / det;
  const height = (x, z) => a.y + gx * (x - a.x) + gz * (z - a.z);
  let best = -Infinity;
  const evaluate = (x, z) => {
    const remaining = radius * radius - (x - cx) ** 2 - (z - cz) ** 2;
    if (remaining >= -1e-10 * Math.max(1, radius * radius))
      best = Math.max(best, height(x, z) + Math.sqrt(Math.max(0, remaining)));
  };

  // Interior maximum of this concave support function on the infinite plane.
  const scale = radius / Math.sqrt(1 + gx * gx + gz * gz);
  const px = cx + gx * scale, pz = cz + gz * scale;
  if (insideTriangle(px, pz, a, b, c)) evaluate(px, pz);

  // Each restricted edge is another concave, one-dimensional function.
  for (const [p, q] of [[a, b], [b, c], [c, a]]) {
    const length = Math.hypot(q.x - p.x, q.z - p.z);
    const ux = (q.x - p.x) / length, uz = (q.z - p.z) / length;
    const centreAlong = (cx - p.x) * ux + (cz - p.z) * uz;
    const qx = p.x + centreAlong * ux, qz = p.z + centreAlong * uz;
    const distance2 = (qx - cx) ** 2 + (qz - cz) ** 2;
    if (distance2 > radius * radius) continue;
    const diskHalf = Math.sqrt(Math.max(0, radius * radius - distance2));
    const low = Math.max(-centreAlong, -diskHalf);
    const high = Math.min(length - centreAlong, diskHalf);
    if (low > high) continue;
    const slope = gx * ux + gz * uz;
    const optimum = clamp(slope * diskHalf / Math.sqrt(1 + slope * slope), low, high);
    evaluate(qx + optimum * ux, qz + optimum * uz);
    // Endpoints also cover numerical tangencies and vertex intersections.
    evaluate(qx + low * ux, qz + low * uz);
    evaluate(qx + high * ux, qz + high * uz);
  }
  return best;
}

/** Grid split matches f340403: a,c,b and b,c,d; vertexHeight samples rawHeight. */
export function gridSphereSupport(cx, cz, radius, spacing, vertexHeight, epsilon = 0.015) {
  if (![cx, cz, radius, spacing, epsilon].every(Number.isFinite) ||
      radius <= 0 || spacing <= 0 || epsilon < 0) throw new Error('Invalid support input');
  const minX = Math.floor((cx - radius) / spacing);
  const maxX = Math.floor((cx + radius) / spacing);
  const minZ = Math.floor((cz - radius) / spacing);
  const maxZ = Math.floor((cz + radius) / spacing);
  const cache = new Map();
  function vertex(ix, iz) {
    const key = `${ix},${iz}`;
    if (!cache.has(key)) {
      const x = ix * spacing, z = iz * spacing, y = vertexHeight(x, z);
      if (!Number.isFinite(y)) throw new Error('Non-finite terrain sample');
      cache.set(key, {x, z, y});
    }
    return cache.get(key);
  }
  let best = -Infinity;
  for (let ix = minX; ix <= maxX; ix++) for (let iz = minZ; iz <= maxZ; iz++) {
    const a = vertex(ix, iz), b = vertex(ix + 1, iz);
    const c = vertex(ix, iz + 1), d = vertex(ix + 1, iz + 1);
    best = Math.max(best,
      triangleSphereSupport(cx, cz, radius, [a, c, b]),
      triangleSphereSupport(cx, cz, radius, [b, c, d]));
  }
  if (!Number.isFinite(best)) throw new Error('No intersecting terrain triangles');
  return best + epsilon;
}

/** Barycentric height of precisely the same grid triangulation. */
export function triangleGridHeight(x, z, spacing, vertexHeight) {
  const x0 = Math.floor(x / spacing) * spacing, z0 = Math.floor(z / spacing) * spacing;
  const u = (x - x0) / spacing, v = (z - z0) / spacing;
  const a = vertexHeight(x0, z0), b = vertexHeight(x0 + spacing, z0);
  const c = vertexHeight(x0, z0 + spacing), d = vertexHeight(x0 + spacing, z0 + spacing);
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v
    : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}

/** Conservative maximum over ALL cells covering a segment's expanded AABB.
 * Over-includes cells deliberately; linear triangle extrema occur at vertices.
 * Raise the complete rendered primitive to this height+gap+vertical half extent,
 * or subdivide and apply per subsegment. This is not a tight capsule solver.
 */
export function segmentTerrainCeiling(a, b, footprintRadius, spacing, vertexHeight) {
  if (footprintRadius < 0 || spacing <= 0) throw new Error('Invalid footprint');
  const ix0 = Math.floor((Math.min(a.x, b.x) - footprintRadius) / spacing);
  const ix1 = Math.floor((Math.max(a.x, b.x) + footprintRadius) / spacing) + 1;
  const iz0 = Math.floor((Math.min(a.z, b.z) - footprintRadius) / spacing);
  const iz1 = Math.floor((Math.max(a.z, b.z) + footprintRadius) / spacing) + 1;
  let ceiling = -Infinity;
  for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
    const h = vertexHeight(ix * spacing, iz * spacing);
    if (!Number.isFinite(h)) throw new Error('Non-finite terrain sample');
    ceiling = Math.max(ceiling, h);
  }
  return ceiling;
}
