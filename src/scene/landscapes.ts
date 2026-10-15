import { coarseQuadMask } from "../../core/retrowave-edges.mjs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import index from "../../assets/landscapes.json";
import score from "../../show/structures.json";
import {
  boundsRadius,
  envelope,
  proximityGain,
  safeToPlace,
  smooth,
} from "../../core/landscape-math.mjs";
import { retroMountainMaterial } from "./retro-mountain-material.mjs";
import { projectionMaterial } from "./projection-material.mjs";
import type { createFlight } from "./flight";
import type { Arrangement } from "../show/arrangement";
type Section = (typeof score.sections)[number];
type Anchor = {
  id: string;
  section: string;
  asset: string;
  x: number;
  y: number;
  z: number;
  angle: number;
  scale: number;
  radius: number;
  born: number;
  index: number;
};
type Slot = {
  anchor: Anchor | null;
  near: THREE.Mesh;
  far: THREE.Mesh;
  gain: number;
  lod: number;
  box: THREE.Box3;
  materials: { mountain: THREE.ShaderMaterial[]; fin: THREE.ShaderMaterial[] };
};
/** Fixed world anchors; no camera transform parenting, physics or second clock. */
export async function createLandscapes() {
  const loader = new GLTFLoader(),
    assets = new Map<string, THREE.BufferGeometry>();
  await Promise.all(
    index.files.map(async (entry) => {
      const response = await fetch(
        `${import.meta.env.BASE_URL}models/landscapes/${entry.path}`,
        { signal: AbortSignal.timeout(30000) },
      );
      if (!response.ok)
        throw Error(`Landscape ${entry.path}: HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (x) => x.toString(16).padStart(2, "0"),
      ).join("");
      if (hash !== entry.sha256)
        throw Error(`Landscape identity mismatch: ${entry.path}`);
      const gltf = await loader.parseAsync(bytes, "");
      let geometry: THREE.BufferGeometry | null = null;
      gltf.scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          if (geometry) throw Error("Expected one baked surface");
          o.updateWorldMatrix(true, false);
          geometry = o.geometry.applyMatrix4(o.matrixWorld);
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => m.dispose());
        }
      });
      if (!geometry) throw Error(`Missing landscape geometry ${entry.path}`);
      assets.set(entry.path, geometry);
      if ("grid" in entry) {
        const g = assets.get(entry.path)!;
        const mask = g.getAttribute("_edge_mask");
        g.setAttribute(
          "_coarse_mask",
          new THREE.BufferAttribute(
            entry.lod === "near"
              ? coarseQuadMask(mask.array, entry.grid[0], entry.grid[1])
              : Float32Array.from(mask.array),
            3,
          ),
        );
      }
    }),
  );
  const group = new THREE.Group();
  group.name = "projected-landscapes";
  const slots: Slot[] = Array.from({ length: 4 }, () => {
    const materials = {
      mountain: [retroMountainMaterial(), retroMountainMaterial()],
      fin: [
        projectionMaterial({ fin: true }),
        projectionMaterial({ fin: true }),
      ],
    };
    const near = new THREE.Mesh(
        assets.get("retro_range_near.glb"),
        materials.mountain[0],
      ),
      far = new THREE.Mesh(
        assets.get("retro_range_far.glb"),
        materials.mountain[1],
      );
    near.frustumCulled = far.frustumCulled = false;
    near.visible = far.visible = false;
    group.add(near, far);
    return {
      anchor: null,
      near,
      far,
      gain: 0,
      lod: 0,
      box: new THREE.Box3(),
      materials,
    };
  });
  const masks = Array.from({ length: 4 }, () => new THREE.Vector4()),
    params = Array.from({ length: 4 }, () => new THREE.Vector2());
  let sectionId = "",
    serial = 0,
    travel = 0,
    nextTravel = 0,
    last: { x: number; z: number } | null = null,
    rejected = 0,
    spawned = 0,
    activeGain = 0;
  const frustum = new THREE.Frustum(),
    matrix = new THREE.Matrix4();
  const sectionAt = (t: number) =>
    score.sections.find((s) => t >= s.start && t < s.end);
  function setup(slot: Slot, a: Anchor) {
    const fin = a.asset === "folded_light_fin",
      near = assets.get(fin ? "folded_light_fin.glb" : a.asset + "_near.glb")!,
      far = assets.get(fin ? "folded_light_fin.glb" : a.asset + "_far.glb")!;
    slot.anchor = { ...a };
    slot.near.geometry = near;
    slot.far.geometry = far;
    for (const [i, mesh] of [slot.near, slot.far].entries()) {
      mesh.material = fin ? slot.materials.fin[i] : slot.materials.mountain[i];
      mesh.position.set(a.x, a.y, a.z);
      mesh.rotation.set(0, a.angle, 0);
      mesh.scale.setScalar(a.scale);
      mesh.updateMatrixWorld();
      const material = mesh.material as THREE.ShaderMaterial;
      material.side = fin ? THREE.DoubleSide : THREE.FrontSide;
      material.forceSinglePass = true;
      material.needsUpdate = true;
    }
    slot.box.setFromObject(slot.near);
  }
  function spawn(
    s: Section,
    t: number,
    flight: ReturnType<typeof createFlight>,
    camera: THREE.PerspectiveCamera,
  ) {
    const active = slots.filter((p) => p.gain > 1e-8);
    if (
      active.some((p) => p.anchor?.section !== s.id) ||
      active.length >= s.max_objects
    )
      return;
    const free = slots
      .filter((p) => p.gain < 1e-8)
      .slice(0, s.family === "fin" ? s.max_objects - active.length : 1);
    if (!free.length) return;
    const path = flight.forecastPath(1, 8),
      future = path.at(-1)!,
      pose = flight.pose(),
      side = serial % 2 === 0 ? -1 : 1;
    const dir = { x: Math.sin(future.yaw), z: -Math.cos(future.yaw) },
      right = { x: Math.cos(future.yaw), z: Math.sin(future.yaw) };
    const distance = Math.hypot(future.x - pose.x, future.z - pose.z),
      ahead = Math.max(200, 540 - distance);
    for (let i = 0; i < free.length; i++) {
      const entry = index.files.find(
        (e) =>
          e.path ===
          (s.family === "fin" ? "folded_light_fin.glb" : s.asset + "_near.glb"),
      )!;
      const radius = boundsRadius(entry.bounds.min, entry.bounds.max, s.scale),
        n = serial++;
      // Portrait keeps a readable portion in its narrow lens; full proximity fade
      // protects unexpected steering, including future turns into the landmark.
      const lateral =
        s.family === "fin"
          ? (i % 2 === 0 ? -1 : 1) *
            ((camera.aspect < 0.8 ? 9 : 24) +
              Math.floor(i / 2) * (camera.aspect < 0.8 ? 13 : 24))
          : side * (camera.aspect < 0.8 ? 4 : 18);
      const point = {
        x: future.x + dir.x * (ahead + i * 24) + right.x * lateral,
        z: future.z + dir.z * (ahead + i * 24) + right.z * lateral,
      };
      if (!safeToPlace(point, radius, path, 72)) {
        rejected++;
        continue;
      }
      setup(free[i], {
        id: `${s.id}:${n}`,
        section: s.id,
        asset: s.asset,
        ...point,
        y: -4,
        angle: -future.yaw + (s.family === "fin" ? -0.18 : 0.22) * side,
        scale: s.scale,
        radius,
        born: t,
        index: n,
      });
      spawned++;
    }
  }
  function update(
    arrangement: Arrangement,
    camera: THREE.PerspectiveCamera,
    flight: ReturnType<typeof createFlight>,
    dpr = 1,
  ) {
    const t = arrangement.seconds,
      s = sectionAt(t),
      pose = flight.pose();
    if (last) travel += Math.hypot(pose.x - last.x, pose.z - last.z);
    last = { x: pose.x, z: pose.z };
    if ((s?.id ?? "") !== sectionId) {
      sectionId = s?.id ?? "";
      nextTravel = travel;
    }
    // Existing visible slots leave only through their phrase/proximity envelope.
    // Incoming families cannot recycle one until its whole rendered gain is zero.
    for (const p of slots)
      if (p.anchor) {
        const a = p.anchor,
          section = score.sections.find((s) => s.id === a.section)!;
        const distance = Math.hypot(a.x - pose.x, a.z - pose.z);
        p.gain =
          envelope(t, section.start, section.end) *
          proximityGain(
            a,
            a.radius,
            pose,
            38,
            38 + Math.max(95, pose.sceneSpeed * pose.turbo * 1.25),
          ) *
          (1 - smooth((distance - 540) / 100)) *
          arrangement.reveal.exit;
      }
    if (s && t < s.end - 4 && travel >= nextTravel) {
      spawn(s, t, flight, camera);
      nextTravel = travel + s.repeat_distance;
    }
    frustum.setFromProjectionMatrix(
      matrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );
    activeGain = 0;
    slots.forEach((p, i) => {
      masks[i].set(0, 0, 1, 1);
      params[i].set(0, 0);
      const a = p.anchor;
      if (!a) {
        p.near.visible = p.far.visible = false;
        return;
      }
      const section = score.sections.find((s) => s.id === a.section)!,
        entry = index.files.find(
          (e) =>
            e.path ===
            (a.asset === "folded_light_fin"
              ? "folded_light_fin.glb"
              : a.asset + "_near.glb"),
        )!;
      const distance = Math.hypot(a.x - pose.x, a.z - pose.z),
        fin = a.asset === "folded_light_fin";
      const gap = distance - a.radius,
        proximity = proximityGain(
          a,
          a.radius,
          pose,
          38,
          38 + Math.max(95, pose.sceneSpeed * pose.turbo * 1.25),
        );
      const age = arrangement.reduced ? 4 : t - a.born;
      p.gain =
        envelope(t, section.start, section.end) *
        smooth(age / 2.2) *
        proximity *
        (1 - smooth((distance - 540) / 100)) *
        arrangement.reveal.exit;
      if (!frustum.intersectsBox(p.box)) p.gain = 0;
      const nearWeight = fin ? 1 : 1 - smooth((distance - 300) / 120);
      p.lod = nearWeight;
      for (const [mesh, weight] of [
        [p.near, nearWeight],
        [p.far, 1 - nearWeight],
      ] as const) {
        const u = (mesh.material as THREE.ShaderMaterial).uniforms;
        mesh.visible = p.gain * weight > 1e-5;
        // Exposure changes emitted light, never normalized visibility/masking.
        u.uGain.value = p.gain * weight * arrangement.brightness;
        u.uAge.value = t - section.start - a.index * 0.37;
        u.uFin.value = fin ? 1 : 0;
        u.uHeight.value = entry.bounds.max[1];
        u.uContourSpacing.value = fin ? 22 : 14;
        u.uBand.value = arrangement.reduced
          ? 0.55
          : 0.15 +
            0.75 *
              (0.5 -
                0.5 * Math.cos((t - section.start) * 0.65 + a.index * 0.7));
        u.uPulse.value = arrangement.reduced ? 0 : arrangement.music.accent;
        u.uFill.value = fin ? 0.025 : 0.006;
        if (!fin) {
          u.uLinePixels.value = 0.72 * dpr;
          u.uHaloPixels.value = 2.6 * dpr;
        }
        if (!fin)
          u.uFineGain.value =
            mesh === p.near ? smooth((nearWeight - 0.35) / 0.5) : 0;
        u.uColorA.value
          .copy(arrangement.colours[0])
          .lerp(new THREE.Color(1, 1, 1), 0.5);
        u.uColorB.value
          .copy(arrangement.colours[1])
          .lerp(new THREE.Color(1, 1, 1), 0.24);
      }
      if (p.gain > 0) {
        if (gap < 38 - 1e-7)
          throw Error("Visible landscape inside protected eye support");
        activeGain = Math.max(activeGain, p.gain);
        const width = (entry.bounds.max[0] - entry.bounds.min[0]) * a.scale,
          depth = (entry.bounds.max[2] - entry.bounds.min[2]) * a.scale;
        masks[i].set(a.x, a.z, width * 1.25, depth * 1.25);
        params[i].set(a.angle, p.gain * section.floor_dim_max);
      }
    });
  }
  function reset() {
    slots.forEach((p) => {
      p.anchor = null;
      p.gain = 0;
      p.near.visible = p.far.visible = false;
    });
    sectionId = "";
    serial = travel = nextTravel = rejected = spawned = activeGain = 0;
    last = null;
    masks.forEach((b) => b.set(0, 0, 1, 1));
    params.forEach((p) => p.set(0, 0));
  }
  function snapshot() {
    return {
      anchors: slots.map((s) => (s.anchor ? { ...s.anchor } : null)),
      sectionId,
      serial,
      travel,
      nextTravel,
      last: last ? { ...last } : null,
      rejected,
      spawned,
    };
  }
  return {
    group,
    update,
    reset,
    snapshot,
    restore(s: ReturnType<typeof snapshot>) {
      reset();
      sectionId = s.sectionId;
      serial = s.serial;
      travel = s.travel;
      nextTravel = s.nextTravel;
      last = s.last;
      rejected = s.rejected;
      spawned = s.spawned;
      s.anchors.forEach((a, i) => {
        if (a) setup(slots[i], a);
      });
    },
    floorMasks: () => ({ bounds: masks, parameters: params }),
    actorGain: () => 1 - activeGain * 0.95,
    diagnostics: () => ({
      section: sectionId,
      activeGain,
      rejected,
      spawned,
      active: slots
        .filter((s) => s.gain > 1e-5)
        .map((s) => ({
          anchor: s.anchor,
          gain: s.gain,
          lod: s.lod,
          near: s.near.visible,
          far: s.far.visible,
        })),
      scheduled: slots.map((s) => (s.anchor ? { ...s.anchor } : null)),
      floorMasks: masks.map((b, i) => ({
        bounds: b.toArray(),
        parameters: params[i].toArray(),
      })),
      familyLimit:
        score.sections.find((s) => s.id === sectionId)?.max_objects ?? 0,
      depthTest: true,
      depthWrite: false,
    }),
    async prewarm(compile: () => Promise<unknown>) {
      const saved = slots.map((s) => ({
        geometry: s.near.geometry,
        farGeometry: s.far.geometry,
        material: s.near.material,
        farMaterial: s.far.material,
        visible: s.near.visible,
        farVisible: s.far.visible,
      }));
      try {
        for (const s of slots) {
          s.near.visible = s.far.visible = true;
          s.near.geometry = s.far.geometry = assets.get(
            "folded_light_fin.glb",
          )!;
          s.near.material = s.materials.fin[0];
          s.far.material = s.materials.fin[1];
        }
        await compile();
      } finally {
        slots.forEach((s, i) => {
          Object.assign(s.near, {
            geometry: saved[i].geometry,
            material: saved[i].material,
            visible: saved[i].visible,
          });
          Object.assign(s.far, {
            geometry: saved[i].farGeometry,
            material: saved[i].farMaterial,
            visible: saved[i].farVisible,
          });
        });
      }
    },
    dispose() {
      assets.forEach((g) => g.dispose());
      slots.forEach((s) => {
        [...s.materials.mountain, ...s.materials.fin].forEach((m) =>
          m.dispose(),
        );
      });
    },
  };
}
