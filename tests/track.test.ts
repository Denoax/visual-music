import { test } from "node:test";
import assert from "node:assert/strict";
import raw from "../analysis/features.json";
import {
  validateFeatures,
  sampleBands,
  TRACK_HASH,
} from "../src/show/track.ts";
test("Only the exact Around the World analysis is accepted; malformed samples fail", () => {
  assert.equal(validateFeatures(raw).runtime_sha256, TRACK_HASH);
  assert.throws(
    () => validateFeatures({ ...raw, runtime_sha256: "wrong" }),
    /different recording/,
  );
  const samples = raw.samples.slice();
  samples[2] = samples[1];
  assert.throws(
    () => validateFeatures({ ...raw, samples }),
    /Invalid analysis sample/,
  );
});
test("Controls interpolate measured sample centres and become zero outside the recording", () => {
  const data = {
    runtime_sha256: TRACK_HASH,
    sample_rate_hz: 48000,
    hop_samples: 480,
    samples: [
      [0, 0, 1, 0, 1],
      [0.01, 1, 0, 1, 0],
    ],
  };
  assert.deepEqual(sampleBands(data, 0.005), {
    low: 0.5,
    mid: 0.5,
    high: 0.5,
    flux: 0.5,
  });
  assert.deepEqual(sampleBands(data, 220), {
    low: 0,
    mid: 0,
    high: 0,
    flux: 0,
  });
  assert.deepEqual(sampleBands(data, -1), { low: 0, mid: 0, high: 0, flux: 0 });
});
