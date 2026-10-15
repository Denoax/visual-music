import test from 'node:test';import assert from 'node:assert/strict';
import {comfortIntegrate,COMFORT} from './comfort-motion.mjs';
import {denseLayerAt,openingLayers,thankYouAt} from './opening-layers.mjs';
import {LoadingModel,LOAD_TASKS} from './loading-model.mjs';
import {confettiAt} from './confetti.mjs';import {tonePlan,createUiTones} from './ui-tones.mjs';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const state=()=>({seconds:0,x:0,z:0,angle:0,roll:0,pitchX:-9*Math.PI/180,turbo:1});
const parameters={speed:150,altitude:60,vfov:25,tilt:9};
const sections=[{start:0,end:12,kind:0},{start:12,end:25,kind:2},{start:25,end:40,kind:1},{start:40,end:60,kind:10}];
test('production speed drops55 percent while altitude and lens stay unchanged',()=>{
  let s=state();for(let i=1;i<=240;i++)s=comfortIntegrate(s,parameters,i/240,1/240);
  near(-s.z,150*.4125*COMFORT.travel);assert.equal(s.altitude,60);assert.equal(s.vfov,25);
});
test('M1 ramps gently, is bounded at1.2 and releases without a speed jump',()=>{
  let s=state();s=comfortIntegrate(s,parameters,.1,.1,{held:true});assert.ok(s.turbo>1.03&&s.turbo<1.05);
  for(let i=2;i<=200;i++)s=comfortIntegrate(s,parameters,i/10,.1,{held:true});assert.ok(s.turbo<=1.2&&s.turbo>1.19);
  const before=s.turbo;s=comfortIntegrate(s,parameters,20.1,.1,{held:false});assert.ok(s.turbo<before&&s.turbo>1);
});
test('exponential held response agrees across frame subdivisions',()=>{
  let a=state(),b=state();for(let i=1;i<=120;i++)a=comfortIntegrate(a,parameters,i/120,1/120,{held:true});
  for(let i=1;i<=240;i++)b=comfortIntegrate(b,parameters,i/240,1/240,{held:true});near(a.turbo,b.turbo);
});
test('fine-grid membership prepares before visibility and fades across12s',()=>{
  assert.deepEqual(denseLayerAt(11,sections),{weight:0,prepare:false});assert.equal(denseLayerAt(11.5,sections).prepare,true);
  assert.equal(denseLayerAt(12,sections).weight,0);assert.ok(denseLayerAt(12.001,sections).weight<1e-6);
  near(denseLayerAt(14,sections).weight,1);near(denseLayerAt(40,sections).weight,1);near(denseLayerAt(42,sections).weight,0);
});
test('terrain/cap reveal stays dark below full physical support and has no7s step',()=>{
  assert.equal(openingLayers(10,14).surfaceGain,0);assert.equal(openingLayers(10,14).depthAllowed,false);
  const a=openingLayers(6.9999,24.75).surfaceGain,b=openingLayers(7.0001,24.75).surfaceGain;assert.ok(b-a<.001);
  near(openingLayers(8.2,24.75).surfaceGain,1);
});
test('loading cannot finish from elapsed time alone or before all real tasks',()=>{
  const l=new LoadingModel();assert.equal(l.sample(20).phase,'loading');
  for(const k of Object.keys(LOAD_TASKS).slice(0,-1))l.markReady(k);assert.equal(l.sample(20).canContinue,false);
  l.markReady('font');assert.equal(l.sample(20).phase,'settling');assert.equal(l.sample(20).spinning,false);assert.equal(l.sample(20.5).canContinue,true);
});
test('cached readiness stops spinning immediately without an artificial minimum wait',()=>{
  const l=new LoadingModel();for(const k of Object.keys(LOAD_TASKS))l.markReady(k);
  assert.equal(l.sample(.05).phase,'settling');assert.equal(l.sample(.05).spinning,false);
  assert.equal(l.sample(.05).playOpacity,0);assert.equal(l.sample(.5).canContinue,true);
});
test('stale load completion cannot arm a retried page',()=>{
  const l=new LoadingModel(),old=l.generation;l.reset();assert.equal(l.markReady('shaders',old),false);
  assert.equal(l.sample(20).realReady,false);
});
test('native Continue is one-shot while pending; a rejected unlock returns ready',()=>{
  const l=new LoadingModel();for(const k of Object.keys(LOAD_TASKS))l.markReady(k);l.sample(3.2);l.sample(5);
  assert.equal(l.beginContinue(),true);assert.equal(l.beginContinue(),false);l.continueFailed('Audio did not unlock');assert.equal(l.beginContinue(),true);
});
test('failed loading stops spinning, stays blocked and stale completions cannot recover it',()=>{
  const l=new LoadingModel(),old=l.generation;l.fail('Network error');
  assert.equal(l.sample(10).spinning,false);assert.equal(l.sample(10).canContinue,false);
  assert.equal(l.markReady('font'),false);l.reset();assert.equal(l.markReady('font',old),false);
  assert.equal(l.sample(0).spinning,true);
});
test('reduced motion presents ready immediately after real readiness',()=>{
  const l=new LoadingModel();for(const k of Object.keys(LOAD_TASKS))l.markReady(k);
  const m=l.sample(.1,{reduced:true});assert.equal(m.phase,'ready');
  assert.equal(m.spinnerOpacity,0);assert.equal(m.playOpacity,1);assert.equal(m.settingsOpacity,1);
});
test('only presented completion can drive the black thank-you page',()=>{
  assert.equal(thankYouAt(null).worldGain,1);assert.equal(thankYouAt(null).pageGain,0);
  near(thankYouAt(0).worldGain,1);near(thankYouAt(2.6).worldGain,0);near(thankYouAt(4).pageGain,1);
  assert.equal(thankYouAt(4,{reduced:true}).confettiAge,null);
});
test('confetti is deterministic, bounded, finite and stops',()=>{
  assert.deepEqual(confettiAt(1),confettiAt(1));assert.equal(confettiAt(1).length,36);
  assert.equal(confettiAt(1,{count:500}).length,48);assert.deepEqual(confettiAt(4),[]);assert.deepEqual(confettiAt(1,{reduced:true}),[]);
  for(const p of confettiAt(1))assert.ok([p.x,p.y,p.rotation,p.opacity].every(Number.isFinite));
});
test('musical button plans share a key and keep partial energy bounded',()=>{
  assert.equal(tonePlan('continue').length,4);near(tonePlan('button',0)[0].frequency,523.2511306011972);
  for(const n of tonePlan('continue'))near(n.partials.reduce((s,p)=>s+p.gain,0),1);
});
const context=()=>{
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});
  return {state:'running',currentTime:0,createGain:()=>({gain:param(),connect(){},disconnect(){}}),createOscillator:()=>({frequency:param(),connect(){},disconnect(){},start(){},stop(){},onended:null})};
};
test('tones reuse the injected graph, respect mute and bound overlap without stealing voices',()=>{
  const ctx=context(),reservations=[],s=createUiTones(ctx,{}, {maxVoices:4,reserveHeadroom:(...a)=>reservations.push(a)});
  assert.equal(s.play('continue'),true);assert.equal(s.activeVoices(),4);ctx.currentTime=.1;assert.equal(s.play(),false);
  assert.equal(reservations.length,1);s.silence();assert.equal(s.activeVoices(),0);s.dispose();assert.equal(s.play(),false);
  const quiet=createUiTones(ctx,{}, {reserveHeadroom(){},muted:()=>true});assert.equal(quiet.play(),false);quiet.dispose();
});
test('Continue chime can follow a Settings note immediately without being throttled',()=>{
  const ctx=context(),s=createUiTones(ctx,{}, {reserveHeadroom(){}});
  assert.equal(s.play(),true);ctx.currentTime=.02;assert.equal(s.play('continue'),true);
  assert.equal(s.activeVoices(),5);s.dispose();
});
