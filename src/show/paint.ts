import { recentMicrocues } from "./microcues";
import type { Front } from "./waves";
import { hash32 } from "../../core/chunk-wave-exchange.mjs";
/** One immutable anchor per measured cue; selecting a new front never drags old paint. */
export function createPaint() {
  const anchors = new Map<string, { x: number; z: number }>();
  function at(seconds: number, fronts: readonly Front[]) {
    const cues = recentMicrocues(seconds);
    return cues.map((c) => {
      let anchor = anchors.get(c.id);
      if (!anchor) {
        const origin = [...fronts].reverse().find((f) => f.time <= c.seconds);
        const seed = hash32(Math.round(c.seconds * 1000), 0, 9) / 4294967296;
        anchor = origin
          ? { x: origin.x + (seed - 0.5) * 18, z: origin.z + 10 }
          : { x: (seed - 0.5) * 32, z: -18 * c.seconds - 28 };
        anchors.set(c.id, anchor);
      }
      return {
        x: anchor.x,
        z: anchor.z,
        time: c.seconds,
        strength: c.strength,
      };
    });
  }
  return {
    at,
    reset: () => anchors.clear(),
    snapshot: () => [...anchors.entries()],
    restore(saved: [string, { x: number; z: number }][]) {
      anchors.clear();
      for (const [id, p] of saved) anchors.set(id, p);
    },
  };
}
export type Paint = ReturnType<ReturnType<typeof createPaint>["at"]>;
