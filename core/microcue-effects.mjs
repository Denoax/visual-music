// Original stateless musical-time aids, not a playback source or lyric detector.
import {clamp01,smooth5,hash32} from './chunk-wave-exchange.mjs';
export const TRACK_SHA='47119d6e77b41e51ef65fb2fc7fa46a2c3f7a75578a650f394b5df78137861a0';
export function cueEnvelope(seconds,cue,{attack=.025,release=.18}={}){
 const age=seconds-cue.seconds;if(age<0||age>=attack+release)return 0;
 return age<attack?smooth5(age/attack):1-smooth5((age-attack)/release);
}
export function activeCues(cues,seconds,{window=.4,limit=8}={}){
 let lo=0,hi=cues.length;while(lo<hi){const m=(lo+hi)>>>1;if(cues[m].seconds<=seconds)lo=m+1;else hi=m;}
 const out=[];for(let i=lo-1;i>=0&&seconds-cues[i].seconds<window&&out.length<limit;i--)out.push(cues[i]);
 return out.reverse();
}
export function validateCueScore(score){
 if(score.runtime_sha256!==TRACK_SHA)throw new Error('Wrong recording');
 const roles=new Set(['instrument_attack','vocal_entry','refrain_syllable','vocal_phrase_end']);
 let previous=-Infinity;const ids=new Set();
 for(const cue of score.events){
  if(!roles.has(cue.role)||!Number.isFinite(cue.seconds)||cue.seconds<0||cue.seconds>score.duration_seconds||cue.seconds<previous||ids.has(cue.id))throw new Error('Invalid cue');
  if(cue.reviewed===true&&!['auditioned_exact_recording','verified_alignment_checked_against_exact_recording'].includes(cue.evidence))throw new Error('No semantic timing evidence');
  previous=cue.seconds;ids.add(cue.id);
 }
 return score;
}
export function sampleMicrofeatures(data,seconds){
 if(data.runtime_sha256!==TRACK_SHA)throw new Error('Wrong recording');
 const rows=data.samples;if(!rows?.length)throw new Error('Empty features');
 if(seconds<0||seconds>data.duration_seconds)return new Array(rows[0].length-1).fill(0);
 let lo=0,hi=rows.length;while(lo<hi){const m=(lo+hi)>>>1;if(rows[m][0]<=seconds)lo=m+1;else hi=m;}
 const a=rows[Math.max(0,lo-1)],b=rows[Math.min(lo,rows.length-1)],u=a[0]===b[0]?0:clamp01((seconds-a[0])/(b[0]-a[0]));
 return a.slice(1).map((x,i)=>x+(b[i+1]-x)*u);
}
// Borrowed light points disperse then return; their underlying fixtures never move.
export function scatterOffset(id,phraseProgress,{radius=2.6,height=1.8,seed=0}={}){
 const q=clamp01(phraseProgress);if(q===0||q===1)return [0,0,0];const envelope=16*q*q*(1-q)*(1-q);
 const h=hash32(id,seed),angle=h/4294967296*Math.PI*2;
 return [Math.cos(angle)*radius*envelope,height*envelope,Math.sin(angle)*radius*envelope];
}
export function radialComb(distance,phase,{spacing=9,width=.12}={}){
 const p=((distance-phase)%spacing+spacing)%spacing;
 const d=Math.min(p,spacing-p);return 1-smooth5(d/width);
}
export function beamProfile(u,v){
 if(v<=0||v>=1||Math.abs(u)>=1)return 0;
 return Math.exp(-u*u*5)*smooth5(v/.06)*(1-smooth5((v-.72)/.28));
}
export function crossedBeamGeometry({height=36,bottomWidth=.3,topWidth=2.5}={}){
 const vertices=[],uv=[];
 for(let plane=0;plane<3;plane++){
  const angle=plane*Math.PI*2/3,axis=[Math.cos(angle),Math.sin(angle)];
  const corners=[[-bottomWidth,0],[bottomWidth,0],[-topWidth,height],[topWidth,height]];
  for(const i of [0,1,2,2,1,3]){const [r,y]=corners[i];vertices.push(axis[0]*r,y,axis[1]*r);uv.push(i%2?1:0,i<2?0:1);}
 }
 return {vertices:new Float32Array(vertices),uv:new Float32Array(uv)};
}
