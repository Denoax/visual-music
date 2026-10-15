export const TRACK_HASH =
  "47119d6e77b41e51ef65fb2fc7fa46a2c3f7a75578a650f394b5df78137861a0";
export const ANALYSIS_DURATION = 219.6658125;
export type Bands = { low: number; mid: number; high: number; flux: number };
export type Features = {
  runtime_sha256: string;
  sample_rate_hz: number;
  hop_samples: number;
  samples: number[][];
};
export function validateFeatures(value: unknown): Features {
  const data = value as Features;
  if (!data || data.runtime_sha256 !== TRACK_HASH)
    throw new Error("The analysis belongs to a different recording.");
  if (
    data.sample_rate_hz !== 48000 ||
    data.hop_samples !== 480 ||
    !Array.isArray(data.samples) ||
    data.samples.length !== 21967
  )
    throw new Error("Unexpected analysis format.");
  let previous = -1;
  for (const row of data.samples) {
    if (
      row.length !== 5 ||
      !row.every(Number.isFinite) ||
      row[0] <= previous ||
      row.slice(1).some((x) => x < 0 || x > 1)
    )
      throw new Error("Invalid analysis sample.");
    previous = row[0];
  }
  return data;
}
export function sampleBands(data: Features, seconds: number): Bands {
  const rows = data.samples;
  if (
    !Number.isFinite(seconds) ||
    seconds < 0 ||
    seconds > rows[rows.length - 1][0] + 0.01
  )
    return { low: 0, mid: 0, high: 0, flux: 0 };
  const index = Math.min(rows.length - 1, Math.floor(seconds * 100));
  const a = rows[index],
    b = rows[Math.min(rows.length - 1, index + 1)];
  const alpha = Math.min(1, Math.max(0, (seconds - a[0]) / 0.01));
  const mix = (i: number) => a[i] + (b[i] - a[i]) * alpha;
  return { low: mix(1), mid: mix(2), high: mix(3), flux: mix(4) };
}
