import test from "node:test";
import assert from "node:assert/strict";
import { FORMATIONS, formationFor, formationMetric, formationPulse, formationBand, crestChroma } from "../core/wave-formations.mjs";
import { rawHeight, surfaceHeight, waveState, WAVE } from "../src/show/waves";
import { comfortIntegrate, COMFORT } from "../core/comfort-motion.mjs";

test("the approved circular kernel survives as the complete first 25 seconds", () => {
  for(let t=.2;t<25;t+=.31){
    const s=waveState(t,null,false);
    for(const x of [-100,0,83]) for(const z of [-600,-120,0]){
      let h=s.base*(.58*Math.sin(x*.022+z*.027+t*.24)+.28*Math.sin(x*.039-z*.014-t*.19)+.14*Math.cos(x*.009+z*.046+t*.11));
      for(const e of s.fronts){const age=t-e.time,u=Math.max(0,Math.min(1,age/.14)),v=Math.max(0,Math.min(1,(age-4.2)/1.4)),q=(Math.hypot(x-e.x,z-e.z)-34*age)/10;
        h+=s.ring*(.4+.6*e.strength)*Math.exp(-.5*q*q)*u*u*(3-2*u)*(1-v*v*(3-2*v));}
      assert.ok(Math.abs(rawHeight(x,z,s)-14*Math.tanh(h/14))<1e-10);
    }
  }
});
test("new wave shapes are distinct, bounded and carry compact-support exchanges", () => {
  const signatures=[];
  for(const section of FORMATIONS.slice(0,7)){
    const form=formationFor(section.start+.1),signature=[];
    for(let x=-180;x<=180;x+=6)for(let z=-180;z<=180;z+=6){
      const pulse=formationPulse(x,z,1.1,form),bank=formationBand(x,z,1.1,form);
      assert.ok(Number.isFinite(pulse)&&pulse>=0&&pulse<=1+1e-12);
      assert.ok(bank>=0&&bank<=1+1e-12);
      assert.ok(Math.abs(crestChroma(x,z,1.1,form))<=1+1e-12);
      signature.push(pulse);
    }
    signatures.push(signature);
    assert.equal(formationBand(10000,20000,1.1,form),0);
  }
  // Circle recurs deliberately; every authored alternative differs spatially.
  for(const i of [1,3,4,5,6])assert.ok(signatures[i].some((v,j)=>Math.abs(v-signatures[0][j])>.1));
});
test("event-birth shape is stable across chapter changes, seeks and replay",()=>{
  for(const boundary of FORMATIONS.slice(1).map(s=>s.start)){
    const e={x:0,z:0,time:boundary-.1,strength:1,id:99};
    const fixed=formationFor(e.time);
    for(const age of [.01,.15,1,4,5.59]){
      const s={...waveState(e.time+age,null,false),fronts:[e],base:0,ring:7};
      const attack=Math.min(1,age/.14),fade=Math.min(1,Math.max(0,(age-4.2)/1.4));
      const life=attack*attack*(3-2*attack)*(1-fade*fade*(3-2*fade));
      const expected=14*Math.tanh(7*formationPulse(32,48,age,fixed)*life/14);
      assert.ok(Math.abs(rawHeight(32,48,s)-expected)<1e-10);
      assert.equal(rawHeight(32,48,s),rawHeight(32,48,{...s}));
      assert.deepEqual(formationFor(e.time),fixed);
    }
  }
});
test("raw vertices and exact terrain triangles retain the 14m bound in every passage",()=>{
  for(let t=25;t<220;t+=.67){const s=waveState(t,null,false);
    for(const e of s.fronts.slice(-2))for(const dx of [-51,0,51])for(const dz of [-93,12,93]){
      const x=Math.round((e.x+dx)/3)*3,z=Math.round((e.z+dz)/3)*3;
      const h=rawHeight(x,z,s);assert.ok(Number.isFinite(h)&&Math.abs(h)<WAVE.heightBound);
      assert.ok(Math.abs(h-surfaceHeight(x,z,s))<1e-8);
      assert.ok(Math.abs(surfaceHeight(x-1e-6,z+.3,s)-surfaceHeight(x+1e-6,z+.3,s))<1e-4);
    }
  }
});
test("colour phases have no discontinuity at paired-ring or crossed-ridge seams",()=>{
  for(const t of [96,110]){const f=formationFor(t);
    for(let x=-100;x<=100;x+=.43){
      const a=crestChroma(x,-14,1,f),b=crestChroma(x+1e-5,-14,1,f);
      assert.ok(Math.abs(a-b)<1e-5);
      assert.ok(formationMetric(x,-14,1,f).every(Number.isFinite));
    }
  }
});
test("M1 is more responsive, capped, and leaves all no-input route states unchanged",()=>{
  const initial=()=>({seconds:0,x:0,z:0,angle:0,roll:0,pitchX:0,turbo:1});
  const p={speed:150,altitude:60,vfov:25,tilt:9};
  let a=initial(),b=initial();
  for(let i=1;i<=2400;i++){
    a=comfortIntegrate(a,p,i/240,1/240);
    b=comfortIntegrate(b,p,i/240,1/240,{},.4125,{...COMFORT,heldTau:1.25});
    assert.deepEqual(a,b);
  }
  const boost=comfortIntegrate(initial(),p,.1,.1,{held:true});
  assert.ok(boost.turbo>1.03&&boost.turbo<1.05);
  assert.equal(COMFORT.heldTarget,1.2);assert.equal(COMFORT.travel,.45);
});
