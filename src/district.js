export const bounds = {left:-20, right:20, front:14, back:-34};
export const entrance = {x:0, z:9.6};
export const evidenceSites = [
  {x:-6.15,z:4.5,name:'The spice stall',source:'Spice seller',trait:'Scarf',values:['red','blue'],line:['The thief wore a red scarf.','The thief wore a blue scarf.']},
  {x:6,z:-14.6,name:'The rug shop',source:'Rug merchant',trait:'Tail tip',values:['light','dark'],line:['The tip of the thief’s tail was light.','The tip of the thief’s tail was dark.']},
  {x:-17.3,z:-20.1,name:'The west passage',source:'Tracks in flour',trait:'Paws',values:['light','dark'],line:['The thief had light paws.','The thief had dark paws.']},
];

export const buildings = [-1,1].flatMap(side =>
  [[8,9.2,7.1],[-1.15,7.8,8.5],[-13.35,9.1,7.65],[-27.1,9.4,8.3]].map(([z,d,h],i)=>({
    side,x:side*12.1,z,d,h,w:8.8,index:i+(side>0?4:0),
  }))
);

export const props = [
  {kind:'stall',x:-7.1,z:4.55,w:1.08,d:2.6,h:1.03},
  {kind:'stall',x:7.05,z:-14.55,w:1.14,d:3.4,h:1.08},
  {kind:'cart',x:3.55,z:-6.4,w:2.4,d:1.5,h:.92},
  {kind:'crate',x:-2.6,z:-10.3,w:1.44,d:1.25,h:.69},
  {kind:'crate',x:-1.1,z:-10.55,w:.8,d:.92,h:.48},
  {kind:'crate',x:-7.1,z:-24,w:.88,d:1.1,h:.72},
  {kind:'crate',x:-12.1,z:-7.55,w:1.25,d:.7,h:.5},
  {kind:'crate',x:4.5,z:-23.8,w:1.42,d:.95,h:.62},
  {kind:'crate',x:6.75,z:-29.8,w:1.25,d:1.2,h:.76},
  {kind:'pots',x:-6.3,z:-5.52,w:.74,d:1.45,h:.65},
  {kind:'pots',x:6.7,z:1.65,w:1.1,d:1.85,h:.65},
  {kind:'pots',x:-17.45,z:-12.1,w:.83,d:2.04,h:.62},
  {kind:'pots',x:6.75,z:-21.8,w:1.18,d:1.44,h:.63},
  {kind:'crate',x:1.95,z:-16.7,w:1.04,d:1.15,h:.67},
  {kind:'crate',x:3.0,z:-17.15,w:.79,d:.92,h:.46},
  {kind:'crate',x:6.78,z:7.4,w:1.36,d:1.48,h:.79},
];

export const obstacles = [...buildings.map(b=>({...b,h:b.h+1})),...props];
export const heightAt = (x,z,r=.25) => {
  let h=0;
  for(const b of obstacles) {
    if(Math.abs(x-b.x)<b.w/2+r && Math.abs(z-b.z)<b.d/2+r) h=Math.max(h,b.h);
  }
  return h;
};

export function moveBody(body, dx,dz) {
  const {left,right,front,back}=bounds;
  const x=Math.min(right-.4,Math.max(left+.4,body.x+dx));
  const z=Math.min(front-.4,Math.max(back+.4,body.z+dz));
  if(heightAt(x,body.z)<=(body.y||0)+.075) body.x=x;
  if(heightAt(body.x,z)<=(body.y||0)+.075) body.z=z;
}

export const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const starts = [
  [-4,1], [4,3], [-3,-3], [3,-10.1], [-3.8,-15.6], [4.5,-15], [-2.4,-23.7], [3.7,-26.6]
];
export function newVisitors() {
  return starts.map(([x,z],i)=>({
    id:i,x,z,y:0,yaw:i%2===0 ? 1.5 : -1.8, gaits:i*1.8, speed:0,
    homeX:x,homeZ:z, pace:.75+i%3*.13, pinned:false, fleeing:false,
  }));
}
export function patrol(visitor,time,dt,player) {
  const theta=time*visitor.pace+visitor.id*1.2;
  const x=visitor.homeX+Math.sin(theta)*1.35;
  const z=visitor.homeZ+Math.cos(theta*.56)*1.42;
  if(distance(visitor,player)<1.45) {
    visitor.speed=0;
    visitor.yaw=Math.atan2(player.x-visitor.x,-(player.z-visitor.z));
    return;
  }
  const dx=x-visitor.x,dz=z-visitor.z,len=Math.hypot(dx,dz);
  if(len<.1){visitor.speed=0;return;}
  const increment=Math.min(len,dt*1.2);
  visitor.speed=increment/dt;
  visitor.yaw=Math.atan2(dx,-dz);
  moveBody(visitor,dx/len*increment,dz/len*increment);
  visitor.gaits+=increment*7;
}

export function escapeRoute(visitor) {
  const innerX=visitor.x < -2 ? -4.35 : visitor.x > 1.5 ? 5.35 : 0;
  const first={x:innerX,z:visitor.z};
  const north=[{x:-1.1,z:-27.5},{x:-1.15,z:-29.9},{x:0,z:-33.2}];
  if(visitor.z < -21) return [first,...north];
  const alley=visitor.z>=-6.9?-6.85:-19.95;
  const detour=alley>-10 ? [{x:-18.65,z:alley},{x:-18.65,z:-19.95},{x:-5.6,z:-19.95}] : [];
  return [first,{x:innerX,z:alley},{x:-5.6,z:alley},...detour,{x:-3.75,z:-22.2},...north]
    .filter((p,i,all)=>distance(p,i?all[i-1]:visitor)>.3);
}

export function advanceEscape(visitor,route,dt) {
  const next=route[0];
  if(!next)return;
  const dx=next.x-visitor.x,dz=next.z-visitor.z,len=Math.hypot(dx,dz);
  if(len<.24){route.shift();return;}
  const d=Math.min(len,4.22*dt);
  visitor.x+=dx/len*d;
  visitor.z+=dz/len*d;
  visitor.yaw=Math.atan2(dx,-dz);
  visitor.gaits+=d*8;
  visitor.speed=4.22;
}
