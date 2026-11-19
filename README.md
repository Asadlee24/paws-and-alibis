# Paws & Alibis

Eight cats pass through a Peshawar-inspired bazaar. One took the biryani. Explore the market in third person, collect three clues, and question the cats. When the thief runs, sprint through the alleys and pounce when you catch up. The original footage mini-game remains available at `/footage.html`.

## Play locally

Use Node 22.12 or later.

```sh
npm ci
npm run dev
npm test
npm run build
```

Practice opens without a wallet and stores its answer in the browser. The bazaar has traversable market stalls, side streets and a north gate. Desktop uses WASD or arrow keys, Shift, Space, E, and drag to turn the camera. Phones have a joystick, a tap-to-toggle Sprint button, and a dedicated Pounce button during a chase. Practice the chase from the title screen, and use the case notes to see which suspects still match your clues. A software perspective renderer keeps the level playable on browsers without WebGL. Rebuild the sprite sheets with `python3 design/render-cats.py` and `python3 design/render-hero.py` (Pillow and NumPy).

## Encrypted Sepolia mode

The Solidity game selects an encrypted culprit uniformly from eight possibilities. Each request marks only its computed one-bit clue decryptable (scarf, tail tip and paws in the 3D level). Accusing locks the guess before the answer can be decrypted. The guess is compared against the encrypted culprit using FHE. Settlement verifies one Zama KMS proof for the identity and encrypted comparison before calculating the investigation score. The in-game result links to the settlement transaction. An interrupted accusation can resume by reconnecting the same wallet. Runs are independent. Case-local clue results may be decrypted publicly once opened. No wagers or prizes.

```sh
cd onchain
npm ci
npm test
# Export SEPOLIA_RPC_URL and SEPOLIA_DEPLOYER_KEY from a funded test-only account.
npm run deploy:sepolia
```

Set the emitted address as `VITE_BAZAAR_CONTRACT` in the Vite build environment, then rebuild the frontend. Players enter **Use a Sepolia wallet** with a wallet browser and Sepolia test ETH. For a phone only flow, open `/deploy.html` in the wallet browser. Sign the deployment, then share its **Play encrypted case** link. The address in that link is accepted only if the deployed runtime matches the published contract build. After editing the contract, compile and run `node onchain/scripts/export-browser.cjs` from the repository root to update that build. Each attempt can be finished from one wallet. The contract verifies deductions and the client runs exploration and pursuit.

Do not put the deployer key in the frontend, repository, or hosting variables. Without the contract address the site serves practice mode.
