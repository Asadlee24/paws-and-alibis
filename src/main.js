import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-500-italic.css';
import './style.css';
import {cats, duration, evidence, position, clueText, makePractice} from './case.js';
import {makeScene, portrait} from './cat-art.js';

const $ = id => document.getElementById(id);
let state = {time:0,playing:false,selected:null,clues:new Map(),activeClue:null,busy:false,result:null,reveal:false};
let game = makePractice();
let sound=false, audio, clockAt=0, verified=false;
const config = import.meta.env.VITE_BAZAAR_CONTRACT;
const transport = $('play');
const seek = $('seek');
let renderModels;
try {
  renderModels=makeScene($('models'));
  $('models').firstChild.addEventListener('webglcontextlost', () => {
    renderModels=undefined;
    $('screen').classList.add('no-models');
  }, {once:true});
} catch {
  $('screen').classList.add('no-models');
}

const suspectButtons = [], markers = [], clueButtons = [];
for (const [id,cat] of cats.entries()) {
  const button=document.createElement('button');
  button.className='suspect';
  button.type='button';
  button.title=cat.coat;
  button.innerHTML=`<span class="portrait">${portrait(cat)}</span><span class="suspect-name">${cat.name}</span>`;
  button.addEventListener('click',()=>select(id));
  $('suspects').append(button);
  suspectButtons.push(button);

  const marker=document.createElement('button');
  marker.className='marker';
  marker.type='button';
  marker.setAttribute('aria-label',`Track ${cat.name}`);
  marker.innerHTML=`<span aria-hidden="true">${cat.name}</span><i class="fallback-cat">${portrait(cat,true)}</i>`;
  marker.addEventListener('click',()=>select(id));
  $('markers').append(marker);
  markers.push(marker);
}
const lands = Array.from({length:2}, () => {
  const node = document.createElement('i');
  node.className='landmark';
  node.setAttribute('aria-hidden','true');
  node.hidden=true;
  $('markers').append(node);
  return node;
});
for (const [id,clue] of evidence.entries()) {
  const button=document.createElement('button');
  button.type='button';
  button.className='clue';
  button.innerHTML=`<span>${clue.name}</span><span>−75 pts</span>`;
  button.addEventListener('click',()=>openClue(id));
  $('clues').append(button);
  clueButtons.push(button);
}

