import { visualReturn } from "../../core/visual-return.mjs";
import { Color } from "three";
import pulses from "../../show/light-pulses.json";
import proposal from "../../show/arrangement.proposal.json";
import { globalLightingAt, revealAt, paletteLut } from "./floor";
import {
  prepareMusicControls,
  type MusicControl,
} from "../../core/music-controls.mjs";
import { microAt } from "./microcues";
import { clamp } from "./waves";
import type { Features } from "./track";

export const ease = (u: number) => {
  u = clamp(u);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
export function createArrangement() {
  const lut = paletteLut();
  const familyColour = (family: number, u: number) => {
    const at = (family * lut.width + Math.round(u * (lut.width - 1))) * 4;
    return new Color(
      lut.bytes[at] / 255,
      lut.bytes[at + 1] / 255,
      lut.bytes[at + 2] / 255,
    );
  };
  let source: Features | null = null,
    controls: ReturnType<typeof prepareMusicControls> | null = null;
  return (
    seconds: number,
    features: Features | null,
    reduced: boolean,
    endAge: number | null = null,
    brightness = 1,
  ) => {
    if (features && source !== features) {
      source = features;
      controls = prepareMusicControls(
        { ...features, duration_seconds: 219.6658125 },
        pulses.pulses.map((e) => ({
          seconds: e.seconds,
          strength: e.strength,
        })),
        { attack: pulses.attack_seconds, release: pulses.release_seconds },
      );
    }
    const music: MusicControl = controls?.sample(seconds) ?? {
      low: 0,
      high: 0,
      sky: 0,
      accent: 0,
      eventIndex: -1,
      alternatingGroup: 0,
    };
    const list = proposal.sections,
      index = Math.max(
        0,
        list.findIndex((s) => seconds < s.end_seconds),
      );
    const current =
      list[seconds >= list.at(-1)!.end_seconds ? list.length - 1 : index];
    const lighting = globalLightingAt(seconds, reduced),
      reveal = revealAt(seconds, endAge);
    const colours = [
      familyColour(lighting.family, 0.3),
      familyColour(lighting.family, 0.7),
    ];
    const visual = visualReturn(endAge, { reduced });
    const terminal = reveal.exit;
    const horizon = new Color(0);
    const board = { anchorX: 0, anchorZ: 0, shiftX: 0, shiftZ: 0, angle: 0 };
    const gridRest = lighting.kind === 0 || lighting.kind === 10 ? 1 : 0;
    const overview = 0; // Camera score now exclusively owns high oblique shots.
    return {
      seconds,
      section: current.id,
      mode: lighting.mode,
      lighting,
      colours,
      horizon,
      visual,
      airTime:
        seconds +
        (visual.phase === "song"
          ? 0
          : reduced
            ? 6
            : visual.phase === "idle"
              ? 6 + visual.idleSeconds * 0.5
              : visual.blendAge -
                4 *
                  (Math.pow(visual.blendAge / 8, 6) -
                    3 * Math.pow(visual.blendAge / 8, 5) +
                    2.5 * Math.pow(visual.blendAge / 8, 4))),
      horizonGain:
        (ease((seconds - 7) / 8) *
          (0.18 + 0.12 * ease(music.sky)) *
          (1 - visual.blend) +
          (visual.phase === "song" ? 0 : visual.horizonGain) * visual.blend) *
        brightness,
      horizonAzimuth: 0.4 + 0.22 * Math.sin(seconds * 0.013),
      board,
      gridRest,
      pulseStatus: pulses.status,
      music,
      micro: microAt(seconds),
      overview,
      terminal,
      reveal,
      brightness,
      reduced,
    };
  };
}
export type Arrangement = ReturnType<ReturnType<typeof createArrangement>>;
