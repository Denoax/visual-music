import test from 'node:test';import assert from 'node:assert/strict';
import {chunkAt,hash32,waveWeight,exchangeGate,chapterMix,blendGate,flowPhase} from './chunk-wave-exchange.mjs';
import {TRACK_SHA,activeCues,cueEnvelope,validateCueScore,sampleMicrofeatures,scatterOffset,crossedBeamGeometry,beamProfile,radialComb} from './microcue-effects.mjs';
test('scattered world chunks balance two ON/two OFF in every positive and negative2x2 patch',()=>{
 for(let x=-20;x<20;x++)for(let z=-20;z<20;z++){
  let on=0;for(let i=0;i<2;i++)for(let j=0;j<2;j++)on+=chunkAt((x*2+i+.5)*6,(z*2+j+.5)*6).base;
  assert.equal(on,2);
 }
});
test('common nested cells and subcell locations share chunk identity without frame-random ownership',()=>{
 assert.deepEqual(chunkAt(3,3),chunkAt(4.5,4.5));assert.deepEqual(chunkAt(-3,-3),chunkAt(-1.5,-1.5));
 assert.equal(hash32(-5,7,2),hash32(-5,7,2));assert.notEqual(hash32(-5,7,2),hash32(-5,7,3));
});
test('exchange occurs at physical wave arrival and returns to the base state; other chunks stay unchanged',()=>{
 const c=chunkAt(3,3);let id=0;while(hash32(c.cx,c.cz,id)>=Math.floor(.32*4294967296))id++;
 const f={x:-70,z:-25,time:10,id},crest=10+Math.hypot(c.centerX-f.x,c.centerZ-f.z)/34;
 assert.equal(waveWeight(c,f,10),0);assert.equal(waveWeight(c,f,crest),1);
 assert.equal(exchangeGate(3,3,[f],crest),1-c.base);assert.equal(exchangeGate(3,3,[f],16),c.base);
 let other=chunkAt(9,9);while(hash32(other.cx,other.cz,id)<Math.floor(.32*4294967296))other=chunkAt(other.centerX+6,other.centerZ+6);
 assert.equal(waveWeight(other,f,crest),0);
});
test('decorative exchange is bounded and deterministic with overlapping fronts and replay',()=>{
 const fs=Array.from({length:16},(_,i)=>({x:-60+i,z:-30,time:8+i*.2,id:i}));
 for(let t=9;t<14;t+=.02){const g=exchangeGate(-12,33,fs,t);assert.ok(g>=0&&g<=1);assert.equal(g,exchangeGate(-12,33,fs,t));}
});
test('chapter changes crossfade cells without a global black dip and preserve true OFF',()=>{
 assert.equal(chapterMix(3,3,9,10),0);assert.equal(chapterMix(3,3,13,10),1);
 assert.equal(blendGate(0,0,.5),0);assert.equal(blendGate(1,1,.5),1);
 assert.ok(chapterMix(3,3,11,10)>0&&chapterMix(3,3,11,10)<1);
});
test('visual flow advances on song time even when beat-phase tracking holds',()=>{
 assert.ok(flowPhase(170)>flowPhase(169));assert.equal(flowPhase(170),flowPhase(170));
});
test('cue support does not permit unsubstantiated lyric/semantic approval or another song',()=>{
 const good={runtime_sha256:TRACK_SHA,duration_seconds:219.66579,events:[{id:'a',seconds:2,role:'instrument_attack',reviewed:false}]};
 assert.equal(validateCueScore(good),good);
 assert.throws(()=>validateCueScore({...good,runtime_sha256:'different'}));
 assert.throws(()=>validateCueScore({...good,events:[{...good.events[0],reviewed:true,evidence:'spectral_proxy'}]}));
});
test('microcue envelopes and selection reconstruct identically after seeks and stay bounded',()=>{
 const cues=[{id:'a',seconds:1},{id:'b',seconds:1.1},{id:'c',seconds:1.2}];
 assert.deepEqual(activeCues(cues,1.21,{limit:2}).map(x=>x.id),['b','c']);
 assert.equal(cueEnvelope(.9,cues[0]),0);assert.equal(cueEnvelope(1.4,cues[0]),0);
 assert.equal(cueEnvelope(1.025,cues[0]),1);
 const data={runtime_sha256:TRACK_SHA,duration_seconds:2,samples:[[0,0,.5],[1,1,.7],[2,0,.9]]};
 assert.deepEqual(sampleMicrofeatures(data,.5),[.5,.6]);assert.deepEqual(sampleMicrofeatures(data,3),[0,0]);
});
test('chorus dispersion returns every borrowed point to its unchanged emitter at phrase boundaries',()=>{
 for(let i=0;i<64;i++){assert.deepEqual(scatterOffset(i,0),[0,0,0]);assert.ok(scatterOffset(i,1).every(v=>v===0));const a=scatterOffset(i,.5);assert.ok(Math.hypot(a[0],a[2])<=2.600001&&a[1]===1.8);}
});
test('beam geometry uses three bounded planes and a zero-ended soft profile; comb loops seamlessly',()=>{
 const g=crossedBeamGeometry();assert.equal(g.vertices.length,54);assert.equal(g.uv.length,36);
 assert.ok([...g.vertices].every(Number.isFinite));assert.equal(beamProfile(0,0),0);assert.equal(beamProfile(0,1),0);assert.equal(beamProfile(1,.5),0);assert.ok(beamProfile(0,.5)>.9);
 assert.equal(radialComb(5,2),radialComb(14,2));
});

import {passageVertexHeight,PASSAGE} from './safe-passage.mjs';
test('paired raised-eye profile preserves the previous actual floor and increases gap 1.2m',()=>{
 assert.equal(PASSAGE.eyeY,5.4);assert.equal(PASSAGE.clearance,4.43);
 for(const raw of [-14,0,.97,1,4,14])for(const x of [-30,-16,-8,-3,0,3,8,16,30])for(const shot of [0,96]){
  const a=passageVertexHeight(raw,x,0,{x:0,z:0,eyeY:4.2+shot},{clearance:3.23}),b=passageVertexHeight(raw,x,0,{x:0,z:0,eyeY:5.4+shot});assert.ok(Math.abs(a-b)<1e-11);
 }
});
