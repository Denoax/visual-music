import * as THREE from "three";
import { box, tube, batchStatic } from "./geometry";
export function createLights(low: boolean) {
  const group = new THREE.Group(),
    hardware = new THREE.Group();
  group.add(hardware);
  const steel = new THREE.MeshStandardMaterial({
    color: 0x49535a,
    metalness: 0.85,
    roughness: 0.3,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x0a0e12,
    roughness: 0.55,
  });
  const glow = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xd7e4ee,
    emissiveIntensity: 1.3,
  });
  const ring = new THREE.Group();
  ring.position.set(0, 7.2, -10);
  const frame = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.095, 8, 120),
    steel,
  );
  ring.add(frame);
  const ringLeds = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.055, 0.17, 0.1),
    glow,
    120,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    dummy.position.set(Math.sin(a) * 4.2, Math.cos(a) * 4.2, 0.055);
    dummy.rotation.z = -a;
    dummy.updateMatrix();
    ringLeds.setMatrixAt(i, dummy.matrix);
  }
  ring.add(ringLeds);
  group.add(ring);
  const ledPositions: number[][] = [];
  for (const side of [-1, 1]) {
    for (let j = 0; j < 5; j++) {
      const x = side * (4 + j * 2.3);
      tube(
        hardware,
        steel,
        [
          [x, 0, -12],
          [x, 6.2, -12],
        ],
        0.035,
      );
      for (let k = 0; k < 15; k++)
        ledPositions.push([x, 1.1 + k * 0.31, -11.94]);
    }
    for (let j = 0; j < 28; j++)
      ledPositions.push([side * 5, 0.045, 4 - j * 0.56]);
  }
  const leds = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.42, 0.08, 0.06),
    glow,
    ledPositions.length,
  );
  ledPositions.forEach((p, i) => {
    dummy.position.set(p[0], p[1], p[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    leds.setMatrixAt(i, dummy.matrix);
    leds.setColorAt(i, new THREE.Color(0xd5dce3));
  });
  group.add(leds);
  const beams: {
    mesh: THREE.Mesh<THREE.ConeGeometry, THREE.ShaderMaterial>;
    spot: THREE.SpotLight | null;
    origin: THREE.Vector3;
    index: number;
  }[] = [];
  for (let i = 0; i < (low ? 6 : 10); i++) {
    const x = (i - (low ? 5 : 9) / 2) * 2.8;
    box(hardware, dark, [0.42, 0.27, 0.42], [x, 6.6, -12]);
    const beamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        color: { value: new THREE.Color(0xb9cfe4) },
        opacity: { value: 0 },
      },
      vertexShader:
        "varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader:
        "varying vec2 vUv; uniform vec3 color; uniform float opacity; void main(){float edge=pow(sin(vUv.x*3.14159265),2.0); float falloff=pow(vUv.y,1.6); gl_FragColor=vec4(color,opacity*edge*falloff);}",
    });
    const geometry = new THREE.ConeGeometry(2.1, 13, 24, 1, true);
    geometry.translate(0, -6.5, 0);
    const mesh = new THREE.Mesh(geometry, beamMat);
    mesh.position.set(x, 6.6, -12);
    group.add(mesh);
    let spot: THREE.SpotLight | null = null;
    if (i % 4 === 0) {
      spot = new THREE.SpotLight(0xb9cfe4, 0, 32, 0.24, 0.75, 1);
      spot.position.copy(mesh.position);
      group.add(spot, spot.target);
    }
    beams.push({ mesh, spot, origin: mesh.position.clone(), index: i });
  }
  // The final sculpture is physically supported by a deliberately tiny trolley.
  const gag = new THREE.Group();
  gag.position.set(6.2, 0, -5.2);
  const basket = new THREE.Group();
  gag.add(basket);
  for (const y of [0.32, 0.46, 0.6, 0.74])
    tube(
      basket,
      steel,
      [
        [-0.5, y, -0.36],
        [0.5, y, -0.36],
        [0.5, y, 0.36],
        [-0.5, y, 0.36],
      ],
      0.012,
      true,
    );
  for (let x = -0.5; x <= 0.51; x += 0.1)
    for (const z of [-0.36, 0.36])
      tube(
        basket,
        steel,
        [
          [x, 0.32, z],
          [x, 0.76, z],
        ],
        0.01,
      );
  for (const x of [-0.5, 0.5])
    for (let z = -0.36; z <= 0.37; z += 0.12)
      tube(
        basket,
        steel,
        [
          [x, 0.32, z],
          [x, 0.76, z],
        ],
        0.01,
      );
  tube(
    basket,
    steel,
    [
      [-0.48, 0.17, -0.3],
      [-0.48, 0.28, 0.36],
      [0.52, 0.28, 0.36],
      [0.58, 1.02, 0.46],
      [-0.5, 1.02, 0.46],
    ],
    0.025,
  );
  for (const x of [-0.43, 0.43])
    for (const z of [-0.29, 0.29]) {
      const w = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.085, 0.055, 12),
        dark,
      );
      w.rotation.x = Math.PI / 2;
      w.position.set(x, 0.09, z);
      basket.add(w);
    }
  const sculpture = new THREE.Group();
  sculpture.position.y = 0.75;
  gag.add(sculpture);
  for (const x of [-2.2, -0.75, 0.75, 2.2]) {
    box(sculpture, dark, [1.35, 3.4, 0.78], [x, 1.7, 0]);
    for (const y of [0.7, 1.8, 2.8]) {
      const speaker = new THREE.Mesh(
        new THREE.TorusGeometry(0.4, 0.05, 8, 32),
        steel,
      );
      speaker.position.set(x, y, 0.405);
      sculpture.add(speaker);
      const cone = new THREE.Mesh(new THREE.CircleGeometry(0.36, 32), dark);
      cone.position.set(x, y, 0.415);
      sculpture.add(cone);
    }
  }
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(2.5, 0.065, 8, 100),
    glow,
  );
  halo.position.set(0, 3.25, 0);
  sculpture.add(halo);
  tube(
    sculpture,
    steel,
    [
      [-2.9, 0, 0],
      [-2.9, 6.1, 0],
      [2.9, 6.1, 0],
      [2.9, 0, 0],
    ],
    0.04,
  );
  batchStatic(basket);
  batchStatic(sculpture);
  group.add(gag);
  batchStatic(hardware);
  return { group, ring, ringLeds, leds, ledPositions, beams, gag, glow };
}
