# Season 5 submission draft

## Project description

Paws & Alibis is a detective game set in a Peshawar-inspired bazaar. Someone stole the biryani, and eight cats are suspects. Follow the trail, collect up to three clues, accuse a suspect, then chase the actual thief through the streets.

The Sepolia contract randomly selects the culprit in encrypted form. Each clue is derived from that ciphertext and can be decrypted only by the player who opened the case. The contract locks the player's guess and compares it against the encrypted culprit. Revealing the verdict requires a Zama decryption proof bound to that case. The chase and its timer run in the browser.

- Code: https://github.com/Asadlee24/paws-and-alibis
- Public game: https://paws-and-alibis.vercel.app/
- Encrypted demo URL, Sepolia contract and successful settlement: attach after the live round.
- Human-presented video, up to three minutes, and public X post: attach their share links. A video posted on X can serve as both links. YouTube and Loom are also accepted for the video.
- Registration email: use the email used for the Zama API key. The form permits one uneditable submission per email.

## Three-minute recording script

**0:00–0:25 · On camera.**  
“Someone stole the biryani. Eight cats were nearby, and one of them is lying low somewhere in this bazaar. This is Paws & Alibis, a detective game inspired by the streets of Peshawar. I play the detective. I'll look for clues, commit to a suspect, and try to catch the thief before they escape.”

**0:25–1:05 · Show a real Sepolia case and one clue.**  
“I'll open an encrypted case on Sepolia. The contract chooses one of eight suspects at random and keeps that choice encrypted. The first clue tells me what color scarf the thief wore. Zama computes that clue from the encrypted identity. My wallet can decrypt this clue because it opened the case. A spectator cannot use that same encrypted clue to read the value. If every suspect and clue were public on a block explorer, there would be nothing left to investigate.”

**1:05–1:55 · Show the notebook, commit and settle.**  
“I can narrow the list using the scarf, paw color and tail tip. More evidence makes my guess safer, but each clue costs points. I'll track a matching suspect using the notebook and mini-map. Once I accuse them, the contract locks my choice and compares it against the encrypted culprit. The relayer returns a proof. The settlement transaction checks that proof against the ciphertexts for this specific case. Here’s the actual Sepolia transaction and the game’s verified investigation score.”

**1:55–2:45 · Play the chase live.**  
“Now I know who really took the biryani. I still have to catch them. Watch the mini-map as the thief runs through the bazaar. I can toggle sprint, cut through the lanes, then pounce when I'm close enough. Getting the deduction right earns investigation points; the chase itself runs in the browser and records its time separately.”

**2:45–3:00 · Show case result and links.**  
“Dinner is saved. You can play the local case without a wallet or open the encrypted demo with Sepolia test ETH. The source code, demo and proof transaction are all linked in the submission.”

Record with your own voice and appear on camera at least in the intro. Use the confirmed Sepolia transactions in the recording. Trim transaction waits if needed.

## X thread draft

Post from your X profile after the encrypted round has been verified. You can attach your pitch video to the opening post and use its URL for both form fields.

**1/4**  
Someone stole the biryani. Eight cats are suspects. 🐾

I built Paws & Alibis, a detective game set in a Peshawar-inspired bazaar. Follow the clues, accuse a suspect, then chase the thief through the streets.

@zama #ZamaDeveloperProgram

**2/4**  
The Sepolia contract chooses the thief at random and keeps their identity encrypted. Zama computes the clues from that secret, and only the player who opened the case can decrypt their clues.

**3/4**  
Once you lock an accusation, the contract compares your guess against the encrypted culprit. The verdict settles with a Zama proof tied to that case. Catching the thief afterward is up to you.

**4/4**  
Play an encrypted case: [verified demo link]  
See a settled case: [proof transaction link]  
Source: https://github.com/Asadlee24/paws-and-alibis  
3-minute walkthrough: [video link]
