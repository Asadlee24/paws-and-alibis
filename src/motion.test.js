import {test} from 'node:test';
import assert from 'node:assert/strict';
import {entrance,moveBody,heightAt,distance} from './district.js';
import {follow} from './camera.js';
import {makePlayer,stepPlayer,canPounce,startPounce} from './motion.js';

const step=(player,input={})=>stepPlayer(player,{x:0,z:0,heading:0,run:false,jump:false,...input},1/60);

test('movement accelerates, brakes, and respects walls',()=>{
  const actor=makePlayer(entrance);
  step(actor,{z:1});
  assert.ok(actor.speed>0&&actor.speed<2);
  for(let i=0;i<45;i++)step(actor,{z:1,run:true});
  assert.ok(actor.speed>6);
  for(let i=0;i<30;i++)step(actor);
  assert.ok(actor.speed<.05);
  const side=makePlayer({x:6.9,z:7});
  for(let i=0;i<100;i++)step(side,{x:1});
  assert.ok(side.x<7.55);
  const view=follow(side,Math.PI,0);
  assert.ok(heightAt(view.x,view.z,.2)<view.y);
});

test('a jump can clear a crate and lands back on the street',()=>{
  const actor=makePlayer({x:-1.10,z:-9.30});
  for(let i=0;i<120;i++)step(actor,{z:1,jump:i===0});
  assert.ok(actor.z<-11.5);
  assert.equal(actor.y,0);
  assert.equal(actor.air,false);
});

test('pounce reaches a nearby moving suspect and cannot be used through a wall',()=>{
  const actor=makePlayer({x:0,z:1});
  const target={x:0,z:-1.6,y:0};
  assert.equal(startPounce(actor,target),true);
  let caught=false;
  for(let i=0;i<29;i++){
    step(actor,{target});
    if(i>12)moveBody(target,0,-3/60);
    if(distance(actor,target)<.83&&Math.abs(actor.y-target.y)<.71){caught=true;break;}
  }
  assert.ok(caught);
  const behind=makePlayer({x:1.7,z:0});
  assert.equal(canPounce(behind,{x:1.7,z:2.6,y:0}),false);
  const screen=makePlayer({x:3.6,z:-4.8});
  assert.equal(canPounce(screen,{x:3.6,z:-7.6,y:0}),false);
});
