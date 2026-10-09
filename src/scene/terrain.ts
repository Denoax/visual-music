import * as THREE from "three";
import { seeded, terrainHeight } from "../show/choreography";
import { shader, type ShowUniforms } from "./materials";
export function createTerrain(uniforms: ShowUniforms, low: boolean) {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(
    250,
    650,
    low ? 112 : 192,
    low ? 240 : 384,
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, -120);
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++)
    positions.setY(i, terrainHeight(positions.getX(i), positions.getZ(i)));
  geometry.computeVertexNormals();
  const material = shader(
    uniforms,
    `
varying vec3 vWorld,vNormal;
void main(){vec3 p=position; p.y+=wave(p.xz)*.65; vWorld=p;vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}
`,
    `
uniform vec4 uPools[6]; varying vec3 vWorld,vNormal;
void main(){
 float h=vWorld.y;
 float phase=h*2.4+sin(vWorld.z*.013)*1.8;
 float d=abs(sin(phase));
 float width=max(fwidth(phase)*1.2,.025);
 float line=1.-smoothstep(width,width+.11,d);
 float halo=exp(-d*5.)*.18;
 float crest=smoothstep(-4.,4.,h);
 float travel=.55+.45*sin(vWorld.z*.05+vWorld.x*.012-uTime*.7);
 vec3 tint=colour(vWorld.z*.025+vWorld.x*.01+h*.19,.5);
 vec3 base=vec3(.0015,.003,.009)+vec3(.007,.012,.025)*crest;
 vec3 c=base+tint*(line*.48+halo)*(.25+uRibbons*.75)*(.55+crest*.45)*(.8+travel*.2);
 c+=tint*wave(vWorld.xz)*.24;
 for(int i=0;i<6;i++){vec2 delta=vWorld.xz-uPools[i].xz;float pool=exp(-dot(delta,delta)/max(1.,uPools[i].w*uPools[i].w*7.));c+=colour(uPools[i].y,.7)*pool*.028*(.5+crest*.5);}
 gl_FragColor=vec4(litFog(c,vWorld),1.);
}`,
  );
  group.add(new THREE.Mesh(geometry, material));
  const random = seeded(419),
    points: number[] = [],
    sizes: number[] = [],
    seeds: number[] = [];
  const step = low ? 2.3 : 1.6;
  for (let z = -440; z < 205; z += step)
    for (let x = -120; x < 120; x += step) {
      const px = x + (random() - 0.5) * step * 0.4,
        pz = z + (random() - 0.5) * step * 0.4;
      points.push(px, terrainHeight(px, pz) + 0.08, pz);
      sizes.push(0.055 + random() * 0.08);
      seeds.push(random());
    }
  const dots = new THREE.BufferGeometry();
  dots.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  dots.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
  dots.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
  const lights = shader(
    uniforms,
    `
attribute float aSize,aSeed;uniform float uPixelRatio;varying float vSeed,vStrength;varying vec3 vWorld;
void main(){vec3 p=position;p.y+=wave(p.xz)*.65;vWorld=p;vSeed=aSeed;
 float crest=smoothstep(-5.,5.,p.y);float enabled=1.-smoothstep(uDensity-.03,uDensity+.05,aSeed);
 vStrength=enabled*(.25+crest*.75)*(1.+wave(p.xz)*1.4);
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
 gl_PointSize=clamp(aSize*800.*uPixelRatio/-mv.z,2.0,12.*uPixelRatio);
}`,
    `
varying float vSeed,vStrength;varying vec3 vWorld;
void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;
 float a=exp(-r*r*6.)*vStrength;
 vec3 c=colour(vWorld.z*.025+vWorld.x*.01,vSeed)*(1.6+.07*uLow);
 gl_FragColor=vec4(litFog(c,vWorld)*a,a);
}`,
    { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending },
  );
  const field = new THREE.Points(dots, lights);
  field.frustumCulled = false;
  group.add(field);
  return group;
}
