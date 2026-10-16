// Original low-overdraw projected-light surface. Compile/test in current app.
import * as THREE from "three";
export function projectionMaterial({ fin = false } = {}) {
  const uniforms = {
    uColorA: { value: new THREE.Color("#a5e4ed") },
    uColorB: { value: new THREE.Color("#615d91") },
    uAge: { value: 0 },
    uGain: { value: 0 },
    uFin: { value: 0 },
    uBand: { value: 0 },
    uHeight: { value: 120 },
    uContourSpacing: { value: 9 },
    uPulse: { value: 0 },
    uFill: { value: 0.018 },
  };
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: fin ? THREE.DoubleSide : THREE.FrontSide,
    forceSinglePass: true,
    vertexShader: `varying vec3 vLocal,vWorld,vNormal;void main(){vLocal=position;vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `
   uniform vec3 uColorA,uColorB;uniform float uAge,uGain,uBand,uHeight,uContourSpacing,uPulse,uFill,uFin;
   varying vec3 vLocal,vWorld,vNormal;
   void main(){
    float y=vLocal.y/max(uHeight,.01);
    float c=vLocal.y/max(uContourSpacing,.1),aa=max(fwidth(c),.0001);
    float d=abs(fract(c+.5)-.5);
    float lines=(1.-smoothstep(aa*.65,aa*2.2,d))*(1.-smoothstep(.16,.36,aa));
    float sweep=y+vLocal.x*.0025*sin(uAge*.12);
    float band=exp(-pow((sweep-uBand)/mix(.08,.15,uFin),2.));
    float sector=.22+.78*pow(.5+.5*sin(vLocal.x*.021+uAge*.32),2.);
    lines*=sector*(.24+.76*exp(-pow((y-uBand)/.38,2.)));
    float shape=smoothstep(0.,.12,y),facet=.45+.55*max(0.,dot(normalize(vNormal),normalize(vec3(-.4,.8,.2))));
    float slow=.9+.1*sin(uAge*.55+y*4.);
    // Accents energise a travelling band, not the entire mountain.
    float light=(lines*.24+band*(.13+.10*clamp(uPulse,0.,1.))+uFill)*facet*shape*uGain*slow;
    if(light<.0001)discard;
    vec3 colour=mix(uColorA,uColorB,smoothstep(.1,.95,y));
    gl_FragColor=vec4(colour,clamp(light,0.,.32));
   }`,
  });
}
