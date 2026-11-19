import {buildings} from './district.js';

const mapPoint=(x,z)=>[120+x*4,17+(z+35)*3.52];
export function makeMinimap(canvas){
  const ctx=canvas.getContext('2d');
  let last=0;
  return (player,heading,marker,now)=>{
    if(!ctx||canvas.hidden||now-last<100)return;
    last=now;
    ctx.clearRect(0,0,240,204);
    ctx.fillStyle='#d0ab7959';
    for(const b of buildings){
      const [x,y]=mapPoint(b.x-b.w/2,b.z-b.d/2);
      ctx.fillRect(x,y,b.w*4,b.d*3.52);
    }
    ctx.strokeStyle='#d0ab794d';
    ctx.strokeRect(40,17,160,174);
    if(marker){
      const [x,y]=mapPoint(marker.x,marker.z);
      ctx.fillStyle='#edb76a';
      ctx.beginPath();ctx.arc(x,y,6,0,2*Math.PI);ctx.fill();
    }
    const [x,y]=mapPoint(player.x,player.z);
    ctx.save();ctx.translate(x,y);ctx.rotate(heading);
    ctx.fillStyle='#f5ecda';
    ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,6);ctx.lineTo(0,3);ctx.lineTo(-6,6);ctx.closePath();ctx.fill();ctx.restore();
  };
}
