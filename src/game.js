import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-500-italic.css';
import './game.css';
import {cats,makePractice} from './case.js';
import {entrance,evidenceSites,newVisitors,patrol,distance,escapeRoute,advanceEscape,heightAt} from './district.js';
import {makeStreet} from './scenery.js';
import {follow,projection} from './camera.js';
import {makePlayer,stepPlayer,startPounce,canPounce} from './motion.js';
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
let game=makePractice(),verifiedCase=false,verdict=null,view,heading=0,pitch=0,npcs,player,clues,route,leader;
let stage='cover',near=null,time=0,previous=0,busy=false,stamina=1,chaseLead=0,sprintTouch=false,jumpQueued=false;
let jx=0,jy=0,audio,muted=true,toastTimer,shake=0,cooldown=0,pinTime=0,stepClock=0,airborne=false;
const modal=$('panel');
const prefs=matchMedia('(prefers-reduced-motion: reduce)').matches;
const newHero=()=>makePlayer(entrance);
function resetWorld(){
  player=newHero();npcs=newVisitors();clues=new Map();route=[];leader=null;
  heading=0;pitch=0;stamina=1;time=0;near=null;cooldown=0;pinTime=0;stepClock=0;airborne=false;verdict=null;view=follow(player,heading,pitch);
}
resetWorld();
$('game').classList.add('cover-visible');
const contractParam=new URL(location.href).searchParams.get('caseContract');
const feature=/^0x[\da-f]{40}$/i.test(contractParam||'') ? contractParam : import.meta.env.VITE_BAZAAR_CONTRACT;
$('chain').hidden=!feature;

