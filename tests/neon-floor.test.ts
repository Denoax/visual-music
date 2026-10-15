import test from "node:test";
import assert from "node:assert/strict";
import { fixtureGeometry } from "../src/scene/field.ts";
import { globalLightingAt, FLOOR } from "../src/show/floor.ts";
import { createArrangement } from "../src/show/arrangement.ts";
import { triangleGridHeight } from "../core/sphere-support.mjs";
import { densePatchCells } from "../core/led-floor.mjs";
import features from "../analysis/features.json" with { type: "json" };

test("Every whole diffuser and housing face follows one rendered terrain triangle, including fine and negative cells", () => {
  const geo = fixtureGeometry(),
    p = geo.getAttribute("position"),
    indices = geo.index!;
  const vertex = (x: number, z: number) =>
    9 * Math.sin(x * 0.73) + 4 * Math.cos(z * 0.31);
  const height = (x: number, z: number) => triangleGridHeight(x, z, 3, vertex);
  let checks = 0;
  for (const x of [-3, -1.5, 0, 1.5, 3])
    for (const z of [-3, -1.5, 0, 1.5, 3])
      for (let i = 0; i < indices.count; i += 3) {
        const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
        for (const weights of [
          [1 / 3, 1 / 3, 1 / 3],
          [0.1, 0.7, 0.2],
          [0.6, 0.1, 0.3],
        ]) {
          const sampleX = ids.reduce(
              (sum, j, k) => sum + (x + p.getX(j)) * weights[k],
              0,
            ),
            sampleZ = ids.reduce(
              (sum, j, k) => sum + (z + p.getZ(j)) * weights[k],
              0,
            );
          const interpolated = ids.reduce(
            (sum, j, k) =>
              sum + height(x + p.getX(j), z + p.getZ(j)) * weights[k],
            0,
          );
          assert.ok(
            Math.abs(interpolated - height(sampleX, sampleZ)) < 2e-6,
            `face ${i / 3} at ${x},${z}`,
          );
          checks++;
        }
      }
  assert.ok(checks > 5000);
  geo.dispose();
});
test("The score retains stable rests, local wave chunks, ordered palettes and layered fades through the full tail", () => {
  for (let t = 0; t <= 219.666; t += 0.125) {
    const light = globalLightingAt(t);
    assert.deepEqual(light, globalLightingAt(t));
    for (const v of [
      light.dense,
      light.skyAccent,
      light.scoreGain,
      light.paletteGain,
      light.density,
    ])
      assert.ok(v >= 0 && v <= 1);
  }
  assert.equal(globalLightingAt(30).kind, 1);
  assert.equal(globalLightingAt(48).kind, 2);
  assert.equal(globalLightingAt(84).actor, "gather");
  assert.equal(globalLightingAt(112).familyName, "rainbow");
  for (const t of [10, 150, 215, 219.66579])
    assert.ok([0, 10].includes(globalLightingAt(t).kind));
  const arrange = createArrangement();
  assert.equal(arrange(219.66579, features, false).reveal.exit, 1);
  assert.equal(arrange(219.66579, features, false, 32).reveal.exit, 1);
  assert.equal(arrange(219.66579, features, false, 32).visual.blend, 0);
  assert.equal(arrange(219.66579, features, false, 32).finish.worldGain, 0);
  assert.equal(arrange(219.66579, features, false, 32).finish.pageGain, 1);
  assert.equal(arrange(0, features, false).reveal.core, 0);
  assert.equal(arrange(1, features, false).reveal.ground, 0);
});
test("Fine LEDs remain nested with stable world identities and never change physical 3m spacing", () => {
  const a = densePatchCells({ x: -18, z: 36, halfSize: 24, yaw: 0.31 }),
    b = densePatchCells({ x: -18, z: 36, halfSize: 24, yaw: 0.31 });
  assert.deepEqual(a, b);
  assert.ok(a.some((c) => !c.coarse));
  for (const c of a.filter((c) => c.coarse))
    assert.ok(c.x % 3 === 0 && c.z % 3 === 0);
});

