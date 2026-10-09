export const TRACK_HASH =
  "67d55f6e9551e77002fecb2752b835761da84a5db2a7679e91599e4dc94c2780";
export type EventType =
  | "terrain_ignite"
  | "group_morph"
  | "group_release"
  | "palette_transition"
  | "camera_reveal"
  | "beam_fan"
  | "particle_burst"
  | "settle";
export interface ScoreEvent {
  id: string;
  seconds: number;
  type: EventType;
  target: string;
  duration_seconds: number;
  seed: number;
  params: { x: number; z: number; gather_delta?: number };
  audio_feature: string;
  review_status: "candidate" | "reviewed";
  review_notes: string;
}
export interface Region {
  id: string;
  start_seconds: number;
  end_seconds: number;
  review_status: string;
  note: string;
}
export interface Score {
  schema_version: 2;
  runtime_sha256: string;
  duration_seconds: number;
  review_status: "candidate" | "reviewed";
  calibration_offset_ms: number;
  listening_status: string;
  regions: Region[];
  events: ScoreEvent[];
  camera_knots: [number, [number, number, number], number][];
  curves: Record<
    | "density"
    | "morph"
    | "release"
    | "ribbons"
    | "beams"
    | "palette"
    | "brightness",
    [number, number][]
  >;
}
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;
const types = new Set<EventType>([
  "terrain_ignite",
  "group_morph",
  "group_release",
  "palette_transition",
  "camera_reveal",
  "beam_fan",
  "particle_burst",
  "settle",
]);
/** Candidate scores may be previewed, but never acquire approval through this parser. */
export function validateScore(value: unknown, hash = TRACK_HASH): Score {
  if (
    !isRecord(value) ||
    value.schema_version !== 2 ||
    value.runtime_sha256 !== hash
  )
    throw new Error(
      "Score belongs to different audio bytes or an unsupported schema.",
    );
  if (
    !finite(value.duration_seconds) ||
    value.duration_seconds <= 0 ||
    !finite(value.calibration_offset_ms) ||
    Math.abs(value.calibration_offset_ms) > 250
  )
    throw new Error("Invalid score duration or calibration.");
  if (
    !["candidate", "reviewed"].includes(String(value.review_status)) ||
    !Array.isArray(value.regions) ||
    !value.regions.length ||
    !Array.isArray(value.events)
  )
    throw new Error("Invalid score regions/events.");
  if (
    !Array.isArray(value.camera_knots) ||
    value.camera_knots.length < 2 ||
    !isRecord(value.curves)
  )
    throw new Error("Camera and appearance curves are required.");
  let lastCamera = -1;
  for (const knot of value.camera_knots) {
    if (
      !Array.isArray(knot) ||
      !finite(knot[0]) ||
      knot[0] <= lastCamera ||
      !Array.isArray(knot[1]) ||
      knot[1].length !== 3 ||
      !knot[1].every(finite) ||
      !finite(knot[2]) ||
      knot[2] < 25 ||
      knot[2] > 100
    )
      throw new Error("Invalid camera knots.");
    lastCamera = knot[0];
  }
  if (
    value.camera_knots[0][0] !== 0 ||
    Math.abs(lastCamera - value.duration_seconds) > 0.0001
  )
    throw new Error("Camera must cover the recording.");
  for (const key of [
    "density",
    "morph",
    "release",
    "ribbons",
    "beams",
    "palette",
    "brightness",
  ]) {
    const curve = value.curves[key];
    if (!Array.isArray(curve) || curve.length < 2)
      throw new Error(`Missing ${key} curve.`);
    let last = -1;
    for (const point of curve) {
      if (
        !Array.isArray(point) ||
        !finite(point[0]) ||
        point[0] <= last ||
        !finite(point[1]) ||
        point[1] < 0 ||
        point[1] > 1
      )
        throw new Error(`Invalid ${key} curve.`);
      last = point[0];
    }
    if (curve[0][0] !== 0 || Math.abs(last - value.duration_seconds) > 0.0001)
      throw new Error(`${key} does not cover the recording.`);
  }
  let end = 0,
    previous = -1;
  const ids = new Set<string>();
  for (const region of value.regions) {
    if (
      !isRecord(region) ||
      !text(region.id) ||
      ids.has(String(region.id)) ||
      !finite(region.start_seconds) ||
      !finite(region.end_seconds) ||
      Math.abs(region.start_seconds - end) > 0.0001 ||
      region.end_seconds <= region.start_seconds ||
      !text(region.note)
    )
      throw new Error(
        "Regions must cover the recording without gaps or duplicate IDs.",
      );
    ids.add(String(region.id));
    end = region.end_seconds;
  }
  if (Math.abs(end - value.duration_seconds) > 0.0001)
    throw new Error("Regions do not cover the complete recording.");
  ids.clear();
  for (const event of value.events) {
    if (
      !isRecord(event) ||
      !text(event.id) ||
      ids.has(String(event.id)) ||
      !types.has(event.type as EventType) ||
      !text(event.target) ||
      !finite(event.seconds) ||
      event.seconds < previous ||
      event.seconds < 0 ||
      event.seconds > end ||
      !finite(event.duration_seconds) ||
      event.duration_seconds <= 0 ||
      !Number.isInteger(event.seed) ||
      !isRecord(event.params) ||
      !finite(event.params.x) ||
      !finite(event.params.z) ||
      !text(event.audio_feature) ||
      !text(event.review_notes) ||
      !["candidate", "reviewed"].includes(String(event.review_status))
    )
      throw new Error("Invalid or unordered score event.");
    previous = event.seconds;
    ids.add(String(event.id));
  }
  if (
    value.review_status === "reviewed" &&
    (value.listening_status !== "complete" ||
      value.events.some((e) => e.review_status !== "reviewed") ||
      value.regions.some((r) => r.review_status !== "reviewed"))
  )
    throw new Error(
      "A reviewed score requires completed listening and all reviewed entries.",
    );
  return value as unknown as Score;
}
export function regionAt(score: Score, seconds: number) {
  return (
    score.regions.find(
      (r) => seconds >= r.start_seconds && seconds < r.end_seconds,
    ) ?? score.regions.at(-1)!
  );
}
