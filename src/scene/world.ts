import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createTerrain } from "./terrain";
import { createSculptures, sculpturePosition } from "./sculptures";
import { createAtmosphere, createBursts } from "./atmosphere";
import { showUniforms } from "./materials";
import type { Score } from "../show/cues";
import type { ShowFrame } from "../show/choreography";
export type Quality = "high" | "low";
export async function createWorld(
  canvas: HTMLCanvasElement,
  score: Score,
  quality: Quality,
) {
  const low = quality === "low",
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: low ? "low-power" : "high-performance",
    });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(60, 1, 0.2, 800),
    uniforms = showUniforms();
  const terrain = createTerrain(uniforms, low),
    sculptures = createSculptures(uniforms, low),
    atmosphere = createAtmosphere(uniforms, low),
    bursts = createBursts(uniforms, score.events);
  scene.add(terrain, sculptures.group, atmosphere.group, bursts.points);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.65, 0.48, 0.68);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const lossExtension = renderer
    .getContext()
    .getExtension("WEBGL_lose_context");
  const sphere = new THREE.Sphere(),
    raycaster = new THREE.Raycaster(),
    point = new THREE.Vector3();
  function resize() {
    const width = innerWidth,
      height = innerHeight,
      dpr = Math.min(devicePixelRatio, low ? 1.25 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value = dpr;
  }
  resize();
  await renderer.compileAsync(scene, camera);
  function render(
    frame: ShowFrame,
    pointer: { x: number; y: number },
    reduced: boolean,
  ) {
    camera.position.fromArray(frame.position);
    camera.position.x += pointer.x * (reduced ? 0.25 : 1.9);
    camera.position.y += pointer.y * (reduced ? 0.1 : 0.7);
    camera.lookAt(
      new THREE.Vector3(...frame.target).add(
        new THREE.Vector3(
          pointer.x * (reduced ? 0.4 : 3.5),
          pointer.y * (reduced ? 0.15 : 1.6),
          0,
        ),
      ),
    );
    camera.fov = frame.fov;
    camera.updateProjectionMatrix();
    uniforms.uEye.value.copy(camera.position);
    uniforms.uTime.value = frame.seconds;
    uniforms.uDensity.value = frame.density;
    uniforms.uMorph.value = frame.morph;
    uniforms.uGroupPulse.value.fromArray(frame.groupPulse);
    uniforms.uRelease.value = frame.release;
    uniforms.uRibbons.value = frame.ribbons;
    uniforms.uBeams.value = frame.beams;
    uniforms.uPalette.value = frame.palette;
    uniforms.uBrightness.value = frame.brightness;
    uniforms.uAccent.value = frame.accent;
    uniforms.uLow.value = frame.features.low;
    uniforms.uHigh.value = frame.features.high;
    uniforms.uWaveAge.value = frame.wave
      ? frame.seconds - frame.wave.seconds
      : -1;
    if (frame.wave)
      uniforms.uWaveOrigin.value.set(frame.wave.params.x, frame.wave.params.z);
    uniforms.uRestrained.value = reduced ? 1 : 0;
    bloom.strength = reduced ? 0.42 : 0.65;
    const nearby = sculptures.sculptures
      .slice(0, 10)
      .sort(
        (a, b) =>
          Math.abs(a.center[2] - frame.position[2]) -
          Math.abs(b.center[2] - frame.position[2]),
      );
    nearby
      .slice(0, 6)
      .forEach((s, i) =>
        uniforms.uPools.value[i].set(
          s.center[0],
          s.seed + s.group * 0.7,
          s.center[2],
          s.radius,
        ),
      );
    atmosphere.update(frame, reduced);
    bursts.update(frame.seconds, reduced);
    renderer.info.autoReset = false;
    renderer.info.reset();
    composer.render();
  }
  function tap(x: number, y: number, frame: ShowFrame) {
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    let nearest = Infinity,
      selected = -1;
    sculptures.sculptures.forEach((s, i) => {
      sphere.center.fromArray(sculpturePosition(s, frame));
      sphere.radius = s.radius;
      const hit = raycaster.ray.intersectSphere(sphere, point);
      if (hit) {
        const d = point.distanceTo(camera.position);
        if (d < nearest) {
          nearest = d;
          selected = i;
        }
      }
    });
    if (selected < 0) return false;
    bursts.add({
      seconds: frame.seconds,
      seed: 8801 + selected * 37,
      position: sculpturePosition(sculptures.sculptures[selected], frame),
    });
    return true;
  }
  function dispose() {
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.dispose();
      }
    });
    for (const pass of composer.passes) pass.dispose();
    composer.dispose();
    renderer.dispose();
  }
  function diagnostics() {
    const gl = renderer.getContext(),
      ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      quality,
      dpr: renderer.getPixelRatio(),
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      points: renderer.info.render.points,
      renderer: ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
    };
  }
  return {
    restoreContext: () => lossExtension?.restoreContext(),
    render,
    resize,
    tap,
    resetInteractions: bursts.reset,
    dispose,
    diagnostics,
    renderer,
  };
}
