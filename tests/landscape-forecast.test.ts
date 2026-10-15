import test from "node:test";
import assert from "node:assert/strict";
import { createFlight } from "../src/scene/flight";
test("read-only landscape prediction leaves the camera owner and locked waves unchanged", () => {
  const flight = createFlight();
  flight.advance(28, { turn: 0.8, tilt: -0.3, held: true }, false);
  const before = flight.snapshot();
  const path = flight.forecastPath(1, 8);
  assert.deepEqual(flight.snapshot(), before);
  assert.equal(path.length, 9);
  assert(
    Math.hypot(path.at(-1)!.x - path[0].x, path.at(-1)!.z - path[0].z) > 100,
  );
  assert.notEqual(path[0].yaw, path.at(-1)!.yaw);
  assert.throws(() => flight.forecastPath(-1));
  assert.throws(() => flight.forecastPath(1, 1));
});
