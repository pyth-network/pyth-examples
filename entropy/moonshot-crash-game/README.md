# Moonshot Crash — Pyth Entropy Integration Example

## Overview

**Moonshot Crash** is an on-chain Crash-style betting game that demonstrates how to integrate **Pyth Entropy** to provide verifiable randomness in decentralized gaming.  
The project is deployed on **Base Sepolia** and runs fully autonomously, powered by **Chainlink Automation** for round management and **Pyth Entropy** for crash point randomness.

**Checkout the main repo:** https://github.com/drescher-christoph/Moonshot-Crash-Game

This example focuses on the **Pyth Entropy integration** used in the smart contract [`CrashGame.sol`](./CrashGame.sol).

---

## Motivation

Traditional on-chain games often rely on centralized servers or manipulable pseudo-random numbers.  
Moonshot demonstrates how to build a **fair, transparent, and unpredictable on-chain game** using **Pyth Entropy** as a provably fair randomness source.

The system implements the popular “Crash” mechanic:

- Players bet on a rocket’s multiplier.
- The multiplier increases continuously as the rocket ascends.
- The game ends (crashes) at a **random multiplier**, determined by **Pyth Entropy**.
- If a player’s chosen target multiplier is lower than the crash multiplier, they win their payout on-chain.

This mechanic combines **financial logic** (risk/reward balance) with **provably fair randomness**, all executed **transparently on-chain**.

---

## How Pyth Entropy Is Used

**Pyth Entropy** is a verifiable randomness oracle that delivers **unpredictable `bytes32` values** directly to the contract via a callback.  
Moonshot integrates Entropy through a simple 3-step process:

---

### 1️⃣ Requesting Entropy

When a round transitions from `OPEN` → `LOCKED`, the contract requests a random value from the Pyth Entropy provider:

```solidity
function requestRandom() internal {
    uint128 requestFee = entropy.getFeeV2();
    uint64 sequenceNumber = entropy.requestV2{value: requestFee}();
    emit FlipRequested(sequenceNumber);
}
```

This function:

- Retrieves the current request fee from the Entropy provider
- Pays the fee and triggers an on-chain randomness request
- Stores the sequence number for reference and emits an event

### 2️⃣ Receiving Entropy

Once the randomness is ready, Pyth calls back via the `entropyCallback()` function required by the `IEntropyConsumer` interface:

```solidity
function entropyCallback(
    uint64 sequenceNumber,
    address _providerAddress,
    bytes32 randomNumber
) internal override {
    require(s_rounds[s_currentRoundId].state == RoundState.LOCKED);
    uint256 crashMultiplier = _calculateCrashResult(randomNumber);
    s_rounds[s_currentRoundId].crashMultiplier = crashMultiplier;
    s_rounds[s_currentRoundId].crashTime = block.timestamp;
    s_rounds[s_currentRoundId].state = RoundState.RESOLVED;

    emit RoundCrashed(s_currentRoundId, block.timestamp, crashMultiplier);
}
```

The random number is passed as a `bytes32` value that the contract transforms into a numeric multiplier.

## Author

Christoph Drescher
ETHGlobal Online 2025 — Pyth Entropy Track Submission
GitHub: @drescher-christoph
