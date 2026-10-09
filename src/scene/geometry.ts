import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export function box(
  parent: THREE.Object3D,
  material: THREE.Material,
  size: number[],
  position: number[],
  rotationY = 0,
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    material,
  );
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.y = rotationY;
  parent.add(mesh);
  return mesh;
}
export function tube(
  parent: THREE.Object3D,
  material: THREE.Material,
  points: number[][],
  radius = 0.015,
  closed = false,
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    closed,
    "centripetal",
  );
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(
      curve,
      Math.max(8, points.length * 5),
      radius,
      5,
      closed,
    ),
    material,
  );
  parent.add(mesh);
  return mesh;
}
export function polygon(
  parent: THREE.Object3D,
  material: THREE.Material,
  points: number[][],
) {
  const vertices: number[] = [];
  for (let i = 1; i < points.length - 1; i++)
    vertices.push(...points[0], ...points[i], ...points[i + 1]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  return mesh;
}
/** Bake static meshes by material to preserve detail without a draw per trim piece. */
export function batchStatic(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const inverse = group.matrixWorld.clone().invert();
  for (const child of [...group.children]) {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material))
      continue;
    const geo = child.geometry.clone().toNonIndexed();
    if (!geo.getAttribute("uv"))
      geo.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
          new Float32Array(geo.getAttribute("position").count * 2),
          2,
        ),
      );
    geo.deleteAttribute("color");
    geo.applyMatrix4(inverse.clone().multiply(child.matrixWorld));
    const list = groups.get(child.material) ?? [];
    list.push(geo);
    groups.set(child.material, list);
    child.geometry.dispose();
    group.remove(child);
  }
  for (const [material, geometries] of groups) {
    const merged = mergeGeometries(geometries);
    if (!merged) throw new Error("Static geometry attributes do not match.");
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    geometries.forEach((g) => g.dispose());
  }
}
