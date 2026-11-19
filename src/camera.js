import {bounds,heightAt} from './district.js';

export function follow(player,heading,pitch) {
  const fx=Math.sin(heading),fz=-Math.cos(heading);
  let radius=4.8;
  const ty=.8+player.y*.41;
  const y=Math.max(1.02,2.48+player.y*.75+pitch*3.25);
  while(radius>1.05) {
    const xx=player.x-fx*radius+Math.cos(heading)*.55;
    const zz=player.z-fz*radius+Math.sin(heading)*.55;
    if(heightAt(xx,zz,.1)<y-.3 && xx>bounds.left-.8&&xx<bounds.right+.8&&zz<bounds.front+1.1)break;
    radius-=.45;
  }
  return {
    x:player.x-fx*radius+Math.cos(heading)*.55,y,z:player.z-fz*radius+Math.sin(heading)*.55,
    tx:player.x+fx*3.45,ty:ty+pitch*1.55,tz:player.z+fz*3.45,
  };
}

export function projection(v,w,h) {
  const fx=v.tx-v.x,fy=v.ty-v.y,fz=v.tz-v.z;
  const size=Math.hypot(fx,fy,fz)||1;
  const f=[fx/size,fy/size,fz/size],horizontal=Math.hypot(f[0],f[2])||1;
  const right=[-f[2]/horizontal,0,f[0]/horizontal];
  const up=[-right[2]*f[1],right[2]*f[0]-right[0]*f[2],right[0]*f[1]];
  const lens=h*.5/Math.tan(59*Math.PI/360);
  const view=(x,y,z)=>{
    const a=x-v.x,b=y-v.y,c=z-v.z;
    return [a*right[0]+c*right[2],a*up[0]+b*up[1]+c*up[2],a*f[0]+b*f[1]+c*f[2]];
  };
  const screen=([x,y,z])=>[w/2+x*lens/z,h/2-y*lens/z,z];
  return {view,screen,lens,point:(x,y,z)=>screen(view(x,y,z))};
}
