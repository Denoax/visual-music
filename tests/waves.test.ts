import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeFronts,
  events,
  rawHeight,
  surfaceHeight,
  waveState,
  WAVE,
} from "../src/show/waves.ts";
import features from "../analysis/features.json";

test("Seeks reconstruct only live fronts; replay and pause are deterministic", () => {
  let max = 0;
  for (let t = 0; t < 220; t += 0.11) {
    const fronts = activeFronts(t);
    max = Math.max(max, fronts.length);
    assert.ok(fronts.every((e) => t >= e.time && t - e.time <= WAVE.lifetime));
    assert.deepEqual(activeFronts(t), fronts);
  }
  assert.ok(max <= WAVE.capacity);
  assert.deepEqual(activeFronts(0), []);
  assert.deepEqual(
    waveState(0, features, false),
    waveState(0, features, false),
  );
});
test("Held sections keep palette and base coverage steady as fronts advance", () => {
  for (const [a, b] of [
    [80, 95],
    [144, 152],
    [182, 208],
  ]) {
    const first = waveState(a, features, false),
      second = waveState(b, features, false);
    assert.equal(first.hold, 1);
    assert.equal(second.hold, 1);
    assert.equal(first.coverage, second.coverage);
    assert.deepEqual(first.paletteB, second.paletteB);
    assert.notDeepEqual(first.fronts, second.fronts);
  }
});
test("A pulse creates a raised moving ring, with finite smooth lifetime", () => {
  const e = events.find((e) => e.time > 27)!;
  const make = (age: number) => ({
    ...waveState(e.time + age, null, false),
    base: 0,
    ring: 7,
    fronts: [e],
  });
  assert.equal(rawHeight(e.x, e.z, make(0)), 0);
  const age = 1,
    crestX = e.x + WAVE.speed * age;
  assert.ok(rawHeight(crestX, e.z, make(age)) > 2);
  assert.ok(rawHeight(crestX, e.z, make(age)) > rawHeight(e.x, e.z, make(age)));
  assert.ok(Math.abs(rawHeight(crestX, e.z, make(WAVE.lifetime))) < 1e-8);
});
test("Triangle guide agrees at grid vertices, stays bounded and crosses cells continuously", () => {
  for (const t of [0, 29, 77, 110, 150, 160, 185, 212, 219.6658125]) {
    const state = waveState(t, features, false);
    for (let x = -54; x <= 54; x += 3)
      for (let n = -12; n <= 12; n++) {
        const z = Math.round((-t * WAVE.travel) / 3) * 3 + n * 3;
        const h = surfaceHeight(x, z, state);
        assert.ok(Number.isFinite(h) && Math.abs(h) < WAVE.heightBound);
        assert.ok(Math.abs(h - rawHeight(x, z, state)) < 1e-9);
        assert.ok(
          Math.abs(
            surfaceHeight(x - 1e-6, z + 0.6, state) -
              surfaceHeight(x + 1e-6, z + 0.6, state),
          ) < 1e-4,
        );
      }
  }
  assert.equal(waveState(220, features, false).brightness, 0);
  assert.equal(waveState(220, features, false).section, "wave_09");
});
