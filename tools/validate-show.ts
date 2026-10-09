import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { validateScore, TRACK_HASH } from "../src/show/cues";
import scoreData from "../show/score.json";
import assets from "../manifests/runtime-assets.json";
const errors: string[] = [],
  gates: string[] = [];
try {
  const score = validateScore(scoreData);
  if (score.review_status !== "reviewed")
    gates.push("Listening and musical score review remain pending.");
} catch (e) {
  errors.push(String(e));
}
for (const asset of assets.assets) {
  try {
    const bytes = await readFile(asset.path);
    if (
      createHash("sha256").update(bytes).digest("hex") !== asset.sha256 ||
      bytes.length !== asset.bytes
    )
      errors.push(`${asset.path}: byte/hash mismatch.`);
  } catch (e) {
    errors.push(`${asset.path}: ${e}`);
  }
}
const track = JSON.parse(await readFile("manifests/track.json", "utf8"));
if (track.runtime_sha256 !== TRACK_HASH) errors.push("Track hash mismatch.");
for (const filename of [
  "analysis/features.json",
  "analysis/waveform.json",
  "public/data/features.json",
]) {
  const data = JSON.parse(await readFile(filename, "utf8"));
  if (data.runtime_sha256 !== TRACK_HASH)
    errors.push(`${filename}: audio binding mismatch.`);
}
if (!track.runtime_decoder_record)
  gates.push("Browser decode measurement is missing.");
for (const mode of ["standard", "gentle"]) {
  try {
    const report = JSON.parse(
      await readFile(`evidence/lights-v2/${mode}-flash.json`, "utf8"),
    );
    if (report.status !== "certified")
      gates.push(
        `${mode}: formal full-resolution flash conformance remains unverified; screening only.`,
      );
  } catch {
    gates.push(`${mode}: complete flash screening not yet recorded.`);
  }
}
console.log(
  JSON.stringify(
    {
      consistency: errors.length ? "FAIL" : "PASS",
      errors,
      review_status: gates.length ? "PARTIAL" : "REVIEWED",
      pending: gates,
    },
    null,
    2,
  ),
);
if (errors.length || (process.argv.includes("--review") && gates.length))
  process.exitCode = 1;
