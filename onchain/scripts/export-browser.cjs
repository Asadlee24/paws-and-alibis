const {mkdirSync,writeFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {keccak256}=require('ethers');
const artifact=require('../artifacts/contracts/BazaarCase.sol/BazaarCase.json');
const folder=resolve(__dirname,'../../public/contract');
mkdirSync(folder,{recursive:true});
writeFileSync(resolve(folder,'bazaar-case.json'),JSON.stringify({
  bytecode:artifact.bytecode,
  runtimeHash:keccak256(artifact.deployedBytecode),
})+'\n');
