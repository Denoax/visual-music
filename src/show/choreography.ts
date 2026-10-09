import type { Score, ScoreEvent } from "./cues";
export type Vec3 = [number, number, number];
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const terrainHeight = (x: number, z: number) =>
  4.1 * Math.sin(x * 0.045 + z * 0.018) +
  3.2 * Math.cos(z * 0.049 - x * 0.013) +
  1.7 * Math.sin(x * 0.092 + z * 0.037);
export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export interface Features {
  low: number;
  mid: number;
  high: number;
  flux: number;
}
export interface FeatureData {
  runtime_sha256: string;
  hop_seconds: number;
  samples: number[][];
}
export function sampleFeatures(data: FeatureData, seconds: number): Features {
  const index = clamp(seconds / data.hop_seconds, 0, data.samples.length - 1),
    i = Math.floor(index),
    a = data.samples[i],
    b = data.samples[Math.min(i + 1, data.samples.length - 1)],
    f = index - i;
  const at = (n: number) => a[n] + (b[n] - a[n]) * f;
  return { low: at(1), mid: at(2), high: at(3), flux: at(4) };
}
export function curveAt(points: [number, number][], seconds: number) {
  let i = 0;
  while (i < points.length - 2 && seconds > points[i + 1][0]) i++;
  const a = points[i],
    b = points[i + 1];
  return a[1] + (b[1] - a[1]) * smooth(a[0], b[0], seconds);
}
// Camera knots describe travel through this fixed world. Time never integrates frame deltas.
function pathAt(
  knots: Score["camera_knots"],
  seconds: number,
): { position: Vec3; fov: number } {
  let i = 0;
  while (i < knots.length - 2 && seconds > knots[i + 1][0]) i++;
  const a = knots[i],
    b = knots[i + 1],
    f = smooth(a[0], b[0], seconds);
  const p0 = knots[Math.max(0, i - 1)][1],
    p1 = a[1],
    p2 = b[1],
    p3 = knots[Math.min(knots.length - 1, i + 2)][1];
  const p = p1.map(
    (v, n) =>
      0.5 *
      (2 * v +
        (-p0[n] + p2[n]) * f +
        (2 * p0[n] - 5 * v + 4 * p2[n] - p3[n]) * f * f +
        (-p0[n] + 3 * v - 3 * p2[n] + p3[n]) * f * f * f),
  ) as Vec3;
  p[1] += terrainHeight(p[0], p[2]);
  return { position: p, fov: a[2] + (b[2] - a[2]) * f };
}
export interface ShowFrame {
  seconds: number;
  position: Vec3;
  target: Vec3;
  fov: number;
  density: number;
  morph: number;
  release: number;
  ribbons: number;
  beams: number;
  beamFan: number;
  groupPulse: Vec3;
  palette: number;
  brightness: number;
  accent: number;
  wave: ScoreEvent | null;
  features: Features;
}
export function evaluateShow(
  score: Score,
  seconds: number,
  features: Features,
  portrait = false,
  reduced = false,
): ShowFrame {
  const t = clamp(seconds, 0, score.duration_seconds),
    camera = pathAt(score.camera_knots, t);
  let gathering = 0;
  for (const e of score.events)
    if (e.params.gather_delta)
      gathering +=
        e.params.gather_delta *
        smooth(e.seconds, e.seconds + e.duration_seconds, t);
  gathering = clamp(gathering);
  const at = (name: keyof Score["curves"]) => curveAt(score.curves[name], t);
  const release = at("release") + 0.25 * gathering,
    morph = at("morph") + 0.18 * gathering;
  const ending = clamp((at("brightness") - 0.45) / 0.55);
  const target: Vec3 = [
    camera.position[0] * 0.2,
    terrainHeight(0, camera.position[2] - 42) +
      5 +
      Math.max(0, morph - 0.13) * 4 +
      release * 40,
    camera.position[2] - 48,
  ];
  let wave: ScoreEvent | null = null,
    accent = 0,
    beamFan = 0;
  const groupPulse: Vec3 = [0, 0, 0];
  for (const event of score.events) {
    const age = t - event.seconds;
    if (
      age >= 0 &&
      event.type === "terrain_ignite" &&
      age < event.duration_seconds
    )
      wave = event;
    if (age >= 0 && age < event.duration_seconds) {
      const pulse =
        smooth(0, 0.35, age) * (1 - smooth(0.35, event.duration_seconds, age));
      accent = Math.max(accent, pulse);
      if (event.type === "beam_fan") beamFan = Math.max(beamFan, pulse);
      if (["group_morph", "group_release"].includes(event.type)) {
        const group = ["group_0", "group_1", "group_2"].indexOf(event.target);
        if (group >= 0) groupPulse[group] = Math.max(groupPulse[group], pulse);
      }
    }
  }
  if (portrait) {
    camera.position[1] += 3;
    target[1] += 4;
    camera.fov += 8;
  }
  // The accessible mode keeps the land and canopy legible from a stable elevated view.
  if (reduced) {
    camera.position = [0, terrainHeight(0, 40) + 24, 40];
    target[0] = 0;
    target[1] = 9 + release * 12;
    target[2] = -25;
    camera.fov = portrait ? 70 : 60;
  }
  return {
    seconds: t,
    position: camera.position,
    target,
    fov: camera.fov,
    density: at("density"),
    morph,
    release: release * ending,
    ribbons: at("ribbons"),
    beams: at("beams") + (reduced ? 0.12 : 0.45) * beamFan,
    beamFan,
    groupPulse,
    palette: at("palette"),
    brightness: at("brightness"),
    accent: reduced ? accent * 0.2 : accent,
    wave: reduced ? null : wave,
    features,
  };
}
export interface Burst {
  seconds: number;
  seed: number;
  position: Vec3;
}
/** World-space particles are reconstructed from event age and immutable seeded velocities. */
export function particleAt(
  burst: Burst,
  index: number,
  seconds: number,
): Vec3 | null {
  const age = seconds - burst.seconds;
  if (age < 0 || age > 3) return null;
  const random = seeded(burst.seed + index * 7919),
    theta = random() * Math.PI * 2,
    y = 0.25 + random(),
    speed = 1.5 + random() * 4;
  return [
    burst.position[0] + Math.cos(theta) * speed * age,
    burst.position[1] + y * speed * age - 0.6 * age * age,
    burst.position[2] + Math.sin(theta) * speed * age,
  ];
}
