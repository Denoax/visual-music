import { formationFor } from "../../core/wave-formations.mjs";
import {
  pointFragment,
  capFragment,
  groundFragmentMain,
} from "./field-adapter-snippets.mjs";
import { surfaceHeightGLSL, presentedHeightGLSL } from "./post-surface";
import * as THREE from "three";
import { decorationFronts } from "../show/drivers";
import { WAVE, type WaveState } from "../show/waves";
import { triangleHeightGLSL } from "./terrain";
import type { Arrangement } from "../show/arrangement";
import {
  FLOOR,
  floorLightGLSL,
  floorSurfaceGLSL,
  paletteLut,
} from "../show/floor";
import { emitterGLSL } from "../../core/beauty.mjs";
import type { Paint } from "../show/paint";
import { bulbCapGeometry } from "../../core/led-floor.mjs";

const NX = 448,
  NZ = 448;
const FINE_CAPACITY = 65536;
export function fixtureGeometry() {
  const cap = bulbCapGeometry({ sides: 16 });
  // Each radial wedge is bounded by the actual grid axes/diagonals. For
  // nested 3/1.5m centers the whole displaced face shares one terrain plane.
  const positions = [...cap.positions],
    normals = [...cap.normals],
    indices = [...cap.indices];
  const start = positions.length / 3;
  for (const y of [0, 0.055])
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      positions.push(0.39 * Math.cos(a), y, 0.39 * Math.sin(a));
      normals.push(Math.cos(a), 0, Math.sin(a));
    }
  for (let i = 0; i < 16; i++) {
    const a = start + i,
      b = start + ((i + 1) % 16),
      c = a + 16,
      d = b + 16;
    indices.push(a, c, b, b, c, d);
  }
  return new THREE.BufferGeometry()
    .setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    .setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))
    .setIndex(indices);
}
const lightDense = (score: Arrangement) => score.lighting.dense;
export function createField(
  gl?: WebGLRenderingContext | WebGL2RenderingContext,
) {
  const pointLimit = gl ? gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] : 80;
  const group = new THREE.Group();
  group.name = "neon-floor";
  const positions = new Float32Array(NX * NZ * 3);
  for (let z = 0; z < NZ; z++)
    for (let x = 0; x < NX; x++) {
      const i = (z * NX + x) * 3;
      positions[i] = (x - NX / 2) * 3;
      positions[i + 2] = (z - NZ / 2) * 3;
    }
  const geometry = new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );
  const grid = geometry.clone(),
    indices: number[] = [];
  for (let z = 0; z < NZ - 1; z++)
    for (let x = 0; x < NX - 1; x++) {
      const a = z * NX + x,
        b = a + 1,
        c = a + NX,
        d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  grid.setIndex(indices);
  const lut = paletteLut();
  const paletteTexture = new THREE.DataTexture(
    lut.bytes,
    lut.width,
    lut.height,
    THREE.RGBAFormat,
  );
  paletteTexture.magFilter = paletteTexture.minFilter = THREE.LinearFilter;
  paletteTexture.colorSpace = THREE.NoColorSpace;
  paletteTexture.needsUpdate = true;
  const uniforms = {
    uTime: { value: 0 },
    uSurfaceTime: { value: 0 },
    uEndBlend: { value: 0 },
    uIdleSeconds: { value: 0 },
    uReducedSurface: { value: 0 },
    uVisualPhase: { value: new THREE.Vector4() },
    uBase: { value: 1 },
    uRing: { value: 2.5 },
    uMotion: { value: 1 },
    uFronts: {
      value: Array.from(
        { length: WAVE.capacity },
        () => new THREE.Vector4(0, 0, -1000, 0),
      ),
    },
    uFrontForms: {
      value: Array.from(
        { length: WAVE.capacity },
        () => new THREE.Vector4(0, 1, 0, 0),
      ),
    },
    uLocalForms: {
      value: [new THREE.Vector4(0, 1, 0, 0), new THREE.Vector4(0, 1, 0, 0)],
    },
    uOffset: { value: new THREE.Vector2() },
    uCameraXZ: { value: new THREE.Vector2() },
    uNear: { value: new THREE.Vector2(13, 22) },
    uDetailCenter: { value: new THREE.Vector2() },
    uView: { value: new THREE.Matrix4() },
    uFineEnabled: { value: 0 },
    uTerrainVisible: { value: 0 },
    uProjection: { value: 900 },
    uPixelRatio: { value: 1 },
    uPointLimit: { value: pointLimit },
    uPassage: { value: new THREE.Vector3(0, 0, 5.4) },
    uRecipe: { value: new THREE.Vector4() },
    uLighting: { value: new THREE.Vector4() },
    uFlow: { value: new THREE.Vector3() },
    uChapter: { value: new THREE.Vector4() },
    uLocalFronts: {
      value: [
        new THREE.Vector4(0, 0, -1000, 0),
        new THREE.Vector4(0, 0, -1000, 0),
      ],
    },
    uLocalIds: { value: new Int32Array(2) },
    uPaint: {
      value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, -1000, 0)),
    },
    uMicro: { value: new THREE.Vector3() },
    uStructureBounds: {
      value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 1, 1)),
    },
    uStructureParams: {
      value: Array.from({ length: 4 }, () => new THREE.Vector2()),
    },
    uBorrow: { value: new THREE.Vector4() },
    uDensityThreshold: { value: 0 },
    uBrightness: { value: 0 },
    uLow: { value: 0 },
    uAccent: { value: 0 },
    uReduced: { value: 0 },
    uGroundGain: { value: 0 },
    uHorizonGain: { value: 0 },
    uHorizonAzimuth: { value: 0 },
    uFine: { value: new THREE.Vector3(30, 45, 0) },
    uPalette: { value: paletteTexture },
  };
  const fades = `uniform vec2 uCameraXZ,uNear,uDetailCenter;uniform vec3 uFine;uniform mat4 uView;uniform float uProjection,uPixelRatio,uFineEnabled,uTerrainVisible;
  float nearWeight(vec2 p){return uTerrainVisible*(1.-smoothstep(uNear.x,uNear.y,distance(p,uDetailCenter)));}
  float fineWeight(vec2 p){vec4 v=uView*vec4(p.x,renderVertexHeight(p),p.y,1.);float pixels=.678*uProjection/max(.1,-v.z)/uPixelRatio;return uFineEnabled*smoothstep(3.5,5.,pixels);}`;
  const pointMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `${surfaceHeightGLSL}${presentedHeightGLSL}${triangleHeightGLSL}${floorLightGLSL}${fades}
    uniform vec2 uOffset;uniform float uPointLimit;varying vec3 vColour;varying float vFade,vLod;
    void main(){vec2 p=position.xz+(position.y>.5?vec2(0.):uOffset);vec4 view=modelViewMatrix*vec4(p.x,triangleHeight(p)+.16,p.y,1.);gl_Position=projectionMatrix*view;vColour=floorLight(p).emission;float depth=-view.z;
    vLod=1.-nearWeight(p);vFade=(1.-smoothstep(520.,600.,distance(p,uCameraXZ)))*smoothstep(.65,3.2,depth)*(position.y>.5?fineWeight(p):1.);
    float size=2.26*uProjection/max(depth,.1);vFade*=smoothstep(.5*uPixelRatio,1.5*uPixelRatio,size*.30);gl_PointSize=clamp(size,1.,min(uPointLimit,80.*uPixelRatio));}`,
    fragmentShader: pointFragment,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, pointMaterial);
  points.frustumCulled = false;
  points.renderOrder = 1;
  group.add(points);
  const fineGeometry = new THREE.BufferGeometry();
  const finePositions = new Float32Array(FINE_CAPACITY * 3);
  fineGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(finePositions, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  fineGeometry.setDrawRange(0, 0);
  const finePoints = new THREE.Points(fineGeometry, pointMaterial);
  finePoints.frustumCulled = false;
  finePoints.renderOrder = 1;
  group.add(finePoints);
  const groundMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `${surfaceHeightGLSL}${presentedHeightGLSL}uniform vec2 uOffset;uniform float uPointLimit;varying vec2 vWorld;varying vec3 vSurfaceWorld;void main(){vWorld=position.xz+uOffset;vec4 surface=vec4(vWorld.x,renderVertexHeight(vWorld),vWorld.y,1.);vSurfaceWorld=(modelMatrix*surface).xyz;gl_Position=projectionMatrix*modelViewMatrix*surface;}`,
    fragmentShader: `${surfaceHeightGLSL}${presentedHeightGLSL}${floorLightGLSL}${floorSurfaceGLSL}${fades}${emitterGLSL}${groundFragmentMain}`,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(grid, groundMaterial);
  ground.frustumCulled = false;
  group.add(ground);
  const depthMaterial = groundMaterial.clone();
  depthMaterial.uniforms = uniforms;
  depthMaterial.colorWrite = false;
  depthMaterial.depthWrite = true;
  const depthMesh = new THREE.Mesh(grid, depthMaterial);
  depthMesh.frustumCulled = false;
  const capGeometry = new THREE.InstancedBufferGeometry().copy(
    fixtureGeometry() as THREE.InstancedBufferGeometry,
  );
  const centers = new Float32Array(FLOOR.desktopCaps * 3),
    members = new Float32Array(FLOOR.desktopCaps);
  capGeometry.setAttribute(
    "center",
    new THREE.InstancedBufferAttribute(centers, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  capGeometry.setAttribute(
    "fineMember",
    new THREE.InstancedBufferAttribute(members, 1).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  capGeometry.instanceCount = 0;
  const capMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `${surfaceHeightGLSL}${presentedHeightGLSL}${triangleHeightGLSL}${floorLightGLSL}${fades}attribute vec3 center;attribute float fineMember;varying vec3 vColour;varying float vFade,vShade,vBase,vCapRadius;
    void main(){vec2 p=center.xz+position.xz;vColour=floorLight(center.xz).emission;vFade=nearWeight(center.xz)*(fineMember>.5?fineWeight(center.xz):1.);vShade=.70+.30*max(0.,normal.y);vBase=step(.345,length(position.xz));vCapRadius=length(position.xz)/.345;gl_Position=projectionMatrix*modelViewMatrix*vec4(p.x,triangleHeight(p)+position.y+${FLOOR.mount},p.y,1.);}`,
    fragmentShader: capFragment,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const caps = new THREE.Mesh(capGeometry, capMaterial);
  caps.frustumCulled = false;
  caps.renderOrder = 1;
  group.add(caps);
  // Surface-bound glow footprints reuse canonical triangles, not billboards
  // sticking through crests. The shared terrain material owns broad ring spill.
  let fineCells: { x: number; z: number; id: string }[] = [],
    fineKey = "",
    nearCells: { x: number; z: number; fine: boolean }[] = [],
    active: Arrangement["lighting"] | null = null;
  function update(
    state: WaveState,
    camera: THREE.PerspectiveCamera,
    height: number,
    dpr: number,
    score: Arrangement,
    decoration: {
      paint: Paint;
      borrow: THREE.Vector4;
      micro: number[];
      structures?: { bounds: THREE.Vector4[]; parameters: THREE.Vector2[] };
    },
  ) {
    active = score.lighting;
    const u = uniforms;
    u.uTime.value = state.seconds;
    const visual = score.visual;
    u.uEndBlend.value = visual.blend;
    u.uIdleSeconds.value = ((visual.idleSeconds % 12) + 12) % 12;
    u.uSurfaceTime.value =
      state.seconds +
      (visual.phase === "song" ? 0 : Math.min(8, visual.blendAge));
    u.uReducedSurface.value = score.reduced ? 1 : 0;
    u.uVisualPhase.value.set(
      visual.blend,
      score.reduced ? 0 : ((visual.idleSeconds % 12) + 12) % 12,
      visual.phase === "song" ? 0 : visual.breath,
      visual.phase === "song" ? 0 : visual.hueMix,
    );
    for (let i = 0; i < WAVE.capacity; i++)
      u.uFrontForms.value[i].fromArray(
        formationFor(state.fronts[i]?.time ?? 0),
      );
    u.uHorizonGain.value = score.horizonGain;
    u.uHorizonAzimuth.value = score.horizonAzimuth;
    u.uBase.value = state.base;
    u.uRing.value = state.ring;
    u.uMotion.value = state.motion;
    u.uBrightness.value = score.reveal.core * score.brightness;
    u.uPassage.value.set(
      camera.position.x,
      camera.position.z,
      camera.position.y,
    );
    u.uOffset.value.set(
      Math.floor(camera.position.x / 3) * 3,
      Math.floor(camera.position.z / 3) * 3,
    );
    u.uCameraXZ.value.set(camera.position.x, camera.position.z);
    u.uView.value.copy(camera.matrixWorldInverse);
    u.uFineEnabled.value = lightDense(score);
    u.uGroundGain.value =
      score.reveal.core > 1e-6 ? score.reveal.ground / score.reveal.core : 0;
    u.uLow.value = score.music.low;
    u.uAccent.value = score.music.accent;
    u.uReduced.value = score.reduced ? 1 : 0;
    const light = score.lighting;
    u.uRecipe.value.set(light.kind, light.phase, light.handoff, light.axis);
    u.uLighting.value.set(
      light.family,
      light.paletteGain,
      light.scoreGain,
      light.density,
    );
    u.uDensityThreshold.value = Math.min(
      4294967295,
      Math.floor(light.density * 4294967296),
    );
    u.uFlow.value.set(light.angle, light.strips, light.rings);
    u.uChapter.value.set(
      light.previousKind,
      light.previousFamily,
      light.sectionStart,
      light.sectionEnd,
    );
    u.uMicro.value.set(
      decoration.micro[0],
      decoration.micro[5],
      decoration.micro[4],
    );
    u.uBorrow.value.copy(decoration.borrow);
    // No footprint can persist when the scene has no structure owner.
    u.uStructureBounds.value.forEach((b) => b.set(0, 0, 1, 1));
    u.uStructureParams.value.forEach((p) => p.set(0, 0));
    decoration.structures?.bounds.forEach((b, i) =>
      u.uStructureBounds.value[i].copy(b),
    );
    decoration.structures?.parameters.forEach((b, i) =>
      u.uStructureParams.value[i].copy(b),
    );
    const drivers = decorationFronts(state.fronts);
    for (let i = 0; i < 2; i++) {
      const f = drivers[i];
      u.uLocalFronts.value[i].set(
        f?.x ?? 0,
        f?.z ?? 0,
        f?.time ?? -1000,
        f?.strength ?? 0,
      );
      u.uLocalIds.value[i] = f?.id ?? -1;
      u.uLocalForms.value[i].fromArray(formationFor(f?.time ?? 0));
    }
    for (let i = 0; i < 8; i++) {
      const p = decoration.paint[i];
      u.uPaint.value[i].set(
        p?.x ?? 0,
        p?.z ?? 0,
        p?.time ?? -1000,
        p?.strength ?? 0,
      );
    }
    u.uProjection.value =
      (height * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    u.uPixelRatio.value = dpr;
    state.fronts.forEach((e, i) =>
      u.uFronts.value[i].set(e.x, e.z, e.time, e.strength),
    );
    for (let i = state.fronts.length; i < WAVE.capacity; i++)
      u.uFronts.value[i].set(0, 0, -1000, 0);
    const portrait = camera.aspect < 0.8,
      radius = portrait ? 16 : 22;
    u.uNear.value.set(portrait ? 9 : 13, radius);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      camera.quaternion,
    );
    const planar = new THREE.Vector2(forward.x, forward.z).normalize();
    const down = Math.asin(Math.max(-1, Math.min(1, -forward.y)));
    const bottom = down + THREE.MathUtils.degToRad(camera.fov / 2);
    const reach =
      Math.max(0, camera.position.y) / Math.max(0.1, Math.tan(bottom));
    // Bounded cap patch covers the first readable rows, not the invisible feet.
    u.uDetailCenter.value.set(
      Math.round((camera.position.x + planar.x * (reach + 12)) / 3) * 3,
      Math.round((camera.position.z + planar.y * (reach + 12)) / 3) * 3,
    );
    const frustum = new THREE.Frustum().setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );
    const fineDepth = (0.678 * u.uProjection.value) / (3.2 * dpr);
    const center = camera.position;
    const key = `${Math.floor(center.x / 3)},${Math.floor(center.z / 3)}:${camera.quaternion
      .toArray()
      .map((v) => v.toFixed(3))
      .join(",")}:${camera.fov.toFixed(1)}:${light.densePrepare}:${height}`;
    if (key !== fineKey) {
      fineKey = key;
      fineCells = [];
      if (light.densePrepare) {
        const span = Math.min(600, Math.ceil((fineDepth + 32) / 3) * 3);
        const xmin = Math.floor((center.x - span) / 1.5),
          xmax = Math.ceil((center.x + span) / 1.5),
          zmin = Math.floor((center.z - span) / 1.5),
          zmax = Math.ceil((center.z + span) / 1.5);
        for (let j = zmin; j <= zmax; j++)
          for (let i = xmin; i <= xmax; i++) {
            if (i % 2 === 0 && j % 2 === 0) continue;
            const x = i * 1.5,
              z = j * 1.5;
            if (Math.hypot(x - center.x, z - center.z) > 602) continue;
            const v = new THREE.Vector3(x, 0, z).applyMatrix4(
              camera.matrixWorldInverse,
            );
            if (-v.z > fineDepth + 16 || -v.z < -16) continue;
            // Conservative vertical +/-14m bounds, 3m lateral guard. Every
            // rendered triangle/fixture is inside, even at a rising crest.
            if (
              frustum.planes.some(
                (p) =>
                  p.normal.x * x +
                    p.normal.z * z +
                    p.constant +
                    Math.abs(p.normal.y) * 14 +
                    3 <
                  0,
              )
            )
              continue;
            fineCells.push({ x, z, id: `${i},${j}` });
          }
      }
      if (fineCells.length > FINE_CAPACITY)
        throw Error(`Projected dense capacity exceeded ${fineCells.length}`);
      fineCells.forEach((c, i) => finePositions.set([c.x, 1, c.z], i * 3));
      fineGeometry.setDrawRange(0, fineCells.length);
      fineGeometry.attributes.position.needsUpdate = true;
    }
    const detail = u.uDetailCenter.value;
    const ix = Math.floor(detail.x / 3),
      iz = Math.floor(detail.y / 3),
      span = Math.ceil(radius / 3);
    nearCells = [];
    for (let j = iz - span; j <= iz + span; j++)
      for (let i = ix - span; i <= ix + span; i++)
        if (Math.hypot(i * 3 - detail.x, j * 3 - detail.y) < radius)
          nearCells.push({ x: i * 3, z: j * 3, fine: false });
    // Allocate the complete local patch; a projected detail fade is shared by
    // caps, points and spill. Never gate points for a missing cap instance.
    if (light.densePrepare) {
      const span = Math.ceil(radius / 1.5);
      const ix = Math.floor(detail.x / 1.5),
        iz = Math.floor(detail.y / 1.5);
      for (let j = iz - span; j <= iz + span; j++)
        for (let i = ix - span; i <= ix + span; i++)
          if (
            !(i % 2 === 0 && j % 2 === 0) &&
            Math.hypot(i * 1.5 - detail.x, j * 1.5 - detail.y) < radius
          )
            nearCells.push({ x: i * 1.5, z: j * 1.5, fine: true });
    }
    if (nearCells.length > FLOOR.desktopCaps)
      throw Error(`Near LED budget exceeded: ${nearCells.length}`);
    nearCells.forEach((c, i) => {
      centers.set([c.x, 0, c.z], i * 3);
      members[i] = c.fine ? 1 : 0;
    });
    capGeometry.instanceCount = nearCells.length;
    capGeometry.attributes.center.needsUpdate = true;
    capGeometry.attributes.fineMember.needsUpdate = true;
  }
  return {
    group,
    depthMesh,
    setGroundVisible(value: boolean, gain = value ? 1 : 0) {
      ground.visible = depthMesh.visible = caps.visible = value;
      uniforms.uTerrainVisible.value = value ? gain : 0;
    },
    groundVisible: () => ground.visible,
    update,
    uniforms,
    pointCount: NX * NZ,
    diagnostics: () => ({
      surfaceGain: uniforms.uTerrainVisible.value,
      denseWeight: uniforms.uFineEnabled.value,
      nearCaps: nearCells.length,
      visualPhase: uniforms.uVisualPhase.value.toArray(),
      surfacePhase: {
        blend: uniforms.uEndBlend.value,
        time: uniforms.uSurfaceTime.value,
        idle: uniforms.uIdleSeconds.value,
        reduced: uniforms.uReducedSurface.value,
      },
      denseAdded: fineCells.length,
      lighting: active ? { ...active, palettes: undefined } : null,
      terrainSpacing: 3,
      densePitch: 1.5,
      capRadius: FLOOR.radius,
      capHeight: FLOOR.height,
      nearBand: uniforms.uNear.value.toArray(),
      detailCenter: uniforms.uDetailCenter.value.toArray(),
      footprint: [NX * 3, NZ * 3],
      fade: [520, 600],
      fineCapacity: FINE_CAPACITY,
      fineLod: "projected core 3.5–5 CSS px",
      groundVisible: ground.visible,
      pointLimit,
      depthTest: true,
      ground: "same displaced depth mesh",
      board: "canonical aligned world grid",
    }),
    audit: () => ({
      nearCells: nearCells.map((c) => ({ ...c })),
      fineCells: fineCells.map((c) => ({ ...c })),
      capPositions: Array.from(capGeometry.attributes.position.array),
      capIndices: Array.from(capGeometry.index!.array),
      lighting: active ? { ...active, palettes: undefined } : null,
    }),
    dispose() {
      [geometry, grid, fineGeometry, capGeometry].forEach((g) => g.dispose());
      [pointMaterial, groundMaterial, capMaterial].forEach((m) => m.dispose());
      paletteTexture.dispose();
      depthMaterial.dispose();
    },
  };
}
