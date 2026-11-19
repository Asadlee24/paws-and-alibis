import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cats} from './case.js';
import {palette} from './scenery.js';
import {gaitBlend,pawTrack} from './gait.js';

const PLASTER=new Set(['stone','warm','ivory','clay']);
const sRGB=new T.Color('#fff');
const ellipsoid=new T.SphereGeometry(1,16,12);
const cube=new T.BoxGeometry();
const up=new T.Vector3(0,1,0);
const earShape=new T.ConeGeometry(1,1,4);

export function makeWorld(canvas,street,context) {
  const renderer=new T.WebGLRenderer({canvas,context,antialias:true,powerPreference:'high-performance'});
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.06;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFShadowMap;
  renderer.shadowMap.autoUpdate=true;
  const scene=new T.Scene();
  scene.background=new T.Color('#cf9470');
  scene.fog=new T.FogExp2('#a9826f',.019);
  const camera=new T.PerspectiveCamera(59,1,.15,115);
  const hemi=new T.HemisphereLight('#b9c9df','#665449',1.55);
  const sun=new T.DirectionalLight('#ffd39e',3.25);
  sun.position.set(-18,16,-25);
  sun.target.position.set(0,0,-11);
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-25,right:25,top:30,bottom:-28,near:1,far:78});
  sun.shadow.normalBias=.040;
  sun.shadow.bias=-.00019;
  scene.add(hemi,sun,sun.target);

  const textureLoader=new T.TextureLoader();
  const skyTexture=textureLoader.load('/art/dusk.webp');
  skyTexture.colorSpace=T.SRGBColorSpace;
  const sky=new T.Mesh(new T.SphereGeometry(91,26,14),new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,uniforms:{clouds:{value:skyTexture}},
    vertexShader:`varying vec3 vDirection;
      void main(){vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec3 vDirection; uniform sampler2D clouds;
      void main(){vec3 d=normalize(vDirection);float u=atan(d.x,-d.z)*0.15915494+0.5;
        float v=clamp(d.y*1.37+0.115,0.005,0.995);
        vec3 color=texture2D(clouds,vec2(u,v)).rgb;
        color=mix(color,vec3(.37,.195,.118),1.0-smoothstep(0.0,.09,max(d.y,0.0)));
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }`
  }));
  sky.renderOrder=-5;
  scene.add(sky);
  const maxAniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const textures={};
  for(const name of ['stone','cobble','wood','rug','cobble-relief','stone-relief']){
    const tex=textureLoader.load('/art/'+name+'.webp');
    tex.colorSpace=name.endsWith('-relief')?T.NoColorSpace:T.SRGBColorSpace;
    tex.wrapS=tex.wrapT=T.RepeatWrapping;
    tex.anisotropy=maxAniso;
    textures[name]=tex;
  }
  const mats={};
  for(const [name,color] of Object.entries(palette)){
    const map=PLASTER.has(name)?textures.stone:name==='teal'?textures.wood:textures[name];
    const hue=map && name==='teal' ? '#a7c7b7' : map && name==='cobble' ? '#b5a792' : PLASTER.has(name) ? new T.Color(color).lerp(sRGB,.46) : name==='rug' ? '#cda99b' : name==='wood' ? '#9a7656' : color;
    mats[name]=new T.MeshStandardMaterial({color:hue,map:map||null,roughness:name==='brass'?.34:name==='cobble'?.64:.86,bumpMap:name==='cobble'?textures['cobble-relief']:PLASTER.has(name)?textures['stone-relief']:null,bumpScale:name==='cobble'?.079:.045,metalness:name==='brass'?.56:name==='iron'?.44:0,side:T.DoubleSide});
    if(name==='glass'){mats[name].emissive.set('#ffb84c');mats[name].emissiveIntensity=1.7;}
  }
  function geometry(p){
    if(p.type==='box'){
      const g=new T.BoxGeometry(p.w,p.h,p.d);
      const a=g.attributes.position,u=g.attributes.uv,n=g.attributes.normal;
      for(let i=0;i<u.count;i++){
        const x=a.getX(i),y=a.getY(i),z=a.getZ(i);
        const scale=p.m==='cobble'?2.7:PLASTER.has(p.m)?2.1:p.m==='rug'?1:1.65;
        u.setXY(i,Math.abs(n.getX(i))>.5 ? (z+p.z)/scale : (x+p.x)/scale,
          Math.abs(n.getY(i))>.5?(z+p.z)/scale:(y+p.y)/scale);
      }
      return g;
    }
    if(p.type==='arch') {
      const r=p.w/2, knee=p.h-r, outline=new T.Shape();
      outline.moveTo(-r,0);outline.lineTo(r,0);outline.lineTo(r,knee);outline.absarc(0,knee,r,0,Math.PI,false);outline.lineTo(-r,0);
      if(p.hole){
        const inner=r-.45,inset=new T.Path();
        inset.moveTo(-inner,.01);inset.lineTo(-inner,knee);inset.absarc(0,knee,inner,Math.PI,0,true);inset.lineTo(inner,.01);inset.closePath();outline.holes.push(inset);
      }
      const g=new T.ExtrudeGeometry(outline,{depth:p.d,bevelEnabled:false,curveSegments:13});
      return g.translate(0,0,-p.d/2);
    }
    if(p.type==='cloth'){
      const g=new T.PlaneGeometry(p.w,p.d,18,3);
      const a=g.attributes.position;
      for(let i=0;i<a.count;i++){
        const x=a.getX(i),z=-a.getY(i);
        a.setXYZ(i,x,-(z/p.d)*p.h+.04*Math.sin(x*22)*(.7+z/p.d),z);
      }
      g.computeVertexNormals();return g;
    }
    const r=p.r,h=p.h;
    if(p.shape==='wheel'){
      return new T.CylinderGeometry(r,r,h,16).rotateX(Math.PI/2).translate(0,r,0);
    }
    const points=(p.shape==='bowl'?[[.56,0],[.7,.2],[1,1],[.92,1],[.61,.32],[0,.3]]:
      p.shape==='spice'?[[.95,0],[.96,.19],[.66,.46],[.53,.62],[.16,.92],[0,1]]:
      [[.64,0],[.75,.08],[.93,.32],[1,.55],[.89,.75],[.54,.89],[.62,1],[.53,1],[.47,.88]])
      .map(([x,y])=>new T.Vector2(x*r,y*h));
    return new T.LatheGeometry(points,14);
  }
  const batches=new Map();
  const submit=p=>{
    const g=geometry(p);
    g.rotateY(p.yaw||0).translate(p.x,p.y,p.z);
    const key=p.m;
    const batch=batches.get(key)||[];
    if(!batches.has(key))batches.set(key,batch);
    batch.push(g.index?g.toNonIndexed():g);
    if(g.index)g.dispose();
  };
  street.meshes.forEach(submit);
  for(const lamp of street.lamps){
    const {x,y,z,string}=lamp,w=string?.066:.17,h=string?.13:.28;
    submit({x,y,z,w,h,d:w,m:'glass',type:'box'});
    if(!string){
      for(const yy of [-.17,.17])submit({x,y:y+yy,z,w:.24,h:.065,d:.24,m:'iron',type:'box'});
      for(const a of [-1,1])for(const b of [-1,1])submit({x:x+a*.103,y,z:z+b*.1,w:.024,h:.325,d:.022,m:'iron',type:'box'});
    }
  }
  for(const [key,geometries] of batches){
    const geometry=mergeGeometries(geometries);
    const mesh=new T.Mesh(geometry,mats[key]);
    mesh.castShadow=key!=='cobble'&&key!=='glass';
    mesh.receiveShadow=key!=='glass';
    scene.add(mesh);
    geometries.forEach(g=>g.dispose());
  }
  const glow=document.createElement('canvas');
  glow.width=64;glow.height=64;
  const ctx=glow.getContext('2d');
  const gradient=ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(255,235,184,0.72)');
  gradient.addColorStop(.15,'rgba(255,181,78,0.25)');
  gradient.addColorStop(1,'rgba(255,120,20,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const glowTex=new T.CanvasTexture(glow);
  const lightMat=new T.SpriteMaterial({map:glowTex,color:'#ffd68a',transparent:true,opacity:.9,depthWrite:false});
  for(const p of street.lamps){
    const sprite=new T.Sprite(lightMat);
    sprite.scale.setScalar(p.string?.52:1.10);
    sprite.position.set(p.x,p.y,p.z);
    scene.add(sprite);
  }
  const warmSources=street.lamps.filter(p=>!p.string);
  const practicals=Array.from({length:4},()=>new T.PointLight('#ffae64',13,6,2));
  scene.add(...practicals);
  let lampKey='';
  const shadowCanvas=document.createElement('canvas');
  shadowCanvas.width=64;shadowCanvas.height=64;
  const shadeCtx=shadowCanvas.getContext('2d');
  const contact=shadeCtx.createRadialGradient(32,32,3,32,32,30);
  contact.addColorStop(0,'#20170ec9');contact.addColorStop(.58,'#20170e62');contact.addColorStop(1,'#20170e00');
  shadeCtx.fillStyle=contact;shadeCtx.fillRect(0,0,64,64);
  const shadowTexture=new T.CanvasTexture(shadowCanvas);
  const contactShadows=Array.from({length:9},()=>{
    const mesh=new T.Mesh(new T.PlaneGeometry(.85,1.46),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:.52}));
    mesh.rotation.x=-Math.PI/2;scene.add(mesh);return mesh;
  });
  const hero=makeCat({fur:'#8a6056',dark:'#453833',cream:'#e6c9a7',eyes:'#9fab73'},-1);
  const visitors=cats.map((c,id)=>makeCat(c,id));
  scene.add(hero.root,...visitors.map(v=>v.root));

  let lastW=0,lastH=0;
  function draw(state){
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    if(w!==lastW||h!==lastH){
      renderer.setPixelRatio(Math.min(devicePixelRatio,w<800?1.5:1.6));
      renderer.setSize(w,h,false);
      camera.aspect=w/h;camera.updateProjectionMatrix();
      lastW=w;lastH=h;
    }
    const {view,player,npcs}=state;
    camera.position.set(view.x,view.y,view.z);
    sky.position.copy(camera.position);
    const chunk=Math.round(player.x/2)+':'+Math.round(player.z/2);
    if(chunk!==lampKey){
      lampKey=chunk;
      const nearest=warmSources.slice().sort((a,b)=>((a.x-player.x)**2+(a.z-player.z)**2)-((b.x-player.x)**2+(b.z-player.z)**2));
      practicals.forEach((l,i)=>{const p=nearest[i];l.position.set(p.x,p.y,p.z);});
    }
    [player,...npcs].forEach((p,i)=>{
      contactShadows[i].position.set(p.x,.012+i*.00005,p.z);
      contactShadows[i].rotation.z=-p.yaw;
      contactShadows[i].material.opacity=.58*Math.max(.27,1-p.y*.62);
    });
    camera.lookAt(view.tx,view.ty,view.tz);
    pose(hero,player,state.time);
    for(let i=0;i<npcs.length;i++)pose(visitors[i],npcs[i],state.time);
    renderer.render(scene,camera);
  }
  return {draw, dispose:()=>renderer.dispose()};
}

