import { smooth5 } from "./beauty.mjs";
export const RETURN_SECONDS = 8,
  IDLE_PERIOD = 12;
/** Pure mapping from the existing presented end age. No wall clock, source,
 * timer, seek, beat detector, input mutation or transport instance is created.
 * AudioTransport owns unbounded pause-correct end age; scene adapters own surfaces.
 */
export function visualReturn(endAge, { reduced = false } = {}) {
  if (endAge === null || !Number.isFinite(endAge))
    return { phase: "song", blend: 0, idleSeconds: 0 };
  const age = Math.max(0, endAge),
    blend = smooth5(age / RETURN_SECONDS);
  // Target phase runs during return as well: no derivative jump at idle entry.
  const idleSeconds = age - RETURN_SECONDS;
  const angle =
    (2 *
      Math.PI *
      (((idleSeconds % IDLE_PERIOD) + IDLE_PERIOD) % IDLE_PERIOD)) /
    IDLE_PERIOD;
  return {
    blendAge: age,
    phase: age < RETURN_SECONDS ? "return" : "idle",
    blend,
    idleSeconds,
    // These idle signals are visual breathing, never reported as audio cues.
    breath: reduced ? 0.16 : 0.16 + 0.055 * Math.sin(angle),
    hueMix: reduced ? 0.35 : 0.35 + 0.12 * Math.sin(angle),
    ripplePhase: reduced ? 0 : angle,
    horizonGain: reduced ? 0.18 : 0.18 + 0.04 * Math.sin(angle),
    starGain: reduced ? 0.08 : 0.08 + 0.025 * Math.sin(angle),
  };
}
/** Seamless analytic idle wave. Integer spatial harmonics and temporal period;
 * evaluated at existing world positions without resetting their IDs/origins.
 * Blend the actual last terrain height into this field during the return.
 */
export function idleHeight(x, z, seconds, { reduced = false } = {}) {
  if (reduced) return 0;
  const a =
    (2 * Math.PI * (((seconds % IDLE_PERIOD) + IDLE_PERIOD) % IDLE_PERIOD)) /
    IDLE_PERIOD;
  return (
    0.48 * Math.sin(x * 0.021 + a) +
    0.32 * Math.sin(z * 0.018 - a) +
    0.16 * Math.sin((x + z) * 0.013 + 2 * a)
  );
}
