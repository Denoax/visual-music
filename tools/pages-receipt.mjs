/** Bind the Pages artifact to its source revision and unchanged recording. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const track = JSON.parse(await readFile("analysis/track.json", "utf8"));
const recording = await readFile("dist/audio/around-the-world.mp3");
if (hash(recording) !== track.runtime_sha256) {
  throw new Error("Pages recording differs from analysis/track.json");
}

async function inventory(directory, prefix = "") {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((a, b) =>
    a.name.localeCompare(b.name, "en"),
  )) {
    const path = prefix + entry.name;
    if (path === "deployment.json") continue;
    if (entry.isDirectory()) {
      files.push(...(await inventory(join(directory, entry.name), `${path}/`)));
    } else if (entry.isFile()) {
      const bytes = await readFile(join(directory, entry.name));
      files.push({ path, bytes: bytes.length, sha256: hash(bytes) });
    } else {
      throw new Error(`Pages artifact contains a non-regular entry: ${path}`);
    }
  }
  return files;
}

const receipt = {
  application: "Visual Music",
  source_repository: "Denoax/visual-music",
  source_commit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  site: "https://denoax.github.io/visual-music/",
  files: await inventory("dist"),
};
await writeFile(
  "dist/deployment.json",
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(
  `Pages receipt: ${receipt.source_commit}, ${receipt.files.length} files`,
);
