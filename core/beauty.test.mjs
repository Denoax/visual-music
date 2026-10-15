import test from "node:test";
import assert from "node:assert/strict";
import { emitterSample, fogTransmission, horizonRgb } from "./beauty.mjs";
import {
  visualReturn,
  idleHeight,
  RETURN_SECONDS,
  IDLE_PERIOD,
} from "./visual-return.mjs";
const close = (a, b, e = 1e-9) =>
  assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);

test("true OFF emitter stays exactly zero across core, shoulder, halo and LOD weights", () => {
  for (let r = 0; r <= 1.1; r += 0.01)
    for (const w of [0, 0.25, 0.5, 1])
      assert.deepEqual(emitterSample([0, 0, 0], r, 0.015, w), [0, 0, 0]);
});
test("brightness scaling remains linear for colored and near-white emitters", () => {
  for (const rgb of [
    [1, 0.2, 0.1],
    [0.1, 0.2, 1],
    [1, 1, 1],
  ])
    for (const r of [0, 0.15, 0.3, 0.7, 1]) {
      const full = emitterSample(rgb, r),
        half = emitterSample(
          rgb.map((x) => x * 0.5),
          r,
        );
      full.forEach((v, i) => close(v * 0.5, half[i]));
    }
});
test("halo profile is bounded and vanishes at sprite boundary", () => {
  assert.deepEqual(emitterSample([1, 0.2, 0.1], 1, 0.015, 0), [0, 0, 0]);
  for (let r = 0; r <= 1; r += 0.005)
    for (const v of emitterSample([1, 1, 1], r)) assert.ok(v >= 0 && v <= 1.5);
});
test("fog attenuates monotonically, no negative-distance lift", () => {
  close(fogTransmission(0), 1);
  close(fogTransmission(-100), 1);
  let previous = 1;
  for (let d = 0; d < 2000; d += 10) {
    const v = fogTransmission(d);
    assert.ok(v >= 0 && v <= previous);
    previous = v;
  }
});
test("horizon remains black at zenith and tracks world elevation, not screen UV", () => {
  assert.deepEqual(horizonRgb([0, 1, 0]), [0, 0, 0]);
  assert.deepEqual(horizonRgb([0, -1, 0]), [0, 0, 0]);
  assert.deepEqual(horizonRgb([0, 0, -1], 0, 0), [0, 0, 0]);
  assert.ok(horizonRgb([0, 0.02, -1]).some((x) => x > 0.001));
  assert.notDeepEqual(
    horizonRgb([0, 0, -1], 0),
    horizonRgb([0, 0, -1], Math.PI),
  );
});
test("visual return uses presented end age and does not alter the song phase", () => {
  assert.equal(visualReturn(null).phase, "song");
  assert.equal(visualReturn(0).blend, 0);
  assert.equal(visualReturn(RETURN_SECONDS).blend, 1);
  assert.equal(visualReturn(RETURN_SECONDS).phase, "idle");
});
test("idle field and signals match value and first derivative at the period seam", () => {
  for (const [x, z] of [
    [0, 0],
    [43, -89],
    [999, 1000],
  ]) {
    close(idleHeight(x, z, 0), idleHeight(x, z, IDLE_PERIOD));
    const h = 1e-4;
    close(
      (idleHeight(x, z, h) - idleHeight(x, z, -h)) / (2 * h),
      (idleHeight(x, z, IDLE_PERIOD + h) - idleHeight(x, z, IDLE_PERIOD - h)) /
        (2 * h),
      1e-8,
    );
  }
  for (const key of ["breath", "hueMix", "horizonGain", "starGain"]) {
    close(
      visualReturn(RETURN_SECONDS)[key],
      visualReturn(RETURN_SECONDS + IDLE_PERIOD)[key],
    );
  }
});
test("reduced-motion idle is time invariant", () => {
  close(idleHeight(33, 44, 0, { reduced: true }), 0);
  close(idleHeight(33, 44, 345, { reduced: true }), 0);
  const a = visualReturn(12, { reduced: true }),
    b = visualReturn(78, { reduced: true });
  for (const key of [
    "breath",
    "hueMix",
    "horizonGain",
    "starGain",
    "ripplePhase",
  ])
    close(a[key], b[key]);
});
