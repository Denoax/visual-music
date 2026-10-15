import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createLandscapes } from "./landscapes";
import { createHorizon } from "./horizon.mjs";
import { createField } from "./field";
import { createGpuTimer } from "./gpu-timer";
import { waveState, WAVE } from "../show/waves";
import type { Features } from "../show/track";
import { createArrangement } from "../show/arrangement";
import { currentTerrain } from "./terrain";
import referenceScore from "../../show/reference-camera-score.json";
import { createFlight } from "./flight";
import { createStars } from "./stars";
import { StarPass } from "./star-pass";
import { createLyricalActors } from "./lyrical-actors";
import { createPaint } from "../show/paint";
import { createStartGlass } from "./start-glass";
import { SoftnessPass } from "./softness";
import type { GlideState } from "../input";

export async function createWorld(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    // The linear composer target already supplies 4x MSAA.
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
    throw Error(
      `Scene shader compilation failed: ${gl.getProgramInfoLog(program)}\nVertex: ${gl.getShaderInfoLog(vertex)}\nFragment: ${gl.getShaderInfoLog(fragment)}`,
    );
  };
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0);
  const camera = new THREE.PerspectiveCamera(25, 1, 0.4125, 660);
  const field = createField(renderer.getContext());
  const horizon = createHorizon();
  scene.add(horizon.mesh, field.group);
  const stars = createStars(renderer.getContext()),
    actors = createLyricalActors(renderer.getContext()),
    paint = createPaint(),
    flight = createFlight(
      new URLSearchParams(location.search).get("dev") === "1" &&
        new URLSearchParams(location.search).get("referenceCamera") === "1"
        ? referenceScore.cues
        : undefined,
    ),
    arrange = createArrangement();
  const landscapes = await createLandscapes();
  let arrangement = arrange(0, null, false);
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new SoftnessPass());
  const air = new THREE.Group();
  air.add(stars.group, actors.group, landscapes.group);
  const airPass = new StarPass(camera, field.depthMesh, air);
  composer.addPass(airPass);
  composer.addPass(new OutputPass());
  const startGlass = createStartGlass(renderer);
  const timer = createGpuTimer(
    renderer.getContext(),
    new URLSearchParams(location.search).get("dev") === "1",
  );
  const loss = renderer.getContext().getExtension("WEBGL_lose_context");
  let last = 0,
    x = 0,
    z = 0,
    y = 4,
    initialised = false,
    wasReduced = false;
  let state = waveState(0, null, false),
    clear = 4;
  function resize() {
    const width = canvas.clientWidth,
      height = canvas.clientHeight,
      dpr = Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = flight.pose().vfov;
    camera.updateProjectionMatrix();
  }
  resize();
  function reset(seconds = 0) {
    last = seconds;
    flight.reset(seconds);
    actors.reset();
    landscapes.reset();
    paint.reset();
    const pose = flight.pose();
    x = pose.x;
    z = pose.z;
    initialised = false;
    wasReduced = false;
  }
  function render(
    seconds: number,
    input: { x: number } & Partial<GlideState>,
    reduced: boolean,
    features: Features | null,
    _playing = false,
    endAge: number | null = null,
    brightness = 1,
  ) {
    // Output-timestamp estimates can briefly regress while the device warms.
    // Hold the last presentation sample; only explicit reset/seek owns route reset.
    seconds = Math.max(last, seconds);
    last = seconds;
    flight.advance(
      seconds,
      {
        turn: input.turn ?? input.x,
        tilt: input.tilt ?? input.y ?? 0,
        held: input.held,
      },
      reduced,
    );
    const pose = flight.pose();
    x = pose.x;
    z = pose.z;
    wasReduced = reduced;
    state = waveState(seconds, features, reduced, flight.origins());
    arrangement = arrange(seconds, features, reduced, endAge, brightness);
    y = pose.y;
    initialised = true;
    camera.fov = pose.vfov;
    camera.updateProjectionMatrix();
    camera.position.set(x, y, z);
    const b = pose.basis;
    camera.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(
        new THREE.Vector3(...b.right),
        new THREE.Vector3(...b.up),
        new THREE.Vector3(...b.back),
      ),
    );
    horizon.update(camera, {
      gain: arrangement.horizonGain,
      azimuth: arrangement.horizonAzimuth,
    });
    const actualTerrain = currentTerrain(state, undefined, arrangement.visual);
    const groundVisible = reduced || seconds >= 7;
    field.setGroundVisible(groundVisible);
    clear = camera.position.y - actualTerrain.height(x, z);
    camera.updateMatrixWorld();
    const route = new THREE.Vector3(x, y, z);
    landscapes.update(arrangement, camera, flight, renderer.getPixelRatio());
    const borrow = actors.update(
      arrangement,
      camera,
      actualTerrain,
      flight.origins(),
      canvas.clientHeight,
      renderer.getPixelRatio(),
      landscapes.actorGain() * (1 - arrangement.visual.blend),
    );
    field.update(
      state,
      camera,
      canvas.clientHeight,
      renderer.getPixelRatio(),
      arrangement,
      {
        borrow,
        paint: paint.at(seconds, flight.origins()),
        micro: arrangement.micro,
        structures: landscapes.floorMasks(),
      },
    );
    stars.update(
      arrangement,
      camera,
      route,
      canvas.clientHeight,
      renderer.getPixelRatio(),
    );
    renderer.info.autoReset = false;
    renderer.info.reset();
    timer.begin();
    composer.render();
    startGlass.draw();
    timer.end();
  }
  render(0, { x: 0 }, false, null);
  await renderer.compileAsync(scene, camera);
  const airMeshes = [...actors.group.children, ...landscapes.group.children];
  const visibility = airMeshes.map((o) => o.visible);
  airMeshes.forEach((o) => (o.visible = true));
  await airPass.prewarm(renderer);
  await landscapes.prewarm(() => airPass.prewarm(renderer));
  await startGlass.prewarm();
  airMeshes.forEach((o, i) => (o.visible = visibility[i]));
  // Match the default framebuffer and postprocessing targets after prewarming.
  resize();
  render(0, { x: 0 }, false, null);
  function diagnostics() {
    const gl = renderer.getContext(),
      ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      startGlass: startGlass.diagnostics(),
      renderer: ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
      dpr: renderer.getPixelRatio(),
      size: [canvas.width, canvas.height],
      points: field.pointCount,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      activeFronts: state.fronts.length,
      section: state.section,
      colourMode: state.colourMode,
      coverage: state.coverage,
      palette: state.paletteB,
      hold: state.hold,
      camera: camera.position.toArray(),
      clearance: clear,
      terrainHeight: currentTerrain(
        state,
        undefined,
        arrangement.visual,
      ).height(x, z),
      groundVisible: field.groundVisible(),
      cameraLens: camera.fov,
      cameraQuaternion: camera.quaternion.toArray(),
      heightBound: WAVE.heightBound * state.motion,
      background: "black zenith; faint world-oriented low horizon",
      horizon: {
        gain: arrangement.horizonGain,
        azimuth: arrangement.horizonAzimuth,
      },
      drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
      mode:
        arrangement.visual.phase === "song"
          ? arrangement.mode
          : arrangement.visual.phase,
      visual: arrangement.visual,
      floor: field.diagnostics(),
      overview: arrangement.overview,
      gpuTimerAvailable: timer.available,
      reducedOrigin: wasReduced ? "stationary route; fixed origins" : null,
      heading: flight.pose().yaw,
      pitch: flight.pose().pitch,
      flight: flight.diagnostics(),
      reveal: arrangement.reveal,
      cameraStable:
        "No beat/terrain shake. Authored source score plus deliberate input banking only",
      grid: {
        board: arrangement.board,
        activationKind: arrangement.lighting.kind,
        rest: arrangement.gridRest,
      },
      stars: stars.diagnostics(),
      actors: actors.diagnostics(),
      landscapes: landscapes.diagnostics(),
      pulseStatus: arrangement.pulseStatus,
    };
  }
  return {
    render,
    startVisible: startGlass.visible,
    resize,
    reset,
    snapshot: () => ({
      last,
      x,
      z,
      y,
      initialised,
      wasReduced,
      flight: flight.snapshot(),
      floor: { ...arrangement.lighting },
      stars: stars.snapshot(),
      actors: actors.snapshot(),
      landscapes: landscapes.snapshot(),
      paint: paint.snapshot(),
    }),
    restore: (saved: {
      last: number;
      x: number;
      z: number;
      y: number;
      initialised: boolean;
      wasReduced: boolean;
      flight: ReturnType<typeof flight.snapshot>;
      floor: typeof arrangement.lighting;
      stars: ReturnType<typeof stars.snapshot>;
      actors: ReturnType<typeof actors.snapshot>;
      landscapes: ReturnType<typeof landscapes.snapshot>;
      paint: ReturnType<typeof paint.snapshot>;
    }) => {
      ({ last, x, z, y, initialised, wasReduced } = saved);
      flight.restore(saved.flight);
      actors.restore(saved.actors);
      landscapes.restore(saved.landscapes);
      paint.restore(saved.paint);
    },
    diagnostics,
    gpuSamples: timer.samples,
    height: (px: number, pz: number) =>
      currentTerrain(state, undefined, arrangement.visual).vertex(px, pz),
    state: () => state,
    audit: () => ({
      floor: field.audit(),
      stars: stars.audit(),
      flight: flight.snapshot(),
      camera: {
        aspect: camera.aspect,
        projection: camera.projectionMatrix.elements,
        inverse: camera.matrixWorldInverse.elements,
      },
      viewport: renderer.getViewport(new THREE.Vector4()).toArray(),
      targets: [
        composer.renderTarget1.width,
        composer.renderTarget1.height,
        composer.renderTarget1.viewport.toArray(),
        composer.renderTarget2.viewport.toArray(),
      ],
      glViewport: Array.from(
        renderer.getContext().getParameter(renderer.getContext().VIEWPORT),
      ),
      rect: canvas.getBoundingClientRect().toJSON(),
      lights: {
        passage: field.uniforms.uPassage.value.toArray(),
        offset: field.uniforms.uOffset.value.toArray(),
        motion: field.uniforms.uMotion.value,
      },
    }),
    restoreContext: () => loss?.restoreContext(),
    loseContext: () => loss?.loseContext(),
    dispose() {
      timer.dispose();
      startGlass.dispose();
      field.dispose();
      horizon.dispose();
      stars.dispose();
      actors.dispose();
      landscapes.dispose();
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
      target.dispose();
      renderer.dispose();
    },
  };
}
