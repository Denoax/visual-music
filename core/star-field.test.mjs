import test from 'node:test';
import assert from 'node:assert/strict';
import {lightStar,STAR,starClearance,postHaloWorldBound} from './star-field.mjs';
import {projectedSpriteWidth} from './global-lightshow.mjs';
test('All seeded tiers clear the maximum rising terrain, full sprite and conservative post-filter support',()=>{
 let min=Infinity;for(let cx=-20;cx<=20;cx++)for(let cz=-20;cz<=20;cz++)for(let i=0;i<8;i++){
  const s=lightStar(cx,cz,i);min=Math.min(min,starClearance(s));assert.ok(s.radius<=STAR.nearRadius);assert.deepEqual(s,lightStar(cx,cz,i));
 }
 assert.ok(min>1);assert.ok(postHaloWorldBound>16);
});
test('DPR and hardware clamps cannot enlarge a visible point beyond its declared world radius',()=>{
 for(const dpr of [1,1.5,1.75,3])for(const fovDegrees of [58,68,72])for(const maxPixels of [1,16,64,2047])for(const depth of [1,8,32,100,240]){
  const p=600*dpr/(2*Math.tan(fovDegrees*Math.PI/360));
  const width=projectedSpriteWidth({radius:1.05,depth,viewportHeight:600,fovDegrees,dpr,maxPixels});
  assert.ok(width*depth/(2*p)<=1.05+1e-12);
 }
});
