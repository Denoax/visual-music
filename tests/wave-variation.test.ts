import test from "node:test";
import assert from "node:assert/strict";
import {
  FORMATIONS,
  formationFor,
  formationMetric,
  formationPulse,
  formationBand,
  crestChroma,
} from "../core/wave-formations.mjs";
import {
  rawHeight,
  smooth,
  surfaceHeight,
  waveState,
  WAVE,
} from "../src/show/waves";
import { comfortIntegrate, COMFORT } from "../core/comfort-motion.mjs";
import {
  compileCues,
  initialState,
  targetsAt,
  UNIT_SCALE,
} from "../core/reference-camera.mjs";
import { createFlight } from "../src/scene/flight";

test("the approved circular kernel survives as the complete first 25 seconds", () => {
  for (let t = 0.2; t < 25; t += 0.31) {
    const s = waveState(t, null, false);
    for (const x of [-100, 0, 83])
      for (const z of [-600, -120, 0]) {
        let h =
          s.base *
          (0.58 * Math.sin(x * 0.022 + z * 0.027 + t * 0.24) +
            0.28 * Math.sin(x * 0.039 - z * 0.014 - t * 0.19) +
            0.14 * Math.cos(x * 0.009 + z * 0.046 + t * 0.11));
        for (const e of s.fronts) {
          const age = t - e.time,
            u = Math.max(0, Math.min(1, age / 0.14)),
            v = Math.max(0, Math.min(1, (age - 4.2) / 1.4)),
            q = (Math.hypot(x - e.x, z - e.z) - 34 * age) / 10;
          h +=
            s.ring *
            (0.4 + 0.6 * e.strength) *
            Math.exp(-0.5 * q * q) *
            u *
            u *
            (3 - 2 * u) *
            (1 - v * v * (3 - 2 * v));
        }
        assert.ok(
          Math.abs(rawHeight(x, z, s) - 14 * Math.tanh(h / 14)) < 1e-10,
        );
      }
  }
});
test("new wave shapes are distinct, bounded and carry compact-support exchanges", () => {
  const signatures = [];
  for (const section of FORMATIONS.slice(0, 7)) {
    const form = formationFor(section.start + 0.1),
      signature = [];
    for (let x = -180; x <= 180; x += 6)
      for (let z = -180; z <= 180; z += 6) {
        const pulse = formationPulse(x, z, 1.1, form),
          bank = formationBand(x, z, 1.1, form);
        assert.ok(Number.isFinite(pulse) && pulse >= 0 && pulse <= 1 + 1e-12);
        assert.ok(bank >= 0 && bank <= 1 + 1e-12);
        assert.ok(Math.abs(crestChroma(x, z, 1.1, form)) <= 1 + 1e-12);
        signature.push(pulse);
      }
    signatures.push(signature);
    assert.equal(formationBand(10000, 20000, 1.1, form), 0);
  }
  // Circle recurs deliberately; every authored alternative differs spatially.
  for (const i of [1, 3, 4, 5, 6])
    assert.ok(
      signatures[i].some((v, j) => Math.abs(v - signatures[0][j]) > 0.1),
    );
});
test("event-birth shape is stable across chapter changes, seeks and replay", () => {
  for (const boundary of FORMATIONS.slice(1).map((s) => s.start)) {
    const e = { x: 0, z: 0, time: boundary - 0.1, strength: 1, id: 99 };
    const fixed = formationFor(e.time);
    for (const age of [0.01, 0.15, 1, 4, 5.59]) {
      const s = {
        ...waveState(e.time + age, null, false),
        fronts: [e],
        base: 0,
        ring: 7,
      };
      const attack = Math.min(1, age / 0.14),
        fade = Math.min(1, Math.max(0, (age - 4.2) / 1.4));
      const life =
        attack * attack * (3 - 2 * attack) * (1 - fade * fade * (3 - 2 * fade));
      const expected =
        14 * Math.tanh((7 * formationPulse(32, 48, age, fixed) * life) / 14);
      assert.ok(Math.abs(rawHeight(32, 48, s) - expected) < 1e-10);
      assert.equal(rawHeight(32, 48, s), rawHeight(32, 48, { ...s }));
      assert.deepEqual(formationFor(e.time), fixed);
    }
  }
});
test("raw vertices and exact terrain triangles retain the 14m bound in every passage", () => {
  for (let t = 25; t < 220; t += 0.67) {
    const s = waveState(t, null, false);
    for (const e of s.fronts.slice(-2))
      for (const dx of [-51, 0, 51])
        for (const dz of [-93, 12, 93]) {
          const x = Math.round((e.x + dx) / 3) * 3,
            z = Math.round((e.z + dz) / 3) * 3;
          const h = rawHeight(x, z, s);
          assert.ok(Number.isFinite(h) && Math.abs(h) < WAVE.heightBound);
          assert.ok(Math.abs(h - surfaceHeight(x, z, s)) < 1e-8);
          assert.ok(
            Math.abs(
              surfaceHeight(x - 1e-6, z + 0.3, s) -
                surfaceHeight(x + 1e-6, z + 0.3, s),
            ) < 1e-4,
          );
        }
  }
});
test("colour phases have no discontinuity at paired-ring or crossed-ridge seams", () => {
  for (const t of [96, 110]) {
    const f = formationFor(t);
    for (let x = -100; x <= 100; x += 0.43) {
      const a = crestChroma(x, -14, 1, f),
        b = crestChroma(x + 1e-5, -14, 1, f);
      assert.ok(Math.abs(a - b) < 1e-5);
      assert.ok(formationMetric(x, -14, 1, f).every(Number.isFinite));
    }
  }
});
test("M1 is more responsive, capped, and leaves all no-input route states unchanged", () => {
  const initial = () => ({
    seconds: 0,
    x: 0,
    z: 0,
    angle: 0,
    roll: 0,
    pitchX: 0,
    turbo: 1,
  });
  const p = { speed: 150, altitude: 60, vfov: 25, tilt: 9 };
  let a = initial(),
    b = initial();
  for (let i = 1; i <= 2400; i++) {
    a = comfortIntegrate(a, p, i / 240, 1 / 240);
    b = comfortIntegrate(b, p, i / 240, 1 / 240, {}, 0.4125, {
      ...COMFORT,
      heldTau: 1.25,
    });
    assert.deepEqual(a, b);
  }
  const boost = comfortIntegrate(initial(), p, 0.1, 0.1, { held: true });
  assert.ok(boost.turbo > 1.18 && boost.turbo < 1.22);
  assert.equal(COMFORT.heldTarget, 2);
  assert.equal(COMFORT.travel, 0.45);
});

