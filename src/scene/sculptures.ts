import * as THREE from "three";
import {
  seeded,
  terrainHeight,
  type ShowFrame,
  type Vec3,
} from "../show/choreography";
import { shader, type ShowUniforms } from "./materials";
export interface Sculpture {
  center: Vec3;
  radius: number;
  seed: number;
  group: number;
}
const placement = (count: number): Sculpture[] => {
  const random = seeded(717),
    list: Sculpture[] = [];
  // A few deliberate near silhouettes establish scale in the loaded entrance.
  for (const [x, z, r] of [
    [-11, 114, 4.6],
    [14, 98, 5.8],
    [-22, 79, 4.3],
    [8, 59, 3.1],
    [-9, 12, 5.3],
    [16, -25, 5.7],
    [-12, -68, 5],
    [14, -130, 5.5],
    [-10, -200, 5.8],
    [17, -248, 6.2],
    [-6, -290, 4.5],
    [8, -320, 5.2],
  ])
    list.push({
      center: [x, terrainHeight(x, z) + r * 0.66, z],
      radius: r,
      seed: 0.12 + random() * 0.05,
      group: list.length % 3,
    });
  for (let i = list.length; i < count; i++) {
    let x = (random() - 0.5) * 205,
      z = 190 - random() * 640;
    if (Math.abs(x) < 7) x += x < 0 ? -9 : 9;
    const r = 0.6 + Math.pow(random(), 2) * 3;
    list.push({
      center: [x, terrainHeight(x, z) + r * 0.66, z],
      radius: r,
      seed: random(),
      group: i % 3,
    });
  }
  return list;
};
const deformation = `
attribute vec3 aCenter;attribute float aRadius,aSeed,aGroup;
varying vec3 vWorld,vNormal;varying float vSeed,vLocal;
float groupPulse(){return aGroup<.5?uGroupPulse.x:aGroup<1.5?uGroupPulse.y:uGroupPulse.z;}
vec3 center(){vec3 c=aCenter;c.y+=(uMorph+groupPulse()*.12)*aRadius*1.75+uRelease*(32.+aSeed*24.);c.x+=uRelease*sin(aGroup*2.1)*3.;return c;}
float growth(){return .35+.65*(1.-smoothstep(uDensity-.05,uDensity+.05,aSeed));}
`;
export function sculpturePosition(s: Sculpture, frame: ShowFrame): Vec3 {
  return [
    s.center[0] + frame.release * Math.sin(s.group * 2.1) * 3,
    s.center[1] +
      (frame.morph + frame.groupPulse[s.group] * 0.12) * s.radius * 1.75 +
      frame.release * (32 + s.seed * 24),
    s.center[2],
  ];
}
export function createSculptures(uniforms: ShowUniforms, low: boolean) {
  const sculptures = placement(low ? 260 : 360),
    group = new THREE.Group();
  const base = new THREE.SphereGeometry(1, low ? 32 : 48, low ? 24 : 32);
  function instanced(geometry: THREE.BufferGeometry) {
    const g = new THREE.InstancedBufferGeometry();
    g.index = geometry.index;
    g.attributes = geometry.attributes;
    g.instanceCount = sculptures.length;
    g.setAttribute(
      "aCenter",
      new THREE.InstancedBufferAttribute(
        new Float32Array(sculptures.flatMap((s) => s.center)),
        3,
      ),
    );
    for (const [key, values] of [
      ["aRadius", sculptures.map((s) => s.radius)],
      ["aSeed", sculptures.map((s) => s.seed)],
      ["aGroup", sculptures.map((s) => s.group)],
    ] as [string, number[]][])
      g.setAttribute(
        key,
        new THREE.InstancedBufferAttribute(new Float32Array(values), 1),
      );
    return g;
  }
  const material = shader(
    uniforms,
    deformation +
      `
void main(){
 float drop=clamp(uMorph*(.65+aSeed*.35)+groupPulse()*.15,0.,1.2);vec3 p=position;
 float taper=mix(1.,(.03+.97*smoothstep(-.7,.18,p.y)),drop);
 p.xz*=taper;p.y-=drop*2.2*pow(max(0.,-p.y),1.6);
 float scale=aRadius*growth();p*=scale;
 p.y+=sin(aSeed*12.+uTime*.2)*.12*uRelease;
 vWorld=center()+p;vNormal=normalize(vec3(normal.x,normal.y/(1.+drop*.6),normal.z));vLocal=position.y;vSeed=aSeed+aGroup*.7;
 gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);
}`,
    `
varying vec3 vWorld,vNormal;varying float vSeed,vLocal;
void main(){
 vec3 n=normalize(vNormal),view=normalize(uEye-vWorld);
 float facing=max(0.,dot(n,view));float rim=pow(1.-facing,2.4);
 float light=pow(max(0.,dot(n,normalize(vec3(-.45,.65,.7)))),2.);
 vec3 c=colour(vSeed*5.,vLocal);
 vec3 deep=colour(vSeed*5.,-.9)*.16;
 c=mix(deep,c,smoothstep(-.7,.6,vLocal))*(.36+light*.57);
 c+=colour(vSeed*5.,.7)*rim*.9;
 float glint=pow(max(0.,dot(reflect(-normalize(vec3(-.4,.8,.7)),n),view)),32.);
 c+=vec3(.04,.065,.08)*glint;
 c+=colour(vSeed*5.,.8)*pow(facing,7.)*smoothstep(-.3,.7,vLocal)*.35;
 c*=1.+uLow*.045+uAccent*.06;
 gl_FragColor=vec4(litFog(c,vWorld),1.);
}`,
  );
  const forms = new THREE.Mesh(instanced(base), material);
  forms.frustumCulled = false;
  group.add(forms);
  const glowMaterial = shader(
    uniforms,
    deformation +
      `
varying vec2 vUv;
void main(){vUv=uv;vSeed=aSeed+aGroup*.7;vec3 c=center();vec4 mv=viewMatrix*vec4(c,1.);
 mv.xy+=position.xy*aRadius*growth()*3.2;vWorld=c;gl_Position=projectionMatrix*mv;
}`,
    `
varying vec2 vUv;varying vec3 vWorld;varying float vSeed,vLocal;
void main(){float r=length(vUv-.5)*2.;if(r>1.)discard;float a=exp(-r*r*5.5)*.23*(1.-smoothstep(.65,1.,r));
 vec3 c=colour(vSeed*5.,.7)*(1.-fogAmount(vWorld));gl_FragColor=vec4(c*a*uBrightness,a);
}`,
    { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending },
  );
  const glows = new THREE.Mesh(
    instanced(new THREE.PlaneGeometry(2, 2)),
    glowMaterial,
  );
  glows.frustumCulled = false;
  glows.renderOrder = 2;
  group.add(glows);
  return { group, sculptures };
}
