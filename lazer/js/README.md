# Pyth Lazer JavaScript SDK Examples

This directory contains JavaScript/TypeScript examples demonstrating how to use the Pyth Lazer SDK to interact with real-time price feeds and verify price updates on the Solana blockchain.

## What is Pyth Lazer?

Pyth Lazer is a high-performance, low-latency price feed service that provides real-time financial market data to blockchain applications. It supports multiple blockchain networks and offers both JSON and binary message formats for optimal performance.

## Prerequisites

Before running these examples, make sure you have the following installed:

- **Node.js** (version 18 or higher)
- **pnpm** package manager
- A Lazer Access Token -- please see [How to Acquire an Access Token](https://docs.pyth.network/lazer/acquire-access-token) if you don't have one.

## Installation

1. Navigate to the `lazer/js` directory:
   ```bash
   cd lazer/js
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Configure your access token:
    ```bash
    export ACCESS_TOKEN=your_actual_token
    ```

## Basic Examples

### 1. WebSocket Client Example (`src/index.ts`)
Demonstrates how to connect to the Pyth Lazer WebSocket stream and receive real-time price updates.

**What it does:**
- Connects to the Pyth Lazer server
- Subscribes to price feeds (IDs 1 and 2)
- Listens for both JSON and binary messages
- Displays received price data and connection status

**How to run:**
```bash
pnpm run start
```

## Solana Examples

### Prerequisites

The Solana examples require a funded Solana private key stored in `./keypair.json`. 

### 1. Post Solana Example (`src/solana/post_solana.ts`)
Shows how to receive price data from Pyth Lazer and post it to a Solana smart contract.

**What it does:**
- Connects to Pyth Lazer and receives price feed data
- Creates cryptographic instructions for Solana
- Posts the price data to a deployed smart contract
- Handles transaction confirmation

**How to run:**
```bash
pnpm run start:post_solana
```

### 2. ECDSA Message Verification (`src/solana/verify_ecdsa_message.ts`)
Demonstrates how to verify ECDSA-signed messages using the Pyth Lazer Solana contract.

**What it does:**
- Takes a hex-encoded message as input
- Verifies the message using ECDSA signature verification
- Interacts with the Pyth Lazer Solana program

**How to run:**
```bash
pnpm run start:verify_ecdsa_message \
  --url 'https://api.devnet.solana.com' \
  --keypair-path './keypair.json' \
  --message "e4bd474dda8934550d660e6ef4ee6ec1557349e283090c0107cad8bb997e67783a68be5646a5c949a8deaa6bee6ec1fc8aceb5002d6808b1da8ce5e9d26fd1b56ebeaf9d001c0075d3c793403ab1a9b03706000301010000000100eaf83297b5090000"
```

### 3. Ed25519 Message Verification (`src/solana/verify_ed25519_message.ts`)
Shows how to verify Ed25519-signed messages using the Pyth Lazer Solana contract.

**What it does:**
- Takes a hex-encoded message as input
- Creates Ed25519 verification instructions
- Verifies the message using the Pyth Lazer Solana program

**How to run:**
```bash
pnpm run start:verify_ed25519_message \
  --url 'https://api.testnet.solana.com' \
  --keypair-path './keypair.json' \
  --message "b9011a82f3c5c2760beb0c78827c75b0b18f1d4a2dcddf9d3efb291e66de25927538deffd74606de833eff236022aaca7b8a79cf15d3c7b51a91b500b2b9e6ca64bcfa03f65210bee4fcf5b1cee1e537fabcfd95010297653b94af04d454fc473e94834f1c0075d3c793c03c26adb03706000301010000000100aa749416b4090000"
```

## Troubleshooting

### Common Issues

1. **Connection Errors**: Make sure you have a stable internet connection and the Pyth Lazer service is accessible.

2. **Solana Transaction Failures**: Ensure your wallet has sufficient SOL for transaction fees and the correct network is configured.

3. **Keypair Issues**: Make sure your Solana keypair file is in the correct format (JSON array of numbers) and the path is correct.

## License

This project is licensed under the Apache-2.0 License.
