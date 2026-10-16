import test from "node:test";
import assert from "node:assert/strict";
import { confettiAt } from "./confetti.mjs";
import { FINISH_SECONDS, thankYouAt } from "./opening-layers.mjs";

test("the shower introduces several cohorts across the first second instead of one burst", () => {
  let previous = [];
  for (const age of [0.12, 0.3, 0.48, 0.66, 0.84, 1]) {
    const current = confettiAt(age);
    assert.ok(
      current.length > previous.length,
      `a new cohort must appear by ${age}s`,
    );
    assert.ok(
      previous.every((piece) => current.some((next) => next.id === piece.id)),
    );
    previous = current;
  }
  assert.ok(confettiAt(0).length < 36);
  assert.equal(previous.length, 36);
});

test("each new cohort showers from multiple upper-viewport positions", () => {
  const seen = new Set();
  for (const age of [0.08, 0.26, 0.44, 0.62, 0.8, 0.98]) {
    const newPieces = confettiAt(age).filter((piece) => !seen.has(piece.id));
    assert.ok(newPieces.length > 0);
    const xs = newPieces.map((piece) => piece.x);
    assert.ok(
      Math.max(...xs) - Math.min(...xs) > 0.6,
      `cohort at ${age}s must span the viewport`,
    );
    assert.ok(newPieces.every((piece) => piece.y < 0.14));
    newPieces.forEach((piece) => seen.add(piece.id));
  }
  assert.equal(seen.size, 36);
});

test("sampling, pause and reverse-time inspection never change paper identities or trajectories", () => {
  const snapshots = [0.1, 0.7, 1, 2.5, 3.7].map((age) => confettiAt(age));
  for (const index of [4, 1, 3, 0, 2, 2]) {
    assert.deepEqual(
      confettiAt([0.1, 0.7, 1, 2.5, 3.7][index]),
      snapshots[index],
    );
  }
  const altered = confettiAt(1);
  altered[0].x = 500;
  assert.deepEqual(confettiAt(1), snapshots[2]);
});

test("piece requests remain bounded and all rendered coordinates are finite", () => {
  for (const count of [-1, 0, 1, 36, 48, 500, Infinity, NaN]) {
    for (let frame = 0; frame < 4 * 120; frame++) {
      const pieces = confettiAt(frame / 120, { count });
      assert.ok(pieces.length <= 48);
      assert.equal(
        new Set(pieces.map((piece) => piece.id)).size,
        pieces.length,
      );
      for (const piece of pieces) {
        assert.ok(
          [
            piece.x,
            piece.y,
            piece.rotation,
            piece.width,
            piece.height,
            piece.opacity,
          ].every(Number.isFinite),
        );
        assert.ok(piece.width > 0 && piece.height > 0);
        assert.ok(piece.opacity >= 0 && piece.opacity <= 0.65);
      }
    }
  }
  assert.equal(confettiAt(1).length, 36);
  assert.equal(confettiAt(1, { count: 500 }).length, 48);
});

test("every paper fades in, falls and fades out before the finite finish stops RAF", () => {
  const life = new Map();
  for (let frame = 0; frame < 4 * 240; frame++) {
    const age = frame / 240;
    for (const piece of confettiAt(age)) {
      const record = life.get(piece.id);
      if (!record)
        life.set(piece.id, { first: { age, piece }, last: { age, piece } });
      else record.last = { age, piece };
    }
  }
  assert.equal(life.size, 36);
  for (const { first, last } of life.values()) {
    assert.ok(first.age < 1);
    assert.ok(first.piece.opacity < 0.001);
    assert.ok(last.age < 4);
    assert.ok(last.piece.opacity < 0.001);
    assert.ok(last.piece.y > first.piece.y);
  }
  const lastLiveFrame = thankYouAt(FINISH_SECONDS - 1 / 60);
  assert.notEqual(lastLiveFrame.confettiAge, null);
  assert.deepEqual(confettiAt(lastLiveFrame.confettiAge), []);
  assert.equal(thankYouAt(FINISH_SECONDS).confettiAge, null);
  assert.deepEqual(confettiAt(4), []);
});

test("reduced motion and invalid or expired presentation ages have no particles", () => {
  for (const age of [0, 0.5, 1, 2, 3.9])
    assert.deepEqual(confettiAt(age, { reduced: true }), []);
  for (const age of [null, NaN, Infinity, -Infinity, -0.01, 4, 100])
    assert.deepEqual(confettiAt(age), []);
});
