export const SECTION_IDS = [
  "intro",
  "verse_1",
  "refrain_1",
  "chorus_1",
  "verse_2",
  "refrain_2",
  "chorus_2",
  "bridge",
  "verse_3",
  "refrain_3",
  "chorus_final_a",
  "chorus_final_b",
  "outro",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];
export interface Section {
  id: SectionId;
  start_seconds: number | null;
  end_seconds: number | null;
  resolution_status: string;
  review_notes: string | null;
}
export interface CueSheet {
  schema_version: number;
  track_sha256: string | null;
  review_status: string;
  sections: Section[];
  markers: {
    review_status: string;
    review_notes: string | null;
    beats_seconds: number[];
    accents_seconds: number[];
  };
  anchors: {
    seconds: number;
    reviewed: boolean;
    audio_feature: string;
    visual_event: string;
    method: string;
  }[];
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
/** Validate imported data before it can become authoritative choreography. */
export function validateCues(
  value: unknown,
  hash: string,
  duration: number,
): CueSheet {
  if (
    !record(value) ||
    value.schema_version !== 1 ||
    value.review_status !== "reviewed"
  )
    throw new Error("This cue sheet still needs review. Open the cue editor.");
  if (value.track_sha256 !== hash)
    throw new Error(
      "This cue sheet belongs to different audio bytes. Load the matching recording.",
    );
  if (
    !Array.isArray(value.sections) ||
    !record(value.markers) ||
    !Array.isArray(value.anchors)
  )
    throw new Error("Invalid cue sheet structure.");
  let end = 0;
  const ids = new Set<string>();
  for (const item of value.sections) {
    if (
      !record(item) ||
      !SECTION_IDS.includes(item.id as SectionId) ||
      ids.has(item.id as string)
    )
      throw new Error("Invalid or repeated scene section.");
    ids.add(item.id as string);
    if (typeof item.review_notes !== "string" || !item.review_notes.trim())
      throw new Error("Every section needs a listening note.");
    if (
      item.resolution_status === "not_present" &&
      item.start_seconds === null &&
      item.end_seconds === null
    )
      continue;
    if (
      item.resolution_status !== "reviewed" ||
      !finite(item.start_seconds) ||
      !finite(item.end_seconds) ||
      Math.abs(item.start_seconds - end) > 0.001 ||
      item.end_seconds <= item.start_seconds ||
      item.end_seconds > duration + 0.001
    )
      throw new Error(
        "Sections must cover the decoded recording without gaps or overlap.",
      );
    end = item.end_seconds;
  }
  if (ids.size !== SECTION_IDS.length || Math.abs(end - duration) > 0.001)
    throw new Error(
      "Resolve every scene and the complete recording before importing.",
    );
  if (
    value.markers.review_status !== "reviewed" ||
    typeof value.markers.review_notes !== "string" ||
    !value.markers.review_notes.trim()
  )
    throw new Error("Beat and accent markers need review notes.");
  for (const key of ["beats_seconds", "accents_seconds"]) {
    const markers = value.markers[key];
    if (
      !Array.isArray(markers) ||
      markers.some(
        (m, i) =>
          !finite(m) || m < 0 || m > duration || (i > 0 && m <= markers[i - 1]),
      )
    )
      throw new Error(
        "Markers must be finite, ordered and inside the recording.",
      );
  }
  if (
    (value.markers.beats_seconds as number[]).length < 4 ||
    value.anchors.length < 12
  )
    throw new Error(
      "Review at least four beats and twelve audiovisual anchors.",
    );
  for (const a of value.anchors) {
    if (
      !record(a) ||
      !finite(a.seconds) ||
      a.seconds < 0 ||
      a.seconds > duration ||
      a.reviewed !== true ||
      !["audio_feature", "visual_event", "method"].every(
        (k) => typeof a[k] === "string" && (a[k] as string).trim(),
      )
    )
      throw new Error(
        "Every anchor needs a reviewed time, audible feature, visual event and method.",
      );
  }
  return value as unknown as CueSheet;
}
export function activeSection(
  cues: CueSheet,
  time: number,
): { id: SectionId; progress: number } {
  const sections = cues.sections.filter(
    (s): s is Section & { start_seconds: number; end_seconds: number } =>
      s.resolution_status === "reviewed" &&
      s.start_seconds !== null &&
      s.end_seconds !== null,
  );
  const section =
    sections.find((s) => time >= s.start_seconds && time < s.end_seconds) ??
    sections.at(-1);
  if (!section) return { id: "intro", progress: 0 };
  return {
    id: section.id,
    progress: Math.max(
      0,
      Math.min(
        1,
        (time - section.start_seconds) /
          (section.end_seconds - section.start_seconds),
      ),
    ),
  };
}

export function validateTrackIdentity(
  value: unknown,
  hash: string,
  duration: number,
  sampleRate: number,
) {
  if (
    !record(value) ||
    value.identity_review_status !== "verified" ||
    value.requested_spotify_id !== "0iVj13fDCDRM7rfYEGF50X" ||
    typeof value.identity_review_notes !== "string" ||
    !value.identity_review_notes.trim()
  )
    throw new Error(
      "The recording identity needs a verified review record. Load the reviewed track-and-cues JSON.",
    );
  if (value.runtime_sha256 !== hash)
    throw new Error("The identity record belongs to different audio bytes.");
  if (
    !finite(value.runtime_decoded_duration_seconds) ||
    Math.abs(value.runtime_decoded_duration_seconds - duration) > 0.02 ||
    value.runtime_sample_rate_hz !== sampleRate
  )
    throw new Error(
      "This browser decode differs from the reviewed track record. Review duration and sample rate again.",
    );
}
