import {palette} from './scenery.js';
import {projection} from './camera.js';

function terrain(street) {
  const faces=[];
  const transform=(p,[x,y,z])=>{
    const cos=Math.cos(p.yaw||0),sin=Math.sin(p.yaw||0);
    return [p.x+x*cos+z*sin,p.y+y,p.z+z*cos-x*sin];
  };
  const add=(p,points,shade,texture=null,repeat=1)=>{
    const verts=points.map(pt=>transform(p,pt));
    faces.push({verts,shade,color:palette[p.m],texture,repeat});
  };
  const quad=(p,points,shade,texture,repeat)=>add(p,points,shade,texture,repeat);
  for(const p of street.meshes) {
    if(p.type==='box'){
      const {w,h,d}=p;
      if(h<.055 && !['wood','gold','teal'].includes(p.m))continue;
      if(p.m==='cobble')continue;
      const a=w/2,b=h/2,c=d/2;
      const big=w*h>10 || d*h>10;
      const surface=big&&['stone','warm','clay','ivory'].includes(p.m)?'stone':p.m==='rug'?'rug':null;
      quad(p,[[-a,b,c],[a,b,c],[a,-b,c],[-a,-b,c]],.97,surface);
      quad(p,[[a,b,-c],[-a,b,-c],[-a,-b,-c],[a,-b,-c]],.66,surface);
      quad(p,[[a,b,c],[a,b,-c],[a,-b,-c],[a,-b,c]],.69,surface);
      quad(p,[[-a,b,-c],[-a,b,c],[-a,-b,c],[-a,-b,-c]],.88,surface);
      quad(p,[[-a,b,-c],[a,b,-c],[a,b,c],[-a,b,c]],1.12);
    } else if(p.type==='arch'){
      const r=p.w/2,k=p.h-r,near=p.d/2,texture=p.m==='teal'?'wood':p.m==='wood'?null:p.hole?'stone':null;
      if(p.hole){
        const inn=r-.45;
        for(const dir of [-1,1]){
          const x1=dir*r,x2=dir*inn;
          add(p,[[x1,k,near],[x2,k,near],[x2,0,near],[x1,0,near]],.98,'stone');
        }
        for(let i=0;i<12;i++){
          const f=i*Math.PI/12,s=(i+1)*Math.PI/12;
          add(p,[[r*Math.cos(s),k+r*Math.sin(s),near],[r*Math.cos(f),k+r*Math.sin(f),near],
            [inn*Math.cos(f),k+inn*Math.sin(f),near],[inn*Math.cos(s),k+inn*Math.sin(s),near]],.94,'stone');
        }
      }else{
        const pts=[[-r,0,near],[r,0,near],[r,k,near]];
        for(let i=1;i<=10;i++)pts.push([r*Math.cos(i*Math.PI/10),k+r*Math.sin(i*Math.PI/10),near]);
        add(p,pts.reverse(),1,texture);
      }
    } else if(p.type==='cloth'){
      for(let i=0;i<11;i++){
        const a=(i/11-.5)*p.w,b=((i+1)/11-.5)*p.w,d=p.d/2;
        quad(p,[[a,p.h/2,-d],[b,p.h/2,-d],[b,-p.h/2,d],[a,-p.h/2,d]],i%3===0?1.18:i%3===1?.88:1.02);
      }
    } else {
      const n=7;
      const ring=p.shape==='bowl'?[[.54,0],[.68,.18],[1,1],[.88,1],[.54,.34]]:
        p.shape==='spice'?[[1,0],[.61,.55],[0,1]]:
        [[.61,0],[.93,.25],[1,.57],[.68,.9],[.73,1]];
      for(let i=0;i<n;i++){
        const a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n;
        const pt=([r,y],f)=>[Math.cos(f)*r*p.r,y*p.h,Math.sin(f)*r*p.r];
        for(let j=1;j<ring.length;j++){
          quad(p,[pt(ring[j],b),pt(ring[j],a),pt(ring[j-1],a),pt(ring[j-1],b)],.84-.19*Math.cos(a));
        }
      }
    }
  }
  return faces;
}

