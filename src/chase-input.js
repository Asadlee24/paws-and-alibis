export const POUNCE_BUFFER=.42;

export function consumePounce(request,dt,attempt){
  if(request<=0)return {remaining:0,started:false};
  if(attempt())return {remaining:0,started:true};
  return {remaining:Math.max(0,request-dt),started:false};
}
