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

## Addresses and Deployment

### Network Configuration

This example is configured for **Base Sepolia Testnet**:

- **Pyth Entropy Contract**: `0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c`
- **Network**: Base Sepolia (Chain ID: 84532)
- **RPC URL**: Use Base Sepolia RPC endpoint

### Deployment

The deployment script (`EntropyBeastsDeploy.s.sol`) automatically uses the correct Entropy contract address for Base Sepolia testnet.

To deploy:

```bash
# Deploy to Base Sepolia
forge script script/EntropyBeastsDeploy.s.sol \
    --rpc-url https://sepolia.base.org \
    --broadcast \
    --verify \
    --private-key <YOUR_PRIVATE_KEY>
```

**Note**: Ensure your deployer account has sufficient ETH on Base Sepolia for deployment gas fees.

### Current Deployment

The example contract is currently deployed on Base Sepolia testnet:

- **Contract Address**: `0x2e2bae4389ddd3272b945b0833ecf20554202f2c`
- **Transaction Hash**: `0x848047b48ce3b5b754bbe48c8400eb4ffa4b4c74112970c585b4d307777f1304`
- **Block Number**: 29,541,269 (0x1c10395)
- **Deployer**: `0x78357316239040e19fc823372cc179ca75e64b81`

You can interact with this deployment directly or use it as a reference for testing the Entropy V2 integration.

### Other Networks

To deploy on different networks, update the Entropy contract address in `EntropyBeastsDeploy.s.sol`. Refer to [Pyth Entropy documentation](https://docs.pyth.network/entropy) for addresses on other supported networks.

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
