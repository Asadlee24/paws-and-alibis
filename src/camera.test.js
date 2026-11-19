import assert from 'node:assert/strict';
import test from 'node:test';
import {PerspectiveCamera,Vector3} from 'three';
import {desktopFraming,follow,projection} from './camera.js';
import {entrance} from './district.js';
import {makePlayer} from './motion.js';

test('the desktop title frames the cat beside the text and play recenters on it',()=>{
  const player=makePlayer(entrance);
  for(const [width,height] of [[1366,768],[1920,1080],[3440,1440]]){
    const wide=desktopFraming(width,height,false);
    const title=follow(player,0,0,null,false,{wide,cover:true});
    const play=follow(player,0,0,null,false,{wide});
    const [titleX,titleY]=projection(title,width,height).point(player.x,0,player.z);
    const [playX]=projection(play,width,height).point(player.x,0,player.z);
    assert.ok(titleX>width*.64&&titleX<width*.88);
    assert.ok(titleY<height*.90);
    assert.ok(Math.abs(playX/width-.5)<.07);
  }
});

test('touch framing stays the same and desktop markers follow the WebGL lens',()=>{
  assert.equal(desktopFraming(390,844,true),0);
  assert.equal(desktopFraming(844,390,true),0);

  const width=1920,height=1080;
  const view=follow(makePlayer(entrance),.3,.1,null,false,{wide:desktopFraming(width,height,false)});
  const camera=new PerspectiveCamera(view.fov,width/height,.15,115);
  camera.position.set(view.x,view.y,view.z);
  camera.lookAt(view.tx,view.ty,view.tz);
  camera.updateMatrixWorld();
  const clue=new Vector3(-6.15,1.02,4.5);
  const [x,y]=projection(view,width,height).point(...clue);
  clue.project(camera);
  assert.ok(Math.abs(x-(clue.x+1)*width/2)<.01);
  assert.ok(Math.abs(y-(1-clue.y)*height/2)<.01);
});
