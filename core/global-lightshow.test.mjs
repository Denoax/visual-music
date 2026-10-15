import test from 'node:test';
import assert from 'node:assert/strict';
import {globalWeave,effectCoordinates,fixtureBank,bankDimmer,buildPulsePhaseTrack,pulsePhaseAt,gaussianCoreFwhmPixels,projectedSpriteWidth} from './global-lightshow.mjs';
const close=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);

test('pattern repeats far beyond the old +/-24 m square in positive and negative world space',()=>{
  const o={angle:.61,period:72,anchorX:300,anchorZ:-700};
  for(const [x,z] of [[0,0],[3000,-6000],[-7200,9000]]) {
    const w=globalWeave(x,z,2.25,o);
    close(w,globalWeave(x+72*Math.cos(o.angle),z+72*Math.sin(o.angle),2.25,o));
    assert.ok(w>=0 && w<=1);
  }
});

test('one global rotation changes spatial orientation everywhere, preserving wave/fixture positions',()=>{
  const p=effectCoordinates(81,125,{angle:Math.PI/2}); close(p.u,125); close(p.v,-81);
  const rows=[-240,-60,60,240].map(z=>globalWeave(0,z,1,{angle:Math.PI/2}));
  assert.ok(Math.max(...rows)-Math.min(...rows)>.2);
});

test('stable negative IDs, mirror wings and nested 3m/1.5m common cells agree',()=>{
  assert.equal(fixtureBank(-1,0,{blockCells:1,groups:4}),3);
  for(let i=-32;i<=32;i++) {
    assert.equal(fixtureBank(i,3,{mirrored:true}),fixtureBank(-i-1,3,{mirrored:true}));
    const worldX=i*3,worldZ=-18;
    assert.equal(fixtureBank(Math.round(worldX/1.5),Math.round(worldZ/1.5)),fixtureBank(i*2,-12));
  }
});

test('banks trade brightness instead of flashing the entire stage together',()=>{
  for(let p=0;p<16;p+=.03125) {
    close(bankDimmer(0,2,p)+bankDimmer(1,2,p),.90);
    close([0,1,2,3].reduce((v,g)=>v+bankDimmer(g,4,p),0),1.80);
  }
  assert.ok(bankDimmer(0,2,0)>.8 && bankDimmer(1,2,0)<.1);
});

test('irregular clock gaps hold phase continuously; replay/seek reproduce lookup',()=>{
  const track=buildPulsePhaseTrack([1,1.5,2,6,6.5]);
  close(pulsePhaseAt(1.25,track).phase,.5);
  for(const t of [2,3,5.99,6]) close(pulsePhaseAt(t,track).phase,2);
  close(pulsePhaseAt(6.25,track).phase,2.5);
  close(pulsePhaseAt(100,track).phase,3);
  const paused=pulsePhaseAt(6.25,track);
  assert.deepEqual(pulsePhaseAt(6.25,track),paused);
  pulsePhaseAt(1.25,track); assert.deepEqual(pulsePhaseAt(6.25,track),paused);
  assert.throws(()=>buildPulsePhaseTrack([1,1]),TypeError);
});

test('core width quantifies why old sprites look tiny and respects hardware clamp',()=>{
  close(gaussianCoreFwhmPixels(8,22),1.420009916,1e-8);
  assert.ok(gaussianCoreFwhmPixels(16,8)>4.7);
  const width=projectedSpriteWidth({radius:.6,depth:10,viewportHeight:900,fovDegrees:65,maxPixels:32});
  assert.equal(width,32);
});