test("later rotated profiles preserve their family shape in local coordinates", () => {
  for (const section of FORMATIONS.slice(7)) {
    const reference = FORMATIONS.find(
      (candidate) => candidate.kind === section.kind,
    )!;
    const delta = section.angle - reference.angle;
    const form = formationFor(section.start + 0.1);
    const referenceForm = formationFor(reference.start + 0.1);
    assert.ok(Object.isFrozen(form));
    assert.equal(form[0], section.kind);
    assert.equal(form[3], section.mix);
    for (const age of [0.14, 1.1, 4.2, 5.59]) {
      for (const [x, z] of [
        [-91, 33],
        [0, 0],
        [43, -72],
        [150, 97],
      ]) {
        const rotatedX = x * Math.cos(delta) - z * Math.sin(delta);
        const rotatedZ = x * Math.sin(delta) + z * Math.cos(delta);
        const actual = formationMetric(rotatedX, rotatedZ, age, form);
        const expected = formationMetric(x, z, age, referenceForm);
        assert.ok(
          actual.every(
            (value: number, i: number) => Math.abs(value - expected[i]) < 1e-10,
          ),
          section.name,
        );
        // Full family weights isolate orientation from the authored blend back to circles.
        assert.ok(
          Math.abs(
            formationPulse(rotatedX, rotatedZ, age, [...form.slice(0, 3), 1]) -
              formationPulse(x, z, age, [...referenceForm.slice(0, 3), 1]),
          ) < 1e-10,
          section.name,
        );
      }
    }
  }
});