function clip(verts,near=.19) {
  const points=[];
  for(let i=0;i<verts.length;i++){
    const a=verts[i],b=verts[(i+1)%verts.length];
    if(a[2]>=near)points.push(a);
    if((a[2]<near) !== (b[2]<near)){
      const d=(near-a[2])/(b[2]-a[2]);
      points.push([a[0]+(b[0]-a[0])*d,a[1]+(b[1]-a[1])*d,near]);
    }
  }
  return points;
}

const rgb = hex=>[1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16));
const COLOR=new Map(Object.values(palette).map(x=>[x,rgb(x)]));
function shaded(hex,shade,depth) {
  const fade=Math.min(.66,Math.max(0,(depth-9)*.0145));
  const base=COLOR.get(hex)||rgb(hex);
  return 'rgb('+base.map((v,i)=>Math.round(v*shade*(1-fade)+[174,145,120][i]*fade)).join(',')+')';
}

export function makeSoftWorld(canvas,street) {
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('This browser could not start the 3D view.');
  const faces=terrain(street),imgs={};
  for(const name of ['cobble','stone','wood','rug','cat-frames','hero-frames']){
    const image=new Image();
    image.src='/art/'+name+'.webp';
    imgs[name]=image;
  }
  let last=0;
  const isReady=im=>im?.complete&&im.naturalWidth;
  function fill(pts,style){
    ctx.fillStyle=style;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
    ctx.closePath();ctx.fill();
  }
  function tile(im, pts,opacity,tileX=0,tileY=0,tileSize=im.naturalWidth) {
    if(!isReady(im)||pts.length!==4)return;
    const size=tileSize;
    const [a,b,c,d]=pts;
    const area=Math.abs((b[0]-a[0])*(d[1]-a[1])-(d[0]-a[0])*(b[1]-a[1]));
    if(area<40)return;
    const drawTriangle=(p,q,r,flip)=>{
      ctx.save();
      ctx.globalAlpha=opacity;
      ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.lineTo(r[0],r[1]);ctx.closePath();ctx.clip();
      const sign=flip?-1:1;
      ctx.transform(sign*(q[0]-p[0])/size,sign*(q[1]-p[1])/size,
        sign*(r[0]-p[0])/size,sign*(r[1]-p[1])/size,p[0],p[1]);
      ctx.drawImage(im,tileX,tileY,size,size,flip?-size:0,flip?-size:0,size,size);
      ctx.restore();
    };
    drawTriangle(a,b,d,false);
    drawTriangle(c,d,b,true);
  }
  function draw(state){
    const now=performance.now();
    if(now-last<29)return;
    last=now;
    const width=canvas.clientWidth,height=canvas.clientHeight;
    if(!width||!height)return;
    const scale=Math.min(1,1000/width,720/height);
    const w=Math.round(width*scale),h=Math.round(height*scale);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const gradient=ctx.createLinearGradient(0,0,0,h*.65);
    gradient.addColorStop(0,'#8d8a8e');gradient.addColorStop(.65,'#d3a283');gradient.addColorStop(1,'#d5aa87');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    const proj=projection(state.view,w,h);
    const project=verts=>clip(verts.map(p=>proj.view(...p))).map(proj.screen);
    const visible=pts=>pts.length>2&&!([pts.every(p=>p[0]<0),pts.every(p=>p[0]>w),pts.every(p=>p[1]<0),pts.every(p=>p[1]>h)].some(Boolean));
    const ground=project([[-24,0,-48],[24,0,-48],[24,0,20],[-24,0,20]]);
    if(visible(ground))fill(ground,'#796b57');
    const centerX=Math.floor(state.player.x/3)*3,centerZ=Math.floor(state.player.z/3)*3;
    for(let z=centerZ-30;z<=centerZ+16;z+=3)for(let x=centerX-22;x<=centerX+22;x+=3){
      if(Math.abs(x)>23||z< -45||z>17)continue;
      const pts=project([[x,0,z],[x+3,0,z],[x+3,0,z+3],[x,0,z+3]]);
      if(!visible(pts))continue;
      const depth=Math.max(.2,pts.reduce((a,p)=>a+p[2],0)/pts.length);
      fill(pts,shaded(palette.cobble,1+Math.sin(x*3.8+z*1.1)*.04,depth));
      if(pts.length===4&&depth<35)tile(imgs.cobble,pts,Math.max(.22,.86-depth*.018));
    }

    const objects=[];
    for(const face of faces){
      const v=face.verts.map(p=>proj.view(...p));
      if(v.every(p=>p[2]<.19))continue;
      const pts=clip(v).map(proj.screen);
      if(!visible(pts))continue;
      // Facing away surfaces would otherwise draw over the near face of the same box.
      const p=pts[0],a=pts[1],b=pts[2];
      if((a[0]-p[0])*(b[1]-p[1])-(a[1]-p[1])*(b[0]-p[0])<0)continue;
      const depth=pts.reduce((sum,p)=>sum+p[2],0)/pts.length;
      objects.push({depth,pts,face});
    }
    for(const p of street.lamps){
      const pt=proj.point(p.x,p.y,p.z);
      if(pt[2]<1||pt[0]<-10||pt[0]>w+10||pt[1]<-10||pt[1]>h+10)continue;
      objects.push({depth:pt[2]-.027,point:pt,lamp:p});
    }
    for(const cat of [state.player,...state.npcs]){
      const p=proj.point(cat.x,cat.y||0,cat.z);
      if(p[2]<.45||p[0]<-80||p[0]>w+80)continue;
      objects.push({depth:p[2],point:p,cat});
    }
    objects.sort((a,b)=>b.depth-a.depth);
    for(const o of objects){
      if(o.face){
        fill(o.pts,shaded(o.face.color,o.face.shade,o.depth));
        if(o.face.texture&&o.depth<29)tile(imgs[o.face.texture],o.pts,Math.max(.12,.64-o.depth*.017));
      } else if(o.cat){
        const {cat,point:[x,y,z]}=o;
        const size=proj.lens*1.14/z;
        const hero=cat===state.player;
        const image=hero ? imgs['hero-frames']:imgs['cat-frames'];
        if(isReady(image)){
          const g=cat.speed>.14&&cat.y<.24 ? Math.floor((cat.gaits||0)*1.12)%6:0;
          const id=hero?0:cat.id;
          const side=Math.sin(cat.yaw-state.heading);
          if(hero){
            const relative=Math.atan2(Math.sin(cat.yaw-state.heading),Math.cos(cat.yaw-state.heading));
            const direction=(Math.round(relative/(Math.PI/4))+8)%8;
            ctx.drawImage(image,g*90,direction*65,90,65,x-size*.55,y-size*.77,size*1.1,size*.795);
          } else {
            const frame=g+(cat.fleeing?6:0);
            ctx.save();ctx.translate(x,y);ctx.scale(side<0?-1:1,1);
            ctx.drawImage(image,frame*90,id*65,90,65,-size*.68,-size*.82,size*1.36,size*.98);
            ctx.restore();
          }
        }else{
          ctx.fillStyle=hero?'#724b37':'#b58a67';
          ctx.beginPath();ctx.ellipse(x,y-size*.36,size*.33,size*.29,0,0,Math.PI*2);ctx.fill();
        }
      } else {
        const [x,y,z]=o.point,size=Math.max(1,proj.lens*(o.lamp.string?.028:.072)/z);
        const glow=ctx.createRadialGradient(x,y,0,x,y,size*5);
        glow.addColorStop(0,'#fbe1acb0');glow.addColorStop(1,'#ff9d3600');
        ctx.fillStyle=glow;ctx.fillRect(x-5*size,y-5*size,size*10,size*10);
        ctx.fillStyle='#ffd99b';ctx.fillRect(x-size*.7,y-size,size*1.4,size*2);
      }
    }
  }
  return {draw,dispose:()=>{}};
}
