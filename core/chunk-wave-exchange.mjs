// Original spatial correction. Use existing physical wave origins/time/speed.
export const clamp01=v=>Math.max(0,Math.min(1,v));
export const smooth5=v=>{const t=clamp01(v);return t*t*t*(t*(t*6-15)+10);};
const mod=(v,n)=>((v%n)+n)%n;
export function hash32(x,z,seed=0){
 let h=(x^Math.imul(z,0x9e3779b1)^Math.imul(seed,0x85ebca6b))>>>0;
 h=Math.imul(h^(h>>>16),0x7feb352d)>>>0;h=Math.imul(h^(h>>>15),0x846ca68b)>>>0;
 return (h^(h>>>16))>>>0;
}
const PAIRS=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
// Every2x2 patch has exactly two lit/two dark chunks. No endless stripe ownership.
export function chunkAt(x,z,{metres=6,seed=0}={}){
 if(!(Number.isFinite(x)&&Number.isFinite(z)&&metres>0))throw new TypeError('Finite world coordinates required');
 const cx=Math.floor(x/metres),cz=Math.floor(z/metres),sx=Math.floor(cx/2),sz=Math.floor(cz/2);
 const slot=mod(cx,2)+2*mod(cz,2),pair=PAIRS[hash32(sx,sz,seed)%6];
 return {cx,cz,centerX:(cx+.5)*metres,centerZ:(cz+.5)*metres,base:pair.includes(slot)?1:0};
}
export function waveWeight(chunk,front,seconds,{speed=34,halfWidth=6,plateau=1.1,attack=.14,lifetime=5.6,fade=1.4,selectedFraction=.32}={}){
 const age=seconds-front.time;
 if(age<=0||age>=lifetime)return 0;
 const threshold=Math.floor(clamp01(selectedFraction)*4294967296);
 if(hash32(chunk.cx,chunk.cz,front.id)>=threshold)return 0;
 const distance=Math.hypot(chunk.centerX-front.x,chunk.centerZ-front.z);
 const delta=Math.abs(distance-speed*age);
 const spatial=1-smooth5((delta-plateau)/(halfWidth-plateau));
 return spatial*smooth5(age/attack)*(1-smooth5((age-lifetime+fade)/fade));
}
export function exchangeGate(x,z,fronts,seconds,options={}){
 const chunk=chunkAt(x,z,options),active=fronts.filter(f=>f.time<=seconds&&seconds-f.time<(options.lifetime??5.6));
 // Bound the decorative exchange drivers; the physical kernel keeps ALL its fronts.
 let swap=0;for(const f of active.slice(-(options.maxDrivers??2)))swap=Math.max(swap,waveWeight(chunk,f,seconds,options));
 return chunk.base+(1-2*chunk.base)*swap;
}
export function chapterMix(x,z,seconds,start,{duration=1.8,spread=.4,seed=0}={}){
 const c=chunkAt(x,z,{seed}),delay=hash32(c.cx,c.cz,seed)/4294967296*spread;
 return smooth5((seconds-start-delay)/duration);
}
// A layer crossfade, not a master blackout. Off+off stays exactly off.
export const blendGate=(oldGate,newGate,progress)=>oldGate+(newGate-oldGate)*clamp01(progress);
// Slow autonomous light flow remains music-time driven even in a beat-grid gap.
export const flowPhase=(songSeconds,{speed=.18,offset=0}={})=>songSeconds*speed+offset;
