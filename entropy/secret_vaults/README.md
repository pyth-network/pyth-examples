# Secret Vaults

Built for the hackathon. May contain bugs. Use at your own risk.

## Overview:

Secret Vaults is a cryptographic guessing game leveraging Pyth Entropy V2 for verifiable on-chain randomness. Players create secret vaults containing hidden words known only to the contract, while others attempt to guess them for rewards. If the reveal deadline passes without a correct guess, the vault creator can reclaim the locked funds, including their initial deposit and any accumulated guess fees. Each vault’s secret word is composed of a random adjective and noun pair, generated securely using Pyth Entropy V2. The project demonstrates fair randomness, on-chain verifiability, and transparent game logic.

## Technologies:

Pyth Entropy Solidity SDK `^2.1.0`

Solidity `^0.8.28`

## Deployment:

Network: Base Sepolia (can be deployed on any network supporting Pyth Entropy V2)

Entropy contract: `0x41c9e39574f40ad34c79f1c99b66a45efb830d4c`

Game contract: `0x2cDD7E1c2069C8B9b9d62242410CB87F78764705`

Frontend implementations can vary creatively. An example demo is available here:

**Live Demo:** https://secret-vaults.vercel.app/

---

## Implementation Details

The `SecretVault` contract integrates **Pyth Entropy V2** as a randomness oracle to generate secret answers derived from a predefined adjective–noun wordlist.

**Workflow:**

A player invokes `requestVaultGeneration()`, providing `MIN_DEPOSIT` plus the on-chain entropy fee from `getFeeV2()`. This calls `entropy.requestV2()` and records a `VaultRequest` keyed by the resulting sequence number. When Pyth Entropy later triggers the `entropyCallback()`, the contract deterministically derives a secret from the provided `randomNumber` using `_generateFromEntropy()`, commits the hash `keccak256(answer, randomness, sequenceNumber)` to create the vault, and initializes its prize pool with the user’s deposit.

Key functions include:

`requestVaultGeneration()` – requests new random vault generation

`submitGuess()` – allows players to guess and potentially claim the prize pool

`revealVault()` – enables vault creators to reclaim funds after expiration

View utilities – `getVault()`, `getVaultCount()`, `getEntropyFee()`

Commitment-based design ensures secrets remain hidden until reveal. The system prevents replay and collision through `usedCommitments`, ties each random value to a specific request via sequence numbers, and uses explicit fee validation and structured errors to maintain consistent game economics and state transitions.

## Future Extensions:

Potential enhancements include ERC-20 token support as underlying asset, expanded wordlists, numeric secrets, and progressive clue systems to increase difficulty and engagement.