function label(phase,title,detail){
  $('phase').textContent=phase;$('objective').textContent=title;$('detail').textContent=detail;
}
function objective(){
  if(stage==='hunt'){
    label(verifiedCase?'SEPOLIA · INVESTIGATION':'CASE 01 · INVESTIGATION',clues.size===3?'Find your suspect':'Investigate the bazaar',clues.size===3?'Match the scarf, tail tip and paws.':clues.size+' / 3 clues · Follow the marker to inspect evidence.');
  }else if(stage==='chase'){
    label('CASE 01 · PURSUIT','Catch the thief','Sprint or cut through the lanes. Get close and pounce.');
  }else if(stage==='capture'){
    label('THIEF CAUGHT','Biryani recovered','');
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
function footstep(hard){
  if(muted||!audio)return;
  const len=hard?.105:.047,buffer=audio.createBuffer(1,Math.floor(audio.sampleRate*len),audio.sampleRate);
  const wave=buffer.getChannelData(0);
  for(let i=0;i<wave.length;i++)wave[i]=(Math.random()*2-1)*Math.pow(1-i/wave.length,2.5);
  const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
  source.buffer=buffer;filter.type='lowpass';filter.frequency.value=hard?625:490;gain.gain.value=hard?.155:.058;
  source.connect(filter);filter.connect(gain);gain.connect(audio.destination);source.start();
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
    const wantsChain=useChain||(stage!=='cover'&&verifiedCase);
    if(wantsChain && !verifiedCase){
      button.textContent='Connecting to Sepolia…';
      const {makeVerified}=await import('./sepolia.js');game=await makeVerified(feature);
    }else if(!wantsChain){game=makePractice();}
    const resumed=await game.start({resume:wantsChain&&stage==='cover'});
    verifiedCase=wantsChain;resetWorld();stage='hunt';
    if(resumed?.clues)clues=resumed.clues;
    $('cover').hidden=true;$('game').classList.remove('cover-visible');
    objective();ping(328);ping(493,.18,.045,.1);
    if(resumed?.result)beginChase(resumed.result);
  }catch(e){tell(e.shortMessage||e.message||'Could not start the case.');}
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
    beginChase(result);
  }catch(e){
    tell(e.shortMessage||e.message||'Could not check that accusation.');
    if($('accuse')){$('accuse').disabled=false;$('accuse').textContent='Retry accusation';}
  }finally{busy=false;}
}
function beginChase(result){
    verdict=result;
    leader=npcs[result.culprit];
    if(!result.correct){show('<div class="kicker">WRONG SUSPECT</div><h2>The thief ran.</h2><p>'+cats[result.culprit].name+' bolted with the biryani. You can still catch them.</p><form method="dialog"><button class="primary">Give chase</button></form>');}
    // Reposition only a distant thief, to a nearby open patch of street.
    if(distance(player,leader)>10){
      const options=[[-4,-4],[0,-5],[4,-4],[-4,4],[0,4],[4,4]]
        .map(([x,z])=>({x:Math.min(18.9,Math.max(-18.9,player.x+x)),z:Math.min(12,Math.max(-30,player.z+z))}))
        .filter(p=>heightAt(p.x,p.z,.55)===0 && distance(player,p)>3.5);
      if(options.length) Object.assign(leader,options[0]);
    }
    if(distance(player,leader)<2.3){
      const options=[{x:leader.x,z:leader.z-2.4},{x:leader.x+2.6,z:leader.z},{x:leader.x-2.6,z:leader.z}];
      const patch=options.find(p=>heightAt(p.x,p.z,.4)===0&&p.z>-32&&distance(player,p)>2.1);
      if(patch)Object.assign(leader,patch);
    }
    leader.fleeing=true;leader.speed=0;route=escapeRoute(leader);
    stage='chase';chaseLead=1.1;shake=.18;objective();ping(329,.16);ping(220,.22,.055,.13);
}
function finish(won){
  stage=won?'complete':'escaped';
  leader.speed=0;leader.fleeing=!won;
  objective();
  if(won){ping(523,.22);ping(659,.23,.05,.10);ping(784,.31,.05,.19);}
  const proof=won&&verdict?.receipt ? '<p class="proof"><a target="_blank" rel="noopener noreferrer" href="'+verdict.receipt+'">View investigation proof on Sepolia ↗</a></p>' : '';
  const deduction=won&&verdict ? '<p class="deduction">'+(verdict.correct?'Correct accusation':'Wrong accusation')+' · '+verdict.score+' investigation points</p>' : '';
  show('<div class="kicker">'+(won?'CASE CLOSED':'CHASE LOST')+'</div><h2>'+(won?'Dinner is saved.':'The thief got away.')+'</h2><p>'+(won?'You caught '+cats[leader.id].name+' after finding '+clues.size+' '+(clues.size===1?'clue':'clues')+'.':'Cut through the alleys and save some sprint for the last stretch.')+'</p>'+deduction+proof+'<button class="primary" id="again">'+(won?'New case':'Retry chase')+'</button>');
  $('again').addEventListener('click',()=>{
    modal.close();
    if(won)start();
    else{
      const first=escapeRoute({...entrance,x:0,z:5.7});
      Object.assign(player,newHero());Object.assign(leader,{x:0,z:5.7,y:0,fleeing:true,pinned:false,speed:0});route=first;heading=0;view=follow(player,0,0);stamina=1;cooldown=0;chaseLead=1.35;stage='chase';objective();
    }
  });
}
async function interact(){
  if(busy||!near||modal.open)return;
  if(near.type==='chase'){pounce();return;}
  if(near.type==='cat'){ask(near.id);return;}
  const id=near.id;
  busy=true;$('act').disabled=true;
  try{
    const bit=await game.clue(id);clues.set(id,bit);
    tell(evidenceSites[id].line[bit]);ping(493);ping(659,.17,.04,.1);objective();
  }catch(error){tell(error.shortMessage||error.message||'Could not inspect that clue.');}
  finally{busy=false;$('act').disabled=false;}
}
function pounce(){
  if(stage!=='chase'||cooldown>0||!startPounce(player,leader))return false;
  cooldown=.66;ping(145,.2,.07);return true;
}
function capture(){
  stage='capture';pinTime=.87;player.pounce=0;player.speed=0;player.vx=0;player.vz=0;player.vy=0;player.y=leader.y;player.air=false;
  leader.speed=0;leader.pinned=true;shake=.115;objective();footstep(true);
}
$('act').addEventListener('click',interact);
const gameKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','ShiftLeft','ShiftRight','Space','KeyE','KeyQ']);
document.addEventListener('keydown',e=>{
  if(!gameKeys.has(e.code)||modal.open||stage==='cover'||e.metaKey||e.ctrlKey)return;
  e.preventDefault();keys.add(e.code);
  if(!e.repeat && e.code==='Space'&&!pounce())jumpQueued=true;
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
$('jump').addEventListener('pointerdown',()=>{if(!pounce())jumpQueued=true;});
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
  cooldown=Math.max(0,cooldown-dt);
  const running=Math.hypot(x,z)>.07&&(sprintTouch||key('ShiftLeft','ShiftRight'))&&stamina>.07;
  if(running)stamina=Math.max(0,stamina-dt*.145);
  else stamina=Math.min(1,stamina+dt*.30);
  $('stamina').firstElementChild.style.transform='scaleX('+stamina+')';
  const chasing=stage==='chase';
  if(stage==='capture'){
    pinTime-=dt;
    if(pinTime<=0){finish(true);return;}
  }else if(stage==='hunt'||chasing){
    const pouncing=player.pounce>0;
    stepPlayer(player,{x,z,heading,run:running,jump:jumpQueued,target:chasing?leader:null},dt);
    if(!player.air&&airborne)footstep(true);
    if(!player.air&&player.speed>.6){
      stepClock+=player.speed*dt;
      if(stepClock>.72){stepClock=0;footstep(false);}
    }
    airborne=player.air;
    for(const npc of npcs){if(npc!==leader)patrol(npc,time,dt,player);}
    if(chasing){
      chaseLead-=dt;
      if(chaseLead<=0)advanceEscape(leader,route,dt);
      if(pouncing&&distance(player,leader)<.83&&Math.abs(player.y-leader.y)<.71){capture();}
      else if(!route.length){finish(false);return;}
    }
  }
  jumpQueued=false;
  const next=follow(player,heading,pitch,stage==='capture'?leader:null,prefs);
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
    marker=leader;near=cooldown<=0&&canPounce(player,leader)?{type:'chase'}:null;
  }else if(marker&&distance(marker,player)<2.25)near=marker;
  else near=close?{type:'cat',id:close.id}:null;
  $('act').hidden=!near;
  $('jump').textContent=near?.type==='chase'?'Pounce':'Jump';
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
