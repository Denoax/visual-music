import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceFlight, transformLight, inverseLight, lightWindowCell, rowMembership, lockEmitter, starSample, starCells} from './grid-flight.mjs';

test('turning changes travel direction and constant-input route is independent of frame subdivision', () => {
  const start = {x:0,z:0,yaw:0,pitch:0}, input={turn:1,tilt:.4};
  const time=Math.PI/(2*.7), whole=advanceFlight(start,input,time);
  assert.ok(Math.abs(whole.x-18/.7)<1e-9);
  assert.ok(Math.abs(whole.z+18/.7)<1e-9);
  let split={...start};
  for(let i=0;i<180;i++) split=advanceFlight(split,input,time/180);
  for(const key of ['x','z','yaw','pitch']) assert.ok(Math.abs(split[key]-whole[key])<1e-9);
  assert.deepEqual(advanceFlight(start,input,0),start);
});

test('board transform is invertible at negative and distant world cells; stable IDs survive window movement', () => {
  const board={anchorX:219,anchorZ:-606,shiftX:9,shiftZ:-3,angle:.21};
  for(const [x,z] of [[-33,-129],[6036,-9012],[0,0]]) {
    const moved=transformLight(x,z,board), restored=inverseLight(moved.x,moved.z,board);
    assert.ok(Math.abs(restored.x-x)<1e-8 && Math.abs(restored.z-z)<1e-8);
    assert.deepEqual(lightWindowCell(moved.x+.001,moved.z+.001,board),{ix:Math.floor(x/3),iz:Math.floor(z/3)});
  }
  for(let row=-16;row<16;row++) assert.equal(rowMembership(0,row,0,3),1);
  assert.equal(Array.from({length:16},(_,i)=>rowMembership(2,i-8,1,1)).filter(v=>v===0).length,4);
});

test('emitter identity locks its world origin across a large turn and retains timing', () => {
  const r=new Map(), e={id:7,time:42.5,strength:.8};
  const a=lockEmitter(r,e,{x:0,z:0,yaw:0},{lateral:9});
  const b=lockEmitter(r,e,{x:900,z:-18,yaw:Math.PI},{lateral:-30});
  assert.strictEqual(a,b); assert.equal(a.x,9); assert.equal(a.z,-63);
  assert.equal(a.time,42.5); assert.equal(a.strength,.8);
  const side=lockEmitter(r,{...e,id:8},{x:0,z:0,yaw:Math.PI/2});
  assert.equal(side.x,63); assert.ok(Math.abs(side.z)<1e-9);
});

test('star cell identities are deterministic, bounded, floor-safe and cover rear/side headings', () => {
  const cells=starCells(-1,144); assert.equal(cells.length,49);
  assert.equal(new Set(cells.map(c=>c.key)).size,49);
  for(const dx of [-1,1]) for(const dz of [-1,1]) {
    const x=-1+dx*200,z=144+dz*200;
    assert.ok(cells.some(c=>c.cx===Math.floor(x/72)&&c.cz===Math.floor(z/72)));
  }
  for(const c of cells) for(let i=0;i<16;i++) {
    const s=starSample(c.cx,c.cz,i); assert.deepEqual(s,starSample(c.cx,c.cz,i));
    assert.ok(s.x>=c.cx*72&&s.x<(c.cx+1)*72);
    assert.ok(s.z>=c.cz*72&&s.z<(c.cz+1)*72);
    assert.ok(s.y-s.radius>14+2.5);
  }
});
