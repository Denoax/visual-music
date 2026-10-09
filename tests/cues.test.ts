import { test } from "node:test";
import assert from "node:assert/strict";
import { SECTION_IDS, validateCues, activeSection } from "../src/show/cues.ts";
import { evaluateScene, studyAt } from "../src/show/choreography.ts";
function fixture() {
  return {
    schema_version: 1,
    track_sha256: "a".repeat(64),
    review_status: "reviewed",
    sections: SECTION_IDS.map((id, i) => ({
      id,
      start_seconds: i * 10,
      end_seconds: (i + 1) * 10,
      resolution_status: "reviewed",
      review_notes: "Synthetic test fixture; not song evidence",
    })),
    markers: {
      review_status: "reviewed",
      review_notes: "Fixture",
      beats_seconds: [1, 2, 3, 4],
      accents_seconds: [],
    },
    anchors: Array.from({ length: 12 }, (_, i) => ({
      seconds: i * 10,
      reviewed: true,
      audio_feature: "fixture",
      visual_event: "fixture",
      method: "fixture",
    })),
  };
}
test("audio-byte mismatch and pending templates cannot activate choreography", () => {
  assert.throws(
    () => validateCues(fixture(), "b".repeat(64), 130),
    /different audio/,
  );
  assert.throws(
    () =>
      validateCues(
        { ...fixture(), review_status: "pending" },
        "a".repeat(64),
        130,
      ),
    /needs review/,
  );
});
test("untrusted cues reject overlap, duplicate ids, missing anchors and unordered beats", () => {
  const bad = fixture();
  bad.sections[1].start_seconds = 9;
  assert.throws(() => validateCues(bad, "a".repeat(64), 130), /overlap/);
  const duplicate = fixture();
  duplicate.sections[1].id = "intro";
  assert.throws(() => validateCues(duplicate, "a".repeat(64), 130), /repeated/);
  const short = fixture();
  short.anchors = [];
  assert.throws(() => validateCues(short, "a".repeat(64), 130), /twelve/);
  const beats = fixture();
  beats.markers.beats_seconds = [2, 1];
  assert.throws(() => validateCues(beats, "a".repeat(64), 130), /ordered/);
});
test("section boundaries are half-open and seeking reconstructs the same state", () => {
  const cues = validateCues(fixture(), "a".repeat(64), 130);
  assert.equal(activeSection(cues, 10).id, "verse_1");
  const state = evaluateScene("chorus_final_b", 0.6, 116, false, false);
  evaluateScene("intro", 0, 0, false, false);
  assert.deepEqual(
    evaluateScene("chorus_final_b", 0.6, 116, false, false),
    state,
  );
  assert.equal(studyAt(130).id, "outro");
  assert.equal(activeSection(cues, 130).progress, 1);
});
test("portrait cameras differ and reduced motion freezes the air freshener", () => {
  assert.notDeepEqual(
    evaluateScene("chorus_1", 1, 35, false, false).camera,
    evaluateScene("chorus_1", 1, 35, true, false).camera,
  );
  assert.equal(evaluateScene("bridge", 1, 75, false, true).freshenerSwing, 0);
});

test("recording identity requires a verified exact-track record and matching browser decode", async () => {
  const { validateTrackIdentity } = await import("../src/show/cues.ts");
  const track = {
    requested_spotify_id: "0iVj13fDCDRM7rfYEGF50X",
    identity_review_status: "verified",
    identity_review_notes: "Synthetic contract fixture",
    runtime_sha256: "a".repeat(64),
    runtime_decoded_duration_seconds: 130,
    runtime_sample_rate_hz: 48000,
  };
  assert.doesNotThrow(() =>
    validateTrackIdentity(track, "a".repeat(64), 130, 48000),
  );
  assert.throws(
    () =>
      validateTrackIdentity(
        { ...track, identity_review_status: "pending" },
        "a".repeat(64),
        130,
        48000,
      ),
    /identity/,
  );
  assert.throws(
    () => validateTrackIdentity(track, "a".repeat(64), 130, 44100),
    /decode/,
  );
  assert.throws(
    () => validateTrackIdentity(track, "b".repeat(64), 130, 48000),
    /different audio/,
  );
});

test("the freshener settles upright at the ending regardless of previous seek history", () => {
  evaluateScene("bridge", 0.3, 73, false, false);
  assert.ok(
    evaluateScene("outro", 1, 130, false, false).freshenerSwing === 0,
    "The ending pose must be upright",
  );
  assert.ok(
    evaluateScene("outro", 1, 130, true, false).freshenerSwing === 0,
    "The portrait ending pose must be upright",
  );
});
