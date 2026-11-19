import {BrowserProvider, Contract, isAddress, ZeroHash} from 'ethers';
import {createInstance, initSDK, SepoliaConfig} from '@zama-fhe/relayer-sdk/web';

const abi = [
  'event CaseStarted(uint256 indexed id,address indexed player)',
  'function startCase() returns (uint256)',
  'function openEvidence(uint256,uint8)',
  'function submitGuess(uint256,uint8)',
  'function settle(uint256,uint8,bytes)',
  'function evidenceHandle(uint256,uint8) view returns (bytes32)',
  'function summary(uint256) view returns (uint8 opened,bool accused,uint8 guess,bytes32 reveal,bool settled,uint8 answer,uint16 score)',
];

export async function makeVerified(address) {
  if (!isAddress(address)) throw new Error('Sepolia contract address is invalid.');
  const wallet=window.ethereum;
  if (!wallet) throw new Error('Open this page in a Sepolia wallet browser to play this mode.');
  await wallet.request({method:'eth_requestAccounts'});
  const chain=await wallet.request({method:'eth_chainId'});
  if (chain!=='0xaa36a7') {
    await wallet.request({method:'wallet_switchEthereumChain',params:[{chainId:'0xaa36a7'}]});
  }
  const provider=new BrowserProvider(wallet);
  const signer=await provider.getSigner();
  if (await provider.getCode(address)==='0x') throw new Error('No case contract was found on Sepolia.');
  await initSDK();
  const relayer=await createInstance({...SepoliaConfig, network:wallet});
  const contract=new Contract(address,abi,signer);
  let caseId;

  function valueOf(payload, handle) {
    const values=payload.clearValues;
    const value=values[handle] ?? values[handle.toLowerCase()];
    if (value===undefined) throw new Error('The relayer did not return this result. Try again.');
    return Number(value);
  }

  return {
    async start() {
      const tx=await contract.startCase();
      const receipt=await tx.wait();
      const event=receipt.logs.filter(log=>log.address.toLowerCase()===address.toLowerCase())
        .map(log=>contract.interface.parseLog(log)).find(log=>log?.name==='CaseStarted');
      if (!event) throw new Error('Could not read the new case from the transaction.');
      caseId=event.args.id;
    },
    async clue(id) {
      let handle=await contract.evidenceHandle(caseId,id);
      if (handle===ZeroHash) {
        await (await contract.openEvidence(caseId,id)).wait();
        handle=await contract.evidenceHandle(caseId,id);
      }
      return valueOf(await relayer.publicDecrypt([handle]),handle);
    },
    async accuse(id) {
      let current=await contract.summary(caseId);
      if (!current.accused) {
        await (await contract.submitGuess(caseId,id)).wait();
        current=await contract.summary(caseId);
      }
      if (!current.settled) {
        const handle=current.reveal;
        const proof=await relayer.publicDecrypt([handle]);
        const culprit=valueOf(proof,handle);
        try {
          await (await contract.settle(caseId,culprit,proof.decryptionProof)).wait();
        } catch (error) {
          if (!(await contract.summary(caseId)).settled) throw error;
        }
        current=await contract.summary(caseId);
      }
      const culprit=Number(current.answer);
      const clues=[0,1,2].filter(bit=>(Number(current.opened)&(1<<bit))!==0).length;
      return {culprit,correct:culprit===Number(current.guess),clues,score:Number(current.score)};
    },
  };
}
