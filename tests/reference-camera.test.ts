import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createFlight } from "../src/scene/flight";
import { rawHeight, waveState, WAVE, events } from "../src/show/waves";
import { currentTerrain } from "../src/scene/terrain";
import {
  compileCues,
  initialState,
  step,
  UNIT_SCALE,
  pose,
} from "../core/reference-camera.mjs";
import ref from "../show/reference-camera-score.json";
import features from "../analysis/features.json";
test("Diagnostic reference owner matches the original source-score neutral rig and freezes route through the whole delayed opening", () => {
  const f = createFlight(ref.cues, true),
    segments = compileCues(ref.cues);
  let s = initialState(segments);
  for (let tick = 1; tick <= 240 * 210; tick++) {
    const t = tick / 240;
    s = step(s, t, 1 / 240, {}, UNIT_SCALE, segments);
    if (tick % 240 === 0) {
      f.advance(t, { turn: 0, tilt: 0 }, false);
      assert.deepEqual(f.pose().position, pose(s).position);
      assert.equal(f.pose().vfov, s.vfov);
      assert.equal(f.pose().pitch, s.pitchX);
    }
  }
  f.reset(8);
  assert.equal(f.pose().x, 0);
  assert.equal(f.pose().z, 0);
  f.advance(9, { turn: 0, tilt: 0 }, false);
  assert.ok(Math.hypot(f.pose().x, f.pose().z) > 30);
  assert.equal(f.pose().vfov, 25);
});
test("Every reference shot and maximum turbo clears the complete raw terrain and mounted fixtures after intro visibility", () => {
  for (const input of [
    { turn: 0, tilt: 0 },
    { turn: 1, tilt: 1, held: true },
    { turn: -1, tilt: -1, held: true },
  ]) {
    const f = createFlight();
    for (let t = 0; t < 220; t += 0.1) {
      f.advance(t, input, false);
      const p = f.pose(),
        state = waveState(t, features, false, f.origins());
      if (t >= 7) assert.ok(p.y - WAVE.heightBound - 0.31 > 8.8);
      const terrain = currentTerrain(state);
      for (const d of [-3, 0, 3])
        assert.equal(
          terrain.vertex(p.x + d, p.z),
          rawHeight(p.x + d, p.z, state),
        );
      const b = p.basis,
        m = new THREE.Matrix4().makeBasis(
          new THREE.Vector3(...b.right),
          new THREE.Vector3(...b.up),
          new THREE.Vector3(...b.back),
        );
      assert.ok(Math.abs(m.determinant() - 1) < 1e-12);
    }
  }
});
test("Held input smoothly changes turbo and travelled path; release, pause, snapshot and reduced motion retain their ownership", () => {
  const f = createFlight();
  f.reset(28);
  const before = f.snapshot();
  f.advance(29, { turn: 1, tilt: 1, held: true }, false);
  assert.ok(
    Math.abs(f.pose().turbo - (1.2 - 0.2 * Math.exp(-1 / 0.45))) < 0.000001,
  );
  assert.ok(f.pose().roll > 0);
  assert.ok(f.pose().yaw > before.pose.yaw);
  assert.ok(f.pose().pitch > before.pose.pitch);
  const held = f.snapshot();
  f.advance(30, { turn: 0, tilt: 0 }, false);
  assert.ok(
    Math.abs(
      f.pose().turbo - (1 + (held.pose.turbo - 1) * Math.exp(-1 / 0.85)),
    ) < 0.000001,
  );
  f.restore(held);
  assert.deepEqual(f.snapshot(), held);
  f.advance(29, { turn: 0, tilt: 0 }, false);
  assert.deepEqual(f.pose().position, held.pose.position);
  f.advance(40, { turn: -1, tilt: -1, held: true }, true);
  const r = f.pose();
  assert.equal(r.x, held.pose.x);
  assert.equal(r.z, held.pose.z);
  assert.equal(r.roll, 0);
  assert.equal(r.turbo, 1);
  assert.equal(r.y, 24.75);
});
test("No-input diagnostic event origins share the production route and never alter IDs, strengths or front speed", () => {
  const f = createFlight(),
    seen = new Map();
  for (let t = 0; t <= 220; t += 0.1) {
    f.advance(t, { turn: 0, tilt: 0 }, false);
    for (const e of f.origins()) {
      if (seen.has(e.id)) assert.deepEqual(e, seen.get(e.id));
      seen.set(e.id, e);
      assert.deepEqual(e, events[e.id]);
    }
  }
  assert.equal(seen.size, events.length);
  assert.equal(WAVE.speed, 34);
});

test("Reduced motion at sample zero immediately selects a safe visible stationary pose", () => {
  const f = createFlight();
  f.advance(0, { turn: 1, tilt: 1, held: true }, true);
  assert.equal(f.pose().y, 24.75);
  assert.equal(f.pose().x, 0);
  assert.equal(f.pose().turbo, 1);
  assert.equal(f.diagnostics().groundVisible, true);
});