test("births on both sides of a chapter boundary coexist without reshaping the older packet", () => {
  const unsaturate = (height: number) =>
    WAVE.heightBound * Math.atanh(height / WAVE.heightBound);
  for (const section of FORMATIONS.slice(1)) {
    const old = {
      x: -36,
      z: -84,
      time: section.start - 0.1,
      strength: 0.7,
      id: 900,
    };
    const fresh = {
      x: 21,
      z: -108,
      time: section.start + 0.1,
      strength: 1,
      id: 901,
    };
    const oldForm = formationFor(old.time);
    const freshForm = formationFor(fresh.time);
    for (const age of [0.01, 0.14, 1.4, 4.2, 5.59]) {
      const state = {
        ...waveState(fresh.time + age, null, false),
        base: 0,
        ring: 3,
      };
      for (const [x, z] of [
        [-36, -84],
        [30, -60],
        [81, -135],
      ]) {
        const a = rawHeight(x, z, { ...state, fronts: [old] });
        const b = rawHeight(x, z, { ...state, fronts: [fresh] });
        const joined = rawHeight(x, z, { ...state, fronts: [old, fresh] });
        const expected =
          WAVE.heightBound *
          Math.tanh((unsaturate(a) + unsaturate(b)) / WAVE.heightBound);
        assert.ok(
          Math.abs(joined - expected) < 1e-10,
          `${section.start}s overlap at age ${age}`,
        );
        assert.equal(
          joined,
          rawHeight(x, z, { ...state, fronts: [fresh, old] }),
        );
      }
      assert.strictEqual(formationFor(old.time), oldForm);
      assert.strictEqual(formationFor(fresh.time), freshForm);
    }
  }
});

test("each packet follows its shared formation through attack, fade and exact lifetime boundaries", () => {
  for (const section of FORMATIONS) {
    const event = {
      x: -18,
      z: -300,
      time: section.start + 0.5,
      strength: 1,
      id: 902,
    };
    const form = formationFor(event.time);
    for (const requestedAge of [
      -0.1,
      0,
      WAVE.attack / 2,
      WAVE.attack,
      WAVE.lifetime - WAVE.fade,
      WAVE.lifetime - 1e-6,
      WAVE.lifetime,
      WAVE.lifetime + 0.1,
    ]) {
      const seconds = event.time + requestedAge;
      const age = seconds - event.time;
      const state = {
        ...waveState(seconds, null, false),
        seconds,
        base: 0,
        ring: 7,
        fronts: [event],
      };
      const x = event.x + WAVE.speed * Math.max(0, age);
      const z = event.z + 3;
      const height = rawHeight(x, z, state);
      if (age <= 0 || age >= WAVE.lifetime) {
        assert.equal(
          Math.abs(height),
          0,
          `${section.name} outside life at ${requestedAge}s`,
        );
        continue;
      }
      // The shared spatial packet owns shape; the public attack/fade contract owns life.
      const life =
        smooth(0, WAVE.attack, age) *
        (1 - smooth(WAVE.lifetime - WAVE.fade, WAVE.lifetime, age));
      const packet = formationPulse(
        x - event.x,
        z - event.z,
        age,
        form,
        WAVE.width,
        WAVE.speed,
      );
      const expected =
        WAVE.heightBound *
        Math.tanh((state.ring * packet * life) / WAVE.heightBound);
      assert.ok(
        Math.abs(height - expected) < 1e-10,
        `${section.name} at ${requestedAge}s`,
      );
      assert.equal(rawHeight(x, z, { ...state, motion: 0.3 }), height * 0.3);
    }
  }
});

