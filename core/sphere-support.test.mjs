import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gridSphereSupport, triangleGridHeight, segmentTerrainCeiling} from './sphere-support.mjs';

const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
test('flat floor gives exact radius at negative, positive and seam positions', () => {
  for (const [x, z] of [[0, 0], [1.1, 2.9], [-3.1, -11.7], [3, 3]])
    near(gridSphereSupport(x, z, 1.2, 3, () => 4, 0), 5.2);
});
test('planar slopes require full-body support, not centre height plus radius', () => {
  for (const [gx, gz] of [[1, 0], [0, -2], [.7, 1.3], [-3.2, .2]]) {
    const h = (x, z) => .4 + gx * x + gz * z;
    for (const [x, z] of [[.2, 1.7], [-8.12, -5.04], [2.4, 2.4]])
      near(gridSphereSupport(x, z, 1.2, 3, h, 0), h(x, z) + 1.2 * Math.hypot(1, gx, gz));
  }
});
test('off-centre sharp crest would penetrate naive centre-height placement', () => {
  const h = (x, z) => x === 3 && z === 3 ? 8 : 0;
  const x = 2.3, z = 2.3, r = 1.2;
  const support = gridSphereSupport(x, z, r, 3, h, 0);
  assert.ok(support > triangleGridHeight(x, z, 3, h) + r + 1);
  assert.ok(support >= 8 + Math.sqrt(r * r - .7 ** 2 - .7 ** 2) - 1e-9);
});
test('support is continuous across a cell seam and triangle diagonal', () => {
  const h = (x, z) => 5 * Math.sin(.8 * x) * Math.cos(.5 * z);
  const samples = [[3, 1.4], [.5, 2.5], [-3, -3]];
  for (const [x, z] of samples) {
    const a = gridSphereSupport(x - 1e-7, z, 1.1, 3, h, 0);
    const b = gridSphereSupport(x + 1e-7, z, 1.1, 3, h, 0);
    near(a, b, 2e-6);
  }
});
test('dense independent disk sampling never exceeds analytic support', () => {
  const h = (x, z) => 7 * Math.sin(x * .43) + 4 * Math.cos(z * .51);
  for (let i = 0; i < 25; i++) {
    const x = -11.2 + i * 1.031, z = -17.4 + i * .79, r = .2 + (i % 7) * .36;
    const support = gridSphereSupport(x, z, r, 3, h, 0);
    let sampled = -Infinity;
    for (let j = 0; j <= 80; j++) for (let k = 0; k < 160; k++) {
      const radius = r * j / 80, angle = Math.PI * 2 * k / 160;
      const px = x + radius * Math.cos(angle), pz = z + radius * Math.sin(angle);
      sampled = Math.max(sampled, triangleGridHeight(px, pz, 3, h) + Math.sqrt(Math.max(0, r * r - radius * radius)));
    }
    assert.ok(sampled <= support + 1e-8, `${sampled} > ${support}`);
    assert.ok(support - sampled < .025, 'Analytic result unexpectedly far above dense sample');
  }
});
test('old trail segment clearance must be recomputed when a hill rises in its middle', () => {
  const a = {x: -6, z: 0}, b = {x: 6, z: 0};
  const raised = (x, z) => x === 0 && z === 0 ? 9 : 0;
  near(segmentTerrainCeiling(a, b, .2, 3, () => 0), 0);
  near(segmentTerrainCeiling(a, b, .2, 3, raised), 9);
  near(triangleGridHeight(a.x, a.z, 3, raised), 0);
  near(triangleGridHeight(b.x, b.z, 3, raised), 0);
});
