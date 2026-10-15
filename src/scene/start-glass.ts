import * as THREE from "three";
import { glassOptics } from "../ui/glass-optics";
/** Owned portfolio 08eb0e5 glass. One clean encoded capture for every native
 * button; no feedback, second renderer, blurred labels or displaced hitboxes. */
export function createStartGlass(renderer: THREE.WebGLRenderer) {
  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>(
      "#start,#settings-button,#settings button",
    ),
  ];
  const plane = new THREE.PlaneGeometry(1, 1),
    geometry = new THREE.InstancedBufferGeometry();
  geometry.index = plane.index;
  geometry.attributes.position = plane.attributes.position;
  const rect = new THREE.InstancedBufferAttribute(
    new Float32Array(buttons.length * 4),
    4,
  );
  const shape = new THREE.InstancedBufferAttribute(
    new Float32Array(buttons.length * 4),
    4,
  );
  const optics = new THREE.InstancedBufferAttribute(
    new Float32Array(buttons.length * 4),
    4,
  );
  const parent = new THREE.InstancedBufferAttribute(
    new Float32Array(buttons.length * 4),
    4,
  );
  const front = new THREE.InstancedBufferAttribute(
    new Float32Array(buttons.length * 2),
    2,
  );
  const clips = new THREE.InstancedBufferAttribute(
    new Float32Array(buttons.length * 4),
    4,
  );
  geometry.setAttribute("aClip", clips);
  geometry.setAttribute("aRect", rect);
  geometry.setAttribute("aShape", shape);
  geometry.setAttribute("aOptics", optics);
  geometry.setAttribute("aParent", parent);
  geometry.setAttribute("aFront", front);
  geometry.instanceCount = 0;
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
    vertexShader: `precision highp float;attribute vec3 position;attribute vec4 aClip;varying vec4 vClip;attribute vec4 aRect,aShape,aOptics,aParent;attribute vec2 aFront;uniform vec2 uSize;varying vec4 vRect,vShape,vOptics,vParent;varying vec2 vFront;void main(){vClip=aClip;vRect=aRect;vShape=aShape;vOptics=aOptics;vParent=aParent;vFront=aFront;vec2 p=aRect.xy-vec2(2.)+(position.xy+.5)*(aRect.zw+vec2(4.));gl_Position=vec4(p/uSize*2.-1.,0.,1.);}`,
    fragmentShader: `precision highp float;varying vec4 vClip;uniform sampler2D uBase;uniform vec2 uSize;uniform float uPixelRatio,uLight;varying vec4 vRect,vShape,vOptics,vParent;varying vec2 vFront;
      void main(){
        vec2 p=gl_FragCoord.xy/uPixelRatio;
        if(p.x<vClip.x||p.y<vClip.y||p.x>vClip.z||p.y>vClip.w)discard;
        float arrival=p.y-(vRect.y+vRect.w-vFront.x);
        if(arrival<0.)discard;
        float ownership=vFront.y>.001?smoothstep(0.,vFront.y,arrival):1.;
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
        float shift=bevel*vOptics.y*rim*rim*(3.-2.*rim);
        // The center magnifies the actual clean backdrop about this pane;
        // rim displacement is continuous with that affine sample map.
        float magnification=vOptics.x;
        vec2 center=vRect.xy+halfSize;
        vec2 samplePoint=center+local/magnification;
        if(vParent.w>.5)samplePoint=vParent.xy+(samplePoint-vParent.xy)/vParent.z;
        vec2 uv=samplePoint/uSize;
        vec2 bend=normal*shift/uSize;
        float fringe=vOptics.z*rim*rim;
        vec2 rgbOffset=normal*fringe/uSize;
        vec3 color=vec3(texture2D(uBase,clamp(uv-bend-rgbOffset,0.,1.)).r,
          texture2D(uBase,clamp(uv-bend,0.,1.)).g,
          texture2D(uBase,clamp(uv-bend+rgbOffset,0.,1.)).b);
        vec2 rough=vec2(vOptics.w)/uSize;
        vec3 softened=(texture2D(uBase,clamp(uv-bend+vec2(rough.x,0.),0.,1.)).rgb+texture2D(uBase,clamp(uv-bend-vec2(rough.x,0.),0.,1.)).rgb+texture2D(uBase,clamp(uv-bend+vec2(0.,rough.y),0.,1.)).rgb+texture2D(uBase,clamp(uv-bend-vec2(0.,rough.y),0.,1.)).rgb)*.25;
        color=mix(color,softened,.24);
        bool panel=vShape.z>.5;
        // The encoded neutral substrate must remain visible on black. Keep the
        // existing 12% film mix, backdrop detail and lens map unchanged.
        vec3 film=panel?vec3(.018,.025,.035):mix(vec3(.52),vec3(.55,.59,.63),uLight);
        color=mix(color,film,panel?0.:vShape.z);
        // Pane absorption is applied once above both the GL and native DOM layers.
        float lighting=max(0.,dot(normal,normalize(vec2(-.5,1.))));
        float rimLight=pow(rim,3.)*(.012+.07*lighting);
        color+=vec3(rimLight);
        color+=pow(rim,2.)*.005;
        gl_FragColor=vec4(color,vShape.w*(1.-smoothstep(-aa,aa,distance))*ownership);
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
    surfaces: 0,
    mode: "inactive",
    encodedOutput: true,
    nativeLabel: true,
    ownedRef: "08eb0e5",
  };
  function alpha(button: HTMLElement) {
    if (button.closest("[hidden]") || !button.getClientRects().length) return 0;
    let opacity = 1;
    for (let node: HTMLElement | null = button; node; node = node.parentElement)
      opacity *= Number(getComputedStyle(node).opacity);
    return opacity;
  }
  const visible = () => buttons.some((button) => alpha(button) > 0.001);
  // GPU surfaces obey the same viewport and scrolling/overflow clips as their
  // native labels. getClientRects alone includes offscreen scroll children.
  function clipFor(button: HTMLElement) {
    let left = 0,
      top = 0,
      right = innerWidth,
      bottom = innerHeight;
    for (let node = button.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node),
        r = node.getBoundingClientRect();
      if (style.overflowX !== "visible") {
        left = Math.max(left, r.left + node.clientLeft);
        right = Math.min(right, r.left + node.clientLeft + node.clientWidth);
      }
      if (style.overflowY !== "visible") {
        top = Math.max(top, r.top + node.clientTop);
        bottom = Math.min(bottom, r.top + node.clientTop + node.clientHeight);
      }
    }
    return { left, top, right, bottom };
  }
  function draw() {
    if (fallback.matches) {
      buttons.forEach((b) => (b.dataset.glassMode = "solid"));
      metrics.mode = "solid";
      return;
    }
    const active = buttons.filter((button) => {
      if (alpha(button) <= 0.001) return false;
      const b = button.getBoundingClientRect(),
        c = clipFor(button);
      return (
        b.right > c.left &&
        b.left < c.right &&
        b.bottom > c.top &&
        b.top < c.bottom
      );
    });
    metrics.surfaces = active.length;
    if (!active.length) {
      metrics.mode = "inactive";
      return;
    }
    const canvas = renderer.domElement,
      bounds = canvas.getBoundingClientRect(),
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
    renderer.copyFramebufferToTexture(texture);
    metrics.captures++;
    uniforms.uSize.value.set(bounds.width, bounds.height);
    uniforms.uPixelRatio.value = dpr;
    active.forEach((button, i) => {
      const b = button.getBoundingClientRect(),
        style = getComputedStyle(button),
        radius = parseFloat(style.borderTopLeftRadius) || 12,
        profile = glassOptics(
          b.width,
          b.height,
          radius,
          false,
          button.closest("dialog") !== null,
        );
      rect.setXYZW(
        i,
        b.left - bounds.left,
        bounds.bottom - b.bottom,
        b.width,
        b.height,
      );
      const clip = clipFor(button);
      clips.setXYZW(
        i,
        clip.left - bounds.left,
        bounds.bottom - clip.bottom,
        clip.right - bounds.left,
        bounds.bottom - clip.top,
      );
      shape.setXYZW(i, profile.radius, profile.bevel, 0.12, alpha(button));
      optics.setXYZW(
        i,
        profile.magnification,
        profile.bend,
        profile.fringe,
        profile.roughness,
      );
      parent.setXYZW(i, 0, 0, 1, 0);
      front.setXY(i, b.height + 4, 0);
      button.dataset.glassMode = "gpu";
    });
    geometry.instanceCount = active.length;
    [rect, shape, optics, parent, front, clips].forEach(
      (a) => (a.needsUpdate = true),
    );
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
    visible,
    prewarm: () => renderer.compileAsync(scene, camera),
    diagnostics: () => ({ ...metrics }),
    dispose() {
      texture?.dispose();
      geometry.dispose();
      plane.dispose();
      material.dispose();
      buttons.forEach((b) => delete b.dataset.glassMode);
    },
  };
}
