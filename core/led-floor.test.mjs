import test from 'node:test';
import assert from 'node:assert/strict';
import {motifPolygon,polygonDistance,rasterMask,sampleMask,worldToPatch,densePatchCells,bulbCapGeometry,ringIntensity,scanIntensity,chaseIntensity,composeLight} from './led-floor.mjs';

test('heart and star masks retain symmetry, dark corners and distinct filled/outline coverage',()=>{
  for(const name of ['heart','star']) {
    const points=motifPolygon(name),fill=rasterMask(points),outline=rasterMask(points,{outline:true});
    assert.equal(fill.data.length,1024);assert.deepEqual(fill.data,rasterMask(points).data);
    for(let r=0;r<32;r++)for(let c=0;c<32;c++)assert.equal(fill.data[r*32+c],fill.data[r*32+31-c]);
    assert.equal(sampleMask(fill,1,1),0);assert.equal(sampleMask(fill,-1,-1),0);
    assert.equal(sampleMask(fill,2,0),0);assert.ok(sampleMask(fill,0,0)>.5);
    assert.ok(fill.data.reduce((a,b)=>a+b,0)>outline.data.reduce((a,b)=>a+b,0));
    assert.ok(polygonDistance(0,0,points)<0);
  }
});

test('dense cells nest coarse members with stable negative-world identity and bounded growth',()=>{
  const cells=densePatchCells({x:0,z:0,halfSize:24});
  assert.equal(cells.length,1024);assert.equal(cells.filter(c=>c.coarse).length,256);
  assert.equal(new Set(cells.map(c=>c.id)).size,1024);
  for(const c of cells.filter(c=>c.coarse))assert.ok(c.x%3===0&&c.z%3===0);
  const moved=densePatchCells({x:1.5,z:0,halfSize:24});
  const old=new Map(cells.map(c=>[c.id,c]));
  for(const c of moved)if(old.has(c.id))assert.deepEqual(c,old.get(c.id));
  const rotated=densePatchCells({x:0,z:0,halfSize:24,yaw:Math.PI/4});
  assert.ok(rotated.length>900&&rotated.length<1150);
  assert.ok(rotated.some(c=>c.z< -24));
  for(const c of rotated){const p=worldToPatch(c.x,c.z,{x:0,z:0,halfSize:24,yaw:Math.PI/4});assert.ok(Math.abs(p.u)<=1+1e-10&&Math.abs(p.v)<=1+1e-10);}
});

test('diffuser cap has finite unit normals, bounded geometry and outward non-degenerate faces',()=>{
  const g=bulbCapGeometry();assert.equal(g.positions.length/3,33);assert.equal(g.indices.length/3,56);
  for(let i=0;i<g.positions.length;i+=3){
    const [x,y,z]=g.positions.slice(i,i+3);assert.ok(Math.hypot(x,z)<=g.radius+1e-10&&y>=0&&y<=g.height);
    assert.ok(Math.abs(Math.hypot(...g.normals.slice(i,i+3))-1)<1e-12);
  }
  for(let i=0;i<g.indices.length;i+=3){
    const [a,b,c]=g.indices.slice(i,i+3).map(j=>g.positions.slice(j*3,j*3+3));
    const ab=b.map((v,j)=>v-a[j]),ac=c.map((v,j)=>v-a[j]);
    const cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    assert.ok(Math.hypot(...cross)>1e-8);
    const normal=g.normals.slice(g.indices[i+1]*3,g.indices[i+1]*3+3);
    assert.ok(cross.reduce((sum,v,j)=>sum+v*normal[j],0)>0);
  }
});

test('mask world coordinates are fixed to the patch, not camera position or heading',()=>{
  const patch={x:30,z:-60,yaw:Math.PI/2,halfSize:24};
  const uv=worldToPatch(54,-60,patch);assert.ok(Math.abs(uv.u)<1e-12);assert.ok(Math.abs(uv.v-1)<1e-12);
  assert.deepEqual(worldToPatch(30,-60,patch),{u:0,v:0});
});

test('ripple is born once, propagates at approved units and expires without changing the kernel',()=>{
  const e={x:9,z:-63,time:40,strength:.8};
  assert.equal(ringIntensity(9,-63,e,39.9),0);assert.equal(ringIntensity(9,-63,e,40),0);
  assert.ok(Math.abs(ringIntensity(43,-63,e,41)-.8)<1e-12);
  assert.ok(ringIntensity(9,-63,e,41)<1e-10);assert.equal(ringIntensity(9,-63,e,45.6),0);
  assert.equal(ringIntensity(43,-63,e,41),ringIntensity(43,-63,e,41));
});

test('score phases drive scanning/chasing, and bounded composition preserves colour ratios',()=>{
  assert.ok(scanIntensity(0,0,.5)>.99);assert.ok(scanIntensity(0,0,0)<1e-10);
  assert.equal(scanIntensity(2,0,.5),0);
  assert.equal(chaseIntensity(3,2,.25),chaseIntensity(11,2,.25));
  const a=composeLight([{colour:[1,.2,0],intensity:10}]);
  assert.ok(Math.abs(a[0]-1.4)<1e-12);assert.ok(Math.abs(a[1]/a[0]-.2)<1e-12);assert.equal(a[2],0);
});
