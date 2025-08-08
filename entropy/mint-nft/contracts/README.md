# Entropy Beasts NFT Contracts

This directory contains Solidity smart contracts for the Entropy Beasts NFT example project, demonstrating how to integrate **Pyth Entropy V2** for generating verifiable randomness in smart contracts.

## Overview

This is an example repository showcasing Pyth's Entropy V2 feature through an NFT minting system. Each "Beast" NFT receives randomly generated attributes (strength and intelligence) using Pyth's verifiable random function (VRF) service, demonstrating how to properly integrate on-chain randomness in a real-world application.

## Contracts

### EntropyBeasts.sol

The main contract that demonstrates Pyth Entropy V2 integration:
- NFT minting with verifiable random attributes
- Callback-based entropy consumption pattern
- Gas optimization examples for different use cases
- Single minting mode: `mintBeast()` with configurable gas parameters

**Key Features:**
- Demonstrates Pyth Entropy V2 SDK integration
- Implements `IEntropyConsumer` interface for callback handling
- Shows proper fee calculation and payment flow
- Includes gas usage demonstration with optional gas-intensive operations
- Generates provably random attributes using entropy callbacks

### Deployment Script

- `script/EntropyBeastsDeploy.s.sol`: Foundry deployment script for Base testnet

## Project Structure

```
contracts/
├── src/
│   └── EntropyBeasts.sol          # Main contract
├── script/
│   └── EntropyBeastsDeploy.s.sol  # Deployment script
├── lib/
│   ├── forge-std/                 # Foundry standard library
│   ├── contract.ts                # Contract utilities
│   └── wagmi.ts                   # Frontend integration
├── out/                           # Compiled artifacts
├── broadcast/                     # Deployment broadcasts
└── foundry.toml                   # Foundry configuration
```

## Dependencies

- `@pythnetwork/entropy-sdk-solidity`: Pyth Entropy SDK for Solidity
- `forge-std`: Foundry standard library for testing and scripting

## Building and Testing

This project uses Foundry for smart contract development:

```bash
# Build contracts
forge build

# Run tests
forge test

# Deploy to testnet
forge script script/EntropyBeastsDeploy.s.sol --broadcast --rpc-url <RPC_URL>
```

## Integration

The contracts integrate with Pyth's Entropy service on Base testnet. The entropy provider address is configured in the deployment script.

## Usage Example

This example demonstrates the complete Entropy V2 integration flow:

1. Deploy the contract with the appropriate Entropy contract address
2. Call `mintBeast(gasLimit, isBig)` with sufficient ETH to cover entropy fees
   - `gasLimit`: Gas limit for the callback execution
   - `isBig`: Boolean to trigger gas-intensive operations (for demonstration)
3. The entropy provider fulfills the request via callback to `entropyCallback()`
4. Query minted beast attributes using `getBeast(tokenId)`

The contract showcases how to handle the asynchronous nature of entropy requests and demonstrates gas optimization techniques for different callback scenarios.

## Foundry Commands

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Deploy

```shell
$ forge script script/EntropyBeastsDeploy.s.sol --rpc-url <your_rpc_url> --private-key <your_private_key>
```
