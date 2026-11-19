import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-500-italic.css';
import './game.css';
import {cats,makePractice} from './case.js';
import {entrance,evidenceSites,newVisitors,heightAt,moveBody,patrol,distance,escapeRoute,advanceEscape} from './district.js';
import {makeStreet} from './scenery.js';
import {follow,projection} from './camera.js';
import {makeSoftWorld} from './render-soft.js';

const $=id=>document.getElementById(id);
let canvas=$('world');
const street=makeStreet();
let renderer;
const connectRender=async()=>{
  try {
    const gl=canvas.getContext('webgl2',{antialias:true});
    if(!gl)throw new Error();
    const {makeWorld}=await import('./render-world.js');
    renderer=makeWorld(canvas,street,gl);
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();useSoftware();},{once:true});
  } catch {useSoftware();}
};
function useSoftware(){
  const replacement=canvas.cloneNode();
  canvas.replaceWith(replacement);canvas=replacement;bindCamera();
  renderer=makeSoftWorld(canvas,street);
}
const keys=new Set();
let game=makePractice(),backendReady=false,view,heading=0,pitch=0,npcs,player,clues,route,leader;
let stage='cover',near=null,time=0,previous=0,busy=false,stamina=1,sprintTouch=false,jumpQueued=false;
let jx=0,jy=0,audio,muted=true,toastTimer,shake=0;
const modal=$('panel');
const prefs=matchMedia('(prefers-reduced-motion: reduce)').matches;
const newHero=()=>({...entrance,y:0,yaw:0,gaits:0,speed:0,vy:0,air:false});
function resetWorld(){
  player=newHero();npcs=newVisitors();clues=new Map();route=[];leader=null;
  heading=0;pitch=0;stamina=1;time=0;near=null;view=follow(player,heading,pitch);
}
resetWorld();
$('game').classList.add('cover-visible');
const feature=import.meta.env.VITE_BAZAAR_CONTRACT;
if(feature)$('chain').hidden=false;

function label(phase,title,detail){
  $('phase').textContent=phase;$('objective').textContent=title;$('detail').textContent=detail;
}
function objective(){
  if(stage==='hunt'){
    label('CASE 01 · INVESTIGATION',clues.size===3?'Find your suspect':'Investigate the bazaar',clues.size===3?'Match the scarf, tail tip and paws.':clues.size+' / 3 clues · Follow the marker to inspect evidence.');
  }else if(stage==='chase'){
    label('CASE 01 · PURSUIT','Catch the thief','Sprint or cut through the lanes. Get close and pounce.');
  }else if(stage==='complete'){
    label('CASE CLOSED','Biryani recovered','Open Case notes to play again.');
  }else if(stage==='escaped'){
    label('THIEF ESCAPED','Try the chase again','Open Case notes to retry.');
  }
  $('stamina').hidden=stage!=='chase';
}
function tell(text){
  clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;
  toastTimer=setTimeout(()=>$('toast').hidden=true,2900);
}
function ping(f,length=.11,level=.045,delay=0){
  if(muted||!audio)return;
  const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime+delay;
  o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.001,now);g.gain.exponentialRampToValueAtTime(level,now+.017);g.gain.exponentialRampToValueAtTime(.001,now+length);
  o.connect(g);g.connect(audio.destination);o.start(now);o.stop(now+length+.02);
}
$('audio').addEventListener('click',async()=>{
  if(!window.AudioContext)return;
  audio??=new AudioContext();muted=!muted;if(!muted)await audio.resume();
  $('audio').textContent=muted?'Sound off':'Sound on';$('audio').setAttribute('aria-pressed',String(!muted));ping(430);
});
async function start(useChain=false){
  if(busy)return;busy=true;
  const button=$('start');button.disabled=true;$('chain').disabled=true;
  const original=button.innerHTML;
  try{
    if(useChain){
      button.textContent='Connecting to Sepolia…';
      const {makeVerified}=await import('./sepolia.js');game=await makeVerified(feature);
    }else if(!backendReady){game=makePractice();}
    await game.start();backendReady=true;resetWorld();stage='hunt';
    $('cover').hidden=true;$('game').classList.remove('cover-visible');
    objective();ping(328);ping(493,.18,.045,.1);
  }catch(e){backendReady=false;tell(e.shortMessage||e.message||'Could not start the case.');}
  finally{busy=false;button.disabled=false;$('chain').disabled=false;button.innerHTML=original;}
}
$('start').addEventListener('click',()=>start());
$('chain').addEventListener('click',()=>start(true));

