import { denseLayerAt } from "../../core/opening-layers.mjs";
import { WAVE } from "./waves";
import sections from "../../show/lyrical-sections.json";
import {
  smooth5,
  entryGain,
  paletteRgb,
  shortHue,
} from "../../core/lighting-recipes.mjs";
export const FLOOR = Object.freeze({
  pitch: 1.5,
  desktopCaps: 768,
  portraitCaps: 384,
  mount: 0.04,
  radius: 0.34,
  height: 0.24,
});
export function globalLightingAt(seconds: number, reduced = false) {
  const index = Math.max(
    0,
    sections.sections.findIndex((s) => seconds < s.end),
  );
  const s =
      sections.sections[
        seconds >= 219.66579166666668 ? sections.sections.length - 1 : index
      ],
    previous = sections.sections[Math.max(0, index - 1)];
  return {
    id: s.name,
    mode: s.name,
    kind: s.kind,
    previousKind: previous.kind,
    family: s.family,
    previousFamily: previous.family,
    familyName: ["white", "ice", "violet", "warm", "rainbow"][s.family],
    sectionStart: s.start,
    sectionEnd: s.end,
    actor: s.actor,
    phase: seconds * 0.18,
    phaseActive: !reduced,
    paletteGain: 1,
    scoreGain: 1,
    handoff: 2,
    density: s.kind === 0 ? 0.36 : s.kind === 10 ? 0.46 : 0.5,
    axis: 0,
    angle: s.kind === 3 ? Math.PI / 6 : s.kind === 5 ? -Math.PI / 6 : 0,
    dense: denseLayerAt(seconds, sections.sections).weight,
    densePrepare: denseLayerAt(seconds, sections.sections).prepare,
    strips:
      s.kind === 3
        ? Math.min(0.75, 0.25 + (seconds - s.start) * 0.022)
        : s.kind === 5
          ? 0.35
          : 0,
    rings: s.kind === 2 ? 1 : 0,
    skyAccent: s.actor === "beams" ? 0.06 : 0,
    reduced,
  };
}
export type GlobalLighting = ReturnType<typeof globalLightingAt>;
export function revealAt(seconds: number, _endAge: number | null = null) {
  // Actual natural-end return is blended in the presentation layer; never black out.
  const exit = 1;
  return {
    core: entryGain(seconds) * exit,
    ground: smooth5((seconds - 1.1) / 3.8) * exit,
    stars: smooth5((seconds - 2.1) / 4.5) * exit,
    exit,
  };
}
// Quantized LINEAR RGB LUT, authored once in OKLCH; no per-fragment conversion.
export function paletteLut() {
  const settings = [
    { l: 0.86, c: 0, h: [0, 0] },
    { l: 0.76, c: 0.115, h: [190, 220, 245] },
    { l: 0.73, c: 0.145, h: [285, 315, 335] },
    { l: 0.77, c: 0.13, h: [30, 55, 80] },
    { l: 0.76, c: 0.145, h: [0, 60, 120, 180, 240, 300, 360] },
  ];
  const width = 128,
    bytes = new Uint8Array(width * settings.length * 4);
  settings.forEach((f, row) => {
    for (let x = 0; x < width; x++) {
      const t = (x / (width - 1)) * (f.h.length - 1),
        a = Math.min(f.h.length - 2, Math.floor(t)),
        h = shortHue(f.h[a], f.h[a + 1], t - a);
      const rgb = paletteRgb(f.l, f.c, h);
      bytes.set(
        [...rgb.map((v) => Math.round(v * 255)), 255],
        (row * width + x) * 4,
      );
    }
  });
  return { width, height: settings.length, bytes };
}
export const floorLightGLSL = `
float rfSmooth5(float x){float t=clamp(x,0.,1.);return t*t*t*(t*(t*6.-15.)+10.);}
uint rfHash(uint h){h=(h^(h>>16u))*0x7feb352du;h=(h^(h>>15u))*0x846ca68bu;return h^(h>>16u);}
uint rfCellHash(ivec2 c,int seed){return rfHash(uint(c.x)^(uint(c.y)*0x9e3779b1u)^(uint(seed)*0x85ebca6bu));}
float rfCellRandom(ivec2 c,int seed){return float(rfCellHash(c,seed))*(1./4294967296.);}
uniform sampler2D uPalette;uniform vec3 uFlow;uniform vec4 uRecipe,uLighting,uChapter;
uniform vec4 uLocalFronts[2],uLocalForms[2],uPaint[8];uniform ivec2 uLocalIds;
uniform vec4 uBorrow;uniform vec3 uMicro;
uniform uint uDensityThreshold;uniform float uBrightness,uLow,uAccent,uReduced;
vec2 lightingCoordinates(vec2 p){float c=cos(uFlow.x),s=sin(uFlow.x);return vec2(c*p.x+s*p.y,-s*p.x+c*p.y);}
uniform vec4 uStructureBounds[4];uniform vec2 uStructureParams[4];
// A multiplicative footprint leaves every genuinely OFF emitter at zero.
float landscapeGate(vec2 p){float dim=0.;for(int i=0;i<4;i++){vec4 b=uStructureBounds[i];vec2 a=uStructureParams[i];if(a.y<=.00001)continue;vec2 d=p-b.xy;float c=cos(a.x),s=sin(a.x);vec2 q=vec2(d.x*c-d.y*s,d.x*s+d.y*c)/max(b.zw*.5,vec2(.01));float mask=1.-rfSmooth5((max(abs(q.x),abs(q.y))-.8)/.2);dim=max(dim,mask*a.y);}return 1.-dim;}
uniform vec4 uVisualPhase;
struct FloorLight{vec3 emission;vec3 spill;float activation;};
float chunkBase(ivec2 c){
 ivec2 parent=ivec2(floor(vec2(c)/2.));int slot=int(mod(float(c.x),2.))+2*int(mod(float(c.y),2.));uint pair=rfCellHash(parent,0)%6u;
 if(pair==0u)return slot==0||slot==1?1.:0.;if(pair==1u)return slot==0||slot==2?1.:0.;if(pair==2u)return slot==0||slot==3?1.:0.;
 if(pair==3u)return slot==1||slot==2?1.:0.;if(pair==4u)return slot==1||slot==3?1.:0.;return slot==2||slot==3?1.:0.;
}
float localSwap(vec2 p){
 ivec2 c=ivec2(floor(p/6.));vec2 center=(vec2(c)+.5)*6.;float value=0.;
 for(int i=0;i<2;i++){
  vec4 f=uLocalFronts[i];float age=uTime-f.z;int id=i==0?uLocalIds.x:uLocalIds.y;
  if(age<=0.||age>=5.6||rfCellHash(c,id)>=1374389534u)continue;
  float w=wfBand(center-f.xy,age,uLocalForms[i])*rfSmooth5(age/.14)*(1.-rfSmooth5((age-4.2)/1.4));value=max(value,w);
 }return value*mix(1.,.2,uReduced);
}
float paintAt(vec2 p){float v=0.;for(int i=0;i<8;i++){float age=uTime-uPaint[i].z;if(age>=0.&&age<3.){float radius=3.+age*3.2;float d=distance(p,uPaint[i].xy);float w=exp(-d*d/(radius*radius))*rfSmooth5(age/.045)*(1.-rfSmooth5((age-1.8)/1.2))*uPaint[i].w;v=max(v,w);}}return v;}
float recipeGate(vec2 p,float kind){
 ivec2 id=ivec2(floor(p/1.5+.001)),chunk=ivec2(floor(p/6.));float base=chunkBase(chunk);
 if(kind<.5){float density=.06+.30*rfSmooth5(uTime/12.);return max(rfCellRandom(id,0)<density?1.:0.,paintAt(p)*base);}
 if(kind>9.5)return rfCellRandom(id,0)<.46?1.:0.;
 return base+(1.-2.*base)*localSwap(p);
}
float regionalMix(vec2 p){ivec2 c=ivec2(floor(p/6.));return rfSmooth5((uTime-uChapter.z-rfCellRandom(c,13)*.4)/1.8);}
float borrowing(vec2 p){
 ivec2 fineId=ivec2(round(p/1.5));if((fineId.x%2)!=0||(fineId.y%2)!=0)return 0.;ivec2 id=ivec2(round(p/3.));
 return uBorrow.w*step(distance(p,uBorrow.xy),16.)*(rfCellHash(id,71)%3u==0u?1.:0.);
}
float activationAt(vec2 p){float g=mix(recipeGate(p,uChapter.x),recipeGate(p,uRecipe.x),regionalMix(p));return g*(1.-borrowing(p));}
float crestColourShift(vec2 p){
 float shift=0.,best=0.;
 for(int i=0;i<2;i++){vec4 f=uLocalFronts[i];float age=uTime-f.z;
  if(age<=0.||age>=5.6)continue;
  float life=rfSmooth5(age/.14)*(1.-rfSmooth5((age-4.2)/1.4))*(.4+.6*f.w);
  float energy=wfPulse(p-f.xy,age,uLocalForms[i],18.)*life;
  shift+=wfChroma(p-f.xy,age,uLocalForms[i])*life;best+=energy;
 }
 return (shift/max(1.,best))*(.32+.16*uLow+.10*uAccent)*mix(1.,.12,uReduced);
}
vec3 familyAt(vec2 p,float family,float shift){vec2 uv=lightingCoordinates(p);
 float u=family>3.5?fract((uv.x+uv.y)/96.-uRecipe.y/8.+shift):clamp(.5+.5*sin(uv.x*.026)+shift,0.,1.);
 return texture2D(uPalette,vec2((.5+u*127.)/128.,(family+.5)/5.)).rgb;}
vec3 paletteAt(vec2 p){float shift=crestColourShift(p);return mix(familyAt(p,uChapter.y,shift),familyAt(p,uLighting.x,shift),regionalMix(p));}
float idleGate(vec2 p){float base=chunkBase(ivec2(floor(p/6.)));float swap=rfSmooth5((sin(uVisualPhase.y*6.28318530718/12.)-.55)/.4);return base+(1.-2.*base)*swap;}
FloorLight floorLight(vec2 p){
 float ring=0.;for(int i=0;i<${WAVE.capacity};i++){float a=uTime-uFronts[i].z;if(a>=0.&&a<${WAVE.lifetime}){float life=smoothstep(0.,${WAVE.attack},a)*(1.-smoothstep(${WAVE.lifetime - WAVE.fade},${WAVE.lifetime},a))*(.4+.6*uFronts[i].w);ring=max(ring,wfPulse(p-uFronts[i].xy,a,uFrontForms[i],3.2)*life);}}
 ring*=mix(1.,.12,uReduced);
 float localAccent=(rfCellRandom(ivec2(floor(p/6.)),37)<.18?1.:0.)*max(ring,paintAt(p));
 float gate=activationAt(p)*landscapeGate(p);vec3 col=paletteAt(p);float gain=uBrightness;
 float wave=.25+.035*uLow+.20*uAccent*localAccent+.48*ring+.16*paintAt(p);
 vec3 idleColour=mix(vec3(.11,.20,.30),vec3(.21,.12,.25),uVisualPhase.w);
 float resting=idleGate(p);
 FloorLight r;r.activation=mix(gate,resting,uVisualPhase.x);
 r.emission=mix(col*wave*gate,idleColour*uVisualPhase.z*resting,uVisualPhase.x)*gain;
 r.spill=mix(col*(.025+.012*uLow+.055*ring+.045*paintAt(p))*gate,idleColour*.013*(uVisualPhase.z/.16)*resting,uVisualPhase.x)*gain;return r;
}`;
export const floorSurfaceGLSL = `
vec3 emitterPools(vec2 p,float pitch,float weight){vec3 light=vec3(0.);vec2 cell=floor(p/pitch);
 for(int x=0;x<2;x++)for(int z=0;z<2;z++){vec2 id=cell+vec2(float(x),float(z)),center=id*pitch;if(pitch<2.&&mod(id.x,2.)==0.&&mod(id.y,2.)==0.)continue;
 float radius=pitch<2.?.95:1.45,d=distance(p,center);if(d<radius){float footprint=exp(-d*d/(pitch<2.?.28:.65))*(1.-smoothstep(radius*.7,radius,d));light+=floorLight(center).spill*footprint*weight;}}
 return light;}
float circleTrain(vec2 p){float total=0.;for(int i=0;i<2;i++){vec4 f=uLocalFronts[i];float age=uTime-f.z;if(age>=0.&&age<5.6){float radius=age*14.,d=abs(distance(p,f.xy)-radius);total=max(total,exp(-d*d/2.5)*rfSmooth5(age/.18)*(1.-rfSmooth5((age-4.2)/1.4)));}}return total;}
vec3 surfaceRecipe(vec2 p,float kind){
 vec2 uv=lightingCoordinates(p);vec3 col=paletteAt(p);float lit=0.;
 if(kind>1.5&&kind<2.5)lit=circleTrain(p)*.065;
 if(kind>2.5&&kind<3.5){float spacing=mix(24.,9.,rfSmooth5((uTime-uChapter.z)/15.));float dist=abs(mod(uv.x-uRecipe.y*5.+spacing*.5,spacing)-spacing*.5),aa=max(fwidth(dist),.025);lit=(1.-smoothstep(.06-aa,.06+aa,dist))*.13+exp(-dist*dist/.16)*.025;}
 if(kind>3.5&&kind<4.5){vec2 v=p-vec2(0.,-1728.);float a=atan(v.y,v.x),sector=.5+.5*cos(a*24.+uRecipe.y);float d=abs(mod(length(v)-uRecipe.y*13.+9.,18.)-9.);lit=exp(-d*d/.7)*sector*(.025+.09*uMicro.y);}
 if(kind>4.5&&kind<5.5){float dist=abs(mod(uv.y-uRecipe.y*8.+18.,36.)-18.);lit=exp(-dist*dist/.4)*.045;}
 // Independent thin ground art is distinct from attributable emitter spill.
 return col*lit*(.3+.7*chunkBase(ivec2(floor(p/6.))));
}
vec3 surfaceLight(vec2 p,float fineWeight){return emitterPools(p,3.,1.)+emitterPools(p,1.5,fineWeight)+mix(surfaceRecipe(p,uChapter.x),surfaceRecipe(p,uRecipe.x),regionalMix(p))*uBrightness*landscapeGate(p)*(1.-uVisualPhase.x);}
`;
