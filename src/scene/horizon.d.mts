import type { Camera, Mesh, SphereGeometry, ShaderMaterial } from "three";
export function createHorizon(): {
  mesh: Mesh<SphereGeometry, ShaderMaterial>;
  update(camera: Camera, state?: { gain?: number; azimuth?: number }): void;
  dispose(): void;
};
