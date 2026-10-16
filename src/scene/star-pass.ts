import * as THREE from "three";
import { Pass } from "three/addons/postprocessing/Pass.js";

/** Floor softness never consumes star pixels. Rebuild real terrain depth in the
 * current multisampled color target, then depth-test every local halo fragment.
 * This avoids depth-texture resolve/coordinate ambiguity and blur-through hills. */
export class StarPass extends Pass {
  private depthScene = new THREE.Scene();
  private starScene = new THREE.Scene();
  constructor(
    private camera: THREE.Camera,
    depth: THREE.Mesh,
    stars: THREE.Object3D,
  ) {
    super();
    this.needsSwap = false;
    this.depthScene.add(depth);
    this.starScene.add(stars);
  }
  prewarm(renderer: THREE.WebGLRenderer) {
    return renderer.compileAsync(this.starScene, this.camera);
  }
  render(
    renderer: THREE.WebGLRenderer,
    _write: THREE.WebGLRenderTarget,
    read: THREE.WebGLRenderTarget,
  ) {
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(read);
    renderer.clearDepth();
    renderer.render(this.depthScene, this.camera);
    renderer.render(this.starScene, this.camera);
    renderer.autoClear = auto;
  }
}
