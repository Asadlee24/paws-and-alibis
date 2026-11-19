const {ethers,fhevm}=require('hardhat');
const assert=require('node:assert/strict');
const {FhevmType}=require('@fhevm/hardhat-plugin');

const revertsAs=(game,name)=>error=>error.data?.slice(0,10)===game.interface.getError(name).selector;

describe('BazaarCase',()=>{
  it('reveals only purchased clues, locks the guess, and settles with a case-bound proof',async()=>{
    const [player,other]=await ethers.getSigners();
    const game=await ethers.deployContract('BazaarCase');
    await game.waitForDeployment();
    for(let i=0;i<2;i++)await (await game.connect(player).startCase()).wait();
    assert.equal((await game.summary(1)).reveal,ethers.ZeroHash);
    assert.equal(await game.deductionHandle(1),ethers.ZeroHash);
    assert.equal(await game.latestCase(player.address),2n);
    assert.equal(await game.evidenceHandle(1,0),ethers.ZeroHash);
    await assert.rejects(game.connect(other).openEvidence(1,0),revertsAs(game,'NotCaseOwner'));

    let guess=0;
    for(let clue=0;clue<3;clue++){
      await (await game.connect(player).openEvidence(1,clue)).wait();
      const handle=await game.evidenceHandle(1,clue);
      await assert.rejects(fhevm.publicDecrypt([handle]));
      await assert.rejects(fhevm.userDecryptEuint(FhevmType.euint8,handle,game,other));
      const bit=Number(await fhevm.userDecryptEuint(FhevmType.euint8,handle,game,player));
      assert.ok(bit===0||bit===1);
      guess|=bit<<clue;
    }
    await assert.rejects(game.connect(player).openEvidence(1,0),revertsAs(game,'AlreadyOpened'));
    await (await game.connect(player).submitGuess(1,guess)).wait();
    await assert.rejects(game.connect(player).submitGuess(1,guess),revertsAs(game,'CaseClosed'));
    const {reveal}=await game.summary(1);
    const deduction=await game.deductionHandle(1);
    const result=await fhevm.publicDecrypt([reveal,deduction]);
    await assert.rejects(game.settle(1,guess^1,1,result.decryptionProof));
    await (await game.connect(player).submitGuess(2,guess)).wait();
    await assert.rejects(game.settle(2,guess,1,result.decryptionProof));
    await assert.rejects(game.settle(1,guess,0,result.decryptionProof));
    await (await game.settle(1,guess,1,result.decryptionProof)).wait();
    const settled=await game.summary(1);
    assert.equal(settled.score,75n);
    assert.equal(settled.answer,BigInt(guess));
    assert.equal(settled.settled,true);
    await assert.rejects(game.settle(1,guess,1,result.decryptionProof),revertsAs(game,'CaseClosed'));
  });

  it('proves a wrong guess without leaking the full answer before accusation',async()=>{
    const [player]=await ethers.getSigners();
    const game=await ethers.deployContract('BazaarCase');
    await game.waitForDeployment();
    await (await game.startCase()).wait();
    await assert.rejects(game.settle(1,0,0,'0x'),revertsAs(game,'NotReady'));
    let answer=0;
    for(let clue=0;clue<3;clue++){
      await (await game.openEvidence(1,clue)).wait();
      const handle=await game.evidenceHandle(1,clue);
      answer|=Number(await fhevm.userDecryptEuint(FhevmType.euint8,handle,game,player))<<clue;
    }
    await (await game.submitGuess(1,answer^1)).wait();
    await assert.rejects(game.openEvidence(1,0),revertsAs(game,'CaseClosed'));
    const {reveal}=await game.summary(1);
    const deduction=await game.deductionHandle(1);
    const {clearValues,decryptionProof}=await fhevm.publicDecrypt([reveal,deduction]);
    assert.equal(clearValues[deduction],0n);
    await (await game.settle(1,answer,0,decryptionProof)).wait();
    assert.equal((await game.summary(1)).score,0n);
  });
});
