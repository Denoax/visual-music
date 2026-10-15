import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  TRACK_HASH,
  validateFeatures,
  ANALYSIS_DURATION,
} from "../src/show/track.ts";
import { events, activeFronts } from "../src/show/waves.ts";
import { acceptMicrofeatures } from "../src/show/microcues.ts";
import { validateCueScore } from "../core/microcue-effects.mjs";
const read = async (p: string) => JSON.parse(await readFile(p, "utf8"));
const bytes = await readFile("public/audio/around-the-world.mp3");
if (
  bytes.length !== 8892231 ||
  createHash("sha256").update(bytes).digest("hex") !== TRACK_HASH
)
  throw Error("Bundled recording changed");
for (const name of [
  "track",
  "waveform",
  "provenance",
  "features",
  "low-onset-candidates",
  "stereo-headroom",
]) {
  const data = await read(`analysis/${name}.json`);
  if (data.runtime_sha256 !== TRACK_HASH)
    throw Error(`${name}: wrong recording`);
}
validateFeatures(await read("analysis/features.json"));
acceptMicrofeatures(await read("analysis/mixed-microfeatures.json"));
validateCueScore(await read("show/microcues.json"));
if (
  !Buffer.from(await readFile("analysis/mixed-microfeatures.json")).equals(
    await readFile("public/analysis/mixed-microfeatures.json"),
  )
)
  throw Error("Runtime microfeatures differ");
if (
  !Buffer.from(await readFile("analysis/features.json")).equals(
    await readFile("public/analysis/features.json"),
  )
)
  throw Error("Runtime feature copy differs");
if ((await readdir("public/audio")).join() !== "around-the-world.mp3")
  throw Error("Retired audio remains in active build");
for (const path of ["src/main.ts", "src/scene/world.ts"]) {
  const code = await readFile(path, "utf8");
  if (
    /FoleyPlayer|loadBedroom|createTrail|createCursor|createModes|FIELD_VISUAL_AGE|createLandscapes|createLyricalActors/.test(
      code,
    )
  )
    throw Error("Retired subsystem is still active");
}
const landscapes = await read("assets/manifest.json");
if (landscapes.runtime_visual_assets.length !== 0)
  throw Error("Dance-floor-only scene must not declare runtime scenery assets");
async function assertNoActiveModels(path: string): Promise<void> {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isDirectory())
      await assertNoActiveModels(`${path}/${entry.name}`);
    else if (/\.(glb|gltf|obj|fbx)$/i.test(entry.name))
      throw Error(`Retired scenery still served from ${path}/${entry.name}`);
  }
}
await assertNoActiveModels("public/models");
for (const entry of landscapes.runtime_visual_assets) {
  const bytes = await readFile(entry.path);
  if (
    bytes.length !== entry.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== entry.sha256
  )
    throw Error(`Landscape asset mismatch: ${entry.path}`);
}
const pulses = await read("show/light-pulses.json");
if (pulses.runtime_sha256 !== TRACK_HASH || pulses.approved_beats.length)
  throw Error("Light pulse identity/status mismatch");
if (
  pulses.pulses.some(
    (
      p: { seconds: number; strength: number; listening_approved: boolean },
      i: number,
    ) =>
      !Number.isFinite(p.seconds) ||
      p.seconds < 0 ||
      p.seconds > ANALYSIS_DURATION ||
      !Number.isFinite(p.strength) ||
      p.strength < 0 ||
      p.strength > 1 ||
      p.listening_approved ||
      (i > 0 && p.seconds <= pulses.pulses[i - 1].seconds),
  )
)
  throw Error("Invalid or falsely approved light-pulse track");
for (const path of [
  "src/scene/world.ts",
  "src/scene/field.ts",
  "src/show/floor.ts",
]) {
  if (/PMREMGenerator|MeshPhysicalMaterial/.test(await readFile(path, "utf8")))
    throw Error("Rejected reflection/transmission renderer remains active");
}
let maximum = 0;
for (let t = 0; t < ANALYSIS_DURATION; t += 0.01)
  maximum = Math.max(maximum, activeFronts(t).length);
console.log(
  JSON.stringify(
    {
      runtime_integrity: "pass",
      runtime_sha256: TRACK_HASH,
      feature_rows: 21967,
      selected_candidate_events: events.length,
      max_active_fronts: maximum,
      clock: "Audio presentation time, field zero equals song zero",
      scope:
        "Black-sky dance floor with event-born shared wave formations, crest-carried palette phase, unchanged base camera/route and 1.2x boost with .45s attack; true OFF banks, exact complete track, silent loader/owned glass and finite thank-you finish preserved",
      listening: "unapproved candidates; human listening pending",
    },
    null,
    2,
  ),
);
if (process.argv.includes("--review")) {
  const evidence = await read("evidence/black-sky-wave-colour/review-status.json");
  console.log(JSON.stringify(evidence, null, 2));
  if (!["passed", "verified_with_limits"].includes(evidence.technical_status))
    process.exitCode = 1;
}
