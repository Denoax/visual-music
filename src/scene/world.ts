import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createCar } from "./car";
import { createVenue, loadMaterials } from "./venue";
import { createLights } from "./lights";
import { evaluateScene } from "../show/choreography";
import type { SectionId } from "../show/cues";
export async function createWorld(
  canvas: HTMLCanvasElement,
  onContextLoss: () => void,
) {
  const low = matchMedia("(max-width: 700px)").matches;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1.25 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b12);
  scene.fog = new THREE.FogExp2(0x111a26, 0.018);
  const camera = new THREE.PerspectiveCamera(
    43,
    innerWidth / innerHeight,
    0.04,
    140,
  );
  const materials = await loadMaterials();
  const hdr = await new RGBELoader().loadAsync(
    `${import.meta.env.BASE_URL}assets/textures/rooftop_night_1k.hdr`,
  );
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(hdr);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.25;
  hdr.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0x8899b4, 0x171a20, 0.65));
  const { car, freshener, brake } = createCar();
  scene.add(car);
  const { venue, windows, windowPositions, windowMaterial, frames, reflector } =
    createVenue(materials, low);
  scene.add(venue);
  const rig = createLights(low);
  scene.add(rig.group);
  const key = new THREE.SpotLight(0xbcd6f4, 165, 35, 0.58, 0.7, 1);
  key.position.set(-3, 8, 6);
  key.target.position.set(0, 0, 0);
  scene.add(key, key.target);
  for (const side of [-1, 1]) {
    const head = new THREE.SpotLight(0xffddb0, 45, 17, 0.25, 0.75, 1);
    head.position.set(-2.8, 0.83, side * 0.59);
    head.target.position.set(-14, 0, side * 0.8);
    scene.add(head, head.target);
  }
  const cursorSpot = new THREE.SpotLight(0xccdcec, 8, 40, 0.15, 1, 1.2);
  cursorSpot.position.set(-5, 9, 5);
  cursorSpot.target.position.set(0, 0, 0);
  scene.add(cursorSpot, cursorSpot.target);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    0.22,
    0.35,
    1.5,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let lost = false;
  const contextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    onContextLoss();
  };
  canvas.addEventListener("webglcontextlost", contextLost);
  const resize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  };
  addEventListener("resize", resize);
  const facadeMatrix = new THREE.Matrix4(),
    facadeQuaternion = new THREE.Quaternion(),
    facadePosition = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0),
    xAxis = new THREE.Vector3(1, 0, 0),
    one = new THREE.Vector3(1, 1, 1);
  const gagLight = new THREE.SpotLight(0xe2e7e9, 0, 15, 0.42, 0.65, 1);
  gagLight.position.set(6.2, 3.7, 0.5);
  gagLight.target.position.set(6.2, 0.35, -5.2);
  scene.add(gagLight, gagLight.target);
  const color = new THREE.Color(),
    warm = new THREE.Color(0xe4b67a),
    cold = new THREE.Color(0xb3c9dc),
    lime = new THREE.Color(0xcbf26d);
  const target = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    down = new THREE.Vector3(0, -1, 0);
  function render(
    id: SectionId,
    progress: number,
    time: number,
    intensity: number,
    reduced: boolean,
    pointer: { x: number; y: number },
  ) {
    if (lost) return;
    const pose = evaluateScene(
      id,
      progress,
      time,
      innerWidth < innerHeight,
      reduced,
    );
    camera.position.fromArray(pose.camera);
    camera.lookAt(target.fromArray(pose.target));
    freshener.rotation.z = pose.freshenerSwing;
    rig.ring.rotation.z = pose.ringRotation;
    rig.group.visible = pose.rig > 0.01;
    rig.ringLeds.visible = pose.rig > 0.08;
    rig.leds.visible = pose.rig > 0.05;
    rig.gag.visible = pose.gag > 0.01;
    rig.gag.scale.setScalar(Math.max(0.001, pose.gag));
    rig.glow.emissive.copy(cold).lerp(lime, pose.lime);
    rig.glow.emissiveIntensity = 0.6 + pose.rig * intensity * 1.2;
    // Constant rear-lamp red. No saturated-red pulse or full-screen strobe.
    brake.emissiveIntensity = 0.8;
    const unfold = Math.max(0, (pose.facade - 0.4) / 0.6);
    if (windowMaterial.userData.activation)
      windowMaterial.userData.activation.value = unfold;
    gagLight.intensity = pose.gag * 45;
    windowPositions.forEach(([x, y, z, r], i) => {
      const extension = unfold * (0.35 + 0.45 * Math.sin(i * 0.17));
      facadeQuaternion
        .setFromAxisAngle(yAxis, r)
        .multiply(
          new THREE.Quaternion().setFromAxisAngle(xAxis, -unfold * 0.28),
        );
      facadePosition.set(
        x + (r ? (x > 0 ? -extension : extension) : 0),
        y,
        z + (r ? 0 : extension),
      );
      facadeMatrix.compose(facadePosition, facadeQuaternion, one);
      frames.setMatrixAt(i, facadeMatrix);
      facadePosition.x += r ? (x > 0 ? -0.085 : 0.085) : 0;
      facadePosition.z += r ? 0 : 0.085;
      facadeMatrix.compose(facadePosition, facadeQuaternion, one);
      windows.setMatrixAt(i, facadeMatrix);
      const resting = i % 7 === 0 || i % 11 === 0;
      // Slow spatial chases: one cycle in 16 seconds, bounded between lit states.
      const wave = 0.72 + 0.28 * Math.sin(time * 0.39 + i * 0.34);
      color
        .copy(resting ? warm : cold)
        .lerp(lime, pose.lime)
        .multiplyScalar(
          resting
            ? 0.28 + pose.facade * wave * intensity
            : 0.015 + pose.facade * wave * intensity * 0.65,
        );
      windows.setColorAt(i, color);
    });
    windows.instanceMatrix.needsUpdate = true;
    frames.instanceMatrix.needsUpdate = true;
    if (windows.instanceColor) windows.instanceColor.needsUpdate = true;
    rig.ledPositions.forEach((_, i) => {
      color
        .copy(cold)
        .lerp(lime, pose.lime)
        .multiplyScalar(0.5 + 0.3 * Math.sin(i * 0.4 - time * 0.39));
      rig.leds.setColorAt(i, color);
    });
    if (rig.leds.instanceColor) rig.leds.instanceColor.needsUpdate = true;
    rig.beams.forEach(({ mesh, spot, origin, index }) => {
      const sway = reduced ? 0 : Math.sin(time * 0.16 + index * 0.6) * 3;
      target.set(
        (index - (rig.beams.length - 1) / 2) * 2.4 + sway,
        0.03,
        5 + Math.cos(index) * 2,
      );
      direction.subVectors(target, origin).normalize();
      mesh.quaternion.setFromUnitVectors(down, direction);
      mesh.material.uniforms.opacity.value = pose.rig * intensity * 0.042;
      mesh.material.uniforms.color.value.copy(cold).lerp(lime, pose.lime);
      if (spot) {
        spot.target.position.copy(target);
        spot.intensity = pose.rig * intensity * 65;
        spot.color.copy(cold).lerp(lime, pose.lime);
      }
    });
    cursorSpot.target.position.set(pointer.x * 5, 0, pointer.y * 3);
    cursorSpot.intensity = 8 * intensity;
    bloom.enabled = !low;
    composer.render();
  }
  render("intro", 0, 0, 0.5, false, { x: 0, y: 0 });
  rig.group.visible =
    rig.gag.visible =
    rig.ringLeds.visible =
    rig.leds.visible =
      true;
  await renderer.compileAsync(scene, camera);
  render("intro", 0, 0, 0.5, false, { x: 0, y: 0 });
  return {
    render,
    renderer,
    camera,
    scene,
    dispose: () => {
      removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", contextLost);
      const textures = new Set<THREE.Texture>(),
        mats = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            mats.add(m);
        }
      });
      for (const m of mats) {
        for (const value of Object.values(m))
          if (value instanceof THREE.Texture) textures.add(value);
        m.dispose();
      }
      textures.forEach((t) => t.dispose());
      environment.dispose();
      reflector.getRenderTarget().dispose();
      bloom.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