function makeCat(c,id) {
  const root=new T.Group(),body=new T.Group();
  root.add(body);
  const m=(color,roughness=.91)=>new T.MeshStandardMaterial({color,roughness});
  const fur=m(c.fur),shade=m(c.dark),cream=m(c.cream),dark=m('#392922'),pink=m('#a67065'),eye=m(c.eyes,.46);
  const scarf=m(id<0?'#ad813e':id%2?'#48838c':'#b75635');
  const paws=id<0||!(id&4)?cream:dark;
  const tip=id<0||!(id&2)?cream:dark;
  const object=(g,material,x,y,z,sx,sy,sz,parent=body)=>{
    const mesh=new T.Mesh(g,material);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;
    parent.add(mesh);return mesh;
  };
  const ball=(mat,x,y,z,sx,sy,sz,parent)=>object(ellipsoid,mat,x,y,z,sx,sy,sz,parent);
  ball(fur,0,.43,.01,.179,.196,.41);
  ball(fur,0,.44,.25,.188,.198,.226);
  ball(cream,0,.327,-.10,.19,.126,.28);
  ball(shade,0,.565,.13,.177,.088,.249);
  for(const z of [-.01,.12,.245]){
    ball(shade,.11,.58,z,.055,.064,.078).rotation.y=-.52;
    ball(shade,-.11,.58,z,.055,.064,.078).rotation.y=.52;
  }
  ball(scarf,0,.49,-.282,.191,.123,.13);
  object(cube,scarf,.026,.51,-.34,.123,.16,.11).rotation.z=.52;
  const head=new T.Group();head.position.set(0,.62,-.34);body.add(head);
  ball(fur,0,0,-.06,.193,.164,.184,head);
  ball(cream,0,-.058,-.175,.133,.073,.108,head);
  ball(pink,0,-.034,-.297,.042,.024,.026,head);
  for(const x of [-1,1]){
    object(earShape,shade,x*.151,.181,-.025,.081,.194,.075,head).rotation.z=-x*.14;
    object(earShape,pink,x*.148,.177,-.068,.047,.129,.049,head).rotation.z=-x*.17;
    ball(eye,x*.107,.029,-.23,.044,.044,.03,head);
    ball(dark,x*.108,.028,-.252,.018,.034,.010,head);
    ball(cream,x*.103,.041,-.259,.008,.01,.006,head);
  }
  if(id<0){
    ball(dark,0,.153,-.045,.214,.077,.205,head);
    ball(shade,0,.133,-.152,.19,.034,.17,head);
    object(cube,scarf,.163,.51,.07,.12,.24,.31).rotation.z=-.12;
  }
  const legs=[];
  for(const x of [-.133,.133])for(const z of [-.245,.25]){
    legs.push({
      x,z,front:z<0,
      thigh:ball(fur,x,.25,z,.063,.12,.072,root),
      shin:ball(fur,x,.13,z,.044,.11,.053,root),
      paw:ball(paws,x,.047,z-.023,.061,.045,.084,root),
      a:new T.Vector3(),b:new T.Vector3(),c:new T.Vector3(),direction:new T.Vector3(),
    });
  }
  const tail=[];
  let parent=body;
  for(let i=0;i<6;i++){
    const link=new T.Group();
    if(i===0)link.position.set(0,.445,.413);else link.position.z=.123;
    parent.add(link);parent=link;
    ball(i>3?tip:fur,0,0,.058,.064-i*.004,.059-i*.004,.106,link);
    tail.push(link);
  }
  let bag=null;
  if(id>=0){
    bag=new T.Group();bag.position.set(.058,-.125,-.305);
    object(cube,m('#dcaa68'),0,0,0,.2,.15,.22,bag).rotation.z=.14;
    object(cube,m('#923c2b'),0,0,-.003,.036,.155,.228,bag).rotation.z=.14;
    head.add(bag);bag.visible=false;
  }
  return {root,body,legs,head,tail,bag};
}
function pose(model,p,time){
  const {root,body,head,legs,tail,bag}=model,ph=p.gaits||0;
  const speed=Math.max(0,p.speed||0);
  const fast=gaitBlend(speed);
  const launch=p.pounce>0;
  root.position.set(p.x,p.y||0,p.z);
  root.rotation.y=-p.yaw;
  body.position.y=p.pinned?-.21:Math.sin(time*3.2)*.006+(1-Math.cos(ph*2))*(.006+.013*fast)*Math.min(speed,1)-(p.impact||0)*.45;
  body.scale.set(launch?.89:1,p.pinned?.68:launch?.84:1,launch?1.24:1+fast*.12*Math.sin(ph));
  body.rotation.z=p.pinned?.67:(p.lean||0);
  body.rotation.x=launch?.11:p.air?-.14:Math.sin(ph*2)*(.017+fast*.045);
  head.rotation.x=launch?-.12:p.pinned?.16:Math.sin(ph)*.032;
  head.rotation.y=speed<.25?Math.sin(time*1.4+(p.id||0))*.14:0;
  body.updateMatrix();
  legs.forEach((leg,j)=>{
    const {x,z,front,thigh,shin,paw,a,b,c,direction}=leg;
    const foot=pawTrack(ph,j,speed);
    a.set(x,.35,z).applyMatrix4(body.matrix);
    if(p.pinned)c.set(x,.043,z+.12);
    else if(launch)c.set(x,.124,z+(front?-.24:.20));
    else if(p.air)c.set(x,.17,z+(front?-.10:.09));
    else c.set(x,.043+foot.lift,z+foot.z-.035);
    b.copy(a).lerp(c,.48);
    b.z+=(front?.079:-.107)*Math.min(1,Math.max(.35,(a.y-c.y)*3.3));
    b.x+=Math.sign(x)*.014;
    segment(thigh,a,b,direction);
    segment(shin,b,c,direction);
    paw.position.copy(c);
    paw.rotation.x=launch?-.32:p.air?.23:Math.min(.65,foot.lift*5.4);
  });
  tail.forEach((part,i)=>{
    part.rotation.x=(i===0?-.45:-.11)+.14*Math.sin(time*3.7+i*.65+ph*.22);
    part.rotation.y=.18*Math.sin(time*2.85+i*.42+(p.id||0));
  });
  if(bag)bag.visible=Boolean(p.fleeing);
}


function segment(mesh,start,end,direction) {
  mesh.position.copy(start).lerp(end,.5);
  direction.subVectors(end,start);
  const length=direction.length();
  mesh.scale.y=length*.62+.017;
  if(length>.0001)mesh.quaternion.setFromUnitVectors(up,direction.multiplyScalar(1/length));
}
