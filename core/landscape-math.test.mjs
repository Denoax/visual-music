import test from "node:test";
import assert from "node:assert/strict";
import {
  boundsRadius,
  footprintMask,
  proximityGain,
  safeToPlace,
  reduceFloorGate,
  envelope,
} from "./landscape-math.mjs";
test("asymmetric folded support covers every corner through yaw and scale", () => {
  const min = [-18, 0, -9],
    max = [18, 100, 12];
  for (const scale of [0.5, 0.55, 1])
    for (let angle = -Math.PI; angle < Math.PI; angle += 0.13) {
      const radius = boundsRadius(min, max, scale);
      for (const x of [min[0], max[0]])
        for (const z of [min[2], max[2]]) {
          const wx = scale * (x * Math.cos(angle) + z * Math.sin(angle)),
            wz = scale * (-x * Math.sin(angle) + z * Math.cos(angle));
          assert(Math.hypot(wx, wz) <= radius + 1e-12);
        }
    }
});
test("whole-object near fade is zero before any protected support crossing", () => {
  const anchor = { x: -300, z: 480 },
    radius = 80;
  for (let angle = 0; angle < Math.PI * 2; angle += 0.04)
    for (const gap of [-90, -1, 0, 37, 38])
      assert(
        proximityGain(
          anchor,
          radius,
          {
            x: anchor.x + (radius + gap) * Math.cos(angle),
            z: anchor.z + (radius + gap) * Math.sin(angle),
          },
          38,
          360,
        ) < 1e-35,
      );
  assert.equal(
    proximityGain(
      anchor,
      radius,
      { x: anchor.x + radius + 360, z: anchor.z },
      38,
      360,
    ),
    1,
  );
});
test("sweep rejects segment interior even when endpoints are safe", () => {
  assert.equal(
    safeToPlace(
      { x: 0, z: 10 },
      20,
      [
        { x: -300, z: 0 },
        { x: 300, z: 0 },
      ],
      72,
    ),
    false,
  );
  assert.equal(
    safeToPlace(
      { x: 0, z: 100 },
      20,
      [
        { x: -300, z: 0 },
        { x: 300, z: 0 },
      ],
      72,
    ),
    true,
  );
});
test("floor dim follows Three Y rotation and cannot turn OFF bulbs on", () => {
  for (const angle of [0, 0.3, 1.1, -2]) {
    const c = Math.cos(angle),
      s = Math.sin(angle),
      anchor = { x: -540, z: 320 };
    const p = { x: anchor.x + c * 35 + s * 4, z: anchor.z - s * 35 + c * 4 };
    assert.equal(footprintMask(p.x, p.z, anchor, 100, 20, angle), 1);
    for (const gain of [0, 0.4, 1])
      assert.equal(reduceFloorGate(0, 1, gain, 0.75), 0);
    assert.equal(reduceFloorGate(1, 1, 1, 0.75), 0.25);
    assert.equal(reduceFloorGate(1, 0, 1, 0.75), 1);
  }
});
test("section envelopes have exact quiet boundaries and no implicit repetition", () => {
  for (const t of [0, 24, 25, 56, 57, 219.66])
    assert.equal(envelope(t, 25, 56), 0);
  assert.equal(envelope(32, 25, 56), 1);
  assert(envelope(54, 25, 56) > 0 && envelope(54, 25, 56) < 1);
});
