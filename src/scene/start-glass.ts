import * as THREE from "three";

/** Owned portfolio final-output lens. Native DOM owns hit testing and text.
 * Copy the CLEAN encoded frame exactly once; never sample our own composite. */
export function createStartGlass(renderer: THREE.WebGLRenderer) {
  const button = document.querySelector<HTMLButtonElement>("#start")!;
  const geometry = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(1, 1);
  geometry.index = plane.index;
  geometry.attributes.position = plane.attributes.position;
  const rect = new THREE.InstancedBufferAttribute(new Float32Array(4), 4);
  const shape = new THREE.InstancedBufferAttribute(new Float32Array(4), 4);
  geometry.setAttribute("aRect", rect);
  geometry.setAttribute("aShape", shape);
  geometry.instanceCount = 1;
  const uniforms = {
    uLight: { value: 0 },
    uBase: { value: null as THREE.Texture | null },
    uSize: { value: new THREE.Vector2() },
    uPixelRatio: { value: 1 },
  };
  const material = new THREE.RawShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    transparent: true,
    vertexShader: `precision highp float;attribute vec3 position;attribute vec4 aRect,aShape;uniform vec2 uSize;varying vec4 vRect,vShape;void main(){vRect=aRect;vShape=aShape;vec2 p=aRect.xy-vec2(2.)+(position.xy+.5)*(aRect.zw+vec2(4.));gl_Position=vec4(p/uSize*2.-1.,0.,1.);}`,
    fragmentShader: `precision highp float;uniform sampler2D uBase;uniform vec2 uSize;uniform float uPixelRatio,uLight;varying vec4 vRect,vShape;
      void main(){
        vec2 p=gl_FragCoord.xy/uPixelRatio;
        vec2 halfSize=vRect.zw*.5;
        vec2 local=p-vRect.xy-halfSize;
        float radius=vShape.x,bevel=vShape.y;
        vec2 q=abs(local)-halfSize+radius;
        float distance=length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
        float aa=1./uPixelRatio;
        if(distance>aa)discard;
        vec2 normal;
        if(q.x>0.&&q.y>0.)normal=normalize(max(q,0.))*sign(local);
        else normal=q.x>q.y?vec2(sign(local.x),0.):vec2(0.,sign(local.y));
        float rim=clamp(1.+distance/bevel,0.,1.);
        // A bounded smooth rim keeps the sampling Jacobian positive. The
        // former steep Snell edge could fold small text at the outer bevel.
        float shift=bevel*.16*rim*rim*(3.-2.*rim);
        // The center magnifies the actual clean backdrop about this pane;
        // rim displacement is continuous with that affine sample map.
        float magnification=vShape.z>.5?1.035:1.;
        vec2 center=vRect.xy+halfSize;
        vec2 uv=(center+local/magnification)/uSize;
        vec2 bend=normal*shift/uSize;
        float fringe=.6*rim*rim;
        vec2 rgbOffset=normal*fringe/uSize;
        vec3 color=vec3(texture2D(uBase,clamp(uv-bend-rgbOffset,0.,1.)).r,
          texture2D(uBase,clamp(uv-bend,0.,1.)).g,
          texture2D(uBase,clamp(uv-bend+rgbOffset,0.,1.)).b);
        bool panel=vShape.z>.5;
        // Neutral absorption preserves the source detail instead of lifting
        // light-mode image luma toward white. Panels own white text in both modes.
        vec3 film=panel?vec3(.018,.025,.035):mix(vec3(.025,.032,.044),vec3(.55,.59,.63),uLight);
        color=mix(color,film,panel?0.:vShape.z);
        // Pane absorption is applied once above both the GL and native DOM layers.
        float lighting=max(0.,dot(normal,normalize(vec2(-.5,1.))));
        float rimLight=pow(rim,3.)*(.006+.035*lighting);
        color+=vec3(rimLight);
        color+=pow(rim,2.)*.005;
        gl_FragColor=vec4(color,vShape.w*(1.-smoothstep(-aa,aa,distance)));
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const camera = new THREE.Camera();
  const fallback = matchMedia(
    "(prefers-reduced-transparency: reduce), (forced-colors: active)",
  );
  let texture: THREE.FramebufferTexture | null = null;
  const metrics = {
    captures: 0,
    draws: 0,
    allocations: 0,
    mode: "inactive",
    encodedOutput: true,
    nativeLabel: true,
  };
  function visible() {
    return !button.closest("[hidden]") && button.getClientRects().length > 0;
  }
  function draw() {
    if (!visible()) {
      metrics.mode = "inactive";
      return;
    }
    if (fallback.matches) {
      button.dataset.glassMode = "solid";
      metrics.mode = "solid";
      return;
    }
    const canvas = renderer.domElement,
      bounds = canvas.getBoundingClientRect(),
      b = button.getBoundingClientRect(),
      dpr = renderer.getPixelRatio();
    if (
      !texture ||
      texture.image.width !== canvas.width ||
      texture.image.height !== canvas.height
    ) {
      texture?.dispose();
      texture = new THREE.FramebufferTexture(canvas.width, canvas.height);
      texture.colorSpace = THREE.NoColorSpace;
      texture.minFilter = texture.magFilter = THREE.LinearFilter;
      uniforms.uBase.value = texture;
      metrics.allocations++;
    }
    // OutputPass has just written a fresh encoded scene to the default framebuffer.
    renderer.copyFramebufferToTexture(texture);
    metrics.captures++;
    uniforms.uSize.value.set(bounds.width, bounds.height);
    uniforms.uPixelRatio.value = dpr;
    rect.setXYZW(
      0,
      b.left - bounds.left,
      bounds.bottom - b.bottom,
      b.width,
      b.height,
    );
    shape.setXYZW(0, Math.min(12, b.height / 2), 8, 0.2, 1);
    rect.needsUpdate = shape.needsUpdate = true;
    const auto = renderer.autoClear,
      target = renderer.getRenderTarget(),
      vp = renderer.getViewport(new THREE.Vector4()),
      sc = renderer.getScissor(new THREE.Vector4()),
      scTest = renderer.getScissorTest();
    try {
      renderer.setRenderTarget(null);
      renderer.setViewport(0, 0, bounds.width, bounds.height);
      renderer.setScissorTest(false);
      renderer.autoClear = false;
      renderer.render(scene, camera);
      metrics.draws++;
      metrics.mode = "gpu-final-output";
      button.dataset.glassMode = "gpu";
    } finally {
      renderer.setRenderTarget(target);
      renderer.setViewport(vp);
      renderer.setScissor(sc);
      renderer.setScissorTest(scTest);
      renderer.autoClear = auto;
    }
  }
  return {
    draw,
    prewarm: () => renderer.compileAsync(scene, camera),
    visible,
    diagnostics: () => ({ ...metrics }),
    dispose() {
      texture?.dispose();
      geometry.dispose();
      plane.dispose();
      material.dispose();
      delete button.dataset.glassMode;
    },
  };
}
