import { SECTION_IDS, type SectionId } from "./cues";
export const STUDY_DURATION = 130; // An explicitly silent scene study, never a song cue sheet.
export const labels: Record<SectionId, string> = {
  intro: "Ignition",
  verse_1: "Courtyard",
  refrain_1: "The neighbours",
  chorus_1: "Courtyard rave",
  verse_2: "Street furniture",
  refrain_2: "Something is moving",
  chorus_2: "The building is the rig",
  bridge: "Air freshener",
  verse_3: "Back seat",
  refrain_3: "One more time",
  chorus_final_a: "The whole neighbourhood",
  chorus_final_b: "Very portable sound system",
  outro: "Back home",
};
export const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
export function studyAt(seconds: number) {
  const index = Math.min(
    SECTION_IDS.length - 1,
    Math.floor(Math.max(0, seconds) / 10),
  );
  return {
    id: SECTION_IDS[index],
    progress: Math.min(1, (seconds - index * 10) / 10),
  };
}
type V3 = [number, number, number];
interface Pose {
  camera: V3;
  target: V3;
  portrait: V3;
  portraitTarget?: V3;
  rig: number;
  facade: number;
  lime: number;
  gag: number;
}
const poses: Record<SectionId, Pose> = {
  intro: {
    camera: [-7, 2.5, 8],
    target: [0, 0.9, 0],
    portrait: [-11, 5.5, 16],
    portraitTarget: [0, -0.6, 0],
    rig: 0,
    facade: 0,
    lime: 0,
    gag: 0,
  },
  verse_1: {
    camera: [-6.5, 2.1, 6.8],
    target: [0, 1, 0],
    portrait: [-10, 5, 15],
    portraitTarget: [0, -0.3, 0],
    rig: 0.05,
    facade: 0.04,
    lime: 0,
    gag: 0,
  },
  refrain_1: {
    camera: [-8.5, 4, 10],
    target: [0, 2.2, -2],
    portrait: [-8, 5.5, 13],
    rig: 0.35,
    facade: 0.15,
    lime: 0,
    gag: 0,
  },
  chorus_1: {
    camera: [-9, 5, 12],
    target: [0, 3, -3],
    portrait: [-3.5, 8, 23],
    portraitTarget: [0, 2, -4],
    rig: 0.75,
    facade: 0.25,
    lime: 0,
    gag: 0,
  },
  verse_2: {
    camera: [5.2, 2.1, 5.5],
    target: [0, 0.8, 0],
    portrait: [7, 4, 10],
    rig: 0.16,
    facade: 0.15,
    lime: 0,
    gag: 0,
  },
  refrain_2: {
    camera: [6.5, 4.7, 8],
    target: [0, 3, -3],
    portrait: [8, 7, 14],
    rig: 0.5,
    facade: 0.55,
    lime: 0.15,
    gag: 0,
  },
  chorus_2: {
    camera: [10, 8, 15],
    target: [0, 5, -5],
    portrait: [4, 12, 30],
    portraitTarget: [0, 2, -5],
    rig: 0.9,
    facade: 1,
    lime: 0.65,
    gag: 0,
  },
  bridge: {
    camera: [-0.3, 1.62, 2.5],
    target: [-0.35, 1.24, 0.28],
    portrait: [-0.4, 1.65, 2.9],
    rig: 0.08,
    facade: 0.12,
    lime: 0.1,
    gag: 0,
  },
  verse_3: {
    camera: [4.5, 1.9, -4.5],
    target: [0.8, 0.9, 0],
    portrait: [7, 4, -8],
    rig: 0.2,
    facade: 0.22,
    lime: 0.2,
    gag: 0,
  },
  refrain_3: {
    camera: [-7, 5, 10],
    target: [0, 3, -4],
    portrait: [-8, 7, 14],
    rig: 0.6,
    facade: 0.7,
    lime: 0.6,
    gag: 0,
  },
  chorus_final_a: {
    camera: [-14, 11, 23],
    target: [0, 5, -5],
    portrait: [-5, 15, 35],
    portraitTarget: [0, 1, -6],
    rig: 1,
    facade: 1,
    lime: 1,
    gag: 0,
  },
  chorus_final_b: {
    camera: [8, 3.7, 11],
    target: [5.8, 2.6, -4.5],
    portrait: [9, 6, 17],
    portraitTarget: [5.7, 4, -5],
    rig: 1,
    facade: 1,
    lime: 1,
    gag: 1,
  },
  outro: {
    camera: [-7, 2.5, 8],
    target: [0, 0.9, 0],
    portrait: [-11, 5.5, 16],
    portraitTarget: [0, -0.6, 0],
    rig: 0,
    facade: 0,
    lime: 0,
    gag: 0,
  },
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: V3, b: V3, t: number): V3 => [
  mix(a[0], b[0], t),
  mix(a[1], b[1], t),
  mix(a[2], b[2], t),
];
export function evaluateScene(
  id: SectionId,
  progress: number,
  time: number,
  portrait: boolean,
  reducedMotion: boolean,
) {
  const index = SECTION_IDS.indexOf(id),
    current = poses[id],
    previous = poses[SECTION_IDS[Math.max(0, index - 1)]];
  const t = reducedMotion ? 1 : smooth(progress / 0.42);
  const camera = portrait ? current.portrait : current.camera;
  const oldCamera = portrait ? previous.portrait : previous.camera;
  const target = portrait
    ? (current.portraitTarget ?? current.target)
    : current.target;
  const oldTarget = portrait
    ? (previous.portraitTarget ?? previous.target)
    : previous.target;
  return {
    camera: mix3(oldCamera, camera, t),
    target: mix3(oldTarget, target, t),
    rig: mix(previous.rig, current.rig, t),
    facade: mix(previous.facade, current.facade, t),
    lime: mix(previous.lime, current.lime, t),
    gag: mix(previous.gag, current.gag, t),
    freshenerSwing: reducedMotion
      ? 0
      : Math.sin(time * 2.2) * 0.16 + Math.sin(time * 0.67) * 0.04,
    ringRotation: reducedMotion ? 0 : Math.sin(time * 0.12) * 0.12,
  };
}
