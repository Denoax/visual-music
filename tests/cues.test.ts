import { test } from "node:test";
import assert from "node:assert/strict";
import { validateScore, TRACK_HASH } from "../src/show/cues.ts";
import raw from "../show/score.json" with { type: "json" };
const clone = () => structuredClone(raw);
test("flexible regions cover the complete asset without story-specific IDs", () => {
  const score = validateScore(raw);
  assert.equal(score.runtime_sha256, TRACK_HASH);
  assert.equal(score.review_status, "candidate");
  assert.equal(score.regions.at(-1)?.end_seconds, score.duration_seconds);
  const changed = clone();
  changed.regions[0].id = "another-neutral-name";
  assert.doesNotThrow(() => validateScore(changed));
});
test("wrong hash, region gaps and invalid events fail at import", () => {
  const wrong = clone();
  wrong.runtime_sha256 = "0".repeat(64);
  assert.throws(() => validateScore(wrong), /audio/);
  const gap = clone();
  gap.regions[1].start_seconds += 1;
  assert.throws(() => validateScore(gap), /gaps/);
  const invalid = clone();
  invalid.events[0].duration_seconds = -1;
  assert.throws(() => validateScore(invalid), /event/);
  const infinite = clone();
  infinite.events[0].params.x = Infinity;
  assert.throws(() => validateScore(infinite), /event/);
});
test("changing score status cannot promote unresolved listening or event review", () => {
  const forged = clone();
  forged.review_status = "reviewed";
  assert.throws(() => validateScore(forged), /listening/);
});
