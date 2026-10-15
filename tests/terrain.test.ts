import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { pickTerrain } from "../src/scene/terrain.ts";

// An independent finite mesh intersection checks the cell walker, including
// negative coordinates, steep slopes, horizon misses and vertical rays.
test("Terrain picker agrees with actual independently built grid triangles", () => {
  const vertex = (x: number, z: number) =>
    3 * Math.sin(x * 0.21) + 4 * Math.cos(z * 0.12) + 0.03 * z;
  const positions: number[] = [];
  for (let x = -90; x < 90; x += 3)
    for (let z = -90; z < 90; z += 3) {
      const a = [x, vertex(x, z), z],
        b = [x + 3, vertex(x + 3, z), z],
        c = [x, vertex(x, z + 3), z + 3],
        d = [x + 3, vertex(x + 3, z + 3), z + 3];
      positions.push(...a, ...c, ...b, ...b, ...c, ...d);
    }
  const geo = new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  mesh.updateMatrixWorld();
  for (let i = 0; i < 100; i++) {
    const o = new THREE.Vector3(
      -25 + (i % 10) * 5,
      22,
      -20 + Math.floor(i / 10) * 4,
    );
    const target = new THREE.Vector3(
      35 * Math.sin(i * 0.7),
      0,
      35 * Math.cos(i * 0.3),
    );
    const ray = new THREE.Ray(o, target.sub(o).normalize());
    const pick = pickTerrain(ray, { vertex }, 120);
    const caster = new THREE.Raycaster(ray.origin, ray.direction, 0, 120);
    const hit = caster.intersectObject(mesh)[0]?.point;
    assert.equal(Boolean(pick), Boolean(hit));
    if (hit && pick) assert.ok(hit.distanceTo(pick) < 0.00002, `ray ${i}`);
  }
  assert.equal(
    pickTerrain(
      new THREE.Ray(new THREE.Vector3(0, 20, 0), new THREE.Vector3(0, 1, 0)),
      { vertex },
    ),
    null,
  );
  const vertical = pickTerrain(
    new THREE.Ray(new THREE.Vector3(-3, 20, 3), new THREE.Vector3(0, -1, 0)),
    { vertex },
  );
  assert.ok(vertical);
  assert.ok(Math.abs(vertical.y - vertex(-3, 3)) < 1e-8);
  geo.dispose();
});
