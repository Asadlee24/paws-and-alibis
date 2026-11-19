import {Contract, isAddress, keccak256, ZeroHash} from 'ethers';
import {connectSepolia} from './wallet.js';
import {createInstance, initSDK, SepoliaConfig} from '@zama-fhe/relayer-sdk/web';

const abi = [
  'event CaseStarted(uint256 indexed id,address indexed player)',
  'event CaseSettled(uint256 indexed id,uint8 culprit,uint16 score)',
  'function startCase() returns (uint256)',
  'function latestCase(address) view returns (uint256)',
  'function openEvidence(uint256,uint8)',
  'function submitGuess(uint256,uint8)',
  'function settle(uint256,uint8,uint8,bytes)',
  'function deductionHandle(uint256) view returns (bytes32)',
  'function evidenceHandle(uint256,uint8) view returns (bytes32)',
  'function summary(uint256) view returns (uint8 opened,bool accused,uint8 guess,bytes32 reveal,bool settled,uint8 answer,uint16 score)',
];
let wasm;

function decode(clearValues,handle,max){
  const lower=handle.toLowerCase();
  const pair=Object.entries(clearValues).find(([key])=>key.toLowerCase()===lower);
  if(!pair)throw new Error('The relayer did not return one of the case results.');
  const value=Number(pair[1]);
  if(!Number.isInteger(value)||value<0||value>max)throw new Error('The relayer returned an invalid result.');
  return value;
}

export async function makeVerified(address,update=()=>{}) {
  if(!isAddress(address))throw new Error('Sepolia contract address is invalid.');
  update('Connect your wallet and select Sepolia.');
  const provider=await connectSepolia();
  const signer=await provider.getSigner();
  const player=await signer.getAddress();
  const contract=new Contract(address,abi,signer);
  const code=await provider.getCode(address);
  if(code==='0x')throw new Error('No case contract was found on Sepolia.');
  const artifact=await fetch('/contract/bazaar-case.json');
  if(!artifact.ok||keccak256(code)!==(await artifact.json()).runtimeHash){
    throw new Error('This address does not match the published Paws & Alibis contract.');
  }
  update('Loading Zama encryption tools…');
  wasm??=initSDK({thread:1}).catch(error=>{wasm=null;throw error;});
  await wasm;
  const relayer=await createInstance({...SepoliaConfig,network:{request:({method,params})=>provider.send(method,params??[])}});
  let caseId, decryptSession;
  const contractAddresses=[address];

  async function withRelayer(operation){
    let last;
    for(let attempt=0;attempt<3;attempt++){
      try{return await operation();}
      catch(error){
        last=error;
        if(!/not.ready|not.allowed|pending|timeout|temporar|network|fetch|HTTP 5/i.test(String(error?.message||error)))throw error;
        if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1000+attempt*1400));
      }
    }
    throw last;
  }
  // The ephemeral key is held in memory. The signed authorization is scoped
  // to this contract, this wallet and a one-day expiry.
  async function authorizeClues(){
    if(decryptSession&&Date.now()-decryptSession.timestamp*1000<23*60*60*1000)return decryptSession;
    update('Sign the private clue authorization in your wallet. No gas is charged for this signature.');
    const keypair=relayer.generateKeypair();
    const timestamp=Math.floor(Date.now()/1000);
    const duration=1;
    const typed=relayer.createEIP712(keypair.publicKey,contractAddresses,timestamp,duration);
    const signature=await signer.signTypedData(typed.domain,{[typed.primaryType]:typed.types[typed.primaryType]},typed.message);
    decryptSession={keypair,timestamp,duration,signature};
    return decryptSession;
  }
  async function readClues(handles){
    const {keypair,timestamp,duration,signature}=await authorizeClues();
    update('Zama is decrypting evidence for your wallet…');
    const pairs=handles.map(handle=>({handle,contractAddress:address}));
    return withRelayer(()=>relayer.userDecrypt(pairs,keypair.privateKey,keypair.publicKey,signature,contractAddresses,
      player,timestamp,duration,{timeout:20000}));
  }
  function clueCount(mask){
    return [0,1,2].filter(bit=>(Number(mask)&(1<<bit))!==0).length;
  }
  async function resultOf(current,hash){
    if(!hash){
      const events=await contract.queryFilter(contract.filters.CaseSettled(caseId)).catch(()=>[]);
      hash=events.at(-1)?.transactionHash;
    }
    return {
      culprit:Number(current.answer),correct:Number(current.answer)===Number(current.guess),
      clues:clueCount(current.opened),score:Number(current.score),caseId:caseId.toString(),
      receipt:hash?'https://sepolia.etherscan.io/tx/'+hash:null,
    };
  }
  return {
    get caseId(){return caseId?.toString()??null;},
    async start({resume=false}={}){
      if(resume){
        update('Checking for an unfinished case…');
        const latest=await contract.latestCase(player);
        if(latest!==0n){
          const previous=await contract.summary(latest);
          if(!previous.settled){
            caseId=latest;
            const clues=new Map();
            const ids=[0,1,2].filter(i=>Number(previous.opened)&(1<<i));
            if(ids.length){
              const handles=await Promise.all(ids.map(i=>contract.evidenceHandle(caseId,i)));
              const values=await readClues(handles);
              ids.forEach((id,i)=>clues.set(id,decode(values,handles[i],1)));
            }
            if(previous.accused)return {result:await this.accuse(Number(previous.guess)),clues};
            return {clues};
          }
        }
      }
      update('Confirm a new encrypted case in your wallet.');
      const tx=await contract.startCase();
      update('Waiting for Sepolia to seal the case…');
      const receipt=await tx.wait();
      const event=receipt.logs.filter(log=>log.address.toLowerCase()===address.toLowerCase())
        .map(log=>contract.interface.parseLog(log)).find(log=>log?.name==='CaseStarted');
      if(!event)throw new Error('Could not read the new case from the transaction.');
      caseId=event.args.id;
    },
    async clue(id){
      let handle=await contract.evidenceHandle(caseId,id);
      if(handle===ZeroHash){
        update('Confirm the evidence request in your wallet.');
        const tx=await contract.openEvidence(caseId,id);
        update('Waiting for the clue to be computed…');
        await tx.wait();
        handle=await contract.evidenceHandle(caseId,id);
      }
      return decode(await readClues([handle]),handle,1);
    },
    async accuse(id){
      let current=await contract.summary(caseId);
      if(!current.accused){
        update('Confirm your accusation. The choice will be locked on Sepolia.');
        const tx=await contract.submitGuess(caseId,id);
        update('Waiting for Sepolia to lock your accusation…');
        await tx.wait();
        current=await contract.summary(caseId);
      }
      if(current.settled)return resultOf(current);
      const comparison=await contract.deductionHandle(caseId);
      update('Zama is revealing the culprit and preparing the proof…');
      const proof=await withRelayer(()=>relayer.publicDecrypt([current.reveal,comparison],{timeout:20000}));
      const culprit=decode(proof.clearValues,current.reveal,7);
      const correct=decode(proof.clearValues,comparison,1);
      let receipt;
      try{
        update('Confirm settlement to verify the Zama proof onchain.');
        const tx=await contract.settle(caseId,culprit,correct,proof.decryptionProof);
        update('Waiting for the proof transaction…');
        receipt=await tx.wait();
      }catch(error){
        current=await contract.summary(caseId);
        if(!current.settled)throw error;
        return resultOf(current);
      }
      return resultOf(await contract.summary(caseId),receipt.hash);
    },
  };
}
