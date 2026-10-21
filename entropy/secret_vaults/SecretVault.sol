// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

/// @title SecretVault is a cryptographic guessing game with verifiable randomness
/// @notice Players create vaults with secret words and others try to guess them for prizes
/// @dev Uses Pyth Entropy V2 for generating provably fair random secrets composed of adjectives and nouns
contract SecretVault is IEntropyConsumer {
    IEntropyV2 public entropy;

    // Simple wordlists for generating secrets
    string[5] public adjectives = ["red", "fast", "happy", "cold", "dark"];
    string[5] public nouns = ["cat", "moon", "tree", "ghost", "fire"];

    enum PatternType {
        ADJECTIVE_NOUN // e.g. "redcat"
    }

    struct VaultRequest {
        address requester;
        uint256 depositAmount;
        bool fulfilled;
        bytes32 commitment;
        string clue;
        uint256 createdAt;
    }

    struct Vault {
        bytes32 commitment;
        string clue;
        uint256 prizePool;
        uint256 createdAt;
        uint256 revealDeadline;
        bool revealed;
        string answer;
        address creator;
        PatternType pattern;
    }

    mapping(uint64 => VaultRequest) public vaultRequests;
    mapping(uint256 => Vault) public vaults;
    mapping(bytes32 => bool) public usedCommitments;

    uint256 public vaultCounter;
    uint256 public constant MIN_DEPOSIT = 0.001 ether;
    uint256 public constant GUESS_FEE = 0.001 ether;
    uint256 public constant REVEAL_DELAY = 1 hours;

    event VaultRequested(
        uint64 indexed sequenceNumber,
        address indexed requester
    );
    event VaultCreated(
        uint256 indexed vaultId,
        bytes32 commitment,
        string clue,
        PatternType pattern
    );
    event VaultRevealed(uint256 indexed vaultId, string answer);
    event PrizeClaimed(uint256 indexed vaultId, address winner, uint256 amount);
    event GuessSubmitted(
        uint256 indexed vaultId,
        address indexed guesser,
        bool correct
    );

    error InsufficientDeposit();
    error InsufficientFee();
    error AlreadyFulfilled();
    error InvalidRequest();
    error CommitmentCollision();
    error VaultNotFound();
    error VaultAlreadyRevealed();
    error VaultExpired();
    error VaultNotExpired();
    error InsufficientGuessFee();
    error NotRevealed();

    constructor(address _entropy) {
        require(_entropy != address(0), "Invalid entropy address");
        entropy = IEntropyV2(_entropy);
    }

    /// @notice Required by Pyth Entropy
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    /// @notice Request creation of a new vault with random secret
    /// @dev Requires MIN_DEPOSIT + Pyth fee. The random secret is generated via callback
    function requestVaultGeneration() external payable returns (uint64) {
        if (msg.value < MIN_DEPOSIT) revert InsufficientDeposit();

        uint256 fee = entropy.getFeeV2();
        if (msg.value < MIN_DEPOSIT + fee) revert InsufficientFee();

        uint64 sequenceNumber = entropy.requestV2{value: fee}();

        vaultRequests[sequenceNumber] = VaultRequest({
            requester: msg.sender,
            depositAmount: msg.value - fee,
            fulfilled: false,
            commitment: bytes32(0),
            clue: "",
            createdAt: block.timestamp
        });

        emit VaultRequested(sequenceNumber, msg.sender);

        return sequenceNumber;
    }

    /// @notice Callback function called by Pyth Entropy with random number
    /// @dev Automatically generates vault with random adjective+noun combination
    function entropyCallback(
        uint64 sequenceNumber,
        address, // provider (unused in V2)
        bytes32 randomNumber
    ) internal override {
        VaultRequest storage request = vaultRequests[sequenceNumber];
        if (request.fulfilled) revert AlreadyFulfilled();
        if (request.requester == address(0)) revert InvalidRequest();

        uint256 randomness = uint256(randomNumber);
        (
            string memory answer,
            string memory clue,
            PatternType pattern
        ) = _generateFromEntropy(randomness);

        // Create commitment to hide the answer
        bytes32 commitment = keccak256(
            abi.encodePacked(answer, randomness, sequenceNumber)
        );

        if (usedCommitments[commitment]) revert CommitmentCollision();
        usedCommitments[commitment] = true;

        uint256 vaultId = vaultCounter++;
        vaults[vaultId] = Vault({
            commitment: commitment,
            clue: clue,
            prizePool: request.depositAmount,
            createdAt: block.timestamp,
            revealDeadline: block.timestamp + REVEAL_DELAY,
            revealed: false,
            answer: answer,
            creator: request.requester,
            pattern: pattern
        });

        request.fulfilled = true;
        request.commitment = commitment;
        request.clue = clue;

        emit VaultCreated(vaultId, commitment, clue, pattern);
    }

    /// @notice Generates a secret answer from entropy
    /// @dev Combines a random adjective with a random noun
    function _generateFromEntropy(
        uint256 randomness
    )
        internal
        view
        returns (string memory answer, string memory clue, PatternType pattern)
    {
        pattern = PatternType.ADJECTIVE_NOUN;

        uint256 adjIdx = randomness % adjectives.length;
        uint256 nounIdx = (randomness / 100) % nouns.length;

        answer = string(abi.encodePacked(adjectives[adjIdx], nouns[nounIdx]));
        clue = "Pattern: [adjective][noun] (one word, lowercase)";

        return (answer, clue, pattern);
    }

    /// @notice Submit a guess for a vault's secret
    /// @dev Correct guesses win the entire prize pool, wrong guesses add to it
    function submitGuess(
        uint256 vaultId,
        string calldata guess
    ) external payable {
        Vault storage vault = vaults[vaultId];
        if (vault.createdAt == 0) revert VaultNotFound();
        if (vault.revealed) revert VaultAlreadyRevealed();
        if (block.timestamp >= vault.revealDeadline) revert VaultExpired();
        if (msg.value < GUESS_FEE) revert InsufficientGuessFee();

        vault.prizePool += msg.value;

        bool correct = keccak256(abi.encodePacked(guess)) ==
            keccak256(abi.encodePacked(vault.answer));

        emit GuessSubmitted(vaultId, msg.sender, correct);

        if (correct) {
            // WINNER!
            vault.revealed = true;
            uint256 prize = vault.prizePool;
            vault.prizePool = 0;

            (bool success, ) = payable(msg.sender).call{value: prize}("");
            require(success, "Transfer failed");

            emit PrizeClaimed(vaultId, msg.sender, prize);
            emit VaultRevealed(vaultId, vault.answer);
        }
        // WRONG - fee stays in pool for next guesser
    }

    /// @notice Reveal a vault after the deadline expires
    /// @dev If unsolved, refunds the prize pool to the creator
    function revealVault(uint256 vaultId) external {
        Vault storage vault = vaults[vaultId];
        if (vault.createdAt == 0) revert VaultNotFound();
        if (vault.revealed) revert VaultAlreadyRevealed();
        if (block.timestamp < vault.revealDeadline) revert VaultNotExpired();

        vault.revealed = true;

        if (vault.prizePool > 0) {
            uint256 refund = vault.prizePool;
            vault.prizePool = 0;

            (bool success, ) = payable(vault.creator).call{value: refund}("");
            require(success, "Refund failed");
        }

        emit VaultRevealed(vaultId, vault.answer);
    }

    function getVault(
        uint256 vaultId
    )
        external
        view
        returns (
            bytes32 commitment,
            string memory clue,
            uint256 prizePool,
            uint256 createdAt,
            uint256 revealDeadline,
            bool revealed,
            PatternType pattern
        )
    {
        Vault storage vault = vaults[vaultId];
        return (
            vault.commitment,
            vault.clue,
            vault.prizePool,
            vault.createdAt,
            vault.revealDeadline,
            vault.revealed,
            vault.pattern
        );
    }

    function getAnswer(uint256 vaultId) external view returns (string memory) {
        Vault storage vault = vaults[vaultId];
        if (!vault.revealed) revert NotRevealed();
        return vault.answer;
    }

    function getVaultCount() external view returns (uint256) {
        return vaultCounter;
    }

    function getVaultRequest(
        uint64 sequenceNumber
    ) external view returns (VaultRequest memory request) {
        return vaultRequests[sequenceNumber];
    }

    function isVaultActive(uint256 vaultId) external view returns (bool) {
        Vault storage vault = vaults[vaultId];
        return
            vault.createdAt > 0 &&
            !vault.revealed &&
            block.timestamp < vault.revealDeadline;
    }

    function getEntropyFee() external view returns (uint256) {
        return entropy.getFeeV2();
    }

    function getTotalCost() external view returns (uint256) {
        return MIN_DEPOSIT + entropy.getFeeV2();
    }
}
