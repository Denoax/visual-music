import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { box, tube, batchStatic } from "./geometry";
export async function loadMaterials() {
  const loader = new THREE.TextureLoader();
  const map = async (name: string, color: boolean, repeat: number) => {
    const texture = await loader.loadAsync(
      `${import.meta.env.BASE_URL}assets/textures/${name}`,
    );
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.anisotropy = 4;
    return texture;
  };
  const [
    asphalt,
    asphaltNormal,
    asphaltRough,
    concrete,
    concreteNormal,
    concreteRough,
  ] = await Promise.all([
    map("asphalt_02_diff_1k.jpg", true, 18),
    map("asphalt_02_nor_gl_1k.jpg", false, 18),
    map("asphalt_02_rough_1k.jpg", false, 18),
    map("concrete_wall_007_diff_1k.jpg", true, 6),
    map("concrete_wall_007_nor_gl_1k.jpg", false, 6),
    map("concrete_wall_007_rough_1k.jpg", false, 6),
  ]);
  const ground = new THREE.MeshPhysicalMaterial({
    map: asphalt,
    normalMap: asphaltNormal,
    roughnessMap: asphaltRough,
    color: 0x5c6269,
    roughness: 0.9,
    metalness: 0.12,
    clearcoat: 0.22,
    clearcoatRoughness: 0.4,
  });
  // Spatially varied wet patches preserve dry aggregate. All textures remain linear except diffuse.
  ground.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      `#include <roughnessmap_fragment>
      float wetness = smoothstep(0.32, 0.78, sin(vMapUv.x*2.7)*sin(vMapUv.y*3.1)*0.5+0.5);
      roughnessFactor = mix(roughnessFactor, 0.19, wetness*0.55);`,
    );
  };
  return {
    ground,
    concrete: new THREE.MeshStandardMaterial({
      map: concrete,
      normalMap: concreteNormal,
      roughnessMap: concreteRough,
      color: 0x858e94,
      roughness: 0.92,
    }),
  };
}
export function createVenue(
  materials: Awaited<ReturnType<typeof loadMaterials>>,
  low: boolean,
) {
  const venue = new THREE.Group(),
    architecture = new THREE.Group();
  venue.add(architecture);
  const dark = new THREE.MeshStandardMaterial({
    color: 0x151b22,
    roughness: 0.8,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: 0x495159,
    metalness: 0.65,
    roughness: 0.42,
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 110),
    materials.ground,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  venue.add(ground);
  const reflector = new Reflector(new THREE.PlaneGeometry(65, 65), {
    textureWidth: low ? 384 : 768,
    textureHeight: low ? 384 : 768,
    color: 0x4f535b,
    clipBias: 0.003,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.y = 0.009;
  (reflector.material as THREE.ShaderMaterial).transparent = true;
  (reflector.material as THREE.ShaderMaterial).depthWrite = false;
  (reflector.material as THREE.ShaderMaterial).fragmentShader = (
    reflector.material as THREE.ShaderMaterial
  ).fragmentShader.replace(
    "gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );",
    `
    float wetMask = smoothstep(0.20, 0.65, sin(vUv.x*0.52+cos(vUv.y*0.83))*sin(vUv.y*0.37)*0.5+0.5);
    gl_FragColor = vec4( blendOverlay( base.rgb, color ), wetMask * 0.22 );`,
  );
  venue.add(reflector);
  box(architecture, materials.concrete, [40, 26, 3], [0, 13, -18]);
  box(architecture, materials.concrete, [3, 23, 38], [-21, 11.5, -3]);
  box(architecture, materials.concrete, [3, 29, 38], [21, 14.5, -3]);
  for (let y = 2.6; y < 26; y += 2.7) {
    box(architecture, dark, [40, 0.18, 0.18], [0, y, -16.43]);
    box(architecture, dark, [0.18, 0.18, 36], [-19.43, y, -3]);
    box(architecture, dark, [0.18, 0.18, 36], [19.43, y, -3]);
  }
  const windowPositions: [number, number, number, number][] = [];
  for (let row = 0; row < 9; row++)
    for (let col = 0; col < 17; col++)
      windowPositions.push([-18.4 + col * 2.3, 2 + row * 2.7, -16.43, 0]);
  for (const side of [-1, 1])
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 12; col++)
        windowPositions.push([
          side * 19.43,
          2 + row * 2.7,
          -17 + col * 2.8,
          side === -1 ? Math.PI / 2 : -Math.PI / 2,
        ]);
  const frames = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.36, 1.72, 0.13),
    dark,
    windowPositions.length,
  );
  const windowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });
  windowMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.facadeActivation = { value: 0 };
    windowMaterial.userData.activation = shader.uniforms.facadeActivation;
    shader.vertexShader =
      "varying vec2 vLedUv;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n vLedUv = uv;",
      );
    shader.fragmentShader =
      "varying vec2 vLedUv; uniform float facadeActivation;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      vec2 cell = abs(fract(vLedUv*vec2(7.0,10.0))-0.5);
      float diode = 1.0-smoothstep(0.28,0.39,max(cell.x,cell.y));
      diffuseColor.rgb *= mix(1.0, 0.07+diode*1.65, facadeActivation);`,
      );
  };
  const windows = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1.16, 1.47),
    windowMaterial,
    windowPositions.length,
  );
  const matrix = new THREE.Matrix4(),
    quaternion = new THREE.Quaternion(),
    color = new THREE.Color();
  windowPositions.forEach(([x, y, z, r], i) => {
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r);
    matrix.compose(
      new THREE.Vector3(x, y, z),
      quaternion,
      new THREE.Vector3(1, 1, 1),
    );
    frames.setMatrixAt(i, matrix);
    matrix.compose(
      new THREE.Vector3(
        x + (r ? (x > 0 ? -0.085 : 0.085) : 0),
        y,
        z + (r ? 0 : 0.085),
      ),
      quaternion,
      new THREE.Vector3(1, 1, 1),
    );
    windows.setMatrixAt(i, matrix);
    color.setHex(i % 7 === 0 || i % 11 === 0 ? 0xc19762 : 0x121c27);
    windows.setColorAt(i, color);
  });
  venue.add(frames, windows);
  // Shared parking marks become the paths of later light banks.
  const lineMaterial = new THREE.MeshStandardMaterial({
    color: 0xa0a191,
    roughness: 0.9,
  });
  for (let x = -12; x <= 12; x += 4)
    box(architecture, lineMaterial, [0.075, 0.008, 6], [x, 0.013, 2]);
  box(architecture, lineMaterial, [25, 0.009, 0.075], [0, 0.013, 5]);
  box(architecture, trim, [0.38, 0.1, 6], [-14, 0.055, 3]);
  for (let i = 0; i < 12; i++)
    box(architecture, dark, [0.025, 0.105, 0.18], [-14, 0.06, i * 0.45]);
  const lampGlow = new THREE.MeshStandardMaterial({
    color: 0xffe0ac,
    emissive: 0xffc485,
    emissiveIntensity: 3,
  });
  for (const x of [-8, 10]) {
    tube(
      architecture,
      trim,
      [
        [x, 0.01, -4],
        [x, 7, -4],
        [x + 0.14, 7.4, -4],
        [x + 1.9, 7.4, -4],
      ],
      0.064,
    );
    box(architecture, dark, [0.92, 0.12, 0.46], [x + 1.72, 7.35, -4]);
    box(architecture, lampGlow, [0.76, 0.03, 0.33], [x + 1.72, 7.27, -4]);
    const light = new THREE.SpotLight(0xffce91, 105, 26, 0.62, 0.8, 1.1);
    light.position.set(x + 1.7, 7.25, -4);
    light.target.position.set(x + 1.7, 0, -4);
    light.castShadow = !low;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.bias = -0.001;
    venue.add(light, light.target);
  }
  // Drainpipes, an entrance canopy and a bench give the place a scale before the show.
  for (const x of [-17, 17])
    tube(
      architecture,
      trim,
      [
        [x, 0, -16.2],
        [x, 25, -16.2],
      ],
      0.055,
    );
  box(architecture, dark, [2.4, 3.2, 0.18], [-6, 1.6, -16.25]);
  box(architecture, trim, [3.1, 0.1, 1.2], [-6, 3.3, -15.9]);
  for (let i = 0; i < 4; i++)
    box(architecture, trim, [3, 0.055, 0.07], [12, 0.5, -12 + i * 0.1]);
  for (const x of [10.8, 13.2])
    box(architecture, dark, [0.07, 0.5, 0.5], [x, 0.25, -11.8]);
  batchStatic(architecture);
  return { venue, windows, windowPositions, windowMaterial, frames, reflector };
}
