import {bounds,heightAt} from './district.js';

const defaultFov=59;

export function desktopFraming(width,height,touch) {
  if(touch||height<=0)return 0;
  return Math.max(0,Math.min(1,(width/height-1.14)/.57));
}

export function follow(player,heading,pitch,target=null,reducedMotion=false,{wide=0,cover=false}={}) {
  const fx=Math.sin(heading),fz=-Math.cos(heading);
  const run=Math.max(0,Math.min(1,(player.speed-3.9)/2.8));
  const sway=reducedMotion?0:Math.sin(player.gaits*.52)*.028*Math.min(1,player.speed);
  const radius=target?3.15:4.1+run*.85-wide*.55;
  const y=Math.max(.95,2.06+.65*player.y+pitch*3.1+run*.14+sway-wide*.40);
  const focus={x:player.x+fx*2.75,y:.63+player.y*.45+pitch*1.43+wide*.15,z:player.z+fz*2.75};
  if(target){focus.x=(player.x+target.x)*.5;focus.y=.47;focus.z=(player.z+target.z)*.5;}
  // Move the idle title camera left so the cat and the gate sit beside the copy.
  const titleOffset=cover?wide:0;
  focus.x-=titleOffset*2.15;
  focus.y-=titleOffset*.12;
  let found={x:player.x,y,z:player.z};
  // Keep the whole camera boom in free space, even as it swings around corners.
  for(let d=.3;d<=radius+.06;d+=.25){
    const shoulder=Math.min(.43,d*.16)-titleOffset*Math.min(1.2,d*.36);
    const x=player.x-fx*d+Math.cos(heading)*shoulder;
    const z=player.z-fz*d+Math.sin(heading)*shoulder;
    if(heightAt(x,z,.24)>y-.24||x<bounds.left-.15||x>bounds.right+.15||z>bounds.front+.85||z<bounds.back-.8)break;
    found={x,y,z};
  }
  return {...found,tx:focus.x,ty:focus.y,tz:focus.z,fov:defaultFov-wide*(target?4:10)};
}

export function projection(v,w,h) {
  const fx=v.tx-v.x,fy=v.ty-v.y,fz=v.tz-v.z;
  const size=Math.hypot(fx,fy,fz)||1;
  const f=[fx/size,fy/size,fz/size],horizontal=Math.hypot(f[0],f[2])||1;
  const right=[-f[2]/horizontal,0,f[0]/horizontal];
  const up=[-right[2]*f[1],right[2]*f[0]-right[0]*f[2],right[0]*f[1]];
  const lens=h*.5/Math.tan((v.fov??defaultFov)*Math.PI/360);
  const view=(x,y,z)=>{
    const a=x-v.x,b=y-v.y,c=z-v.z;
    return [a*right[0]+c*right[2],a*up[0]+b*up[1]+c*up[2],a*f[0]+b*f[1]+c*f[2]];
  };
  const screen=([x,y,z])=>[w/2+x*lens/z,h/2-y*lens/z,z];
  return {view,screen,lens,point:(x,y,z)=>screen(view(x,y,z))};
}
