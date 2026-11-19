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

function decode(payload,handle,max){
  const lower=handle.toLowerCase();
  const pair=Object.entries(payload.clearValues).find(([key])=>key.toLowerCase()===lower);
  if(!pair)throw new Error('The relayer did not return one of the case results.');
  const value=Number(pair[1]);
  if(!Number.isInteger(value)||value<0||value>max)throw new Error('The relayer returned an invalid result.');
  return value;
}

export async function makeVerified(address) {
  if(!isAddress(address))throw new Error('Sepolia contract address is invalid.');
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
  wasm??=initSDK({thread:1}).catch(error=>{wasm=null;throw error;});
  await wasm;
  const relayer=await createInstance({...SepoliaConfig,network:provider.provider});
  let caseId;

  async function decrypt(handles){
    let last;
    for(let attempt=0;attempt<3;attempt++){
      try{return await relayer.publicDecrypt(handles,{timeout:20000});}
      catch(error){
        last=error;
        if(!/not.ready|not.allowed|pending|timeout|temporar|network|fetch|HTTP 5/i.test(String(error?.message||error)))throw error;
        if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1000+attempt*1400));
      }
    }
    throw last;
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
    async start({resume=false}={}){
      if(resume){
        const latest=await contract.latestCase(player);
        if(latest!==0n){
          const previous=await contract.summary(latest);
          if(!previous.settled){
            caseId=latest;
            const clues=new Map();
            for(let i=0;i<3;i++)if(Number(previous.opened)&(1<<i))clues.set(i,await this.clue(i));
            if(previous.accused)return {result:await this.accuse(Number(previous.guess)),clues};
            return {clues};
          }
        }
      }
      const receipt=await (await contract.startCase()).wait();
      const event=receipt.logs.filter(log=>log.address.toLowerCase()===address.toLowerCase())
        .map(log=>contract.interface.parseLog(log)).find(log=>log?.name==='CaseStarted');
      if(!event)throw new Error('Could not read the new case from the transaction.');
      caseId=event.args.id;
    },
    async clue(id){
      let handle=await contract.evidenceHandle(caseId,id);
      if(handle===ZeroHash){
        await (await contract.openEvidence(caseId,id)).wait();
        handle=await contract.evidenceHandle(caseId,id);
      }
      return decode(await decrypt([handle]),handle,1);
    },
    async accuse(id){
      let current=await contract.summary(caseId);
      if(!current.accused){
        await (await contract.submitGuess(caseId,id)).wait();
        current=await contract.summary(caseId);
      }
      if(current.settled)return resultOf(current);
      const comparison=await contract.deductionHandle(caseId);
      const proof=await decrypt([current.reveal,comparison]);
      const culprit=decode(proof,current.reveal,7);
      const correct=decode(proof,comparison,1);
      let receipt;
      try{
        receipt=await (await contract.settle(caseId,culprit,correct,proof.decryptionProof)).wait();
      }catch(error){
        current=await contract.summary(caseId);
        if(!current.settled)throw error;
        return resultOf(current);
      }
      return resultOf(await contract.summary(caseId),receipt.hash);
    },
  };
}
