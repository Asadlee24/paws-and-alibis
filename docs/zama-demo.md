# Paws & Alibis for Zama Season 5

A case opens on Sepolia with a randomly chosen encrypted culprit. Each evidence site computes a single clue from that ciphertext. The player signs a scoped decryption authorization once per session to read their own clues. Locking an accusation triggers an encrypted comparison. The public result is settled only after the contract verifies the KMS proof for the case's identity and comparison ciphertexts. The chase is played locally using the verified culprit and earns a separate time.

## Verify a real case

1. Deploy from a funded Sepolia test wallet using [the deploy page](https://paws-and-alibis.vercel.app/deploy.html). Save the deployment hash and copy the **Play encrypted case** link.
2. Open that link in a Sepolia wallet browser and select **Zama encrypted case**. Approve the new case transaction.
3. Walk to an evidence site, request its clue and sign the gas-free authorization. The notebook should show the private clue and Sepolia case number. Collect the remaining clues or use the notebook to track a matching suspect early.
4. Accuse a suspect. Approve the accusation transaction, wait for the relayer, then approve settlement. Open **View investigation proof on Sepolia** from Case notes or the chase result. Save that hash for the submission.
5. Start a fresh case, accuse the wrong suspect, and verify that it settles with zero investigation points. The chase can still be won.

`npm test` in the root tests gameplay. `npm test` in `onchain` tests owner-only clue access, correct and incorrect accusations, and refusal of reused or tampered proofs on Hardhat's mock FHEVM. Sepolia and the live relayer require the separate wallet run above.

## Three-minute pitch outline

- **0:00–0:25.** Introduce the stolen biryani, the eight suspects and the bazaar.
- **0:25–1:10.** Start a Sepolia case and show one evidence site and the private clue in Case notes. Explain why the hidden culprit cannot simply be read on an explorer.
- **1:10–2:10.** Track a suspect, lock the accusation, open the proof link and show the actual settlement transaction. Cut confirmed wallet waits in the recording.
- **2:10–3:00.** Play the chase through to capture. Show the result and clarify that the case is verified onchain while movement and timing run in the browser.

Record your own pitch. Use [the submission draft](zama-submission.md) for the spoken script and X thread. Publish the thread with the verified demo link, repository, contract address and a sample proof transaction. Then submit through the [official Zama form](https://forms.zama.org/zama-developer-program-mainnet-season-5-confidential-gaming).
