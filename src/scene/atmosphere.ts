import * as THREE from "three";
import {
  seeded,
  terrainHeight,
  type ShowFrame,
  type Burst,
  particleAt,
} from "../show/choreography";
import type { ScoreEvent } from "../show/cues";
import { shader, type ShowUniforms } from "./materials";
export function createAtmosphere(uniforms: ShowUniforms, low: boolean) {
  const group = new THREE.Group(),
    random = seeded(1204);
  const sky = shader(
    uniforms,
    `varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    `
varying vec3 vDirection;
void main(){vec3 d=normalize(vDirection);float haze=exp(-pow((d.y+.035)*6.,2.));float side=.5+.5*sin(d.x*3.+uPalette*3.);
 vec3 c=vec3(.0008,.0018,.006)+mix(vec3(.005,.012,.042),vec3(.035,.005,.031),side)*haze*.75;
 gl_FragColor=vec4(c*uBrightness,1.);}`,
    { side: THREE.BackSide, depthWrite: false },
  );
  const dome = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), sky);
  dome.renderOrder = -10;
  group.add(dome);
  const positions: number[] = [],
    sizes: number[] = [],
    layers: number[] = [],
    seeds: number[] = [];
  const count = low ? 700 : 1300;
  for (let i = 0; i < count; i++) {
    const layer = i < count * 0.65 ? 0 : i < count * 0.9 ? 1 : 2;
    positions.push(
      (random() - 0.5) * 360,
      layer === 2 ? 12 + random() * 38 : 12 + random() * 180,
      180 - random() * 720,
    );
    sizes.push(
      layer === 0
        ? 0.06 + random() * 0.1
        : layer === 1
          ? 0.2 + random() * 0.4
          : 0.6 + random() * 1.6,
    );
    layers.push(layer);
    seeds.push(random());
  }
  const stars = new THREE.BufferGeometry();
  for (const [key, values, size] of [
    ["position", positions, 3],
    ["aSize", sizes, 1],
    ["aLayer", layers, 1],
    ["aSeed", seeds, 1],
  ] as [string, number[], number][])
    stars.setAttribute(key, new THREE.Float32BufferAttribute(values, size));
  const dots = shader(
    uniforms,
    `
attribute float aSize,aLayer,aSeed;uniform float uPixelRatio;varying float vLayer,vSeed;varying vec3 vWorld;
void main(){vLayer=aLayer;vSeed=aSeed;vec3 p=position;p.x+=sin(uTime*.09+aSeed*18.)*aLayer*.8;p.y+=cos(uTime*.07+aSeed*12.)*aLayer*.5;
 vWorld=p;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*800.*uPixelRatio/-mv.z,1.,aLayer<.5?4.:100.);}
`,
    `
varying float vLayer,vSeed;varying vec3 vWorld;
void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;
 float a=vLayer<.5?exp(-r*r*10.):exp(-r*r*3.5)*(1.-smoothstep(.65,1.,r))*.45;
 vec3 c=vLayer<.5?vec3(.35,.52,.75):colour(vSeed*14.,.5)*.6;
 gl_FragColor=vec4(c*a*uBrightness*(1.-fogAmount(vWorld)*.5),a);
}`,
    { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending },
  );
  const motes = new THREE.Points(stars, dots);
  motes.frustumCulled = false;
  group.add(motes);
  const beams: { mesh: THREE.Group; x: number; z: number; seed: number }[] = [];
  const coneMaterial = shader(
    uniforms,
    `
varying vec3 vWorld,vNormal;varying vec2 vUv;
void main(){vUv=uv;vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*p;}
`,
    `
