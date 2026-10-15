import * as THREE from "three";
/** Original quad-wire material inspired by documented barycentric rendering.
 * Compatible existing landscape owner uniforms; use only on new GLBs.
 * Do not use built-in wireframe=true: it would reintroduce every diagonal.
 */
export function retroMountainMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColorA: { value: new THREE.Color("#55d9ff") },
      uColorB: { value: new THREE.Color("#b468ff") },
      uAge: { value: 0 },
      uGain: { value: 0 },
      uBand: { value: 0.5 },
      uHeight: { value: 120 },
      uPulse: { value: 0 },
      uFill: { value: 0.006 },
      uFin: { value: 0 },
      uContourSpacing: { value: 14 },
      uFineGain: { value: 0 },
      uLinePixels: { value: 0.72 },
      uHaloPixels: { value: 2.6 },
    },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    forceSinglePass: true,
    vertexShader: `
      attribute vec3 _barycentric,_edge_mask,_coarse_mask;
      varying vec3 vBary,vMask,vCoarse,vLocal,vNormal;
      void main(){vBary=_barycentric;vMask=_edge_mask;vCoarse=_coarse_mask;vLocal=position;
        vNormal=normalize(mat3(modelMatrix)*normal);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
    `,
    fragmentShader: `
      uniform vec3 uColorA,uColorB;
      uniform float uAge,uGain,uBand,uHeight,uPulse,uFill,uLinePixels,uHaloPixels,uFineGain;
      varying vec3 vBary,vMask,vCoarse,vLocal,vNormal;
      void main(){
        // Each barycentric component vanishes on the opposite edge. Masked
        // components cannot contribute; fwidth keeps widths in physical pixels.
        vec3 px=max(fwidth(vBary),vec3(.00001));
        vec3 d=mix(vec3(10000.),vBary/px,step(.5,vMask));
        float edge=min(d.x,min(d.y,d.z));
        vec3 cd=mix(vec3(10000.),vBary/px,step(.5,vCoarse));float coarse=min(cd.x,min(cd.y,cd.z));
        float core=max(1.-smoothstep(max(0.,uLinePixels-.45),uLinePixels+.45,coarse),uFineGain*(1.-smoothstep(max(0.,uLinePixels-.45),uLinePixels+.45,edge)));
        float halo=max(exp(-pow(coarse/max(.1,uHaloPixels),2.)),uFineGain*exp(-pow(edge/max(.1,uHaloPixels),2.)))*.10;
        // Reject unresolved dense far grids instead of turning them into a solid glow.
        float resolved=1.-smoothstep(.12,.35,max(px.x,max(px.y,px.z)));
        float y=clamp(vLocal.y/max(.01,uHeight),0.,1.);
        float sweep=exp(-pow((y-uBand)/.16,2.));
        float sector=.25+.75*pow(.5+.5*sin(vLocal.x*.019+uAge*.22),2.);
        float breathe=.86+.14*sin(uAge*.45+y*3.);
        float gain=max(0.,uGain)*breathe;
        float energy=.24+sector*(.28+.20*sweep*clamp(uPulse,0.,1.));
        float foot=smoothstep(0.,.06,y);
        vec3 colour=mix(uColorA,uColorB,smoothstep(.1,.9,y));
        float l=dot(colour,vec3(.2126,.7152,.0722));
        vec3 pearl=mix(colour,vec3(l),.58);
        float facet=.4+.6*max(0.,dot(normalize(vNormal),normalize(vec3(-.3,.8,.2))));
        vec3 light=((pearl*core*.65+colour*halo)*resolved*energy+colour*uFill*facet)*gain*foot;
        if(max(light.r,max(light.g,light.b))<.00001)discard;
        // Additive energy stored in RGB, alpha=1 avoids accidentally squaring gain.
        gl_FragColor=vec4(light,1.);
      }
    `,
  });
}
