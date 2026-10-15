/** Original reference maths, not a drop-in scene or a second transport owner. */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = (x) => { const u = clamp(x); return u * u * (3 - 2 * u); };

export function heading(yaw) {
  return { x: Math.sin(yaw), z: -Math.cos(yaw) };
}

/** Exact planar arc for constant yaw-rate input over a song-time interval.
 * Filter/input-sample outside this function; retain those samples for route replay.
 * Pitch only changes viewing here. Actual Y remains the current terrain's owner.
 */
export function advanceFlight(pose, input, deltaSong, options = {}) {
  if (!Number.isFinite(deltaSong) || deltaSong < 0) throw Error('Invalid song delta');
  const speed = options.speed ?? 18;
  const maxYawRate = options.maxYawRate ?? .7;
  const maxPitch = options.maxPitch ?? .2;
  const turn = clamp(input.turn ?? 0, -1, 1);
  const dead = options.deadZone ?? .08;
  if (speed < 0 || maxYawRate < 0 || dead < 0 || dead >= 1) throw Error('Invalid flight options');
  const neutral = Math.abs(turn) <= dead ? 0 : Math.sign(turn) * (Math.abs(turn) - dead) / (1 - dead);
  const rate = neutral * maxYawRate;
  const endYaw = pose.yaw + rate * deltaSong;
  // Mid-angle sinc avoids subtracting nearly identical cosines on tiny turns.
  const halfArc = rate * deltaSong * .5;
  const sinc = Math.abs(halfArc) < 1e-5 ? 1 - halfArc * halfArc / 6 : Math.sin(halfArc) / halfArc;
  const distance = speed * deltaSong * sinc;
  const mid = (pose.yaw + endYaw) * .5;
  const targetPitch = clamp(input.tilt ?? 0, -1, 1) * maxPitch;
  return {
    ...pose,
    x: pose.x + distance * Math.sin(mid),
    z: pose.z - distance * Math.cos(mid),
    yaw: endYaw,
    pitch: (pose.pitch ?? 0) + (targetPitch - (pose.pitch ?? 0)) * (1 - Math.exp(-6 * deltaSong)),
  };
}

/** Light transforms only: depth/collision keep the canonical world grid. */
export function transformLight(x, z, board = {}) {
  const ax = board.anchorX ?? 0, az = board.anchorZ ?? 0;
  const c = Math.cos(board.angle ?? 0), s = Math.sin(board.angle ?? 0);
  const dx = x - ax, dz = z - az;
  return { x: ax + c * dx - s * dz + (board.shiftX ?? 0), z: az + s * dx + c * dz + (board.shiftZ ?? 0) };
}

export function inverseLight(x, z, board = {}) {
  const ax = board.anchorX ?? 0, az = board.anchorZ ?? 0;
  const c = Math.cos(board.angle ?? 0), s = Math.sin(board.angle ?? 0);
  const dx = x - ax - (board.shiftX ?? 0), dz = z - az - (board.shiftZ ?? 0);
  return { x: ax + c * dx + s * dz, z: az - s * dx + c * dz };
}

/** The same lattice IDs stay under the same world positions as a tile window shifts. */
export function lightWindowCell(x, z, board = {}, spacing = 3) {
  const p = inverseLight(x, z, board);
  return { ix: Math.floor(p.x / spacing), iz: Math.floor(p.z / spacing) };
}

/** One coherent row of four fades; dropout=0 returns the entire grid. */
export function rowMembership(ix, iz, dropout = 0, group = 0) {
  const row = ((iz % 4) + 4) % 4;
  const selected = ((Math.trunc(group) % 4) + 4) % 4;
  return row === selected ? 1 - clamp(dropout) : 1;
}

/** Registry identity prevents a visible emitter or active front chasing the camera.
 * Pass a snapshot of pose at introduction. Keep the entry until all lifetimes end.
 */
export function lockEmitter(registry, event, pose, options = {}) {
  const old = registry.get(event.id);
  if (old) return old;
  const forward = heading(pose.yaw);
  const right = { x: Math.cos(pose.yaw), z: Math.sin(pose.yaw) };
  const distance = (options.ahead ?? 64) + clamp(options.previewSeconds ?? 0, 0, 2) * (options.speed ?? 18);
  const side = options.lateral ?? 0, spacing = options.spacing ?? 3;
  const record = Object.freeze({
    id: event.id, time: event.time, strength: event.strength,
    x: Math.round((pose.x + forward.x * distance + right.x * side) / spacing) * spacing,
    z: Math.round((pose.z + forward.z * distance + right.z * side) / spacing) * spacing,
  });
  registry.set(event.id, record);
  return record;
}

function hash32(a, b, c) {
  let n = Math.imul(a | 0, 0x45d9f3b) ^ Math.imul(b | 0, 0x119de1f3) ^ Math.imul(c | 0, 0x3449f5);
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return (n ^ (n >>> 16)) >>> 0;
}
const seeded = (a, b, c) => hash32(a, b, c) / 4294967296;

/** Original deterministic world samples. Translation comes from camera travel.
 * Altitude bound includes a 3-unit gap above the maximum terrain vertex height;
 * ensure rendered halo radius stays inside that gap when integrating.
 */
export function starSample(cx, cz, index, options = {}) {
  const size = options.cellSize ?? 72, bound = options.terrainBound ?? 14;
  const n = index * 6;
  return {
    id: `${cx}:${cz}:${index}`,
    x: (cx + seeded(cx, cz, n)) * size,
    z: (cz + seeded(cx, cz, n + 1)) * size,
    y: bound + 3 + 76 * seeded(cx, cz, n + 2),
    radius: .08 + .14 * seeded(cx, cz, n + 3),
    phase: 2 * Math.PI * seeded(cx, cz, n + 4),
    twinkleHz: .12 + .16 * seeded(cx, cz, n + 5),
  };
}

/** Bounded square of world cells, covering left/right/rear as well as forward. */
export function starCells(x, z, options = {}) {
  const size = options.cellSize ?? 72, radius = options.radiusCells ?? 3;
  if (!Number.isInteger(radius) || radius < 1 || size <= 0) throw Error('Invalid star window');
  const cx = Math.floor(x / size), cz = Math.floor(z / size), cells = [];
  for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
    cells.push({ cx: cx + dx, cz: cz + dz, key: `${cx + dx}:${cz + dz}` });
  }
  return cells;
}
