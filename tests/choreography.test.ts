import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateShow,
  particleAt,
  sampleFeatures,
  terrainHeight,
} from "../src/show/choreography.ts";
import { validateScore } from "../src/show/cues.ts";
import raw from "../show/score.json" with { type: "json" };
const score = validateScore(raw),
  bands = { low: 0.5, mid: 0.4, high: 0.3, flux: 0.2 };
test("seek and replay reconstruct world state without visiting previous phases", () => {
  const direct = evaluateShow(score, 211, bands);
  for (let t = 0; t < 211; t += 0.1) evaluateShow(score, t, bands);
  assert.deepEqual(evaluateShow(score, 211, bands), direct);
  evaluateShow(score, 233, bands);
  assert.deepEqual(
    evaluateShow(score, 0, bands),
    evaluateShow(score, 0, bands),
  );
});
test("the first entrance and later canopy alter geometry and density", () => {
  const a = evaluateShow(score, 0, bands),
    b = evaluateShow(score, 25, bands),
    c = evaluateShow(score, 211, bands);
  assert.ok(b.morph - a.morph > 0.5);
  assert.ok(b.density - a.density > 0.6);
  assert.ok(c.release > 0.9);
  assert.ok(c.position[1] - b.position[1] > 20);
});
test("portrait uses a separate framing envelope and reduced motion uses a stable camera", () => {
  const landscape = evaluateShow(score, 73, bands),
    portrait = evaluateShow(score, 73, bands, true);
  assert.notEqual(landscape.position[1], portrait.position[1]);
  assert.notEqual(landscape.fov, portrait.fov);
  assert.deepEqual(
    evaluateShow(score, 43, bands, false, true).position,
    evaluateShow(score, 211, bands, false, true).position,
  );
});
test("events do not fire a backlog and waves have bounded lifetimes", () => {
  assert.ok(evaluateShow(score, 20, bands).wave);
  assert.equal(evaluateShow(score, 29, bands).wave, null);
  assert.equal(evaluateShow(score, 73, bands).accent, 0);
});
test("particles are age-based, bounded and seed-reproducible", () => {
  const burst = {
    seconds: 20,
    seed: 32,
    position: [0, 4, 0] as [number, number, number],
  };
  assert.equal(particleAt(burst, 2, 19), null);
  assert.equal(particleAt(burst, 2, 24), null);
  assert.deepEqual(particleAt(burst, 2, 21), particleAt(burst, 2, 21));
  assert.notDeepEqual(particleAt(burst, 2, 21), particleAt(burst, 3, 21));
});
test("band curves interpolate and clamp in recording seconds without scaling time", () => {
  const data = {
    runtime_sha256: "",
    hop_seconds: 0.05,
    samples: [
      [0, 0, 0, 0, 0],
      [0.05, 1, 0.5, 0.25, 0.2],
    ],
  };
  assert.equal(sampleFeatures(data, 0.025).low, 0.5);
  assert.equal(sampleFeatures(data, 999).high, 0.25);
  assert.equal(sampleFeatures(data, -1).low, 0);
  assert.ok(Number.isFinite(terrainHeight(0, 0)));
});
