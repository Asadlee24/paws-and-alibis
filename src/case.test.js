import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cats,evidence,side,position,makePractice} from './case.js';

test('every route can be identified by its three evidence records',()=>{
  const routes=cats.map((_,id)=>evidence.map((clue,index)=>{
    const [x]=clue.places[side(id,index)];
    assert.ok(Math.abs(position(id,clue.time).x-x)<.04);
    return side(id,index);
  }).join(''));
  assert.equal(new Set(routes).size,8);
});

test('practice rewards the correct guess once and charges for each distinct clue',async()=>{
  const game=makePractice();
  await game.start();
  const clues=await Promise.all([0,1,2].map(id=>game.clue(id)));
  await game.clue(0);
  const answer=clues.reduce((acc,bit,id)=>acc+(bit<<id),0);
  assert.deepEqual(await game.accuse(answer),{culprit:answer,correct:true,clues:3,score:75});
  await assert.rejects(game.accuse(answer),/closed/);
  await assert.rejects(game.clue(0),/closed/);
});
