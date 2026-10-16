import test from "node:test";
import assert from "node:assert/strict";
import { createFlight } from "../src/scene/flight";
import { globalLightingAt } from "../src/show/floor";
import sections from "../show/lyrical-sections.json";
test("Actual route, forecast and snapshots use the same 45-percent policy while altitude and lens retain the score", () => {
  const comfortable = createFlight(),
    source = createFlight(undefined, true);
  comfortable.advance(90, { turn: 0, tilt: 0 }, false);
  source.advance(90, { turn: 0, tilt: 0 }, false);
  assert.ok(Math.abs(comfortable.pose().z / source.pose().z - 0.45) < 1e-10);
  assert.equal(comfortable.pose().y, source.pose().y);
  assert.equal(comfortable.pose().vfov, source.pose().vfov);
  const saved = comfortable.snapshot(),
    path = comfortable.forecastPath(1, 4);
  comfortable.advance(91, { turn: 0, tilt: 0 }, false);
  assert.ok(
    Math.hypot(
      comfortable.pose().x - path[4].x,
      comfortable.pose().z - path[4].z,
    ) < 1e-8,
  );
  comfortable.restore(saved);
  assert.deepEqual(comfortable.snapshot(), saved);
});
test("Every real density entry and exit is continuous and retains membership during retirement", () => {
  for (const section of sections.sections.slice(1)) {
    const a = globalLightingAt(section.start - 1e-5),
      b = globalLightingAt(section.start + 1e-5);
    assert.ok(Math.abs(a.dense - b.dense) < 1e-5, section.name);
    if (b.dense > 0) assert.equal(b.densePrepare, true);
  }
  assert.equal(globalLightingAt(11.5).dense, 0);
  assert.equal(globalLightingAt(11.5).densePrepare, true);
  assert.equal(globalLightingAt(13).dense, 0.5);
});
