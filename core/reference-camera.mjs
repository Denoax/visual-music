// Independently authored numerical model of inspected reference behaviour.
// No renderer, transport, event origins or browser interaction owner here.
import score from "../show/camera-score.json" with { type: "json" };
const D = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const UNIT_SCALE = score.scale.uniformScale;
export function blend(q) {
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp(q, 0, 1));
}
const lerp = (a, b, u) =>
  Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] - a[k]) * u]));
export function compileCues(cues = score.cues, initial = score.initial) {
  let target = {
      altitude: initial.altitude,
      vfov: initial.vfov,
      tilt: initial.tilt,
      speed: initial.speed,
    },
    segments = [];
  for (const c of cues) {
    const prev = segments.at(-1),
      origin = prev
        ? lerp(
            prev.origin,
            prev.target,
            blend((c.seconds - prev.seconds) / prev.duration),
          )
        : target;
    target = { ...target, ...c.target };
    segments.push({ ...c, origin, target });
  }
  return segments;
}
export const SEGMENTS = compileCues();
export function targetsAt(t, segments = SEGMENTS) {
  const s = segments.findLast((c) => c.seconds <= t) ?? segments[0];
  return lerp(s.origin, s.target, blend((t - s.seconds) / s.duration));
}
export function initialState(segments = SEGMENTS) {
  return {
    seconds: 0,
    x: 0,
    z: 0,
    angle: score.initial.angle * D,
    pitchX: score.initial.cameraPitchX * D,
    roll: 0,
    turbo: 1,
    ...targetsAt(0, segments),
  };
}
/** One nominal source-order step. Ref coefficients use REFERENCE speed,
 * translation uses the chosen uniform scene scale. MouseY is DOWN positive.
 * Fixed-step integration belongs inside the existing route owner. */
export function step(
  state,
  t,
  dt,
  input = {},
  scale = UNIT_SCALE,
  segments = SEGMENTS,
) {
  if (
    !(
      Number.isFinite(dt) &&
      dt >= 0 &&
      dt <= 0.2 &&
      Number.isFinite(t) &&
      t >= state.seconds
    )
  )
    throw new RangeError("Invalid forward step");
  return integrate(state, targetsAt(t, segments), t, dt, input, scale);
}
export function integrate(
  state,
  parameters,
  t,
  dt,
  input = {},
  scale = UNIT_SCALE,
) {
  const { speed, altitude, vfov, tilt } = parameters,
    mx = clamp(input.x ?? 0, -1, 1),
    my = clamp(input.y ?? 0, -1, 1);
  const turbo =
    state.turbo +
    (input.held ? 2.5 - state.turbo : 1 - state.turbo) *
      dt *
      (input.held ? 4 : 2);
  const angle = state.angle - mx * turbo * dt * speed * 0.001;
  const travel = dt * speed * scale * turbo;
  const roll =
    state.roll + (mx * speed * 0.001 - state.roll) * dt * 0.3 * turbo;
  const pitchX =
    state.pitchX - (state.pitchX + my * speed * 0.0005 + tilt * D) * dt * 2;
  return {
    seconds: t,
    x: state.x - Math.sin(state.angle) * travel,
    z: state.z - Math.cos(state.angle) * travel,
    angle,
    roll,
    pitchX,
    turbo,
    speed,
    altitude,
    vfov,
    tilt,
  };
}
/** Columns of world rotation Ry(angle) Rz(-roll) Rx(pitchX), right/up/back.
 * Convert with a current Three.js Matrix4.makeBasis/quaternion, not lookAt
 * followed by another lookAt that erases the bank/pitch. */
export function basis(s) {
  const a = s.angle,
    r = -s.roll,
    p = s.pitchX,
    ca = Math.cos(a),
    sa = Math.sin(a),
    cr = Math.cos(r),
    sr = Math.sin(r),
    cp = Math.cos(p),
    sp = Math.sin(p);
  return {
    right: [ca * cr, sr, -sa * cr],
    up: [-ca * sr * cp + sa * sp, cr * cp, sa * sr * cp + ca * sp],
    back: [ca * sr * sp + sa * cp, -cr * sp, -sa * sr * sp + ca * cp],
  };
}
export function pose(s, scale = UNIT_SCALE) {
  return {
    position: [s.x, s.altitude * scale, s.z],
    vfov: s.vfov,
    basis: basis(s),
    yaw: -s.angle,
    pitchX: s.pitchX,
    bank: s.roll,
    referenceSpeed: s.speed,
    sceneSpeed: s.speed * scale,
    turbo: s.turbo,
  };
}
export function horizon(downDegrees, vfov) {
  return 0.5 - Math.tan(downDegrees * D) / (2 * Math.tan((vfov * D) / 2));
}
