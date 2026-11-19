require('@nomicfoundation/hardhat-ethers');
require('@fhevm/hardhat-plugin');

const {subtask}=require('hardhat/config');
const {TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD}=require('hardhat/builtin-tasks/task-names');

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async ({solcVersion}, hre, runSuper) => {
  if (solcVersion !== '0.8.27') return runSuper();
  return {compilerPath:require.resolve('solc/soljson.js'),isSolcJs:true,version:solcVersion,longVersion:require('solc').version()};
});

const {SEPOLIA_RPC_URL,SEPOLIA_DEPLOYER_KEY}=process.env;
module.exports={
  solidity:{version:'0.8.27',settings:{evmVersion:'cancun',optimizer:{enabled:true,runs:200}}},
  networks:SEPOLIA_RPC_URL ? {sepolia:{chainId:11155111,url:SEPOLIA_RPC_URL,accounts:SEPOLIA_DEPLOYER_KEY ? [SEPOLIA_DEPLOYER_KEY]:[]}}:{},
};
