import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/fraunces/latin-600.css';
import './game.css';
import {ContractFactory,formatEther,keccak256} from 'ethers';
import {connectSepolia} from './wallet.js';
import {rememberContract} from './case-config.js';

const $=id=>document.getElementById(id);
let provider, factory, deployment, submitter;
const message=text=>{$('message').textContent=text;};
async function activate(){
  $('connect').disabled=true;
  try{
    provider=await connectSepolia();
    const response=await fetch('/contract/bazaar-case.json');
    if(!response.ok)throw Error('Could not load the contract build.');
    const artifact=await response.json();
    submitter=artifact.runtimeHash;
    const signer=await provider.getSigner();
    factory=new ContractFactory([],artifact.bytecode,signer);
    const request=await factory.getDeployTransaction();
    const gas=await signer.estimateGas(request);
    const feeData=await provider.getFeeData();
    const maxFee=feeData.maxFeePerGas??feeData.gasPrice;
    $('fee').textContent=gas.toLocaleString('en-US')+' gas estimated'+(maxFee!==null?' · up to '+formatEther(gas*maxFee)+' test ETH':'')+'. Confirm the estimate shown by your wallet.';
    $('estimate').hidden=false;
    $('connect').hidden=true;
    message('');
  }catch(error){message(error.shortMessage||error.message||'Could not connect to Sepolia.');}
  finally{$('connect').disabled=false;}
}
$('connect').addEventListener('click',activate);
$('deploy').addEventListener('click',async()=>{
  $('deploy').disabled=true;
  message(deployment?'Checking transaction confirmation…':'Waiting for your wallet approval…');
  try{
    deployment??=await factory.deploy();
    const tx=deployment.deploymentTransaction();
    $('transaction').href='https://sepolia.etherscan.io/tx/'+tx.hash;
    await deployment.waitForDeployment();
    const address=await deployment.getAddress();
    if(keccak256(await provider.getCode(address))!==submitter)throw Error('The deployed contract did not match this version of Paws & Alibis.');
    rememberContract(address);
    $('game-link').href='/?caseContract='+address;
    $('done').hidden=false;
    $('estimate').hidden=true;
    message('Contract confirmed on Sepolia.');
  }catch(error){
    if(error.receipt?.status===0||error.cancelled)deployment=null;
    message(error.shortMessage||error.message||'The deployment is still pending.');
  }finally{$('deploy').disabled=false;}
});
$('copy').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('game-link').href);$('copy').textContent='Copied';}
  catch{message('Open Play encrypted case, then copy the address from your browser.');}
});
