# NFT Growth Contract

This repository contains the smart contracts for the NFT Growth project, utilizing Solidity ^0.8.24. The contracts enable the creation, management, and interaction with NFTs while integrating with the Pyth network for entropy (randomness) services.

## Contracts Overview

- **NFT.sol**: Implements an ERC721A token with functionalities for ownership and basic NFT management.
- **NFTGrowth.sol**: Extends `NFT.sol` to add functionality for NFT growth, which uses entropy from the Pyth network to influence NFT states.

## Features

- Minting new NFTs with initial properties.
- Growing NFTs by influencing their state with external entropy.
- Locking and Unlocking NFT Mechanics: This functionality is crucial for managing the state of an NFT between random number requests and callbacks. The lock prevents new growth requests on an NFT until the current process is complete, thus avoiding callback spam. Once a callback has been completed and processed, the NFT can be unlocked, allowing further interactions. This ensures that each growth step is completed before a new one begins, maintaining the integrity and sequential logic of NFT state changes.
- Withdrawal of contract balance by the owner.

## Dependencies

- OpenZeppelin Contracts (Access Control, Security)
- ERC721A Contracts (Efficient batch minting)
- Pyth Network Entropy SDK (Randomness)

## Getting Started

### Prerequisites

- Node.js and npm/yarn installed.
- Bunx and Hardhat setup for smart contract compilation and deployment.

### Installation

Clone the repository and install the dependencies:

```sh
bun install
```

### Deploying to Blast Network

To deploy the contracts to the Blast Sepolia network, use the following commands:

1. **Deploy and verify the Contract**:
   ```sh
   bunx hardhat ignition deploy ignition/modules/App.ts --network blast-sepolia --verify
   ```

### Interacting with the Contracts

After deployment, you can interact with the contracts through the Next.js project built for this demo

## Contract Functions

### NFT Contract

- `tokensOfOwner(address owner)`: Returns a list of token IDs owned by a given address.
- `withdraw(address to)`: Withdraws the balance to a specified address.

### NFTGrowth Contract

- `mint()`: Allows a user to mint a new NFT.
- `grow(uint256 tokenId, bytes32 userRandomNumber)`: Initiates the growth process of an NFT.
- `unlock(uint256 tokenId)`: Unlocks the NFT after a lock period.
- `ownerUnlock(uint256 tokenId)`: Allows the owner to unlock an NFT regardless of lock status.
- `getGrowFee()`: Returns the fee required for making a grow request.

### Internal Functions

- `requireLock(uint256 tokenId)`: Ensures that the NFT is locked and the lock period has expired before allowing certain actions.
- `requireOwnership(uint256 tokenId)`: Checks if the caller is the owner of the NFT.
- `entropyCallback(uint64 sequenceNumber, address provider, bytes32 randomNumber)`: Callback function used by the entropy system to deliver results.

## Events

- `NFTResult`: Emitted after the growth process with the result of the randomness.
- `NftGrowthRequested`: Indicates that an NFT growth request has been made.

## Acknowledgments

This example of using Pyth Entropy was created by [lualabs.xyz](https://lualabs.xyz).

We hope this starter example inspires you to continue innovating and building creative solutions with NFTs.
