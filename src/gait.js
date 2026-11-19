const TAU=2*Math.PI;
const mix=(start,end,amount)=>start+(end-start)*amount;
export const gaitBlend=speed=>Math.max(0,Math.min(1,(speed-3.3)/3.4));
export const strideLength=speed=>mix(.60,1.38,gaitBlend(speed));

export function pawTrack(phase,leg,speed) {
  const run=gaitBlend(speed);
  // Four distinct footfalls at a walk; fore and hind pairs converge into a gallop.
  const offset=mix([0,.52,.5,.02][leg],[0,.57,.11,.67][leg],run);
  const cadence=phase/TAU+offset;
  const t=cadence-Math.floor(cadence);
  const stance=mix(.70,.48,run);
  const stride=strideLength(speed);
  const strength=Math.min(1,speed/1.15);
  const excursion=stride*stance*.5*strength;
  if(t<stance)return {z:mix(-excursion,excursion,t/stance),lift:0};
  const swing=(t-stance)/(1-stance);
  const ease=swing*swing*(3-2*swing);
  return {z:mix(excursion,-excursion,ease),lift:Math.sin(Math.PI*swing)*(.102+.084*run)*strength};
}
