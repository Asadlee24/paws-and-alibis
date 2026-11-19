const key='paws-and-alibis-contract';
export const validContract=value=>/^0x[\da-f]{40}$/i.test(value||'');
export function caseContract(){
  const param=new URL(location.href).searchParams.get('caseContract');
  if(validContract(param))return param;
  if(validContract(import.meta.env.VITE_BAZAAR_CONTRACT))return import.meta.env.VITE_BAZAAR_CONTRACT;
  try{
    const saved=localStorage.getItem(key);
    return validContract(saved)?saved:null;
  }catch{return null;}
}
export function rememberContract(address){
  if(validContract(address)){
    try{localStorage.setItem(key,address);}catch{/* The link also carries the address. */}
  }
}
