import test from "node:test";
import assert from "node:assert/strict";
import { coarseQuadMask } from "./retrowave-edges.mjs";
test("coarse quad strokes omit both diagonals and mid-cell fine strokes during LOD handover", () => {
  const input = Float32Array.from(
    Array.from({ length: 4 }, () => [
      0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0,
    ]).flat(),
  );
  const mask = coarseQuadMask(input, 3, 3);
  assert.equal(mask.filter((x) => x === 1).length, 24);
  for (let i = 0; i < mask.length; i++) assert(mask[i] <= input[i]);
  assert.deepEqual([...mask.slice(0, 3)], [0, 1, 1]);
  assert.deepEqual([...mask.slice(9, 12)], [0, 0, 0]);
  assert.throws(() => coarseQuadMask(input, 5, 3));
});
