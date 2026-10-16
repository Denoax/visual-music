import test from "node:test";
import assert from "node:assert/strict";
import { globalLightingAt } from "../src/show/floor.ts";
import { createPaint } from "../src/show/paint.ts";
import { acceptMicrofeatures, microAt } from "../src/show/microcues.ts";
import micro from "../analysis/mixed-microfeatures.json" with { type: "json" };
import { createArrangement } from "../src/show/arrangement.ts";
import { createLyricalActors } from "../src/scene/lyrical-actors.ts";
import { currentTerrain } from "../src/scene/terrain.ts";
import { waveState } from "../src/show/waves.ts";
import features from "../analysis/features.json" with { type: "json" };
import * as THREE from "three";
test("continuous musical flow advances through the former phase gap; chapter changes cannot produce a master blackout", () => {
  assert.ok(globalLightingAt(169.1).phase > globalLightingAt(169).phase);
  for (let t = 0; t < 219.7; t += 0.1) {
    const a = globalLightingAt(t);
    assert.equal(a.scoreGain, 1);
    assert.equal(a.paletteGain, 1);
  }
});
test("microfeatures reject the wrong recording and invalid channels; sampling is deterministic", () => {
  assert.throws(() => acceptMicrofeatures({ ...micro, runtime_sha256: "bad" }));
  assert.throws(() => acceptMicrofeatures({ ...micro, channels: ["seconds"] }));
  acceptMicrofeatures(micro);
  assert.deepEqual(microAt(3.141), microAt(3.141));
  assert.equal(
    microAt(300).reduce((s, v) => s + v, 0),
    0,
  );
});
test("paint anchor survives advancing origins and round-trips context recovery", () => {
  const p = createPaint(),
    front = { x: 12, z: -30, time: 1, id: 1, strength: 1 };
  const a = p.at(2, [front]),
    snapshot = p.snapshot();
  const b = p.at(2, [{ ...front, x: 200 }]);
  assert.deepEqual(a, b);
  p.reset();
  p.restore(snapshot);
  assert.deepEqual(p.at(2, [front]), a);
});
test("musical points and complete ribbon strips clear CURRENT terrain and reconstruct after pause/context recovery", () => {
  acceptMicrofeatures(micro);
  const actors = createLyricalActors({
      getParameter: () => [1, 128],
    } as unknown as WebGL2RenderingContext),
    arrange = createArrangement(),
    camera = new THREE.PerspectiveCamera(58, 1.6, 0.2, 550);
  for (const t of [14, 26, 28, 76, 78, 124, 162, 176, 178, 192, 204]) {
    camera.position.set(0, 5.4, -18 * t);
    const state = waveState(t, features, false),
      terrain = currentTerrain(state, { x: 0, z: -18 * t, eyeY: 5.4 }),
      score = arrange(t, features, false);
    actors.update(score, camera, terrain, state.fronts, 900, 1);
    const d = actors.diagnostics();
    assert.ok(d.points <= 192 && d.beams <= 8);
    if (d.minimumPointTerrainGap !== null)
      assert.ok(d.minimumPointTerrainGap >= 0.24999);
    const saved = actors.snapshot();
    actors.update(score, camera, terrain, state.fronts, 900, 1);
    assert.deepEqual(actors.diagnostics(), d);
    actors.reset();
    actors.restore(saved);
    actors.update(score, camera, terrain, state.fronts, 900, 1);
    assert.deepEqual(actors.diagnostics(), d);
  }
  actors.dispose();
});

import { decorationFronts } from "../src/show/drivers.ts";
test("decorative driver budget never evicts a live crest; physical fronts remain untouched", () => {
  for (let t = 0; t < 219.7; t += 0.01) {
    const state = waveState(t, features, false),
      before = [...state.fronts],
      drivers = decorationFronts(state.fronts);
    assert.ok(drivers.length <= 2);
    assert.deepEqual(state.fronts, before);
  }
});