import * as THREE from "three";
import { createField } from "../src/scene/field.ts";
import { waveState } from "../src/show/waves.ts";
test("Actual foreground batches keep complete nested coverage through tile crossings and retire dense cells on replay", () => {
  const field = createField(),
    arrange = createArrangement();
  for (const portrait of [false, true]) {
    const camera = new THREE.PerspectiveCamera(
      58,
      portrait ? 390 / 844 : 1440 / 900,
      0.2,
      550,
    );
    for (const t of [77, 89, 109, 122, 143, 163, 168, 179, 198]) {
      const pose = { x: -18, z: -18 * t, yaw: 0, pitch: 0 },
        a = arrange(t, features, false);
      for (const offset of [-3.01, -0.01, 0, 0.01, 1.49, 1.51, 3.01]) {
        camera.position.set(pose.x, 24.75, pose.z + offset);
        camera.lookAt(pose.x, 0, pose.z + offset - 120);
        camera.updateMatrixWorld();
        field.update(waveState(t, features, false), camera, 900, 1, a, {
          paint: [],
          borrow: new THREE.Vector4(),
          micro: Array(9).fill(0),
        });
        const audit = field.audit(),
          d = field.diagnostics(),
          ids = audit.nearCells.map((c) => `${c.x},${c.z}`);
        assert.equal(
          new Set(ids).size,
          ids.length,
          "No duplicated coarse/fine cap emission",
        );
        assert.ok(
          d.nearCaps <= (portrait ? FLOOR.portraitCaps : FLOOR.desktopCaps),
        );
        const radius = d.nearBand[1];
        for (let ix = -36; ix <= 36; ix += 3)
          for (
            let iz = Math.floor((d.detailCenter[1] - radius) / 3) * 3;
            iz < d.detailCenter[1] + radius;
            iz += 3
          )
            if (
              Math.hypot(ix - d.detailCenter[0], iz - d.detailCenter[1]) <
              radius
            )
              assert.ok(
                ids.includes(`${ix},${iz}`),
                "No missing cap inside complementary LOD",
              );
        for (const c of audit.fineCells) {
          assert.ok(
            !(c.x % 3 === 0 && c.z % 3 === 0),
            "No even/even duplicate",
          );
          if (
            Math.hypot(c.x - d.detailCenter[0], c.z - d.detailCenter[1]) <
            radius
          )
            assert.ok(ids.includes(`${c.x},${c.z}`));
        }
      }
    }
  }
  field.update(
    waveState(0, features, false),
    new THREE.PerspectiveCamera(),
    900,
    1,
    arrange(0, features, false),
    { paint: [], borrow: new THREE.Vector4(), micro: Array(9).fill(0) },
  );
  assert.equal(field.diagnostics().denseAdded, 0);
  assert.equal(field.diagnostics().lighting!.kind, 0);
  field.dispose();
});

test("Diffuser and housing triangles have outward winding consistent with their authored normals", () => {
  const geo = fixtureGeometry(),
    p = geo.getAttribute("position"),
    n = geo.getAttribute("normal"),
    idx = geo.index!;
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i),
      b = idx.getX(i + 1),
      c = idx.getX(i + 2);
    const v = (j: number) => new THREE.Vector3().fromBufferAttribute(p, j);
    const cross = v(b)
      .sub(v(a))
      .cross(v(c).sub(v(a)));
    const normal = new THREE.Vector3()
      .fromBufferAttribute(n, a)
      .add(new THREE.Vector3().fromBufferAttribute(n, b))
      .add(new THREE.Vector3().fromBufferAttribute(n, c));
    assert.ok(cross.length() > 1e-7, `Degenerate fixture face ${i / 3}`);
    assert.ok(cross.dot(normal) > 0, `Inward fixture face ${i / 3}`);
  }
  geo.dispose();
});

test("Dense detail follows the visible ground across diagonal crossings and retains nested world identities", () => {
  const field = createField(),
    arrange = createArrangement();
  for (const aspect of [1440 / 900, 390 / 844])
    for (const delta of [0, 1.49, 3.01]) {
      const camera = new THREE.PerspectiveCamera(25, aspect, 0.4125, 660);
      camera.position.set(delta, 24.75, delta);
      camera.lookAt(delta, 0, delta - 156);
      camera.updateMatrixWorld();
      field.update(
        waveState(84, features, false),
        camera,
        900,
        1,
        arrange(84, features, false),
        { paint: [], borrow: new THREE.Vector4(), micro: Array(9).fill(0) },
      );
      const cells = field.audit().fineCells,
        ids = new Set(cells.map((c) => c.id));
      assert.ok(cells.length > 1000);
      assert.equal(cells.length, ids.size);
      for (const c of cells) {
        assert.ok(!(c.x % 3 === 0 && c.z % 3 === 0));
        assert.equal(c.id, `${c.x / 1.5},${c.z / 1.5}`);
      }
      // Central flat-ground bottom rows are >60m away: old 32/45m selection missed them.
      for (let x = -9; x <= 9; x += 1.5)
        for (let z = -120; z <= -72; z += 1.5)
          if (!(x % 3 === 0 && z % 3 === 0)) {
            const clip = new THREE.Vector3(x, 0, z).project(camera);
            if (Math.abs(clip.x) < 0.9 && Math.abs(clip.y) < 0.9)
              assert.ok(ids.has(`${x / 1.5},${z / 1.5}`));
          }
    }
  field.dispose();
});
