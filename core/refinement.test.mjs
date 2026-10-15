import test from 'node:test';import assert from 'node:assert/strict';
import {pairedBankGate,dropoutGate,hashCell,gateEmitter,entryGain,exitGain,starLifeGain,loopRing,paletteRgb,shortHue,worldBank} from './lighting-recipes.mjs';
import {PASSAGE,passageVertexHeight,canonicalTriangle} from './safe-passage.mjs';
const close=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('two banks have genuine OFF plateaus and swap, rather than both glowing faintly',()=>{
 assert.equal(pairedBankGate(0,.5),1);assert.equal(pairedBankGate(1,.5),0);
 assert.equal(pairedBankGate(0,1.5),0);assert.equal(pairedBankGate(1,1.5),1);
 for(let p=0;p<16;p+=.01)close(pairedBankGate(0,p)+pairedBankGate(1,p),1);
});
test('final gate also extinguishes ring accents, halo and terrain spill',()=>{
 const source={head:[1,.8,.7],halo:[.5,.2,.1],spill:[.08,.07,.06]};
 assert.deepEqual(gateEmitter(source,0),{head:[0,0,0],halo:[0,0,0],spill:[0,0,0]});
});
test('dropout is reproducible on pause/replay with dark and lit members across a large field',()=>{
 let on=0;const all=[];for(let x=-80;x<=80;x++)for(let z=-80;z<=80;z++){const v=dropoutGate(x,z,10);on+=v;all.push(v);assert.equal(v,dropoutGate(x,z,10));}
 assert.ok(on/all.length>.24&&on/all.length<.32);assert.ok(all.includes(0)&&all.includes(1));
 assert.notEqual(hashCell(2,3,2),hashCell(2,3,3));
});
test('stable bank ownership works behind origin and at common nested cells',()=>{
 assert.equal(worldBank(-1,0),1);assert.equal(worldBank(0,0),0);
 assert.equal(worldBank(16,-20),0);assert.equal(worldBank(24,-20),1);
});
test('intro fades smoothly; exit cannot begin before natural presented end',()=>{
 assert.equal(entryGain(0),0);assert.equal(entryGain(3),1);assert.ok(entryGain(1)>.1&&entryGain(1)<.9);
 assert.equal(exitGain(null),1);assert.equal(exitGain(0),1);assert.equal(exitGain(.1),1);assert.equal(exitGain(3),0);
});
test('stars genuinely disappear at both ends of their lifecycle',()=>{
 assert.equal(starLifeGain(0),0);assert.equal(starLifeGain(4),0);assert.equal(starLifeGain(2),1);assert.ok(starLifeGain(.35)>0&&starLifeGain(.35)<1);
});
test('light ring train repeats continuously in unbounded space and phase',()=>{
 for(let d=0;d<300;d+=7)close(loopRing(d,.43),loopRing(d+48,1.43));
 assert.equal(loopRing(.43*48,.43),1);
});
test('palette is bounded linear RGB, neutral white stays neutral, hue wraps cleanly',()=>{
 const neutral=paletteRgb(.7,0,0);for(const c of neutral)close(c,.343,1e-7);
 for(let h=0;h<360;h+=3)assert.ok(paletteRgb(.72,.18,h).every(c=>c>=0&&c<=1));
 close(shortHue(350,10,.5),0);const a=paletteRgb(.72,.12,359.99),b=paletteRgb(.72,.12,.01);assert.ok(Math.max(...a.map((c,i)=>Math.abs(c-b[i])))<.001);
});
test('stable camera pocket protects the COMPLETE triangle containing the view',()=>{
 const lower=canonicalTriangle(.3,.6),upper=canonicalTriangle(1.2,2.1);
 assert.deepEqual(lower.vertices,[[0,0],[3,0],[0,3]]);assert.deepEqual(upper.vertices,[[3,3],[0,3],[3,0]]);
 [.7,.1,.2].forEach((v,i)=>close(lower.weights[i],v));[.1,.6,.3].forEach((v,i)=>close(upper.weights[i],v));
 for(const x of [-31.99,-3,0,.4,1.5,2.99,31.7])for(const z of [-21.9,-3,0,.7,2.99,25.8]){
  const cam={x,z},t=canonicalTriangle(x,z);let h=0;
  t.vertices.forEach(([vx,vz],i)=>{assert.ok(Math.hypot(vx-x,vz-z)<PASSAGE.innerRadius);const raw=-14+28*hashCell(Math.round(vx/3),Math.round(vz/3),11);h+=t.weights[i]*passageVertexHeight(raw,vx,vz,cam);});
  assert.ok(PASSAGE.eyeY-h>=PASSAGE.clearance-1e-9);
 }
});
test('clearance pocket leaves far approved waves intact and has a smooth spatial exit',()=>{
 const c={x:0,z:0};assert.equal(passageVertexHeight(14,30,0,c),14);
 assert.ok(passageVertexHeight(14,0,0,c)<=1);assert.ok(passageVertexHeight(14,15.99,0,c)>13.999);
});
