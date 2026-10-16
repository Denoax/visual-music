/** Original height-field choreography. Parameters belong to each event's birth,
 * never to the current chapter: an active crest cannot change shape mid-flight.
 * All distances are metres. No horizontal vertex displacement or extra meshes.
 */
export const FORMATIONS = Object.freeze([
  {start:0, end:25, name:'circle', kind:0, angle:0, mix:0},
  {start:25, end:40, name:'oval', kind:1, angle:.25, mix:.82},
  {start:40, end:56, name:'circle', kind:0, angle:0, mix:0},
  {start:56, end:75, name:'diagonal-ridge', kind:2, angle:-Math.PI/3, mix:.84},
  {start:75, end:94, name:'chevron', kind:3, angle:-Math.PI/2, mix:.8},
  {start:94, end:106, name:'crossed-ridges', kind:4, angle:-Math.PI/2, mix:.86},
  {start:106, end:123, name:'paired-rings', kind:5, angle:0, mix:.85},
  {start:123, end:139, name:'diagonal-ridge', kind:2, angle:-Math.PI/6, mix:.86},
  {start:139, end:158, name:'circle', kind:0, angle:0, mix:0},
  {start:158, end:175, name:'oval', kind:1, angle:-.45, mix:.88},
  {start:175, end:190, name:'chevron', kind:3, angle:-Math.PI/2, mix:.84},
  {start:190, end:201, name:'crossed-ridges', kind:4, angle:-Math.PI/3, mix:.8},
  {start:201, end:Infinity, name:'circle', kind:0, angle:0, mix:0},
].map(Object.freeze));

const parameters=FORMATIONS.map(s=>Object.freeze([s.kind,Math.cos(s.angle),Math.sin(s.angle),s.mix]));
const births=new Map();
export function formationFor(seconds) {
  let f=births.get(seconds);
  if(f)return f;
  const i=FORMATIONS.findIndex(s=>seconds<s.end);
  f=parameters[i<0?parameters.length-1:i];
  if(births.size>=1024)births.delete(births.keys().next().value);
  births.set(seconds,f);
  return f;
}
export function formationMetric(dx,dz,age,form,speed=34) {
  const [kind,c,s]=form, u=dx*c+dz*s, v=-dx*s+dz*c, r=speed*age;
  if(kind<.5)return [Math.hypot(dx,dz)-r,1];
  if(kind<1.5)return [Math.hypot(u/1.35,v*1.16)-r,1];
  if(kind<2.5)return [u-r,Math.exp(-.5*(v/140)**2)];
  if(kind<3.5)return [u+.42*(Math.sqrt(v*v+144)-12)-r,Math.exp(-.5*(v/160)**2)];
  if(kind<4.5){const a=.8*u+.6*v-r,b=.8*u-.6*v-r;return [Math.abs(a)<Math.abs(b)?a:b,Math.exp(-.5*(Math.hypot(dx,dz)/240)**2)];}
  const a=Math.hypot(dx,dz)-r,b=a+24;
  return [Math.abs(a)<Math.abs(b)?a:b,1];
}
export function formationPulse(dx,dz,age,form,width=10,speed=34) {
  const radial=Math.hypot(dx,dz)-speed*age;
  const base=Math.exp(-.5*(radial/width)**2);
  if(form[0]<.5||form[3]<=0)return base;
  const [d,footprint]=formationMetric(dx,dz,age,form,speed);
  return base*(1-form[3])+Math.exp(-.5*(d/width)**2)*footprint*form[3];
}
// Compact support matters here: Gaussian tails must never wake every OFF bank.
export function formationBand(dx,dz,age,form) {
  const window=d=>{const t=Math.max(0,Math.min(1,(Math.abs(d)-1.1)/4.9));return 1-t*t*t*(t*(t*6-15)+10);};
  const base=window(Math.hypot(dx,dz)-34*age);
  const [d,footprint]=formationMetric(dx,dz,age,form);
  return base*(1-form[3])+window(d)*footprint*form[3];
}
// A signed phase travels with the physical crest. Its amplitude is local and
// finite; band envelopes scale this motion rather than rotating the whole LUT.
export function crestChroma(dx,dz,age,form,life=1) {
  const [d,footprint]=formationMetric(dx,dz,age,form);
  const u=dx*form[1]+dz*form[2],v=-dx*form[2]+dz*form[1],r=34*age;
  const lobe=d=>Math.sin(d*.085)*Math.exp(-.5*(d/18)**2);
  let shaped=lobe(d)*footprint;
  if(form[0]>3.5&&form[0]<4.5)shaped=.5*(lobe(.8*u+.6*v-r)+lobe(.8*u-.6*v-r))*footprint;
  else if(form[0]>4.5)shaped=.5*(lobe(Math.hypot(dx,dz)-r)+lobe(Math.hypot(dx,dz)-r+24));
  return (lobe(Math.hypot(dx,dz)-r)*(1-form[3])+shaped*form[3])*life;
}
export const formationGLSL = `
vec2 wfMetric(vec2 d,float age,vec4 f){
 float u=dot(d,f.yz),v=dot(d,vec2(-f.z,f.y)),r=34.*age;
 if(f.x<.5)return vec2(length(d)-r,1.);
 if(f.x<1.5)return vec2(length(vec2(u/1.35,v*1.16))-r,1.);
 if(f.x<2.5)return vec2(u-r,exp(-.5*(v/140.)*(v/140.)));
 if(f.x<3.5)return vec2(u+.42*(sqrt(v*v+144.)-12.)-r,exp(-.5*(v/160.)*(v/160.)));
 if(f.x<4.5){float a=.8*u+.6*v-r,b=.8*u-.6*v-r;return vec2(abs(a)<abs(b)?a:b,exp(-.5*dot(d,d)/(240.*240.)));}
 float a=length(d)-r,b=a+24.;return vec2(abs(a)<abs(b)?a:b,1.);
}
float wfChromaLobe(float d){return sin(d*.085)*exp(-.5*d*d/(18.*18.));}
float wfBandWindow(float d){float t=clamp((abs(d)-1.1)/4.9,0.,1.);return 1.-t*t*t*(t*(t*6.-15.)+10.);}
float wfBand(vec2 d,float age,vec4 f){vec2 m=wfMetric(d,age,f);return mix(wfBandWindow(length(d)-34.*age),wfBandWindow(m.x)*m.y,f.w);}
float wfChroma(vec2 d,float age,vec4 f){
 vec2 m=wfMetric(d,age,f);float shape=wfChromaLobe(m.x)*m.y;
 float u=dot(d,f.yz),v=dot(d,vec2(-f.z,f.y)),r=34.*age;
 if(f.x>3.5&&f.x<4.5)shape=.5*(wfChromaLobe(.8*u+.6*v-r)+wfChromaLobe(.8*u-.6*v-r))*m.y;
 else if(f.x>4.5)shape=.5*(wfChromaLobe(length(d)-r)+wfChromaLobe(length(d)-r+24.));
 return mix(wfChromaLobe(length(d)-r),shape,f.w);
}
float wfPulse(vec2 d,float age,vec4 f,float width){
 float q=(length(d)-34.*age)/width,base=exp(-.5*q*q);
 if(f.x<.5||f.w<=0.)return base;
 vec2 m=wfMetric(d,age,f);float n=m.x/width;
 return mix(base,exp(-.5*n*n)*m.y,f.w);
}
`;
