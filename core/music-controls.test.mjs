import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareMusicControls, motifTargets} from './music-controls.mjs';
const features = {duration_seconds: 4, samples: Array.from({length:401},(_,i)=>
  [i/100,i<100?.1:.8,.4,i<200?.2:.7,0])};
const events = [{seconds:1,strength:1},{seconds:1.5,strength:.8},{seconds:2.5,strength:.9}];
test('seek, pause repetition and replay give the same music-owned values',()=>{
  const c=prepareMusicControls(features,events), expected=c.sample(2.65);
  c.sample(.12);c.sample(3.9);c.sample(1.2);
  assert.deepEqual(c.sample(2.65),expected);
  assert.deepEqual(c.sample(2.65),expected);
  assert.deepEqual(c.sample(0),{low:0,high:0,sky:0,accent:0,eventIndex:-1,alternatingGroup:0});
});
test('A/B selection uses stable event index, not callback count',()=>{
  const c=prepareMusicControls(features,events);
  assert.equal(c.sample(1.06).alternatingGroup,0);
  assert.equal(c.sample(1.56).alternatingGroup,1);
  assert.equal(c.sample(2.56).alternatingGroup,0);
});
test('old quiet segment cannot inherit a future envelope after reverse seek',()=>{
  const c=prepareMusicControls(features,events);
  c.sample(3);assert.ok(c.sample(.3).low<.11);assert.equal(c.sample(.3).accent,0);
});
test('sky changes much slower than local low-band breathing',()=>{
  const c=prepareMusicControls(features,events);
  assert.ok(c.sample(1.2).low>.7);assert.ok(c.sample(1.2).sky<.25);
});
test('own motifs are deterministic, bounded and exact requested count',()=>{
  for(const name of ['circle','diamond','chevron','up']) for(const n of [1,32,128]) {
    const result=motifTargets(name,n);assert.equal(result.length,n);
    assert.deepEqual(result,motifTargets(name,n));
    assert.ok(result.every(p=>p.length===2&&p.every(v=>Number.isFinite(v)&&Math.abs(v)<=1.0000001)));
  }
});
