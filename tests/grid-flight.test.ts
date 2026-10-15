import test from "node:test";
import assert from "node:assert/strict";
import { createFlight } from "../src/scene/flight.ts";
import { createArrangement } from "../src/show/arrangement.ts";
import { waveState } from "../src/show/waves.ts";
import features from "../analysis/features.json" with { type: "json" };
import pulses from "../show/light-pulses.json" with { type: "json" };

test("Full turn travels off the original rail and visible origins never follow it", () => {
  const f = createFlight();
  f.advance(60, { turn: 1, tilt: 0.3 }, false);
  const a = f.pose(),
    locked = f.origins().map((e) => ({ ...e }));
  assert.ok(Math.abs(a.x) > 10);
  assert.ok(a.yaw > -Math.PI / 6);
  assert.ok(f.origins().length < 24);
  f.advance(61, { turn: -1, tilt: 0 }, false);
  for (const e of locked) {
    const live = f.origins().find((o) => o.id === e.id);
    if (live) assert.deepEqual(live, e);
  }
  const state = waveState(61, features, false, f.origins());
  for (const front of state.fronts)
    assert.ok(
      state.emitters.some(
        (e) => e.id === front.id && e.x === front.x && e.z === front.z,
      ),
    );
});
test("A multi-second stall preserves the interactive path, reduced toggles retain position, and snapshots recover exactly", () => {
  const a = createFlight(),
    b = createFlight();
  a.advance(10, { turn: 0.6, tilt: -0.2 }, false);
  for (let i = 1; i <= 600; i++)
    b.advance(i / 60, { turn: 0.6, tilt: -0.2 }, false);
  assert.ok(
    Math.hypot(a.pose().x - b.pose().x, a.pose().z - b.pose().z) < 0.001,
  );
  const saved = a.snapshot();
  a.advance(16, { turn: 0, tilt: 0 }, true);
  assert.equal(a.pose().x, saved.pose.x);
  assert.equal(a.pose().z, saved.pose.z);
  const old = a.pose();
  a.advance(16.01, { turn: 0, tilt: 0 }, false);
  assert.ok(Math.hypot(a.pose().x - old.x, a.pose().z - old.z) < 1.1);
  a.restore(saved);
  assert.deepEqual(a.snapshot(), saved);
  a.reset(10);
  const nominal = createFlight();
  nominal.advance(10, { turn: 0, tilt: 0 }, false);
  assert.deepEqual(a.pose(), nominal.pose());
});
test("Scored aligned rests restore every member and identity while the separate candidate pulse envelope breathes", () => {
  const score = createArrangement();
  for (const t of [10, 155, 213]) {
    const a = score(t, features, false);
    assert.equal(a.gridRest, 1, `rest ${t}`);
    assert.deepEqual(a.board, {
      anchorX: 0,
      anchorZ: 0,
      shiftX: 0,
      shiftZ: 0,
      angle: 0,
    });
  }
  assert.ok(score(48, features, false).lighting.kind === 2);
  assert.equal(score(48, features, false).board.angle, 0); // Detailed floor masks stay on the canonical grid.
  const p = pulses.pulses.find(
    (p) => p.seconds > 82 && p.evidence === "near_measured_onset",
  )!;
  assert.ok(
    score(p.seconds + 0.04, features, false).music.accent >
      score(p.seconds + 0.38, features, false).music.accent,
  );
  assert.notEqual(pulses.pulses.length, 255);
  assert.ok(pulses.pulses.every((p) => !p.listening_approved));
});