test("late formations retain one bounded surface at triangle diagonals and both cell edges", () => {
  const epsilon = 1e-6;
  for (const section of FORMATIONS.slice(7)) {
    for (const reduced of [false, true]) {
      const state = waveState(section.start + 2.1, null, reduced);
      assert.ok(state.fronts.length > 0, `${section.name} needs live fronts`);
      for (const event of state.fronts.slice(-2)) {
        const x0 = Math.floor((event.x + 33) / WAVE.spacing) * WAVE.spacing;
        const z0 = Math.floor((event.z - 54) / WAVE.spacing) * WAVE.spacing;
        const corners = [
          [x0, z0],
          [x0 + 3, z0],
          [x0, z0 + 3],
          [x0 + 3, z0 + 3],
        ];
        for (const [x, z] of corners) {
          assert.ok(
            Math.abs(surfaceHeight(x, z, state) - rawHeight(x, z, state)) <
              1e-8,
          );
        }
        for (const [x, z] of [
          [x0 + 0.9, z0 + 2.1],
          [x0, z0 + 0.9],
          [x0 + 0.9, z0],
        ]) {
          const height = surfaceHeight(x, z, state);
          assert.ok(
            Number.isFinite(height) &&
              Math.abs(height) <= WAVE.heightBound * state.motion,
          );
          assert.ok(
            Math.abs(
              surfaceHeight(x - epsilon, z, state) -
                surfaceHeight(x + epsilon, z, state),
            ) < 1e-4,
          );
          assert.ok(
            Math.abs(
              surfaceHeight(x, z - epsilon, state) -
                surfaceHeight(x, z + epsilon, state),
            ) < 1e-4,
          );
        }
      }
    }
  }
});

test("OFF exchange support is exact normal to the crest, with a deliberately unbounded transverse footprint", () => {
  for (const section of FORMATIONS) {
    const form = formationFor(section.start + 0.1);
    // Both the circular component and this offset from every authored crest are outside support.
    assert.equal(formationBand(-10000, -20000, 1.1, form), 0, section.name);
  }
  const ridge = formationFor(56.1);
  const age = 1.1;
  const along = 1000;
  const normal = WAVE.speed * age;
  const x = normal * ridge[1] - along * ridge[2];
  const z = normal * ridge[2] + along * ridge[1];
  // The Gaussian along a ridge is not globally compact; OFF support is a band in crest distance.
  assert.ok(formationBand(x, z, age, ridge) > 0);
  const outsideX = (normal + 6.01) * ridge[1] - along * ridge[2];
  const outsideZ = (normal + 6.01) * ridge[2] + along * ridge[1];
  assert.equal(formationBand(outsideX, outsideZ, age, ridge), 0);
});

test("the complete no-input production route and camera remain identical before and after the stronger boost", () => {
  const segments = compileCues();
  const route = createFlight();
  let approved = initialState(segments);
  const previousPolicy = { ...COMFORT, heldTarget: 1.2 };
  for (let tick = 1; tick <= 240 * 220; tick++) {
    const seconds = tick / 240;
    approved = comfortIntegrate(
      approved,
      targetsAt(seconds, segments),
      seconds,
      1 / 240,
      {},
      UNIT_SCALE,
      previousPolicy,
    );
    if (tick % 240 === 0) {
      route.advance(seconds, { turn: 0, tilt: 0, held: false }, false);
      assert.deepEqual(
        route.snapshot().state,
        approved,
        `unchanged scored route at ${seconds}s`,
      );
      assert.equal(route.pose().vfov, approved.vfov);
      assert.equal(route.pose().pitch, approved.pitchX);
      assert.equal(route.pose().y, approved.altitude * UNIT_SCALE);
    }
  }
});
