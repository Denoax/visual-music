import { presentedVertex } from "./post-surface";
import { visualReturn, type VisualReturn } from "../../core/visual-return.mjs";
import * as THREE from "three";
import {
  gridSphereSupport,
  segmentTerrainCeiling,
  triangleGridHeight,
} from "../../core/sphere-support.mjs";
import { type Passage } from "../../core/safe-passage.mjs";
import { WAVE, type WaveState } from "../show/waves";

/** One frame's transformed terrain, shared by camera, picking and all bodies. */
export function currentTerrain(
  state: WaveState,
  _passage?: Passage,
  visual: VisualReturn = visualReturn(null),
) {
  const cache = new Map<string, number>();
  const vertex = (x: number, z: number) => {
    const key = `${x},${z}`;
    let h = cache.get(key);
    if (h === undefined) {
      h = presentedVertex(x, z, state, visual);

      cache.set(key, h);
    }
    return h;
  };
  return {
    vertex,
    height: (x: number, z: number) =>
      triangleGridHeight(x, z, WAVE.spacing, vertex),
    support: (x: number, z: number, radius: number, gap = 0) =>
      gridSphereSupport(x, z, radius, WAVE.spacing, vertex, 0.03) + gap,
    ceiling: (
      a: { x: number; z: number },
      b: { x: number; z: number },
      width: number,
    ) => segmentTerrainCeiling(a, b, width, WAVE.spacing, vertex),
    normal(x: number, z: number) {
      const s = WAVE.spacing,
        x0 = Math.floor(x / s) * s,
        z0 = Math.floor(z / s) * s;
      const a = vertex(x0, z0),
        b = vertex(x0 + s, z0),
        c = vertex(x0, z0 + s),
        d = vertex(x0 + s, z0 + s);
      return (
        x - x0 + z - z0 <= s
          ? new THREE.Vector3((a - b) / s, 1, (a - c) / s)
          : new THREE.Vector3((c - d) / s, 1, (b - d) / s)
      ).normalize();
    },
    cachedVertices: () => cache.size,
  };
}
export type Terrain = ReturnType<typeof currentTerrain>;

/** Exact cell walk and triangle intersection. No flat proxy or coarse march. */
export function pickTerrain(
  ray: THREE.Ray,
  terrain: Pick<Terrain, "vertex">,
  maximum = 240,
) {
  const s = WAVE.spacing,
    o = ray.origin,
    d = ray.direction;
  let ix = Math.floor(o.x / s),
    iz = Math.floor(o.z / s),
    entry = 0;
  const stepX = Math.sign(d.x),
    stepZ = Math.sign(d.z);
  const tx = () =>
    stepX === 0 ? Infinity : ((ix + (stepX > 0 ? 1 : 0)) * s - o.x) / d.x;
  const tz = () =>
    stepZ === 0 ? Infinity : ((iz + (stepZ > 0 ? 1 : 0)) * s - o.z) / d.z;
  const target = new THREE.Vector3();
  for (let walk = 0; walk < 400 && entry <= maximum; walk++) {
    const x = ix * s,
      z = iz * s;
    const a = new THREE.Vector3(x, terrain.vertex(x, z), z),
      b = new THREE.Vector3(x + s, terrain.vertex(x + s, z), z);
    const c = new THREE.Vector3(x, terrain.vertex(x, z + s), z + s),
      e = new THREE.Vector3(x + s, terrain.vertex(x + s, z + s), z + s);
    const next = Math.min(tx(), tz(), maximum);
    let hit: THREE.Vector3 | null = null,
      best = Infinity;
    for (const triangle of [
      [a, c, b],
      [b, c, e],
    ]) {
      const p = ray.intersectTriangle(
        triangle[0],
        triangle[1],
        triangle[2],
        false,
        target,
      );
      if (p) {
        const t = p.clone().sub(o).dot(d);
        if (t >= entry - 1e-7 && t <= next + 1e-7 && t < best) {
          hit = p.clone();
          best = t;
        }
      }
    }
    if (hit) return hit;
    if (!Number.isFinite(next) || next >= maximum) return null;
    const nx = tx(),
      nz = tz();
    if (nx <= nz + 1e-9) ix += stepX;
    if (nz <= nx + 1e-9) iz += stepZ;
    entry = next;
  }
  return null;
}

/** Off-grid lights sit on the SAME planar triangles as the depth surface. */
export const triangleHeightGLSL = `
float triangleHeight(vec2 p){
 vec2 origin=floor(p/3.)*3.;vec2 f=(p-origin)/3.;
 float a=renderVertexHeight(origin),b=renderVertexHeight(origin+vec2(3.,0.)),c=renderVertexHeight(origin+vec2(0.,3.)),d=renderVertexHeight(origin+vec2(3.));
 return f.x+f.y<=1.?a+(b-a)*f.x+(c-a)*f.y:d+(c-d)*(1.-f.x)+(b-d)*(1.-f.y);
}`;

// Reference flight clears the raw global bound. No camera-following crater.
// Keep uPassage for existing inspection tools; it no longer modifies geometry.
export const passageHeightGLSL = `
uniform vec3 uPassage;
float renderVertexHeight(vec2 p){return heightAt(p);}
`;
