import {BrowserProvider} from 'ethers';

const providerError = error => error?.code ?? error?.error?.code;

export async function connectSepolia() {
  const providers=window.ethereum?.providers;
  const wallet=providers?.find(p=>p.isMetaMask)||providers?.[0]||window.ethereum;
  if(!wallet)throw new Error('Open this link in your wallet’s browser, then switch to Sepolia.');
  await wallet.request({method:'eth_requestAccounts'});
  if(await wallet.request({method:'eth_chainId'})!=='0xaa36a7'){
    try {
      await wallet.request({method:'wallet_switchEthereumChain',params:[{chainId:'0xaa36a7'}]});
    }catch(error){
      if(providerError(error)===4902)throw new Error('Enable the Sepolia test network in your wallet, then try again.');
      throw error;
    }
  }
  return new BrowserProvider(wallet);
}

