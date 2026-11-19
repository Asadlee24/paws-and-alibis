// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { FHE, euint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract BazaarCase is ZamaEthereumConfig {
    error NotCaseOwner();
    error CaseClosed();
    error InvalidChoice();
    error NotReady();
    error AlreadyOpened();

    struct Case {
        address player;
        euint8 culprit;
        euint8[3] hints;
        euint8 reveal;
        uint8 opened;
        uint8 guess;
        bool accused;
        bool settled;
        uint8 answer;
        uint16 score;
    }

    uint256 public caseCount;
    mapping(uint256 => Case) private cases;

    event CaseStarted(uint256 indexed id, address indexed player);
    event EvidenceOpened(uint256 indexed id, uint8 indexed clue);
    event Accused(uint256 indexed id, uint8 guess);
    event CaseSettled(uint256 indexed id, uint8 culprit, uint16 score);

    function startCase() external returns (uint256 id) {
        id = ++caseCount;
        Case storage game = cases[id];
        game.player = msg.sender;
        game.culprit = FHE.randEuint8(8);
        FHE.allowThis(game.culprit);
        emit CaseStarted(id, msg.sender);
    }

    function openEvidence(uint256 id, uint8 clue) external {
        Case storage game = _ownerCase(id);
        if (game.accused) revert CaseClosed();
        if (clue > 2) revert InvalidChoice();

        uint8 flag = uint8(1) << clue;
        if ((game.opened & flag) != 0) revert AlreadyOpened();

        // Each historical route has three binary landmarks. Reveal one bit.
        euint8 hint = FHE.and(FHE.shr(game.culprit, clue), uint8(1));
        game.hints[clue] = hint;
        game.opened |= flag;
        FHE.allowThis(hint);
        FHE.makePubliclyDecryptable(hint);
        emit EvidenceOpened(id, clue);
    }

    function submitGuess(uint256 id, uint8 guess) external {
        Case storage game = _ownerCase(id);
        if (game.accused) revert CaseClosed();
        if (guess > 7) revert InvalidChoice();

        game.guess = guess;
        game.accused = true;
        game.reveal = FHE.add(game.culprit, uint8(0));
        FHE.allowThis(game.reveal);
        FHE.makePubliclyDecryptable(game.reveal);
        emit Accused(id, guess);
    }

    function settle(uint256 id, uint8 answer, bytes calldata proof) external {
        Case storage game = cases[id];
        if (!game.accused) revert NotReady();
        if (game.settled) revert CaseClosed();

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = euint8.unwrap(game.reveal);
        FHE.checkSignatures(handles, abi.encode(answer), proof);

        uint16 used;
        for (uint8 i; i < 3; ++i) {
            if ((game.opened & (uint8(1) << i)) != 0) ++used;
        }
        game.settled = true;
        game.answer = answer;
        game.score = answer == game.guess ? 300 - used * 75 : 0;
        emit CaseSettled(id, answer, game.score);
    }

    function evidenceHandle(uint256 id, uint8 clue) external view returns (bytes32) {
        if (clue > 2) revert InvalidChoice();
        return euint8.unwrap(cases[id].hints[clue]);
    }

    function summary(uint256 id)
        external view
        returns (uint8 opened, bool accused, uint8 guess, bytes32 reveal, bool settled, uint8 answer, uint16 score)
    {
        Case storage game = cases[id];
        return (game.opened, game.accused, game.guess, euint8.unwrap(game.reveal), game.settled, game.answer, game.score);
    }

    function _ownerCase(uint256 id) private view returns (Case storage game) {
        game = cases[id];
        if (game.player != msg.sender) revert NotCaseOwner();
    }
}
