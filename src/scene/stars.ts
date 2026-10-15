import * as THREE from "three";
import { starCells } from "../../core/grid-flight.mjs";
import { nearStar, nearStarLife } from "../../core/near-stars.mjs";
import type { Arrangement } from "../show/arrangement";
export function createStars(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
) {
  const range = Array.from(
    gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE),
  ) as number[];
  const geo = new THREE.BufferGeometry(),
    position = new Float32Array(121 * 12 * 3),
    data = new Float32Array(121 * 12 * 2),
    glints = new Float32Array(121 * 12);
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geo.setAttribute(
    "data",
    new THREE.BufferAttribute(data, 2).setUsage(THREE.DynamicDrawUsage),
  );
  geo.setAttribute(
    "glint",
    new THREE.BufferAttribute(glints, 1).setUsage(THREE.DynamicDrawUsage),
  );
  const uniforms = {
    time: { value: 0 },
    projection: { value: 1 },
    eye: { value: new THREE.Vector3() },
    range: { value: new THREE.Vector2(range[0], range[1]) },
    fade: { value: 0 },
    tint: { value: new THREE.Color(1, 1, 1) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `attribute vec2 data;attribute float glint;varying float vGlint;uniform float time,projection,fade;uniform vec2 range;uniform vec3 eye;varying float vFade;
 float smooth5(float x){float q=clamp(x,0.,1.);return q*q*q*(q*(q*6.-15.)+10.);}
 void main(){vGlint=glint;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;float depth=-p.z,age=mod(time+data.y,6.);
 float life=smooth5(age/1.1)*(1.-smooth5((age-4.7)/1.3));
 float natural=5.5*data.x*projection/max(.1,depth);gl_PointSize=clamp(natural,range.x,range.y);
 float dist=distance(position.xz,eye.xz);
 vFade=fade*life*smoothstep(1.2,4.,depth)*(1.-smoothstep(240.,300.,dist))*(1.-smoothstep(300.,330.,distance(position,eye)))*step(range.x,natural);
 vFade*=smoothstep(.8,1.8,natural);}`,
    fragmentShader: `uniform vec3 tint;varying float vFade,vGlint;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>=1.||vFade<.0001)discard;
 float core=exp(-r*r*6.),halo=.12*exp(-r*r*2.5)*(1.-smoothstep(.65,1.,r));gl_FragColor=vec4(tint*(core+halo+vGlint*.28*exp(-r*r*65.)),vFade);}`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const group = new THREE.Points(geo, material);
  group.frustumCulled = false;
  let key = "",
    samples: ReturnType<typeof nearStar>[] = [];
  function update(
    score: Arrangement,
    camera: THREE.PerspectiveCamera,
    route: THREE.Vector3,
    height: number,
    dpr: number,
  ) {
    const short = height < 500,
      per = short ? 6 : camera.aspect < 0.8 ? 8 : 12;
    const cells = starCells(route.x, route.z, { cellSize: 72, radiusCells: 5 }),
      next = `${cells[0].key}:${per}`;
    if (key !== next) {
      key = next;
      samples = cells.flatMap((c) =>
        Array.from({ length: per }, (_, i) => nearStar(c.cx, c.cz, i)),
      );
      samples.forEach((s, i) => {
        position.set([s.x, s.y, s.z], i * 3);
        data.set([s.radius, s.phase], i * 2);
        glints[i] = s.tier === "near" && s.r < 0.23 ? 1 : 0;
      });
      geo.setDrawRange(0, samples.length);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.data.needsUpdate = true;
      geo.attributes.glint.needsUpdate = true;
    }
    uniforms.time.value = ((score.airTime % 6) + 6) % 6;
    uniforms.eye.value.copy(camera.position);
    uniforms.projection.value = (height * dpr) / 2;
    uniforms.range.value.set(
      range[0],
      Math.min(range[1], (short ? 20 : 24) * dpr),
    );
    uniforms.fade.value =
      (score.reveal.stars * (1 - score.visual.blend) +
        (score.visual.phase === "song" ? 0 : score.visual.starGain) *
          score.visual.blend) *
      (score.reduced ? 0.45 : 1) *
      score.brightness;
    uniforms.tint.value
      .setRGB(1, 1, 1)
      .lerp(score.colours[0], score.lighting.skyAccent);
  }
  return {
    group,
    update,
    snapshot: () => ({ key }),
    diagnostics: () => ({
      count: samples.length,
      glintCount: samples.filter((s) => s.tier === "near" && s.r < 0.23).length,
      nearCount: samples.filter((s) => s.tier === "near").length,
      maximumY: samples.length ? Math.max(...samples.map((s) => s.y)) : null,
      minimumY: samples.length ? Math.min(...samples.map((s) => s.y)) : null,
      pointSizeRange: range,
      pointLimit: uniforms.range.value.y,
      lifeZeroEndpoints: true,
      shortViewportSupported: true,
      occlusion:
        "Post-floor-softness terrain depth prepass; complete local sprites/halos depth-tested in same MSAA color target",
      postFilterOnStars: false,
      worldStable: true,
      attenuation:
        "r42-style screen-height scaling, reference4-unit particle size calibrated once; no additional FOV multiplier",
    }),
    audit: () =>
      samples.map((s) => ({
        ...s,
        life: nearStarLife(uniforms.time.value, s.phase),
      })),
    dispose: () => {
      geo.dispose();
      material.dispose();
    },
  };
}
