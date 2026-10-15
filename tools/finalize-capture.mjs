import { readFile, rename, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
export async function finalize(prefix) {
  const file = `${prefix}.webm`,
    raw = `${prefix}.stream.webm`;
  try {
    await readFile(raw);
  } catch {
    await rename(file, raw);
  }
  // A previous validation attempt may have already made the raw copy.

  execFileSync(
    "ffmpeg",
    ["-v", "error", "-i", raw, "-map", "0", "-c", "copy", "-y", file],
    { stdio: "pipe" },
  );
  const hash = async (path) =>
    createHash("sha256")
      .update(await readFile(path))
      .digest("hex");
  const packets = (path) =>
    JSON.parse(
      execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_packets",
          "-show_data_hash",
          "sha256",
          "-show_entries",
          "packet=stream_index,data_hash",
          "-of",
          "json",
          path,
        ],
        { maxBuffer: 16 * 1024 * 1024 },
      ),
    ).packets;
  const a = packets(raw),
    b = packets(file);
  const byStream = (items) =>
    [0, 1].map((index) =>
      items.filter((p) => p.stream_index === index).map((p) => p.data_hash),
    );
  if (JSON.stringify(byStream(a)) !== JSON.stringify(byStream(b)))
    throw new Error("Capture remux changed media packets");
  const probe = JSON.parse(
    execFileSync("ffprobe", [
      "-v",
      "error",
      "-count_packets",
      "-show_entries",
      "format=duration:stream=codec_name,nb_read_packets,width,height,sample_rate,channels,avg_frame_rate",
      "-of",
      "json",
      file,
    ]),
  );
  const metadata = {
    operation:
      "Lossless WebM container remux to add seekable duration/index; no cuts, transcoding or soundtrack replacement",
    raw,
    raw_sha256: await hash(raw),
    file,
    sha256: await hash(file),
    identical_packet_payloads: true,
    packets: a.length,
    probe,
  };
  await writeFile(
    `${prefix}-container.json`,
    JSON.stringify(metadata, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      file,
      duration: probe.format.duration,
      identical_packet_payloads: true,
    }),
  );
}
if (process.argv[1]?.endsWith("finalize-capture.mjs"))
  await finalize(process.argv[2]);
