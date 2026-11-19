# Paws & Alibis

Eight cats pass through a Peshawar-inspired bazaar. One took the biryani. Replay the footage, open evidence, and identify the thief. Each clue reveals one landmark and costs 75 points. One accusation closes the case.

## Play locally

Use Node 22.12 or later.

```sh
npm ci
npm run dev
npm test
npm run build
```

Practice opens without a wallet and stores its answer in the browser. The original bazaar background and procedural Three.js cats are local assets. Browsers without WebGL use animated, prerendered 3D cat sprites. Rebuild the fallback art with `python3 design/render-cats.py` (Pillow and NumPy).

## Encrypted Sepolia mode

The Solidity game selects an encrypted culprit uniformly from eight possibilities. Each request marks only its computed one-bit clue decryptable. Accusing locks the guess before the answer can be decrypted. Settlement verifies the Zama KMS proof for the case's reveal handle and computes the score from onchain state. Runs are independent. Case-local clue results may be decrypted publicly once opened. No wagers or prizes.

```sh
cd onchain
npm ci
npm test
# Export SEPOLIA_RPC_URL and SEPOLIA_DEPLOYER_KEY from a funded test-only account.
npm run deploy:sepolia
```

Set the emitted address as `VITE_BAZAAR_CONTRACT` in the Vite build environment, then rebuild the frontend. Players enter **Play on Sepolia** with a wallet browser and Sepolia test ETH. Each attempt can be finished from one wallet.

Do not put the deployer key in the frontend, repository, or hosting variables. Without the contract address the site serves practice mode.
