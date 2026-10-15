import score from "../../show/microcues.json";
import { TRACK_HASH } from "./track";
export type Microfeatures = {
  runtime_sha256: string;
  duration_seconds: number;
  channels: string[];
  samples: number[][];
};
let source: Microfeatures | null = null;
export function acceptMicrofeatures(value: unknown) {
  const v = value as Microfeatures;
  const channels = [
    "seconds",
    "bass_amp",
    "low_mid_amp",
    "mid_amp",
    "upper_mid_amp",
    "treble_amp",
    "harmonic_mid_proxy",
    "bass_attack",
    "tonal_attack",
    "treble_attack",
  ];
  if (
    v.runtime_sha256 !== TRACK_HASH ||
    JSON.stringify(v.channels) !== JSON.stringify(channels) ||
    Math.abs(v.duration_seconds - 219.66579166666668) > 0.001 ||
    !Array.isArray(v.samples) ||
    v.samples.length !== 21967
  )
    throw Error("Microfeatures do not match this recording");
  let previous = -1;
  for (const row of v.samples) {
    if (
      row.length !== 10 ||
      row[0] <= previous ||
      row.some((x, i) => !Number.isFinite(x) || (i > 0 && (x < 0 || x > 1)))
    )
      throw Error("Invalid microfeature row");
    previous = row[0];
  }
  source = v;
}
export function microAt(seconds: number) {
  if (!source || seconds < 0 || seconds > source.duration_seconds)
    return Array<number>(9).fill(0);
  const i = Math.min(source.samples.length - 1, Math.floor(seconds * 100)),
    a = source.samples[i],
    b = source.samples[Math.min(i + 1, source.samples.length - 1)],
    u = Math.min(1, Math.max(0, (seconds - a[0]) / 0.01));
  return a.slice(1).map((x, j) => x + (b[j + 1] - x) * u);
}
export function recentMicrocues(seconds: number, window = 3, limit = 8) {
  let lo = 0,
    hi = score.events.length;
  while (lo < hi) {
    const m = (lo + hi) >>> 1;
    if (score.events[m].seconds <= seconds) lo = m + 1;
    else hi = m;
  }
  const selected = [];
  for (
    let i = lo - 1;
    i >= 0 &&
    seconds - score.events[i].seconds < window &&
    selected.length < limit;
    i--
  )
    selected.push(score.events[i]);
  return selected.reverse();
}
export const semanticStatus = score.semantic_status;