uniform float uCore; varying vec3 vWorld,vNormal;varying vec2 vUv;
void main(){float facing=abs(dot(normalize(vNormal),normalize(uEye-vWorld)));
 float profile=pow(facing,1.6)*smoothstep(0.,.16,vUv.y)*(1.-smoothstep(.72,1.,vUv.y));
 float a=profile*(.18+uCore*.7)*uBeams*(1.-fogAmount(vWorld));
 vec3 c=colour(vWorld.z*.035,.8);gl_FragColor=vec4(c*a*uBrightness,a);
}`,
    {
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    },
  );
  coneMaterial.uniforms = { ...uniforms, uCore: { value: 0 } };
  const coreMaterial = coneMaterial.clone();
  coreMaterial.uniforms = { ...uniforms, uCore: { value: 1 } };
  const cone = new THREE.ConeGeometry(5, 38, 32, 1, true);
  cone.rotateX(Math.PI);
  cone.translate(0, 19, 0);
  const core = new THREE.ConeGeometry(0.16, 38, 12, 1, true);
  core.rotateX(Math.PI);
  core.translate(0, 19, 0);
  for (let i = 0; i < 12; i++) {
    const x = (i % 2 ? -1 : 1) * (23 + random() * 32),
      z = 110 - Math.floor(i / 2) * 78;
    const mesh = new THREE.Group();
    mesh.add(
      new THREE.Mesh(cone, coneMaterial),
      new THREE.Mesh(core, coreMaterial),
    );
    mesh.position.set(x, terrainHeight(x, z), z);
    group.add(mesh);
    beams.push({ mesh, x, z, seed: i * 0.61 });
  }
  function update(frame: ShowFrame, reduced: boolean) {
    dome.position.fromArray(frame.position);
    for (const beam of beams) {
      const sweep = reduced
        ? 0.15
        : Math.sin(frame.seconds * 0.12 + beam.seed) * 0.42;
      beam.mesh.rotation.z = sweep * (1 + frame.beamFan * 0.75);
      beam.mesh.rotation.x = Math.sin(frame.seconds * 0.09 + beam.seed) * 0.24;
    }
  }
  return { group, update };
}
export function createBursts(uniforms: ShowUniforms, events: ScoreEvent[]) {
  const maxBursts = 8,
    perBurst = 48,
    count = maxBursts * perBurst;
  const positions = new Float32Array(count * 3),
    alphas = new Float32Array(count);
  positions.fill(10000);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
  const material = shader(
    uniforms,
    `attribute float aAlpha;varying float vAlpha;uniform float uPixelRatio;void main(){vAlpha=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(120.*uPixelRatio/-mv.z,1.5,8.);}`,
    `varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.||vAlpha<=0.)discard;float a=exp(-r*r*5.)*vAlpha;gl_FragColor=vec4(vec3(.18,.62,.92)*a,a);}`,
    { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending },
  );
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const interactions: Burst[] = [];
  function add(burst: Burst) {
    interactions.push(burst);
    if (interactions.length > 6) interactions.shift();
  }
  function reset() {
    interactions.length = 0;
  }
  function update(seconds: number, reduced: boolean) {
    const scored = events
      .filter(
        (e) =>
          ["particle_burst", "group_release"].includes(e.type) &&
          seconds >= e.seconds &&
          seconds - e.seconds < 3,
      )
      .map((e) => ({
        seconds: e.seconds,
        seed: e.seed,
        position: [
          e.params.x,
          terrainHeight(e.params.x, e.params.z) + 5,
          e.params.z,
        ] as [number, number, number],
      }));
    const active = [
      ...scored,
      ...interactions.filter(
        (e) => seconds >= e.seconds && seconds - e.seconds < 3,
      ),
    ].slice(-maxBursts);
    alphas.fill(0);
    for (let b = 0; b < active.length; b++)
      for (let i = 0; i < perBurst; i++) {
        const p = particleAt(active[b], i, seconds);
        if (!p) continue;
        const index = b * perBurst + i;
        positions.set(p, index * 3);
        alphas[index] =
          (1 - (seconds - active[b].seconds) / 3) * (reduced ? 0.2 : 0.65);
      }
    geometry.getAttribute("position").needsUpdate = true;
    geometry.getAttribute("aAlpha").needsUpdate = true;
  }
  return { points, add, reset, update };
}
