import {
  formationFor,
  formationPulse,
  formationGLSL,
} from "../../core/wave-formations.mjs";
import cues from "../../show/cues.proposal.json";
import eventRecord from "../../show/events.json";
import originRecord from "../../show/camera-origins.json";
import { sampleBands, type Features } from "./track";

export const WAVE = Object.freeze({
  lifetime: 5.6,
  fade: 1.4,
  attack: 0.14,
  speed: 34,
  width: 10,
  heightBound: 14,
  capacity: 16,
  travel: 18,
  spacing: 3,
});
export type Front = {
  x: number;
  z: number;
  time: number;
  strength: number;
  id: number;
};
export type WaveState = ReturnType<typeof waveState>;
export const clamp = (x: number, lo = 0, hi = 1) =>
  Math.max(lo, Math.min(hi, x));
export const smooth = (a: number, b: number, x: number) => {
  const u = clamp((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mode = (s: (typeof cues.sections)[number]) =>
  s.colour_mode === "hold" ? 1 : 0;
const palette = (s: (typeof cues.sections)[number]) =>
  s.palette_srgb.length ? s.palette_srgb : ["#ffffff", "#ffffff"];

// Nominal no-input origins support analysis and existing kernel checks. The
// interactive flight owner supplies its once-locked origins to waveState.
export const events: Front[] = eventRecord.events.map((e, id) => ({
  id,
  time: e.seconds,
  strength: e.strength,
  x: originRecord.events[id].x,
  z: originRecord.events[id].z,
}));
function lowerBound(t: number) {
  let lo = 0,
    hi = events.length;
  while (lo < hi) {
    const m = (lo + hi) >>> 1;
    if (events[m].time < t) lo = m + 1;
    else hi = m;
  }
  return lo;
}
export function activeFronts(t: number) {
  return events
    .slice(lowerBound(t - WAVE.lifetime), lowerBound(t) + 1)
    .filter((e) => e.time <= t && t - e.time < WAVE.lifetime)
    .slice(-WAVE.capacity);
}
export function visibleEmitters(t: number) {
  return events
    .slice(lowerBound(t - WAVE.lifetime), lowerBound(t + 12))
    .slice(-40);
}
export function waveState(
  t: number,
  features: Features | null,
  reduced: boolean,
  origins?: readonly Front[],
) {
  const found = cues.sections.findIndex((s) => t < s.end_seconds);
  const i = found < 0 ? cues.sections.length - 1 : found;
  const current = cues.sections[i],
    previous = cues.sections[Math.max(0, i - 1)];
  const a =
    i === 0
      ? 1
      : smooth(0, current.transition_seconds, t - current.start_seconds);
  const bands = features
    ? sampleBands(features, t)
    : { low: 0, mid: 0, high: 0, flux: 0 };
  return {
    seconds: t,
    section: current.id,
    colourMode: current.colour_mode,
    paletteA: palette(previous),
    paletteB: palette(current),
    blend: a,
    coverage: mix(
      previous.base_colour_coverage_target,
      current.base_colour_coverage_target,
      a,
    ),
    hold: mix(mode(previous), mode(current), a),
    base:
      mix(
        previous.base_swell_height_target,
        current.base_swell_height_target,
        a,
      ) *
      (0.7 + 0.3 * bands.low),
    ring: mix(previous.ring_height_target, current.ring_height_target, a),
    motion: reduced ? 0.3 : 1,
    brightness: 1 - smooth(214, 219.6658125, t),
    bands,
    fronts: origins
      ? origins
          .filter((e) => e.time <= t && t - e.time < WAVE.lifetime)
          .slice(-WAVE.capacity)
      : activeFronts(t),
    emitters: origins
      ? origins.filter((e) => t - e.time < WAVE.lifetime && e.time <= t + 1.5)
      : visibleEmitters(t),
  };
}
export function rawHeight(x: number, z: number, state: WaveState) {
  const t = state.seconds;
  let h =
    state.base *
    (0.58 * Math.sin(x * 0.022 + z * 0.027 + t * 0.24) +
      0.28 * Math.sin(x * 0.039 - z * 0.014 - t * 0.19) +
      0.14 * Math.cos(x * 0.009 + z * 0.046 + t * 0.11));
  for (const e of state.fronts) {
    const age = t - e.time;
    if (age < 0 || age >= WAVE.lifetime) continue;
    const pulse = formationPulse(
      x - e.x,
      z - e.z,
      age,
      formationFor(e.time),
      WAVE.width,
    );
    h +=
      state.ring *
      (0.4 + 0.6 * e.strength) *
      pulse *
      smooth(0, WAVE.attack, age) *
      (1 - smooth(WAVE.lifetime - WAVE.fade, WAVE.lifetime, age));
  }
  return WAVE.heightBound * Math.tanh(h / WAVE.heightBound) * state.motion;
}
/** Height of the exact grid triangles used for black depth occlusion, not only
 * the continuous kernel. Covers interpolated crests at every sub-cell camera x. */
export function surfaceHeight(x: number, z: number, state: WaveState) {
  const s = WAVE.spacing,
    x0 = Math.floor(x / s) * s,
    z0 = Math.floor(z / s) * s;
  const u = (x - x0) / s,
    v = (z - z0) / s;
  const a = rawHeight(x0, z0, state),
    b = rawHeight(x0 + s, z0, state),
    c = rawHeight(x0, z0 + s, state),
    d = rawHeight(x0 + s, z0 + s, state);
  return u + v <= 1
    ? a + (b - a) * u + (c - a) * v
    : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}

/** Independently authored event-born height-field formations.
 * All render passes use this exact GLSL kernel; CPU uses the same units/equations. */
export const heightGLSL = `
uniform float uTime, uBase, uRing, uMotion;
uniform vec4 uFronts[${WAVE.capacity}], uFrontForms[${WAVE.capacity}];
${formationGLSL}
float heightAt(vec2 p) {
 float h=uBase*(.58*sin(p.x*.022+p.y*.027+uTime*.24)+.28*sin(p.x*.039-p.y*.014-uTime*.19)+.14*cos(p.x*.009+p.y*.046+uTime*.11));
 for(int i=0;i<${WAVE.capacity};i++) {
  float a=uTime-uFronts[i].z;
  if(a>=0. && a<${WAVE.lifetime}) {
   float pulse=wfPulse(p-uFronts[i].xy,a,uFrontForms[i],${WAVE.width}.);
   h+=uRing*(.4+.6*uFronts[i].w)*pulse*smoothstep(0.,${WAVE.attack},a)*(1.-smoothstep(${WAVE.lifetime - WAVE.fade},${WAVE.lifetime},a));
  }
 }
 float v=h/${WAVE.heightBound}.;
 return ${WAVE.heightBound}.*(2./(1.+exp(-2.*v))-1.)*uMotion;
}
`;
