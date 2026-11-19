import {heightAt,moveBody,distance} from './district.js';
import {strideLength} from './gait.js';

const smooth=(rate,dt)=>1-Math.exp(-rate*dt);
export const angleDelta=(target,current)=>Math.atan2(Math.sin(target-current),Math.cos(target-current));
export const makePlayer=start=>({...start,y:0,yaw:0,vx:0,vz:0,vy:0,air:false,gaits:0,speed:0,lean:0,pounce:0,impact:0});

export function canPounce(player,target) {
  if(!target||player.pounce>0||Math.abs(player.y-target.y)>.75)return false;
  const d=distance(player,target);
  if(d>3.45)return false;
  const angle=Math.atan2(target.x-player.x,player.z-target.z);
  if(d>1.85&&Math.abs(angleDelta(angle,player.yaw))>1.37)return false;
  for(let i=1;i<=5;i++){
    if(heightAt(player.x+(target.x-player.x)*i/6,player.z+(target.z-player.z)*i/6,.16)>.48)return false;
  }
  return true;
}

export function startPounce(player,target) {
  if(!canPounce(player,target))return false;
  player.pounce=.57;
  player.air=true;
  player.vy=3.05;
  return true;
}

export function stepPlayer(player,{x,z,heading,run,jump,target},dt) {
  const speed=run?6.7:4.05;
  const amount=Math.min(1,Math.hypot(x,z));
  if(jump&&!player.air){
    player.air=true;
    player.vy=5.15;
  }
  let dx=0,dz=0;
  if(player.pounce>0&&target){
    const a=Math.atan2(target.x-player.x,player.z-target.z);
    dx=Math.sin(a)*11.5;
    dz=-Math.cos(a)*11.5;
    player.pounce=Math.max(0,player.pounce-dt);
  }else if(amount>.045){
    const sin=Math.sin(heading),cos=Math.cos(heading),scale=speed/Math.max(1,Math.hypot(x,z));
    dx=(cos*x+sin*z)*scale;
    dz=(sin*x-cos*z)*scale;
  }
  const grip=player.pounce>0?20:player.air?3.6:amount>.045?12:16;
  player.vx+=(dx-player.vx)*smooth(grip,dt);
  player.vz+=(dz-player.vz)*smooth(grip,dt);
  if(Math.hypot(dx,dz)>.1){
    const turn=angleDelta(Math.atan2(dx,-dz),player.yaw);
    player.yaw+=turn*smooth(player.pounce>0?25:12,dt);
    player.lean+=(Math.max(-.23,Math.min(.23,turn*-.22))-player.lean)*smooth(9,dt);
  }else player.lean*=Math.exp(-10*dt);
  if(player.air){
    player.vy-=13.1*dt;
    player.y+=player.vy*dt;
    const platform=heightAt(player.x,player.z,.25);
    if(player.vy<0&&player.y<=platform){
      player.impact=Math.min(.21,-player.vy*.027);
      player.y=platform;
      player.vy=0;
      player.air=false;
    }
  }
  const oldX=player.x,oldZ=player.z;
  moveBody(player,player.vx*dt,player.vz*dt);
  if(Math.abs(player.x-oldX)<Math.abs(player.vx*dt)*.2)player.vx=0;
  if(Math.abs(player.z-oldZ)<Math.abs(player.vz*dt)*.2)player.vz=0;
  const moved=Math.hypot(player.x-oldX,player.z-oldZ);
  player.speed=moved/dt;
  if(!player.air)player.gaits+=moved*2*Math.PI/strideLength(player.speed);
  if(!player.air&&heightAt(player.x,player.z,.25)<player.y-.055){
    player.air=true;
    player.vy=0;
  }
  player.impact*=Math.exp(-12*dt);
}