function traits(id){
  return evidenceSites.map((s,i)=>[s.trait,s.values[(id>>i)&1]]);
}
function notes(){
  const visible=Array.from(clues.entries()).sort(([a],[b])=>a-b).map(([i,bit])=>'<li>'+evidenceSites[i].line[bit]+'</li>').join('');
  const roster=clues.size>=1?'<div class="suspect-list">'+cats.map((cat,id)=>'<div><b>'+cat.name+'</b><br><span>'+traits(id).map(([,v])=>v).join(' · ')+'</span></div>').join('')+'</div>':'';
  show('<div class="kicker">DETECTIVE’S NOTEBOOK</div><h2>Case notes</h2>'+(visible?'<ul>'+visible+'</ul>':'<p>No evidence yet. Check the stalls and alley.</p>')+roster+(stage==='escaped'||stage==='complete'?'<button class="primary" id="again">New case</button>':''));
  $('again')?.addEventListener('click',()=>{modal.close();start();});
}
function show(html){$('panel-body').innerHTML=html;if(!modal.open)modal.showModal();}
$('notebook').addEventListener('click',notes);
$('help').addEventListener('click',()=>show('<div class="kicker">CONTROLS</div><h2>On the trail</h2><p><b>Desktop:</b> WASD or arrows to move, drag to look, Shift to sprint, Space to jump and E to interact.</p><p><b>Phone:</b> Use the left stick, drag the scene to look and tap the action buttons.</p><p>Read the clues, question cats and pounce when you catch up to the thief.</p>'));
function ask(id){
  const cat=cats[id];
  show('<div class="kicker">SUSPECT</div><h2>'+cat.name+'</h2><ul>'+traits(id).map(([key,value])=>'<li>'+key+': <b>'+value+'</b></li>').join('')+'</ul><button class="primary" id="accuse">Accuse '+cat.name+'</button><button class="sub" id="let-go">Keep looking</button>');
  $('let-go').addEventListener('click',()=>modal.close());
  $('accuse').addEventListener('click',()=>accuse(id));
}
async function accuse(id){
  if(busy)return;
  busy=true;$('accuse').disabled=true;$('accuse').textContent='Checking accusation…';
  try{
    const result=await game.accuse(id);
    modal.close();
    leader=npcs[result.culprit];
    if(!result.correct){show('<div class="kicker">WRONG SUSPECT</div><h2>The thief ran.</h2><p>'+cats[result.culprit].name+' bolted with the biryani. You can still catch them.</p><form method="dialog"><button class="primary">Give chase</button></form>');}
    // Start the chase a few steps ahead so it remains playable from a wrong accusation.
    if(distance(player,leader)>8){
      const z=Math.max(-29,Math.min(7,player.z-5));
      leader.x=Math.max(-5,Math.min(5,player.x));
      leader.z=z;
    }
    if(distance(player,leader)<3){leader.z=Math.max(-31,leader.z-3.5);}
    leader.fleeing=true;route=escapeRoute(leader);
    stage='chase';shake=.18;objective();ping(329,.16);ping(220,.22,.055,.13);
  }catch(e){
    tell(e.shortMessage||e.message||'Could not check that accusation.');
    if($('accuse')){$('accuse').disabled=false;$('accuse').textContent='Retry accusation';}
  }finally{busy=false;}
}
function finish(won){
  stage=won?'complete':'escaped';
  leader.speed=0;leader.fleeing=!won;
  objective();
  if(won){ping(523,.22);ping(659,.23,.05,.10);ping(784,.31,.05,.19);}
  show('<div class="kicker">'+(won?'CASE CLOSED':'CHASE LOST')+'</div><h2>'+(won?'Dinner is saved.':'The thief got away.')+'</h2><p>'+(won?'You caught '+cats[leader.id].name+' after finding '+clues.size+' '+(clues.size===1?'clue':'clues')+'.':'Cut through the alleys and save some sprint for the last stretch.')+'</p><button class="primary" id="again">'+(won?'New case':'Retry chase')+'</button>');
  $('again').addEventListener('click',()=>{
    modal.close();
    if(won)start();
    else{
      const first=escapeRoute({...entrance,x:0,z:3});
      Object.assign(player,newHero());Object.assign(leader,{x:0,z:3,y:0,fleeing:true});route=first;heading=0;stamina=1;stage='chase';objective();
    }
  });
}
async function interact(){
  if(busy||!near||modal.open)return;
  if(near.type==='chase'){finish(true);return;}
  if(near.type==='cat'){ask(near.id);return;}
  const id=near.id;
  busy=true;$('act').disabled=true;
  try{
    const bit=await game.clue(id);clues.set(id,bit);
    tell(evidenceSites[id].line[bit]);ping(493);ping(659,.17,.04,.1);objective();
  }catch(error){tell(error.shortMessage||error.message||'Could not inspect that clue.');}
  finally{busy=false;$('act').disabled=false;}
}
$('act').addEventListener('click',interact);
const gameKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','ShiftLeft','ShiftRight','Space','KeyE','KeyQ']);
document.addEventListener('keydown',e=>{
  if(!gameKeys.has(e.code)||modal.open||stage==='cover'||e.metaKey||e.ctrlKey)return;
  e.preventDefault();keys.add(e.code);
  if(!e.repeat && e.code==='Space')jumpQueued=true;
  if(!e.repeat && e.code==='KeyE')interact();
  if(!e.repeat && e.code==='KeyQ')notes();
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();jx=0;jy=0;sprintTouch=false;});
const stick=$('stick');
let pad=null;
function stickMove(e){
  if(e.pointerId!==pad?.id)return;
  const dx=e.clientX-pad.x,dy=e.clientY-pad.y,r=Math.hypot(dx,dy),max=34;
  jx=dx/Math.max(r,max);jy=-dy/Math.max(r,max);
  stick.style.setProperty('--jx',jx*max+'px');stick.style.setProperty('--jy',-jy*max+'px');
}
stick.addEventListener('pointerdown',e=>{
  const box=stick.getBoundingClientRect();pad={id:e.pointerId,x:box.x+box.width/2,y:box.y+box.height/2};
  stick.setPointerCapture(e.pointerId);stickMove(e);
});
stick.addEventListener('pointermove',stickMove);
for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{
  if(e.pointerId!==pad?.id)return;pad=null;jx=0;jy=0;
  stick.style.setProperty('--jx','0px');stick.style.setProperty('--jy','0px');
});
$('sprint').addEventListener('pointerdown',e=>{sprintTouch=true;$('sprint').setPointerCapture(e.pointerId);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('sprint').addEventListener(type,()=>sprintTouch=false);
$('jump').addEventListener('pointerdown',()=>jumpQueued=true);
function bindCamera(){
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{
    if(stage==='cover')return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(drag?.id!==e.pointerId)return;
    heading+=(e.clientX-drag.x)*.006;
    pitch=Math.max(-.42,Math.min(.27,pitch-(e.clientY-drag.y)*.0035));
    drag.x=e.clientX;drag.y=e.clientY;
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(drag?.id===e.pointerId)drag=null;});
}
bindCamera();
modal.addEventListener('close',()=>{keys.clear();jx=0;jy=0;jumpQueued=false;sprintTouch=false;});
const key=(...codes)=>codes.some(c=>keys.has(c))?1:0;

function update(dt){
  if(stage==='cover'||modal.open)return;
  const x=key('KeyD','ArrowRight')-key('KeyA','ArrowLeft')+jx;
  const z=key('KeyW','ArrowUp')-key('KeyS','ArrowDown')+jy;
  let speed=3.9;
  const len=Math.hypot(x,z);
  const running=len>.01&&(sprintTouch||key('ShiftLeft','ShiftRight'))&&stamina>.04;
  if(running){speed=6.3;stamina=Math.max(0,stamina-dt*.15);}
  else stamina=Math.min(1,stamina+dt*.27);
  $('stamina').firstElementChild.style.transform='scaleX('+stamina+')';
  if(jumpQueued && !player.air){player.vy=4.9;player.air=true;ping(160,.12,.025);}
  jumpQueued=false;
  if(player.air){
    player.vy-=dt*11.8;player.y+=player.vy*dt;
    const platform=heightAt(player.x,player.z,.23);
    if(player.vy<0&&player.y<=platform){player.y=platform;player.vy=0;player.air=false;}
  }
  const moving=len>.035;
  if(moving){
    const k=speed/Math.max(1,len);
    const dx=(Math.cos(heading)*x+Math.sin(heading)*z)*k;
    const dz=(Math.sin(heading)*x-Math.cos(heading)*z)*k;
    const t=Math.atan2(dx,-dz);
    player.yaw+=Math.atan2(Math.sin(t-player.yaw),Math.cos(t-player.yaw))*Math.min(1,dt*17);
    const oldX=player.x,oldZ=player.z;
    moveBody(player,dx*dt,dz*dt);
    const moved=Math.hypot(player.x-oldX,player.z-oldZ);
    player.speed=moved/dt;player.gaits+=moved*7.4;
    if(heightAt(player.x,player.z,.21)<player.y-.045&&!player.air){player.air=true;player.vy=0;}
  }else player.speed=0;
  for(const npc of npcs){if(npc!==leader)patrol(npc,time,dt,player);}
  if(stage==='chase'){
    advanceEscape(leader,route,dt);
    if(!route.length){finish(false);return;}
  }
  const next=follow(player,heading,pitch);
  for(const k of Object.keys(next))view[k]+=(next[k]-view[k])*Math.min(1,dt*(k.length===1?11:14));
  if(shake>.001){if(!prefs)view.x+=Math.sin(time*65)*shake;shake*=.89;}
}

function indicators(){
  if(stage!=='hunt'&&stage!=='chase'){
    $('act').hidden=true;$('waypoint').hidden=true;$('tag').hidden=true;return;
  }
  const evidence=evidenceSites.map((p,i)=>({...p,id:i,type:'evidence'})).filter(p=>!clues.has(p.id)).sort((a,b)=>distance(a,player)-distance(b,player));
  const close=npcs.filter(p=>distance(p,player)<1.85).sort((a,b)=>distance(a,player)-distance(b,player))[0];
  let marker=evidence[0];
  if(stage==='chase'){
    marker=leader;near=distance(player,leader)<1.75?{type:'chase'}:null;
  }else if(marker&&distance(marker,player)<2.25)near=marker;
  else near=close?{type:'cat',id:close.id}:null;
  $('act').hidden=!near;
  if(near)$('act').lastElementChild.textContent=near.type==='evidence'?'Inspect '+near.name:near.type==='chase'?'Pounce':'Question '+cats[near.id].name;
  const w=canvas.clientWidth,h=canvas.clientHeight,p=projection(view,w,h);
  $('waypoint').hidden=!marker;
  if(marker){
    const [x,y,d]=p.point(marker.x,1.02,marker.z);
    const far=d<.25;
    const bias=Math.sin(Math.atan2(marker.x-player.x,-(marker.z-player.z))-heading);
    const xx=far?(bias>=0?w-34:34):Math.max(34,Math.min(w-34,x));
    const yy=far?h*.45:Math.max(112,Math.min(h*.77,y));
    const el=$('waypoint');el.style.left=xx+'px';el.style.top=yy+'px';
    $('arrow').style.transform='rotate('+(far?(bias>=0?90:-90):180)+'deg)';
    $('meters').textContent=Math.max(1,Math.round(distance(player,marker)))+' m';
  }
  $('tag').hidden=stage!=='hunt'||!close||near?.type!=='cat';
  if(!$('tag').hidden){
    const [x,y,d]=p.point(close.x,1.17,close.z);
    $('tag').hidden=d<0||x<12||x>w-12;
    $('tag').style.left=x+'px';$('tag').style.top=y+'px';$('tag').textContent=cats[close.id].name;
  }
}
function tick(now){
  const dt=Math.max(.001,Math.min(.05,(now-(previous||now))/1000));previous=now;time+=dt;
  update(dt);
  renderer?.draw({view,player,npcs,time,heading});
  indicators();
  requestAnimationFrame(tick);
}
connectRender();
requestAnimationFrame(tick);
