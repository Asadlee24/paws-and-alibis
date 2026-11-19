import {buildings,props} from './district.js';

export const palette = {
  cobble:'#766955', stone:'#a98c63', warm:'#b18356', ivory:'#c9af86', clay:'#8d6146',
  wood:'#644931', teal:'#365f58', dark:'#332b23', mortar:'#544438', iron:'#37332b',
  rust:'#894631', amber:'#c78b46', brass:'#a57832', blue:'#4f686d', rug:'#7f3e34',
  moss:'#526348', coal:'#282322', cream:'#c7a776', gold:'#f8bf63', glass:'#ffcb78',
};

export function makeStreet() {
  const meshes = [];
  const lamps = [];
  const box = (x,y,z,w,h,d,m,yaw=0)=>meshes.push({x,y,z,w,h,d,m,yaw,type:'box'});
  const pot = (x,y,z,r,h,m,shape='jar')=>meshes.push({x,y,z,r,h,m,shape,type:'pot'});
  const arch = (x,y,z,w,h,d,m,yaw=0,hole=false)=>meshes.push({x,y,z,w,h,d,m,yaw,hole,type:'arch'});
  const cloth = (x,y,z,w,h,d,m,yaw=0)=>meshes.push({x,y,z,w,h,d,m,yaw,type:'cloth'});

  box(0,-.13,-9.65,49,.23,59,'cobble');
  box(0,-.05,14.7,49,.13,2.25,'cobble');
  // The arcade and its shutters all share the same way of placing elements on a facade.
  for(const b of buildings) {
    const face=b.x-b.side*b.w*.5;
    const yaw=-b.side*Math.PI/2;
    const wall=b.index%3===0?'warm':b.index%3===1?'stone':'ivory';
    const trim=b.index%2===0?'ivory':'clay';
    const at=(u,y,n,w,h,d,m,fn=box)=>fn(face-b.side*n,y,b.z+b.side*u,w,h,d,m,yaw);
    box(b.x,b.h*.5,b.z,b.w,b.h,b.d,wall);
    box(b.x,b.h+.04,b.z,b.w+.36,.25,b.d+.3,'clay');
    at(0,.08,.34,b.d+.1,.16,.73,'ivory');
    at(0,.55,.045,b.d,.89,.12,'clay');
    at(0,3.31,.09,b.d,.24,.35,trim);
    at(0,3.51,.12,b.d,.12,.47,'wood');
    at(0,b.h-.12,.12,b.d,.28,.46,trim);
    at(0,b.h+.23,.11,b.d,.14,.42,'ivory');
    const cells=b.d>8.4?3:2;
    for(let i=0;i<cells;i++) {
      const u=(i-(cells-1)/2)*(b.d/cells);
      const shutter=i%2===0?'teal':'wood';
      const frame=1.69+(cells===2?.32:0);
      at(u,.22,.07,frame+.46,2.84,.22,trim,arch);
      at(u,.24,.21,frame,2.64,.105,'dark',arch);
      at(u,.26,.28,frame-.2,2.50,.08,shutter,arch);
      at(u,1.1,.328,.058,1.64,.04,'dark');
      at(u,.68,.353,frame-.29,.05,.045,'dark');
      at(u-.19,1.08,.361,.04,.20,.06,'brass');
      at(u+.18,1.08,.361,.04,.20,.06,'brass');
      at(u,.23,.44,frame+.14,.09,.32,'ivory');
      at(u,4.01,.048,frame+.34,2.27,.27,'clay',arch);
      at(u,4.12,.21,frame-.02,2.11,.13,'dark',arch);
      at(u,4.13,.36,frame+.2,.14,.54,b.index%2===0?'teal':'wood');
      at(u,5.78,.31,frame-.04,.1,.2,'wood');
      const lattice=b.index%2===0?'teal':'wood';
      for(let j=-3;j<=3;j++) at(u+j*.195,4.95,.32,.051,1.52,.062,lattice);
      for(let j=0;j<5;j++) at(u,4.29+j*.29,.338,1.43,.045,.067,lattice);
      if (i===1) {
        const fabric=['rust','blue','amber'][b.index%3];
        at(u,2.79,1.05,frame+.89,.39,1.55,fabric,cloth);
        at(u,2.67,1.83,frame+.86,.10,.053,'gold');
      }
      if(i%2===0){
        at(u+1.08,2.33,.44,.11,.10,.43,'iron');
        lamps.push({x:face-b.side*.68,y:2.11,z:b.z+b.side*(u+1.08)});
      }
    }
    for(const side of [-1,1]) {
      at(side*(b.d*.5-.13),3.05,.09,.28,6.04,.26,trim);
      for(let i=0;i<5;i++) at(side*(b.d*.5-.13),.5+i*1.23,.19,.37,.12,.34,'clay');
    }
    // Roof parapet niches and staggered terraces.
    for(let i=0;i<Math.floor(b.d/1.05);i++) at((i-3.5)*.96,b.h+.29,.04,.50,.51,.28,wall);
    box(b.x+b.side*1.8,b.h+.65,b.z-1.1,3.4,1.1,2.49,wall);
    box(b.x+b.side*1.8,b.h+1.26,b.z-1.1,3.78,.19,2.86,'clay');
    pot(b.x,b.h+.12,b.z+2.2,.28,.61,'clay');
  }
  // A limestone gateway caps the north view. The archway remains traversable.
  for(const side of [-1,1]){
    box(side*5.0,2.95,-33.1,3.4,5.9,2.35,'stone');
    box(side*5.0,6.02,-33.1,3.75,.24,2.55,'ivory');
    box(side*5.0,7.11,-33.1,2.38,2.13,1.8,'clay');
    box(side*5.0,8.18,-33.1,2.73,.24,2.16,'ivory');
    for(const u of [-.95,0,.95])box(side*5.0+u,8.45,-32.49,.55,.5,.5,'stone');
    lamps.push({x:side*2.95,y:2.65,z:-31.95});
  }
  arch(0,.02,-33.0,7.1,6.51,1.85,'ivory',0,true);
  box(0,6.83,-33.14,7.5,.71,1.95,'stone');
  box(0,7.23,-33.1,7.8,.16,2.13,'ivory');
  for(let i=0;i<7;i++)box(i-3,7.49,-32.45,.55,.46,.38,'clay');
  box(0,.55,-37.3,26,1.1,1.05,'stone');
  for(let i=0;i<10;i++) {
    const x=(i-4.5)*3.85;
    const h=5+Math.sin(i*1.8)*1.4+Math.cos(i*.91)*1.5;
    box(x,h/2,-40.3-(i%2)*3,4.23,h,4.7,i%2?'stone':'clay');
    box(x,h+.04,-40.3-(i%2)*3,4.5,.32,4.98,'ivory');
  }
  for(const side of [-1,1]) {
    box(side*20.15,1.05,-9.6,.56,2.1,46.75,'clay');
    box(side*20.15,2.17,-9.6,.81,.15,47.05,'ivory');
  }
  for(const p of props){
    if(p.kind==='crate'){
      box(p.x,p.h*.48,p.z,p.w*.96,p.h*.95,p.d*.96,'wood');
      for(const sign of [-1,1]) for(const other of [-1,1])box(p.x+sign*(p.w*.44),p.h*.48,p.z+other*(p.d*.44),.13,p.h,.13,'cream');
      box(p.x,p.h*.83,p.z,p.w,.1,p.d+.03,'cream');
      box(p.x,p.h*.18,p.z,p.w,.09,p.d+.03,'dark');
      box(p.x,p.h,p.z,p.w,.085,p.d,'wood');
    } else if(p.kind==='pots') {
      for(let i=0;i<3;i++){pot(p.x+((i%2)-.5)*.27,0,p.z+(i-1)*.43,.26+i*.015,.41+i*.057,i===1?'brass':'clay');}
    } else {
      const stall=p.kind==='stall';
      box(p.x,p.h*.53,p.z,p.w*.86,p.h*.71,p.d*.89,'wood');
      box(p.x,p.h-.045,p.z,p.w,p.h*.14,p.d,'cream');
      for(const x of [-1,1])for(const z of [-1,1])box(p.x+x*p.w*.42,p.h*.42,p.z+z*p.d*.42,.10,p.h*.84,.10,'wood');
      if(stall){
        for(let i=0;i<4;i++){
          const z=p.z+(i-1.5)*.45;
          pot(p.x,p.h,z,.25,.19,i%2?'clay':'brass','bowl');
          pot(p.x,p.h+.15,z,.198,.15,['rust','amber','moss','gold'][i],'spice');
        }
        const rug=p.x>0;
        if(rug) for(let i=0;i<3;i++)box(p.x-.54,.51+i*.105,p.z+(i-.8)*.3,.14,.99,1.21,i%2?'amber':'rug');
      } else {
        for(const x of [-1,1])for(const z of [-1,1])pot(p.x+x*.89,.02,p.z+z*.62,.24,.08,'iron','wheel');
        for(let i=0;i<4;i++)box(p.x+(i-1.5)*.37,p.h+.22,p.z,.32,.39,.76,i%2?'rug':'teal');
      }
    }
  }
  for(const z of [9.4,-1.2,-13,-25.5]){
    for(let i=0;i<16;i++){
      const x=-8.1+i*1.08,y=5.6+.015*x*x;
      lamps.push({x,y,z,string:true});
      if(i)box(x-.54,y+.11,z,1.12,.013,.015,'dark');
    }
  }
  return {meshes,lamps};
}
