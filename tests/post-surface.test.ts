import test from "node:test";
import assert from "node:assert/strict";
import { waveState, rawHeight, surfaceHeight } from "../src/show/waves";
import features from "../analysis/features.json";
import { visualReturn } from "../core/visual-return.mjs";
import { presentedVertex } from "../src/scene/post-surface";
import { currentTerrain } from "../src/scene/terrain";
test("ordinary song surface remains the canonical raw vertices and triangles", () => {
  for (const t of [0, 27, 94, 159, 219.66579166666668]) {
    const state = waveState(t, features, false);
    const terrain = currentTerrain(state);
    for (const [x, z] of [
      [0, 0],
      [21, -420],
      [-300, 528],
      [18623, -9548],
    ]) {
      assert.equal(terrain.vertex(x, z), rawHeight(x, z, state));
      assert.equal(
        terrain.height(x + 0.7, z + 1.4),
        surfaceHeight(x + 0.7, z + 1.4, state),
      );
    }
  }
});
test("return preserves the last field, drains fronts, remains bounded and joins periodic idle smoothly", () => {
  const state = waveState(219.66579166666668, features, false);
  for (const [x, z] of [
    [0, 0],
    [43, -89],
    [18623, -9548],
  ]) {
    assert(
      Math.abs(
        presentedVertex(x, z, state, visualReturn(0)) - rawHeight(x, z, state),
      ) < 1e-12,
    );
    for (let age = 0; age < 33; age += 0.07)
      assert(Math.abs(presentedVertex(x, z, state, visualReturn(age))) <= 14);
    const value = (t: number) => presentedVertex(x, z, state, visualReturn(t));
    const h = 1e-4;
    assert(
      Math.abs((value(8 + h) - value(8)) / h - (value(8) - value(8 - h)) / h) <
        0.0001,
    );
    assert(Math.abs(value(8) - value(20)) < 1e-9);
    assert(Math.abs(value(20) - value(32)) < 1e-9);
  }
});
test("reduced idle is static on the same rendered terrain surface", () => {
  const state = waveState(219.66579166666668, features, true);
  for (const t of [8, 20, 32, 10000]) {
    const terrain = currentTerrain(
      state,
      undefined,
      visualReturn(t, { reduced: true }),
    );
    assert.equal(terrain.height(113.3, -498.4), 0);
  }
});
