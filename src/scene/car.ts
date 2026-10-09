import * as THREE from "three";
import { box, tube, polygon, batchStatic } from "./geometry";
/** Original executive-sedan body, authored from shaped longitudinal sections. No scanned/model media. */
function bonnet(
  parent: THREE.Group,
  material: THREE.Material,
  rows: number[][],
) {
  const vertices: number[] = [],
    indices: number[] = [];
  const segments = 20;
  rows.forEach(([x, height, width], i) => {
    for (let j = 0; j <= segments; j++) {
      const z = ((j / segments) * 2 - 1) * width;
      vertices.push(x, height + 0.035 * (1 - (z / width) ** 2), z);
      if (i && j) {
        const b = i * (segments + 1) + j;
        indices.push(
          b,
          b - 1,
          b - segments - 2,
          b,
          b - segments - 2,
          b - segments - 1,
        );
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  parent.add(new THREE.Mesh(g, material));
}
export function createCar() {
  const car = new THREE.Group(),
    body = new THREE.Group();
  car.add(body);
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x0e1219,
    metalness: 0.72,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    side: THREE.DoubleSide,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xc2ccd5,
    metalness: 0.94,
    roughness: 0.17,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x0b0c0e,
    roughness: 0.86,
  });
  const recess = new THREE.MeshStandardMaterial({
    color: 0x030406,
    roughness: 0.42,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x101d26,
    metalness: 0.24,
    roughness: 0.12,
    transparent: true,
    opacity: 0.64,
    side: THREE.DoubleSide,
  });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffeed4,
    emissive: 0xffdab0,
    emissiveIntensity: 2.4,
  });
  const brake = new THREE.MeshStandardMaterial({
    color: 0x721911,
    emissive: 0xd32a22,
    emissiveIntensity: 1.1,
  });
  bonnet(body, paint, [
    [-2.7, 0.89, 0.88],
    [-2.53, 0.97, 0.98],
    [-1.65, 1.02, 1.015],
    [-1.05, 1.04, 1.0],
    [0.2, 1.045, 1.015],
    [1.45, 1.035, 1.0],
    [2.4, 0.97, 0.98],
    [2.68, 0.88, 0.89],
  ]);
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(-2.7, 0.89);
    shape.lineTo(-2.5, 0.97);
    shape.lineTo(-1.05, 1.04);
    shape.lineTo(1.4, 1.035);
    shape.lineTo(2.4, 0.97);
    shape.lineTo(2.68, 0.88);
    shape.lineTo(2.65, 0.32);
    shape.lineTo(2.1, 0.32);
    shape.lineTo(2.1, 0.49);
    shape.absarc(1.65, 0.49, 0.45, 0, Math.PI, false);
    shape.lineTo(1.2, 0.32);
    shape.lineTo(-1.2, 0.32);
    shape.lineTo(-1.2, 0.49);
    shape.absarc(-1.65, 0.49, 0.45, 0, Math.PI, false);
    shape.lineTo(-2.1, 0.32);
    shape.lineTo(-2.65, 0.32);
    shape.closePath();
    const panel = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), paint);
    panel.position.z = side * 1.008;
    body.add(panel);
    tube(
      body,
      chrome,
      [
        [-2.52, 0.76, side * 1.012],
        [-2, 0.79, side * 1.024],
        [0, 0.8, side * 1.025],
        [2.3, 0.75, side * 1.016],
      ],
      0.012,
    );
    tube(
      body,
      recess,
      [
        [-1.04, 1.025, side * 1.009],
        [-1.0, 0.83, side * 1.026],
        [-0.93, 0.42, side * 1.016],
      ],
      0.008,
    );
    tube(
      body,
      recess,
      [
        [0.24, 1.038, side * 1.023],
        [0.24, 0.82, side * 1.029],
        [0.3, 0.39, side * 1.017],
      ],
      0.008,
    );
    tube(
      body,
      recess,
      [
        [1.48, 1.02, side * 1.005],
        [1.36, 0.84, side * 1.025],
        [1.16, 0.42, side * 1.016],
      ],
      0.008,
    );
    for (const x of [-0.02, 1.03])
      box(body, chrome, [0.21, 0.027, 0.027], [x, 0.91, side * 1.033]);
    box(body, rubber, [2.3, 0.075, 0.045], [0.0, 0.38, side * 1.014]);
    const window = [
      [-1.015, 1.073, side * 0.895],
      [-0.4, 1.475, side * 0.735],
      [0.86, 1.475, side * 0.735],
      [1.465, 1.075, side * 0.895],
    ];
    polygon(body, glass, window);
    tube(body, chrome, window, 0.018, true);
    tube(
      body,
      recess,
      [
        [0.18, 1.073, side * 0.901],
        [0.18, 1.48, side * 0.74],
      ],
      0.033,
    );
    tube(
      body,
      recess,
      [
        [0.91, 1.07, side * 0.9],
        [0.77, 1.48, side * 0.74],
      ],
      0.024,
    );
    const mirror = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), paint);
    mirror.scale.set(0.19, 0.085, 0.13);
    mirror.position.set(-0.76, 1.045, side * 1.12);
    body.add(mirror);
    box(body, chrome, [0.13, 0.065, 0.01], [-0.71, 1.055, side * 1.245]);
    for (const x of [-1.65, 1.65]) {
      const tire = new THREE.Mesh(
        new THREE.TorusGeometry(0.335, 0.107, 12, 44),
        rubber,
      );
      tire.position.set(x, 0.46, side * 0.985);
      body.add(tire);
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.273, 0.273, 0.07, 44),
        chrome,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(x, 0.46, side * 1.053);
      body.add(rim);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.074, 44),
        recess,
      );
      disc.rotation.x = Math.PI / 2;
      disc.position.set(x, 0.46, side * 1.064);
      body.add(disc);
      for (let j = 0; j < 16; j++) {
        const angle = (j / 16) * Math.PI * 2;
        const spoke = box(
          body,
          chrome,
          [0.026, 0.237, 0.022],
          [
            x + Math.sin(angle) * 0.13,
            0.46 + Math.cos(angle) * 0.13,
            side * 1.108,
          ],
        );
        spoke.rotation.z = -angle;
      }
      const hub = new THREE.Mesh(
        new THREE.SphereGeometry(0.071, 16, 8),
        chrome,
      );
      hub.scale.z = 0.35;
      hub.position.set(x, 0.46, side * 1.123);
      body.add(hub);
    }
  }
  bonnet(body, paint, [
    [-0.47, 1.482, 0.738],
    [-0.34, 1.53, 0.735],
    [0.68, 1.53, 0.735],
    [0.9, 1.475, 0.735],
  ]);
  polygon(body, glass, [
    [-1.03, 1.07, -0.89],
    [-0.42, 1.48, -0.73],
    [-0.42, 1.48, 0.73],
    [-1.03, 1.07, 0.89],
  ]);
  polygon(body, glass, [
    [0.9, 1.48, -0.73],
    [1.47, 1.07, -0.89],
    [1.47, 1.07, 0.89],
    [0.9, 1.48, 0.73],
  ]);
  for (const side of [-1, 1]) {
    tube(
      body,
      paint,
      [
        [-1.055, 1.057, side * 0.91],
        [-0.43, 1.488, side * 0.748],
        [0.9, 1.488, side * 0.748],
        [1.48, 1.057, side * 0.91],
      ],
      0.028,
    );
    tube(
      body,
      recess,
      [
        [-2.5, 0.98, side * 0.74],
        [-1.08, 1.06, side * 0.74],
      ],
      0.006,
    );
    box(body, paint, [0.11, 0.2, 0.45], [-2.65, 0.61, side * 0.69]);
    box(body, recess, [0.04, 0.225, 0.64], [-2.708, 0.8, side * 0.6]);
    box(body, chrome, [0.045, 0.2, 0.61], [-2.73, 0.8, side * 0.6]);
    for (const z of [0.43, 0.73]) {
      const headlight = new THREE.Mesh(
        new THREE.SphereGeometry(0.087, 20, 12),
        lamp,
      );
      headlight.scale.x = 0.28;
      headlight.position.set(-2.764, 0.81, side * z);
      body.add(headlight);
    }
    box(body, brake, [0.045, 0.175, 0.62], [2.69, 0.795, side * 0.58]);
    box(body, chrome, [0.045, 0.012, 0.61], [2.716, 0.705, side * 0.58]);
    box(body, recess, [0.055, 0.245, 0.31], [-2.715, 0.79, side * 0.18]);
    tube(
      body,
      chrome,
      [
        [-2.75, 0.91, side * 0.025],
        [-2.75, 0.91, side * 0.337],
        [-2.75, 0.674, side * 0.337],
        [-2.75, 0.674, side * 0.025],
      ],
      0.016,
      true,
    );
    for (let j = 0; j < 6; j++)
      box(
        body,
        chrome,
        [0.02, 0.2, 0.009],
        [-2.748, 0.79, side * (0.047 + j * 0.049)],
      );
  }
  box(body, paint, [0.2, 0.24, 1.91], [-2.59, 0.4, 0]);
  box(body, paint, [0.19, 0.24, 1.91], [2.57, 0.4, 0]);
  box(body, chrome, [0.025, 0.03, 1.86], [-2.704, 0.54, 0]);
  box(body, chrome, [0.025, 0.03, 1.86], [2.674, 0.54, 0]);
  box(body, recess, [0.02, 0.09, 1.63], [-2.71, 0.386, 0]);
  box(body, recess, [0.05, 0.18, 0.43], [-2.73, 0.55, 0]);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#c9c9b7";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = "#151719";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BUMER", 128, 46);
  const plateTexture = new THREE.CanvasTexture(canvas);
  plateTexture.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.11),
    new THREE.MeshStandardMaterial({ map: plateTexture, roughness: 0.4 }),
  );
  plate.rotation.y = -Math.PI / 2;
  plate.position.set(-2.762, 0.55, 0);
  car.add(plate);
  box(body, recess, [0.28, 0.1, 0.13], [2.65, 0.25, -0.6]);
  // A simple cabin provides a readable interior behind the separate glass.
  for (const x of [-0.24, 0.65])
    for (const z of [-0.43, 0.43]) {
      box(body, recess, [0.44, 0.35, 0.38], [x, 1.05, z]);
      box(body, recess, [0.12, 0.12, 0.25], [x + 0.04, 1.29, z]);
    }
  batchStatic(body);
  const freshener = new THREE.Group();
  freshener.position.set(-0.42, 1.4, 0.12);
  const stringMaterial = new THREE.MeshStandardMaterial({
    color: 0xc5bfa9,
    roughness: 0.7,
  });
  tube(
    freshener,
    stringMaterial,
    [
      [0, 0, 0],
      [0, -0.11, 0],
    ],
    0.002,
  );
  const tree = new THREE.Shape();
  tree.moveTo(0, -0.09);
  tree.lineTo(0.036, -0.15);
  tree.lineTo(0.014, -0.15);
  tree.lineTo(0.057, -0.2);
  tree.lineTo(0.028, -0.2);
  tree.lineTo(0.078, -0.26);
  tree.lineTo(0.013, -0.26);
  tree.lineTo(0.013, -0.29);
  tree.lineTo(-0.013, -0.29);
  tree.lineTo(-0.013, -0.26);
  tree.lineTo(-0.078, -0.26);
  tree.lineTo(-0.028, -0.2);
  tree.lineTo(-0.057, -0.2);
  tree.lineTo(-0.014, -0.15);
  tree.lineTo(-0.036, -0.15);
  tree.closePath();
  const fresh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(tree, { depth: 0.009, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({
      color: 0xc6e871,
      roughness: 0.85,
      emissive: 0x445516,
      emissiveIntensity: 0.5,
    }),
  );
  freshener.add(fresh);
  car.add(freshener);
  return { car, freshener, brake, lamp };
}
