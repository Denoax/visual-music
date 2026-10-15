import * as THREE from "three";
import { emitterGLSL } from "../../core/beauty.mjs";
/** One opaque background draw before floor. Fixed world up; no texture and no
 * screenspace gradient. Camera translation follows, yaw/pitch/roll do not.
 * Keep existing world-space stars in their depth-tested post-softness pass.
 */
export function createHorizon() {
  const geometry = new THREE.SphereGeometry(620, 24, 16);
  const material = new THREE.ShaderMaterial({
    uniforms: { uGain: { value: 0 }, uAzimuth: { value: 0 } },
    depthTest: false,
    depthWrite: false,
    side: THREE.BackSide,
    vertexShader: `varying vec3 vRay;void main(){vec4 w=modelMatrix*vec4(position,1.);
      vRay=w.xyz-cameraPosition;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `${emitterGLSL}uniform float uGain,uAzimuth;varying vec3 vRay;
      void main(){gl_FragColor=vec4(beautyHorizon(vRay,uAzimuth,uGain),1.);}`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "retrowave-horizon";
  mesh.renderOrder = -1000;
  mesh.frustumCulled = false;
  return {
    mesh,
    update(camera, { gain = 0, azimuth = 0 } = {}) {
      mesh.position.copy(camera.position); // translation only, world orientation fixed
      material.uniforms.uGain.value = Math.max(0, Math.min(1, gain));
      material.uniforms.uAzimuth.value = azimuth;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
