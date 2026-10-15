import {
  compileCues,
  initialState,
  step,
  pose as cameraPose,
  UNIT_SCALE,
  type CameraInput,
  type CameraCue,
} from "../../core/reference-camera.mjs";
import type { Origin } from "../../core/grid-flight.mjs";
import score from "../../show/camera-score.json";
import { events, WAVE } from "../show/waves";
const HZ = 240;
type Input = { turn: number; tilt: number; held?: boolean };
/** Single camera/route owner. Input is sampled at presentation boundaries;
 * fixed ticks retain source update ordering through stalls and recovery. */
export function createFlight(cues: CameraCue[] = score.cues) {
  const segments = compileCues(cues);
  let state = initialState(segments),
    tick = 0,
    seconds = 0,
    reduced = false;
  let history: { seconds: number; input: CameraInput; reduced: boolean }[] = [];
  let input: CameraInput = { x: 0, y: 0, held: false };
  const origins = new Map<number, Origin>();
  let nextEvent = 0;
  function forecast(to: number) {
    let projected = { ...state };
    if (reduced) return projected;
    // Held-current-input assumption, never a prediction of future gestures.
    while (projected.seconds < to - 1e-9) {
      const end = Math.min(to, projected.seconds + 1 / HZ);
      projected = step(
        projected,
        end,
        end - projected.seconds,
        input,
        UNIT_SCALE,
        segments,
      );
    }
    return projected;
  }
  function forecastPath(duration: number, samples = 8) {
    if (
      !Number.isFinite(duration) ||
      duration < 0 ||
      duration > 12 ||
      !Number.isInteger(samples) ||
      samples < 2
    )
      throw Error("Invalid camera forecast window");
    return Array.from({ length: samples + 1 }, (_, i) => {
      const s = forecast(seconds + (duration * i) / samples);
      return {
        x: s.x,
        z: s.z,
        y: s.altitude * UNIT_SCALE,
        yaw: -s.angle,
        speed: s.speed * UNIT_SCALE * s.turbo,
      };
    });
  }
  function introduce(t: number) {
    for (const [id, e] of origins)
      if (t - e.time >= WAVE.lifetime) origins.delete(id);
    while (nextEvent < events.length && events[nextEvent].time <= t + 1.5) {
      const e = events[nextEvent++];
      if (t - e.time >= WAVE.lifetime) continue;
      const future = forecast(Math.max(t, e.time));
      const forward = {
          x: -Math.sin(future.angle),
          z: -Math.cos(future.angle),
        },
        right = { x: Math.cos(future.angle), z: -Math.sin(future.angle) };
      // Place fronts in the readable ground of the calibrated oblique view.
      const ahead = Math.max(
        95,
        ((future.altitude * UNIT_SCALE) /
          Math.tan((Math.max(9, future.tilt) * Math.PI) / 180)) *
          0.8,
      );
      const side = [-24, 18, -9, 33, 6, -36][e.id % 6];
      origins.set(
        e.id,
        Object.freeze({
          id: e.id,
          time: e.time,
          strength: e.strength,
          x:
            Math.round((future.x + forward.x * ahead + right.x * side) / 3) * 3,
          z:
            Math.round((future.z + forward.z * ahead + right.z * side) / 3) * 3,
        }),
      );
    }
  }
  function advance(to: number, controls: Input, isReduced: boolean) {
    if (!Number.isFinite(to) || to < seconds)
      throw Error("Backward camera time requires explicit reset");
    const next = { x: controls.turn, y: -controls.tilt, held: !!controls.held }; // App up-positive -> source down-positive, once.
    if (
      isReduced !== reduced ||
      next.x !== input.x ||
      next.y !== input.y ||
      next.held !== input.held
    ) {
      history.push({ seconds, input: { ...next }, reduced: isReduced });
      input = next;
    }
    reduced = isReduced;
    if (reduced)
      state = {
        ...state,
        altitude: 60,
        vfov: 25,
        tilt: 9,
        pitchX: (-9 * Math.PI) / 180,
        roll: 0,
        turbo: 1,
        speed: 0,
      };
    const end = Math.floor(to * HZ + 1e-8);
    while (tick < end) {
      tick++;
      const t = tick / HZ;
      if (reduced)
        state = {
          ...state,
          seconds: t,
          altitude: 60,
          vfov: 25,
          tilt: 9,
          pitchX: (-9 * Math.PI) / 180,
          roll: 0,
          turbo: 1,
          speed: 0,
        };
      else state = step(state, t, 1 / HZ, input, UNIT_SCALE, segments);
      introduce(t);
    }
    seconds = to;
    introduce(to);
  }
  function renderState() {
    const dt = seconds - state.seconds;
    return !reduced && dt > 1e-9
      ? step(state, seconds, dt, input, UNIT_SCALE, segments)
      : { ...state };
  }
  function reset(to = 0) {
    state = initialState(segments);
    tick = seconds = nextEvent = 0;
    reduced = false;
    input = { x: 0, y: 0, held: false };
    history = [];
    origins.clear();
    introduce(0);
    advance(to, { turn: 0, tilt: 0 }, false);
    history = [];
  }
  const pose = () => {
    const s = renderState();
    return {
      ...cameraPose(s),
      x: s.x,
      z: s.z,
      y: s.altitude * UNIT_SCALE,
      yaw: -s.angle,
      pitch: s.pitchX,
      roll: s.roll,
    };
  };
  function snapshot() {
    return {
      pose: pose(),
      state: { ...state },
      tick,
      seconds,
      reduced,
      input: { ...input },
      nextEvent,
      origins: [...origins.values()].map((e) => ({ ...e })),
      history: structuredClone(history),
    };
  }

  reset();
  return {
    advance,
    forecastPath,
    reset,
    pose,
    seconds: () => seconds,
    origins: () => [...origins.values()],
    snapshot,
    restore(s: ReturnType<typeof snapshot>) {
      state = { ...s.state };
      tick = s.tick;
      seconds = s.seconds;
      reduced = s.reduced;
      input = { ...s.input };
      nextEvent = s.nextEvent;
      origins.clear();
      s.origins.forEach((e: Origin) =>
        origins.set(e.id, Object.freeze({ ...e })),
      );
      history = structuredClone(s.history);
    },
    diagnostics: () => ({
      pose: pose(),
      turn: input.x,
      tilt: input.y,
      held: input.held,
      inputSamples: history.length,
      originCount: origins.size,
      origins: [...origins.values()],
      shot: segments.filter((c) => c.seconds <= seconds).at(-1)?.id,
      scale: UNIT_SCALE,
      groundVisible: reduced || seconds >= score.ground_visible_seconds,
      forecast:
        "Integrated score + held-current steering/turbo, snapped once at introduction; no future-input claim",
      fixedHz: HZ,
      renderInterpolation: true,
      reduced,
    }),
  };
}
