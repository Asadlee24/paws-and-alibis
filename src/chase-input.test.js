import {test} from 'node:test';
import assert from 'node:assert/strict';
import {consumePounce,POUNCE_BUFFER} from './chase-input.js';
import {pawTrack} from './gait.js';

test('an early pounce tap fires once when the target reaches range',()=>{
  let pending=POUNCE_BUFFER,calls=0;
  for(let i=0;i<17;i++){
    const result=consumePounce(pending,1/60,()=>i>=12);
    pending=result.remaining;
    if(result.started)calls++;
  }
  assert.equal(calls,1);
  assert.equal(pending,0);
  assert.deepEqual(consumePounce(.01,.017,()=>false),{remaining:0,started:false});
});

test('every walking paw has a planted phase and leaves the ground during recovery',()=>{
  for(let i=0;i<4;i++){
    const frames=Array.from({length:60},(_,t)=>pawTrack(t*2*Math.PI/60,i,2.8));
    assert.ok(frames.filter(foot=>foot.lift===0).length>37);
    assert.ok(frames.some(foot=>foot.lift>.08));
  }
});
