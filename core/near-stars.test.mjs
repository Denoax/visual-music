import { test } from "node:test";
import assert from "node:assert/strict";
import { nearStar, nearStarLife, STAR_LAYER } from "./near-stars.mjs";
test("Nearby stars keep stable world identities, bounded extents and zero-ended complete lives", () => {
  for (let x = -5; x <= 5; x++)
    for (let z = -5; z <= 5; z++)
      for (let i = 0; i < 4; i++) {
        const s = nearStar(x, z, i);
        assert.deepEqual(s, nearStar(x, z, i));
        assert.ok(s.radius <= STAR_LAYER.maxRadius);
        assert.ok(s.y >= 33 && s.y <= 94.875);
        assert.ok(
          s.x >= x * STAR_LAYER.cellSize && s.x < (x + 1) * STAR_LAYER.cellSize,
        );
        assert.ok(
          s.z >= z * STAR_LAYER.cellSize && s.z < (z + 1) * STAR_LAYER.cellSize,
        );
        assert.equal(nearStarLife(6 - s.phase, s.phase), 0);
        assert.ok(nearStarLife(3 - s.phase, s.phase) > 0.99);
      }
});
