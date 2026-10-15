import { softnessComposite } from "./field-adapter-snippets.mjs";
import * as THREE from "three";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";
/** Spatial only: two quarter-size Gaussian passes and a restrained linear
 * composite. No temporal history, exposure lift or blur on DOM controls. */
export class SoftnessPass extends Pass {
  private a = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  private b = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  private blur = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: null as THREE.Texture | null },
      step: { value: new THREE.Vector2() },
    },
    vertexShader:
      "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
    fragmentShader:
      "uniform sampler2D map;uniform vec2 step;varying vec2 vUv;void main(){vec4 c=texture2D(map,vUv)*.227027;c+=(texture2D(map,vUv+step*1.384615)+texture2D(map,vUv-step*1.384615))*.316216;c+=(texture2D(map,vUv+step*3.230769)+texture2D(map,vUv-step*3.230769))*.070270;gl_FragColor=c;}",
    depthTest: false,
    depthWrite: false,
  });
  private composite = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: null as THREE.Texture | null },
      soft: { value: this.b.texture },
    },
    vertexShader: this.blur.vertexShader,
    fragmentShader: softnessComposite,
    depthTest: false,
    depthWrite: false,
  });
  private quad = new FullScreenQuad(this.blur);
  setSize(width: number, height: number) {
    this.a.setSize(
      Math.max(1, Math.ceil(width / 4)),
      Math.max(1, Math.ceil(height / 4)),
    );
    this.b.setSize(this.a.width, this.a.height);
  }
  render(
    renderer: THREE.WebGLRenderer,
    write: THREE.WebGLRenderTarget,
    read: THREE.WebGLRenderTarget,
  ) {
    this.quad.material = this.blur;
    this.blur.uniforms.map.value = read.texture;
    this.blur.uniforms.step.value.set(1 / this.a.width, 0);
    renderer.setRenderTarget(this.a);
    this.quad.render(renderer);
    this.blur.uniforms.map.value = this.a.texture;
    this.blur.uniforms.step.value.set(0, 1 / this.a.height);
    renderer.setRenderTarget(this.b);
    this.quad.render(renderer);
    this.quad.material = this.composite;
    this.composite.uniforms.map.value = read.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : write);
    this.quad.render(renderer);
  }
  dispose() {
    this.a.dispose();
    this.b.dispose();
    this.blur.dispose();
    this.composite.dispose();
    this.quad.dispose();
  }
}
