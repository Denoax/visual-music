import * as THREE from "three";
import { decorationFronts } from "../show/drivers";
import cadences from "../../show/cadence-cues.json";
import {
  hash32,
  smooth5,
  chunkAt,
  exchangeGate,
} from "../../core/chunk-wave-exchange.mjs";
import {
  crossedBeamGeometry,
  scatterOffset,
} from "../../core/microcue-effects.mjs";
import type { Terrain } from "./terrain";
import type { Arrangement } from "../show/arrangement";
import type { Front } from "../show/waves";

/** Bounded musical actors in the existing post-softness, terrain-depth stage.
 * Immutable phrase anchors; all poses and lifetimes derive from song time. */
export function createLyricalActors(
  gl: WebGL2RenderingContext | WebGLRenderingContext,
) {
  const group = new THREE.Group(),
    capacity = 192;
  const positions = new Float32Array(capacity * 3),
    colours = new Float32Array(capacity * 3),
    data = new Float32Array(capacity * 2);
  const geometry = new THREE.BufferGeometry()
    .setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    )
    .setAttribute(
      "colour",
      new THREE.BufferAttribute(colours, 3).setUsage(THREE.DynamicDrawUsage),
    )
    .setAttribute(
      "data",
      new THREE.BufferAttribute(data, 2).setUsage(THREE.DynamicDrawUsage),
    );
  const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
  const uniforms = {
    projection: { value: 1 },
    limit: { value: range[1] },
    eye: { value: new THREE.Vector3() },
    gain: { value: 0 },
  };
  const pointMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `attribute vec3 colour;attribute vec2 data;uniform float projection,limit,gain;uniform vec3 eye;varying vec3 vColour;varying float vFade;
  void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;float natural=2.*data.x*projection/max(.1,-p.z);gl_PointSize=clamp(natural,1.,limit);vColour=colour;vFade=data.y*gain*smoothstep(1.2,4.,-p.z)*(1.-smoothstep(230.,300.,distance(position,eye)))*smoothstep(.8,1.8,natural)*step(1.,natural);}`,
    fragmentShader: `varying vec3 vColour;varying float vFade;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>=1.||vFade<.0001)discard;float profile=exp(-r*r*5.)+.10*exp(-r*r*2.)*(1.-smoothstep(.65,1.,r));gl_FragColor=vec4(vColour*profile,vFade);}`,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, pointMaterial);
  points.name = "musical-light-points";
  points.frustumCulled = false;
  group.add(points);
  const softMaterial = () =>
    new THREE.ShaderMaterial({
      uniforms: {
        gain: { value: 0 },
        colour: { value: new THREE.Color(1, 1, 1) },
      },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float gain;uniform vec3 colour;varying vec2 vUv;void main(){float u=vUv.x*2.-1.,v=vUv.y;float profile=exp(-u*u*5.)*smoothstep(0.,.06,v)*(1.-smoothstep(.72,1.,v));if(abs(u)>=1.||profile*gain<.0001)discard;gl_FragColor=vec4(colour,profile*gain);}`,
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  const beam = crossedBeamGeometry();
  const beamGeometry = new THREE.BufferGeometry()
    .setAttribute("position", new THREE.BufferAttribute(beam.vertices, 3))
    .setAttribute("uv", new THREE.BufferAttribute(beam.uv, 2));
  const beams = Array.from({ length: 8 }, () => {
    const m = new THREE.Mesh(beamGeometry, softMaterial());
    m.name = "crossed-beam";
    m.visible = false;
    group.add(m);
    return m;
  });
  const ribbonPositions = new Float32Array(65 * 2 * 3),
    ribbonUv = new Float32Array(65 * 2 * 2),
    indices = [];
  for (let i = 0; i <= 64; i++) {
    ribbonUv.set([0, i / 64, 1, i / 64], i * 4);
    if (i < 64)
      indices.push(
        i * 2,
        i * 2 + 1,
        i * 2 + 2,
        i * 2 + 1,
        i * 2 + 3,
        i * 2 + 2,
      );
  }
  const ribbonGeo = new THREE.BufferGeometry()
    .setAttribute(
      "position",
      new THREE.BufferAttribute(ribbonPositions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    )
    .setAttribute("uv", new THREE.BufferAttribute(ribbonUv, 2))
    .setIndex(indices);
  const ribbon = new THREE.Mesh(ribbonGeo, softMaterial());
  ribbon.name = "musical-ribbon";
  ribbon.frustumCulled = false;
  group.add(ribbon);
  const anchors = new Map<number, { x: number; z: number }>();
  const borrow = new THREE.Vector4();
  let count = 0,
    beamCount = 0,
    minGap = Infinity,
    activeFamily = "none";
  function point(
    x: number,
    y: number,
    z: number,
    radius: number,
    alpha: number,
    col: THREE.Color,
    terrain: Terrain,
  ) {
    if (count >= capacity || alpha <= 0) return;
    // Entire possible sprite halo clears current triangles, including rising old hills.
    const ceiling = terrain.ceiling({ x, z }, { x, z }, radius),
      safeY = Math.max(y, ceiling + radius + 0.25);
    minGap = Math.min(minGap, safeY - ceiling - radius);
    positions.set([x, safeY, z], count * 3);
    colours.set(col.toArray(), count * 3);
    data.set([radius, alpha], count * 2);
    count++;
  }
  function update(
    score: Arrangement,
    camera: THREE.PerspectiveCamera,
    terrain: Terrain,
    fronts: readonly Front[],
    height: number,
    dpr: number,
    presence = 1,
  ) {
    const t = score.seconds,
      s = score.lighting,
      start = s.sectionStart + Math.floor((t - s.sectionStart) / 6) * 6,
      end = Math.min(start + 6, s.sectionEnd);
    let a = anchors.get(start);
    if (!a) {
      // Introduce a musical group into the travelled world once. Its source
      // remains a canonical LED anchor after a turn; it never follows the camera.
      const direction = camera.getWorldDirection(new THREE.Vector3());
      const distance = Math.hypot(direction.x, direction.z) || 1;
      a = {
        x:
          Math.round((camera.position.x + (direction.x / distance) * 60) / 3) *
          3,
        z:
          Math.round((camera.position.z + (direction.z / distance) * 60) / 3) *
          3,
      };
      anchors.set(start, a);
    }
    const q = Math.min(1, Math.max(0, (t - start) / (end - start))),
      life = smooth5((t - start) / 1.3) * (1 - smooth5((t - end + 1.8) / 1.8));
    const gain =
      score.reveal.stars *
      score.brightness *
      presence *
      (score.reduced ? 0.35 : 1);
    uniforms.projection.value =
      (height * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    uniforms.limit.value = Math.min(range[1], 30 * dpr);
    uniforms.eye.value.copy(camera.position);
    uniforms.gain.value = gain;
    count = beamCount = 0;
    minGap = Infinity;
    activeFamily = s.actor;
    borrow.set(a.x, a.z, start, 0);
    group.visible = !score.reduced;
    beams.forEach((b) => (b.visible = false));
    ribbon.visible = false;
    const col = score.colours[0].clone().lerp(new THREE.Color(1, 1, 1), 0.12);
    if (s.actor === "gather") {
      const transfer = 16 * q * q * (1 - q) * (1 - q);
      borrow.w = transfer * presence;
      let source = 0;
      for (let ix = -6; ix <= 6; ix++)
        for (let iz = -6; iz <= 6; iz++) {
          const x = a.x + ix * 3,
            z = a.z + iz * 3,
            idX = Math.round(x / 3),
            idZ = Math.round(z / 3);
          if (
            Math.hypot(x - a.x, z - a.z) > 16 ||
            hash32(idX, idZ, 71) % 3 !== 0 ||
            chunkAt(x, z).base === 0
          )
            continue;
          const theta = source++ * 2.39996323;
          const offset = scatterOffset(source, q, { radius: 4, height: 3 });
          const px = x + (a.x + Math.cos(theta) * 5 - x) * transfer + offset[0],
            pz = z + (a.z + Math.sin(theta) * 5 - z) * transfer + offset[2];
          const y = terrain.height(px, pz) + 0.6 + 5 * transfer + offset[1];
          point(
            px,
            y,
            pz,
            0.32,
            transfer * 0.85 * exchangeGate(x, z, decorationFronts(fronts), t),
            col,
            terrain,
          );
        }
    }
    if (s.actor === "echoes") {
      for (const f of fronts.slice(-3)) {
        const age = t - f.time;
        if (age < 0 || age > 4.8) continue;
        const e = smooth5(age / 0.6) * (1 - smooth5((age - 3.2) / 1.6));
        for (let i = 0; i < 3; i++) {
          const theta = (hash32(f.id, i, 3) / 4294967296) * Math.PI * 2,
            x = f.x + Math.cos(theta) * 4,
            z = f.z + Math.sin(theta) * 4;
          point(
            x,
            terrain.height(x, z) + 0.7 + age * 1.6,
            z,
            0.34 + 0.1 * Math.sin(age),
            e * life * 0.42,
            col,
            terrain,
          );
        }
      }
    }
    if (s.actor === "ribbon") {
      ribbon.visible = life > 0;
      // Mixed harmonic proxy: a musical voice-like gesture, NOT verified vocal data.
      const breath = 0.3 + 0.7 * score.micro[5],
        flow = t - start;
      const path = Array.from({ length: 65 }, (_, i) => {
        const u = i / 64;
        return {
          x: a.x + (u - 0.5) * 28,
          z: a.z - 5 - Math.sin(u * 5 + flow * 0.35) * 5,
          width: 0.18 * Math.sin(Math.PI * u) * (0.7 + 0.3 * breath),
          rise: 0.7 + Math.sin(u * 4 + flow * 0.6) ** 2 * (2 + 3 * breath),
        };
      });
      const ceilings = path
        .slice(1)
        .map((p, i) =>
          terrain.ceiling(path[i], p, Math.max(path[i].width, p.width) + 0.04),
        );
      for (let i = 0; i <= 64; i++) {
        const p = path[i],
          y =
            Math.max(ceilings[Math.max(0, i - 1)], ceilings[Math.min(63, i)]) +
            p.rise;
        ribbonPositions.set(
          [p.x - p.width, y, p.z, p.x + p.width, y, p.z],
          i * 6,
        );
        minGap = Math.min(minGap, p.rise);
      }
      ribbonGeo.attributes.position.needsUpdate = true;
      const material = ribbon.material as THREE.ShaderMaterial;
      material.uniforms.colour.value.copy(col);
      material.uniforms.gain.value = life * gain * 0.55;
      for (let i = 0; i < 8; i++) {
        const u = i / 7,
          x = a.x + (u - 0.5) * 28,
          z = a.z - 5 - Math.sin(u * 5 + flow * 0.35) * 5;
        point(
          x,
          terrain.height(x, z) + 3 + Math.sin(u * 4 + flow * 0.6) ** 2 * 3,
          z,
          0.12,
          life * breath * 0.45,
          col,
          terrain,
        );
      }
    }
    if (s.actor === "beams") {
      const selected = fronts.filter(
        (f) =>
          t > f.time &&
          t - f.time < 5.6 &&
          f.id % (camera.aspect < 0.8 ? 4 : 2) === 0,
      );
      for (let i = 0; i < selected.length; i++) {
        const f = selected[i];
        const x = Math.round((f.x + (f.id % 2 ? 16 : -16)) / 3) * 3,
          z = Math.round((f.z - Math.floor((f.id % 8) / 2) * 12) / 3) * 3,
          b = beams[i];
        b.position.set(x, terrain.height(x, z) + 0.08, z);
        b.rotation.set(
          0.1 * Math.sin(t * 0.14 + f.id),
          0,
          0.14 * Math.cos(t * 0.17 + f.id),
        );
        b.visible = true;
        const material = b.material as THREE.ShaderMaterial;
        material.uniforms.colour.value.copy(score.colours[i % 2]);
        material.uniforms.gain.value =
          life *
          gain *
          (0.045 + 0.025 * score.micro[2]) *
          smooth5((t - f.time) / 0.3) *
          (1 - smooth5((t - f.time - 4.2) / 1.4)) *
          smooth5(
            (Math.hypot(x - camera.position.x, z - camera.position.z) - 12) /
              18,
          );
        beamCount++;
      }
    }
    // Seven isolated measured cadence candidates; never one burst per detected attack.
    for (const cue of cadences.events) {
      const accent = cue.seconds;
      const age = t - accent;
      if (age < 0 || age > 1.4) continue;
      let burstAnchor = anchors.get(-accent);
      if (!burstAnchor) {
        const f = [...fronts].reverse().find((f) => f.time <= accent);
        if (!f) continue;
        burstAnchor = { x: f.x, z: f.z };
        anchors.set(-accent, burstAnchor);
      }
      const f = burstAnchor;
      for (let i = 0; i < 12; i++) {
        const theta =
            (hash32(i, Math.round(accent * 100), 42) / 4294967296) *
            Math.PI *
            2,
          r = age * (2 + (i % 3));
        point(
          f.x + Math.cos(theta) * r,
          terrain.height(f.x, f.z) + 1 + age * 3 - age * age,
          f.z + Math.sin(theta) * r,
          0.09,
          (1 - smooth5(age / 1.4)) * 0.55,
          col,
          terrain,
        );
      }
    }
    if (score.reduced) borrow.w = 0;
    geometry.setDrawRange(0, count);
    for (const name of ["position", "colour", "data"])
      geometry.attributes[name].needsUpdate = true;
    return borrow;
  }
  return {
    group,
    update,
    reset: () => anchors.clear(),
    snapshot: () => [...anchors.entries()],
    restore(saved: [number, { x: number; z: number }][]) {
      anchors.clear();
      saved.forEach(([k, v]) => anchors.set(k, v));
    },
    diagnostics: () => ({
      family: activeFamily,
      points: count,
      beams: beamCount,
      ribbon: ribbon.visible,
      minimumPointTerrainGap: Number.isFinite(minGap) ? minGap : null,
      depthTest: true,
      borrow: borrow.toArray(),
      semanticTiming: "mixed proxies; voice roles unassigned",
    }),
    dispose() {
      geometry.dispose();
      pointMaterial.dispose();
      beamGeometry.dispose();
      beams.forEach((b) => (b.material as THREE.Material).dispose());
      ribbonGeo.dispose();
      (ribbon.material as THREE.Material).dispose();
    },
  };
}
