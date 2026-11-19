const {ethers,fhevm}=require('hardhat');
const assert=require('node:assert/strict');

describe('BazaarCase',()=>{
  it('reveals only purchased clues, locks the guess, and settles with a case-bound proof',async()=>{
    const [player,other]=await ethers.getSigners();
    const game=await ethers.deployContract('BazaarCase');
    await game.waitForDeployment();
    for(let i=0;i<2;i++)await (await game.connect(player).startCase()).wait();
    assert.equal((await game.summary(1)).reveal,ethers.ZeroHash);
    assert.equal(await game.evidenceHandle(1,0),ethers.ZeroHash);
    await assert.rejects(game.connect(other).openEvidence(1,0),/NotCaseOwner/);

    let guess=0;
    for(let clue=0;clue<3;clue++){
      await (await game.connect(player).openEvidence(1,clue)).wait();
      const handle=await game.evidenceHandle(1,clue);
      const result=await fhevm.publicDecrypt([handle]);
      const bit=Number(result.clearValues[handle] ?? result.clearValues[handle.toLowerCase()]);
      assert.ok(bit===0||bit===1);
      guess|=bit<<clue;
    }
    await assert.rejects(game.connect(player).openEvidence(1,0),/AlreadyOpened/);
    await (await game.connect(player).submitGuess(1,guess)).wait();
    await assert.rejects(game.connect(player).submitGuess(1,guess),/CaseClosed/);
    const {reveal}=await game.summary(1);
    const result=await fhevm.publicDecrypt([reveal]);
    await assert.rejects(game.settle(1,guess^1,result.decryptionProof));
    await (await game.connect(player).submitGuess(2,guess)).wait();
    await assert.rejects(game.settle(2,guess,result.decryptionProof));
    await (await game.settle(1,guess,result.decryptionProof)).wait();
    const settled=await game.summary(1);
    assert.equal(settled.score,75n);
    assert.equal(settled.answer,BigInt(guess));
    assert.equal(settled.settled,true);
    await assert.rejects(game.settle(1,guess,result.decryptionProof),/CaseClosed/);
  });
});
