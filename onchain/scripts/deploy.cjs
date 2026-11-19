const {ethers,network}=require('hardhat');

async function main(){
  if(network.name!=='sepolia') throw new Error('Pass --network sepolia to deploy the testnet game.');
  const game=await ethers.deployContract('BazaarCase');
  await game.waitForDeployment();
  console.log('VITE_BAZAAR_CONTRACT='+await game.getAddress());
}
main().catch(error=>{console.error(error);process.exitCode=1;});