function note(freq,duration=.14,volume=.08,delay=0) {
  if (!sound || !audio || audio.state==='closed') return;
  const o=audio.createOscillator(), gain=audio.createGain(), now=audio.currentTime+delay;
  o.type='sine';
  o.frequency.value=freq;
  gain.gain.setValueAtTime(.001,now);
  gain.gain.exponentialRampToValueAtTime(volume,now+.018);
  gain.gain.exponentialRampToValueAtTime(.001,now+duration);
  o.connect(gain);
  gain.connect(audio.destination);
  o.start(now);
  o.stop(now+duration+.012);
}
function syncBoard() {
  suspectButtons.forEach((button,i)=> {
    button.setAttribute('aria-pressed', String(state.selected===i));
    markers[i].setAttribute('aria-pressed',String(state.selected===i));
  });
  clueButtons.forEach((button,i)=>{
    const opened=state.clues.has(i);
    button.classList.toggle('open',opened);
    button.disabled=state.busy || Boolean(state.result && !opened);
    button.firstElementChild.textContent=opened ? clueText(i,state.clues.get(i)) : evidence[i].name;
    button.lastElementChild.textContent=opened ? 'View' : '−75 pts';
  });
  $('clue-count').textContent=`${state.clues.size} / 3 opened`;
  $('points').textContent=`${state.result ? state.result.score : 300-state.clues.size*75} PTS`;
  $('accuse').disabled=state.busy || (!state.result && state.selected===null);
  $('accuse').textContent=state.result ? 'View result' : state.selected===null ? 'Choose a suspect' : `Accuse ${cats[state.selected].name}`;
  $('mode').disabled=state.busy;
}
function select(id) {
  if (state.busy || state.result) return;
  state.selected=state.selected===id ? null : id;
  $('intro').hidden=true;
  note(478,.08,.03);
  syncBoard();
}
function goTo(time) {
  state.time=time;
  seek.value=time;
  clockAt=performance.now();
}
function setPlaying(playing) {
  state.playing=playing;
  transport.classList.toggle('playing',playing);
  transport.setAttribute('aria-label',playing ? 'Pause footage' : 'Play footage');
  $('intro').hidden=true;
}
function togglePlayback() {
  if (!state.playing && state.time===duration) goTo(0);
  state.activeClue=null;
  setPlaying(!state.playing);
}
function draw(now) {
  if (state.playing) {
    const previous=state.time;
    state.time=Math.min(duration,state.time+Math.min(.12,(now-clockAt)/1000));
    if (previous<12&&state.time>=12) {note(785,.3,.05);note(1046,.5,.025,.025);}
    if (state.time===duration) setPlaying(false);
    seek.value=state.time;
  }
  clockAt=now;
  const sceneKey = `${state.time}:${$('screen').clientWidth}:${$('screen').clientHeight}:${state.activeClue}:${state.reveal}:${state.playing}`;
  if (sceneKey===draw.last) {requestAnimationFrame(draw);return;}
  draw.last=sceneKey;
  $('clock').textContent=`00:${String(Math.floor(state.time)).padStart(2,'0')}`;
  const clue=state.activeClue===null ? null:evidence[state.activeClue];
  const isLanding=clue && Math.abs(state.time-clue.time)<.8;
  lands.forEach((node,i)=>{
    node.hidden=!isLanding;
    if (isLanding) {
      node.style.left=`${clue.places[i][0]*100}%`;
      node.style.top=`${clue.places[i][1]*100-11}%`;
      node.textContent=clue.mark[i];
    }
  });
  const bell = !clue && state.time >= 12 && state.time < 13;
  $('event').hidden=!bell && !state.reveal;
  if (state.reveal) $('event').textContent='Getaway replay';
  else if (bell) $('event').textContent='Bicycle bell';
  const positions=cats.map((cat,i)=>position(i,state.time));
  positions.forEach((p,i)=>{
    markers[i].style.left=`${p.x*100}%`;
    markers[i].style.top=`${p.y*100}%`;
    markers[i].style.zIndex=String(Math.round(p.y*16));
  });
  renderModels?.(positions,state.time,state.playing,state.reveal ? state.result.culprit : null);
  requestAnimationFrame(draw);
}
async function run(action) {
  if (state.busy) return;
  state.busy=true;
  $('status').textContent=verified ? 'Waiting for the wallet and Sepolia…' : '';
  syncBoard();
  try {
    await action();
    $('status').textContent='';
  } catch (error) {
    $('status').textContent=error.code===4001 ? 'Wallet request cancelled.' : error.shortMessage || error.message || 'That did not go through. Try again.';
  } finally {
    state.busy=false;
    syncBoard();
  }
}
function openClue(id) {
  run(async()=>{
    if (!state.clues.has(id)) {
      state.clues.set(id,await game.clue(id));
      note(385,.12,.05);
    }
    state.activeClue=id;
    setPlaying(false);
    goTo(evidence[id].time);
    $('footage-note').textContent='Compare the two landmarks in this frame.';
    if (window.innerWidth<=750 && $('screen').getBoundingClientRect().bottom<100) {
      $('screen').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
  });
}
function showResult(result) {
  const cat=cats[result.culprit];
  $('result-label').textContent=result.correct ? `CASE CLOSED · ${result.score} POINTS` : 'CASE CLOSED · WRONG SUSPECT';
  $('result-art').innerHTML=portrait(cat);
  $('result-title').textContent=result.correct ? `${cat.name} did it.` : `It was ${cat.name}.`;
  $('result-text').textContent=`${cat.name} took the biryani and slipped past ${sideName(0,result.culprit)} before heading for ${sideName(2,result.culprit)}.`;
  $('share').textContent='Share result';
  $('result').showModal();
}
function sideName(id,culprit) {
  return ((culprit>>id)&1) ? evidence[id].right : evidence[id].left;
}
async function newCase() {
  await game.start();
  state={time:0,playing:false,selected:null,clues:new Map(),activeClue:null,busy:state.busy,result:null,reveal:false};
  setPlaying(false);
  $('intro').hidden=false;
  goTo(0);
  $('footage-note').textContent='Select a cat in the footage to track it.';
  $('session-label').textContent=verified ? 'Sepolia case' : 'Practice case';
}
$('watch').addEventListener('click',togglePlayback);
transport.addEventListener('click',togglePlayback);
$('rewind').addEventListener('click',()=>{state.activeClue=null;goTo(0);setPlaying(true);});
seek.addEventListener('input',()=>{state.activeClue=null;setPlaying(false);goTo(Number(seek.value));});
$('help').addEventListener('click',()=>$('rules').showModal());
$('sound').addEventListener('click',async()=>{
  if (!window.AudioContext && !window.webkitAudioContext) { $('sound').disabled=true; return; }
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  sound=!sound;
  if (sound) await audio.resume();
  $('sound').textContent=sound ? 'Sound on' : 'Sound off';
  $('sound').setAttribute('aria-pressed',String(sound));
  note(520,.15,.04);
});
$('accuse').addEventListener('click',()=>{
  if (state.result) return showResult(state.result);
  run(async()=>{
    setPlaying(false);
    state.result=await game.accuse(state.selected);
    const winNote=state.result.correct ? [523,659,783] : [430,328];
    winNote.forEach((freq,i)=>note(freq,.29,.06,i*.09));
    showResult(state.result);
  });
});
$('getaway').addEventListener('click',()=>{
  $('result').close();
  state.reveal=true;
  state.selected=state.result.culprit;
  state.activeClue=null;
  goTo(17);
  setPlaying(true);
  syncBoard();
  $('screen').scrollIntoView({block:'nearest'});
});
$('restart').addEventListener('click',()=>{ $('result').close(); run(newCase); });
$('share').addEventListener('click',async()=>{
  const {correct,clues,score}=state.result;
  const url=new URL(import.meta.env.BASE_URL,location.origin).href;
  const text=correct ? `Paws & Alibis: I caught the biryani thief with ${clues} ${clues===1?'clue':'clues'} (${score} pts). Can you beat my score?` : 'Can you catch the biryani thief in Paws & Alibis?';
  try {
    if(navigator.share) await navigator.share({title:'Paws & Alibis',text,url});
    else {await navigator.clipboard.writeText(`${text}\n${url}`); $('share').textContent='Copied';}
  } catch (error) {
    if(error.name!=='AbortError') $('share').textContent='Could not share';
  }
});
if(config) {
  $('mode').hidden=false;
  $('mode').addEventListener('click',()=>run(async()=>{
    const previous=game;
    const wasVerified=verified;
    try {
      if(verified) {game=makePractice();verified=false;}
      else {
        $('status').textContent='Connecting to Sepolia…';
        const {makeVerified}=await import('./sepolia.js');
        game=await makeVerified(config);
        verified=true;
      }
      await newCase();
      $('mode').textContent=verified ? 'Play practice case' : 'Play on Sepolia';
    } catch(error) {
      game=previous;
      verified=wasVerified;
      throw error;
    }
  }));
}
await run(newCase);
requestAnimationFrame(draw);
