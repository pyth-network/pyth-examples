


# StakedSocial

![Chats](https://github.com/user-attachments/assets/404cc90b-df18-4876-be8b-84aa7895b4ad)

# Description
We all love prediction markets, but these are largely focused on global affairs and sports. My friends and I often spend a lot of time having informal bets with each other about things like sports (intramural games), if two friends will get in a relationship with each other, if a friend will fail a class, a round of poker, and other fun things! We thought it would be fun to build something out to facilitate this, and make it easy to do! The entire app revolves around group chats with friends, where any chat can have as many markets as they can. 

Along the way, we ran into a few issues around fairness, and addressed them as best we could. For example:

- Resolution: How do we do verification in a fair way. It can't be a simple majority since, in that case that if the majority loses, they could hijack a bet. Furthermore, it obviously can't be a single person who has sole authority over resolution.
We thought the fairest way would be requiring unanimous verification. To make it simpler, users can upload pictures of their friend's all giving a thumbs-up (resolve yes) or thumbs-down (resolve no), and using the facial embeddings, figure out the resolution. Additionally, the agentic feature allows you to upload a picture of proof with anti-watermarking to reduce doctored pictures. But really, if you're friends, hopefully you don't cheat!
- Bias: A person could bias the result if they knew about the bet. As a result, when making a prediction you can choose to 'hide' the market from certain people in the chat who it's about.
- What if everyone loses: we had the idea of just counting it as a 'house' stake, but thought that was a bit too cheeky, so we ended up deciding that it goes into a 'dinner fund'.
  
## How it's Made
The base app was made through a Celo-templated version of Farcaster, which made it much easier to work with and deploy the app! We used XMTP for all the chat-messaging between friends, managing friend groups, and a little bit with agents. We used facial landmarking (YOLO v7) and embedding (EigenFace) for the computer-vision-based verification and image extraction. The agentic workflow was built with simple tool calls through OpenAI (gpt 5 with minimal). We used Pyth for the nondeterminism in the casino and degen modes for a little bit more fun, and it let it be in a way where the user can confirm there's no foul play happening with how the randomness is done! Used HardHat for testing and deploying the contracts on-chain.

For more details on the optimization done for latency and performance, take a look at [the detailed README around Optimistic Messaging](https://github.com/Pulkith/StakedSocial/tree/main)

## To Run

Most of the .env, secret key, and large folders (node_modules, venvs), etc... have been deleted. Please follow the insturctions at the bottom to reconstruct and populate them with the necessary / your personal data.

A new Celo blockchain project

A modern Celo blockchain application built with Next.js, TypeScript, and Turborepo.
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

4. Setup [Farcaster](https://github.com/Pulkith/StakedSocial/blob/main/FARCASTER_SETUP.md) and the [optimal messaging backend](https://github.com/Pulkith/StakedSocial/blob/main/OPTIMISTIC_MESSAGING_SETUP.md) for full functionality.

## Project Structure

- `apps/web` - Next.js application with embedded UI components and utilities

## Available Scripts

- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Lint all packages and apps
- `pnpm type-check` - Run TypeScript type checking

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Monorepo**: Turborepo
- **Package Manager**: PNPM

---
## AI-Assisted Deep-Dive

For the sake of time we weren't able to write a full README but we've attached one below written largely by AI from our conversation history and a couple of agentic tools. The bulk of the information should be largely corrct, and was edited for accuracy as much as possible, but there may still be slight issues or hallucinations. 

It includes a deeper dive on all major features, the full smart contract portfolio, full setup, major files, and technical implemention, among other things!

## Executive Summary

StakedSocial is a blockchain-based prediction market application designed for friend groups to stake money on real-world events without requiring a trusted intermediary. The core problem it solves is fundamental: how do you settle financial bets between friends fairly when nobody wants to be responsible for holding the money, and when some bets involve people who shouldn't know about them?

The application uses a combination of on-chain smart contracts for financial security, XMTP for encrypted group communication, Celo L2 for low-cost transactions, and Pyth Entropy for cryptographically fair randomness. It includes both traditional prediction markets for real-world events and a "Degen Mode" casino experience where users gamble purely on random outcomes with no social component.

All money is locked in a smart contract escrow. No one can default. Markets can only resolve through full consensus voting (all participants must agree on the outcome). People being bet on cannot see the bets or vote on them. The system prevents manipulation through cryptographic hashing, bet hiding, and outcome secrecy until resolution.

## What This Application Does

This is a peer-to-peer betting platform. When a friend group decides to make a bet, instead of handing money to whoever will arbitrate, all participants deposit money into a smart contract. The contract enforces three rules:

1. Money stays locked until the outcome is decided
2. Everyone must vote on what happened (except the people being bet on)
3. Only if everyone agrees does the winning side get paid

For nondeterministic events (bets with no real outcome), Degen Mode uses Pyth Entropy to generate cryptographically fair random numbers. Friend groups can gamble on casino-like games or just pure randomness with guaranteed fairness for a litle bit of chaotic fun.

## Technology Stack

### Blockchain Layer
- **Solidity 0.8.20** - Smart contract language for Betting.sol
- **Hardhat** - Development environment for contract compilation, testing, and deployment
- **Celo L2 (Sepolia Testnet)** - Layer 2 blockchain for low-cost transactions
- **Pyth Entropy Oracle** - Cryptographic randomness for nondeterministic event resolution
- **ethers.js v6** - JavaScript library for blockchain interaction

### Frontend & UI
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript for all frontend code
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.io Client** - Real-time bidirectional communication

### Communication & Messaging
- **XMTP Protocol** - Decentralized end-to-end encrypted messaging
- **Farcaster Frames** - Social integration for betting in feeds
- **MetaMask** - Wallet connection and transaction signing

### Backend Infrastructure
- **Node.js** - Server runtime
- **Express.js** - HTTP server framework
- **Socket.io Server** - Real-time event broadcasting
- **ngrok** - Public tunnel for local development

### Data & Storage
- **localStorage** - Client-side persistent storage for messages and markets
- **Keccak256 Hashing** - Deterministic metadata verification

## File Structure 
Not complete, but the major peices are here.

```
my-celo-app/
├── apps/web/                                 # Frontend Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── chats/[chatId]/page.tsx      # Main chat & betting interface
│   │   │   ├── page.tsx                      # Landing page
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── bet-modal.tsx                # Create market UI with Degen Mode selection
│   │   │   ├── place-bet-modal.tsx          # Place bets interface
│   │   │   ├── bet-message-card.tsx         # Market display in chat
│   │   │   ├── bet-placement-card.tsx       # Inline alert when user bets
│   │   │   └── [other components]
│   │   ├── contexts/
│   │   │   ├── miniapp-context.tsx          # Farcaster integration
│   │   │   └── socket-context.tsx           # Real-time updates
│   │   ├── hooks/
│   │   │   └── use-optimistic-messaging.ts  # Local-first messaging
│   │   └── lib/
│   │       ├── market-service.ts            # Betting logic & contract calls
│   │       ├── chat-metadata.ts             # Chat storage
│   │       └── [utilities]
│   └── package.json
│
├── contracts/                                # Smart contracts directory
│   ├── contracts/
│   │   └── Betting.sol                      # Main betting contract
│   ├── hardhat.config.ts                    # Hardhat configuration
│   ├── scripts/
│   │   └── deploy.ts                        # Deployment script
│   ├── test/
│   │   └── Betting.test.ts                  # Smart contract tests
│   └── package.json
│
├── backend/                                  # Node.js backend server
│   ├── server.ts                            # Express + Socket.io
│   ├── routes/
│   │   ├── markets.ts                       # Market creation endpoints
│   │   └── messaging.ts                     # Message sync
│   └── package.json
│
└── README.md                                 # This file
```

## Core Features Explained

### 1. Optimistic Messaging Architecture

Optimistic messaging makes the application feel instant despite blockchain latency. When a user sends a message:

1. Message appears immediately in their local UI
2. Request is sent to backend server simultaneously
3. Server broadcasts confirmation to all clients via Socket.io
4. If the server rejects, the UI rolls back the change

This pattern is implemented in `apps/web/src/hooks/use-optimistic-messaging.ts`. The hook maintains local message state and syncs with the optimistic messaging server (running on port 5001). Users see responses in milliseconds while the backend persists data with full consistency.

The server implementation in `backend/routes/messaging.ts` handles message deduplication and ordering. Messages are stored in localStorage on the client and synced with the backend database.

### 2. Custodial Wallet for Frictionless Market Creation

The system uses a single backend-controlled wallet (the "admin account") to deploy all markets. This eliminates per-user gas fees for market creation and ensures consistent contract interactions.

When a user creates a market through the UI (`apps/web/src/components/bet-modal.tsx`):

1. Frontend sends market parameters to backend
2. Backend validates parameters
3. Admin wallet signs transaction calling `Betting.createMarket()` or `Betting.createDegenMarket()`
4. Transaction is submitted to Celo L2
5. Contract emits `MarketCreated` event
6. Backend parses event, extracts market ID
7. Market metadata is stored off-chain (details) and on-chain (hash)
8. User sees market immediately in chat

The benefit: Users never pay to create markets. They only pay when placing bets (sending value directly to contract) or claiming winnings.

### 3. Degen Mode - Nondeterministic RNG Gambling

This is the most distinctive feature. Degen Mode is a virtual casino where friend groups gamble purely on random outcomes with no real-world component. Instead of betting on whether something will happen, users bet against cryptographic randomness provided by Pyth Entropy.

Why create a virtual casino feature? Because traditional friend betting has fundamental friction:

- Real-world events require evidence and subjective judgment
- People being bet on feel awkward and may manipulate
- Disputes occur when "what actually happened" is unclear
- Outcome determination requires trust in an arbitrator

Degen Mode eliminates all social friction. Everyone bets on a random number. The randomness is mathematically proven to be fair. There's no ambiguity, no manipulation, no awkwardness.

How Degen Mode works mechanically:

1. User creates degen market via `Betting.createDegenMarket()` setting:
   - RNG threshold (0.00 to 100.00)
   - Extraction mode (RNG_RANGE, CASCADING_ODDS, or VOLATILITY_BOOST)

2. Participants place bets with `Betting.placeDegenBet()`:
   - Choose "Below Threshold" (side 0) or "Above Threshold" (side 1)
   - Send ETH to smart contract

3. After deadline, market creator calls `Betting.requestDegenResolution()`:
   - Pays Pyth Entropy fee
   - Entropy oracle returns cryptographically secure random bytes32

4. Contract's `entropyCallback()` is invoked:
   - Receives bytes32 random value from Pyth
   - Extracts a number (0-10000) using mode-specific logic
   - Determines winning outcome based on threshold
   - Resolves market automatically

5. Users call `Betting.withdrawDegen()`:
   - Claim proportional share of winning pool
   - Receive payout = (bet_amount * total_pool) / winning_pool_total

The three extraction modes provide different probability distributions:

**RNG_RANGE (Simple Binary):**
Extracts random value via simple modulo. RNG value compared directly to threshold.
- Threshold 5000 (50.00) = 50/50 odds
- Threshold 3333 (33.33) = 33/67 odds

**CASCADING_ODDS (Three-Tier):**
Splits hash into three parts using bit-shifting, weights them 40/35/25, creates three outcomes (Low/Medium/High).

```solidity
uint256 part1 = (hashValue >> 128) % (RNG_MAX_THRESHOLD / 3);
uint256 part2 = (hashValue >> 64) % (RNG_MAX_THRESHOLD / 3);
uint256 part3 = hashValue % (RNG_MAX_THRESHOLD / 3);
return ((part1 * 40) + (part2 * 35) + (part3 * 25)) / 100;
```

Different parts of the same random hash are weighted and combined. Creates overlapping probability distributions with nuanced odds.

**VOLATILITY_BOOST (Four-Tier with Time-Decay):**
Extracts base randomness (70%), volatility factor (20%), and block timestamp modifier (10%). Creates four outcomes with strategic timing element.

```solidity
uint256 base = hashValue % RNG_MAX_THRESHOLD;           // 70% weight
uint256 volatility = (hashValue >> 64) % 500;            // 20% weight
uint256 timeMultiplier = ((block.timestamp % 100) * 100) / 100;  // 10% weight
return (base * 70 + volatility * 20 + timeMultiplier * 10) / 100;
```

The time-decay factor means the exact block when entropy callback is executed slightly influences outcome. Adds strategic timing element to pure randomness.

Why this works for friend groups:

Degen Mode provides provably fair gambling. Everyone knows the odds. Everyone trusts the randomness because it's mathematically verifiable. The fairness comes from cryptographic proofs, not from probability manipulation or hidden house edges.

Friend groups can make absurd bets like "Will a random number be above 50?" No social friction. Pure fun. And everyone knows it's fair because Pyth Entropy uses multiple independent providers, cryptographic commitments, and transparent verification mechanisms that would require compromising multiple independent infrastructure providers to rig.

### 4. Consensus-Based Resolution for Real Events

For betting on actual outcomes (not degen mode), markets resolve only through unanimous consensus voting. After the deadline passes:

1. All non-target participants must vote on the outcome
2. Votes are cast via `Betting.voteResolve()`
3. Contract checks `_tryConsensusResolve()` after each vote
4. Only when ALL participants voted AND all votes match does market resolve
5. If consensus can't be reached, market automatically cancels and refunds everyone

This mechanism prevents:
- Early resolution and information leaks
- Tyranny of the majority (everyone must agree)
- One person declaring themselves winner

The atomic check in Solidity prevents race conditions:

```solidity
function _tryConsensusResolve(uint256 id) internal {
    for (uint256 i; i < m.participants.length; i++) {
        uint8 v = voteOutcome[id][u];
        if (v == 255) return;  // Someone hasn't voted
        if (v != first) return; // Votes don't match
    }
    _resolve(id, first, false); // All voted same outcome
}
```

### 5. Hidden Information - The Core Anti-Manipulation Layer

The contract implements several layers of information hiding to prevent manipulation:

**Bet Amounts Hidden:**
Stakes are stored in private mappings. No one can see how much anyone else bet until withdrawal. This prevents psychology-based manipulation.

**Bet Directions Hidden:**
Users only record which outcome they bet on (stored as index), not direction or amount. Prevents inferring other people's expectations.

**Target Hiding:**
People being bet on cannot:
- See that bets exist about them
- View bet amounts or predictions
- Vote on outcomes
- Know which outcome won

This prevents awkwardness and manipulation attempts.

**Deadline Lock:**
Bets must be placed BEFORE deadline. Voting happens AFTER deadline. This prevents targets from discovering bets at last second and rushing to counter-bet.

### 6. Money Locked in Escrow

All bet funds are held in the smart contract itself via the `placeBet()` and `placeDegenBet()` functions. The contract never releases funds except through `withdraw()` or `withdrawDegen()` after proper resolution.

This eliminates counterparty risk entirely. No one can default. If you bet $10, the smart contract guarantees it will be distributed fairly among winners.

### 7. XMTP for Encrypted Group Communication

All group chats use XMTP, an encrypted messaging protocol. The benefits:

- Messages are end-to-end encrypted
- No central server can read conversations
- Groups are portable across clients
- Natural conversation flow for creating bets

Integration in `apps/web/src/contexts/miniapp-context.tsx` handles wallet connection and message retrieval from XMTP network.

## Installation & Setup Guide

This application is a monorepo containing frontend, smart contracts, and backend. Below is complete setup for local development.

### Prerequisites

You need:
- Node.js 18+ (`node --version` to check)
- Git
- MetaMask browser extension
- A Celo Sepolia testnet wallet with some test funds

### Step 1: Install pnpm Package Manager

pnpm is faster and more efficient than npm. Install globally:

```bash
npm install -g pnpm@latest
```

Verify installation:
```bash
pnpm --version
```

### Step 2: Clone Repository and Install Dependencies

```bash
git clone <repository-url>
cd my-celo-app
pnpm install
```

This installs all dependencies for:
- `apps/web` (frontend)
- `contracts` (smart contracts)
- `backend` (Node.js server)

### Step 3: Environment Configuration

Create three `.env.local` files for different parts of the app.

**For Frontend** (`apps/web/.env.local`):

```
NEXT_PUBLIC_ADMIN_ADDRESS=0x7A19e4496bf4428Eb414cf7ad4a80DfE53b2a965
NEXT_PUBLIC_CONTRACT_ADDRESS=0xB0bD3b5D742FF7Ce8246DE6e650085957BaAC852
NEXT_PUBLIC_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
NEXT_PUBLIC_OPTIMISTIC_SERVER_URL=http://localhost:5001
```

**For Smart Contracts** (`contracts/.env.local`):

```
CELO_SEPOLIA_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
ADMIN_MNEMONIC=your twelve word mnemonic phrase here
ADMIN_ADDRESS=0x7A19e4496bf4428Eb414cf7ad4a80DfE53b2a965
PYTH_ENTROPY_ADDRESS=0x6CC14824Ea2918f5De5C2f35Cc9623134759e477
```

Replace `ADMIN_MNEMONIC` with your actual 12-word seed phrase. Keep this secret.

**For Backend** (`backend/.env.local`):

```
PORT=5001
NODE_ENV=development
ADMIN_ADDRESS=0x7A19e4496bf4428Eb414cf7ad4a80DfE53b2a965
RPC_URL=https://forno.celo-sepolia.celo-testnet.org
```

### Step 4: Get Testnet Funds

The admin account needs Celo and cUSD on Celo Sepolia testnet. Get free testnet funds:

1. Go to https://faucet.celo-testnet.org
2. Enter your Celo Sepolia wallet address
3. Request CELO and cUSD tokens
4. Wait for transaction confirmation

### Step 5: Set Up ngrok Tunnel

ngrok creates a public URL for your local backend, allowing webhook testing.

Install ngrok:

```bash
npm install -g ngrok
```

Create ngrok config at `~/.ngrok2/ngrok.yml`:

```yaml
version: "2"
authtoken: <your-ngrok-token>
tunnels:
  backend:
    proto: http
    addr: 5001
```

Get your auth token from https://dashboard.ngrok.com

Start the tunnel:

```bash
ngrok start backend
```

Note the public URL (like `https://abc123.ngrok.io`). Update `NEXT_PUBLIC_OPTIMISTIC_SERVER_URL` in `.env.local` with this URL.

### Step 6: Deploy Smart Contract

```bash
cd contracts
pnpm run compile
pnpm run deploy
```

The deploy script:
1. Compiles Betting.sol
2. Reads your ADMIN_MNEMONIC
3. Deploys to Celo Sepolia
4. Outputs the deployed contract address

Save the contract address. Update it in both `.env.local` files.

### Step 7: Start Backend Server

```bash
cd backend
pnpm dev
```

This starts Express server on port 5001 with Socket.io enabled. The server handles message sync and market creation transactions.

### Step 8: Start Frontend Development Server

In another terminal:

```bash
cd apps/web
pnpm dev
```

Frontend starts on http://localhost:3000 with hot reload.

### Step 9: Connect MetaMask

1. Open MetaMask
2. Add Celo Sepolia network:
   - Network Name: Celo Sepolia
   - RPC URL: https://forno.celo-sepolia.celo-testnet.org
   - Chain ID: 44787
   - Currency Symbol: CELO
   - Explorer: https://celoscan.io

3. Import test account with ADMIN_MNEMONIC
4. Confirm you have testnet funds
5. Connect wallet in application UI

Now you're ready to create markets and place bets locally!

## Smart Contract Deep Dive - Betting.sol

The heart of the application is `contracts/contracts/Betting.sol` - a gas-optimized Solidity contract that manages all betting logic. The contract is approximately 750 lines and handles both standard consensus-based markets and Degen Mode RNG markets.

### Contract Architecture Overview

The contract implements the IEntropyConsumer interface from Pyth Entropy SDK, making it capable of receiving cryptographically secure random numbers for Degen Mode resolution.

Key data structures:

**Market Struct:**
```solidity
struct Market {
    uint256 id;
    address creator;
    address resolver;
    bytes32 metadataHash;
    uint64 deadline;
    uint256 shareSize;

    bool resolved;
    bool cancelled;
    uint8 winningOutcome;

    address[] participants;
    address[] targetParticipants;
    uint256[] totalStaked;

    // Degen mode fields
    bool isDegen;
    DegenMode degenModeType;
    uint256 rngThreshold;
    bytes32 entropySequenceNumber;
    bool entropyCallbackReceived;
    bytes32 randomNumberHash;
    uint256 rngRequestTimestamp;
    address entropyProvider;
}
```

Each market tracks creation metadata, participant lists, stake amounts per outcome, and for degen markets, entropy tracking fields.

**DegenBet Struct:**
```solidity
struct DegenBet {
    uint256 marketId;
    address bettor;
    uint256 amount;
    uint8 side;  // 0 = Below, 1 = Above
    uint256 timestamp;
    bool claimed;
}
```

Degen bets are stored in an array per market, enabling independent withdrawal tracking distinct from standard bet withdrawal.

### Standard Market Flow

**Creating Markets:**
The `createMarket()` function deploys a new prediction market with the specified number of outcomes. It validates that:
- Deadline is in the future
- Share size is positive
- Outcome count is positive

Then it initializes storage structures and emits `MarketCreated` event with the market ID.

See `contracts/contracts/Betting.sol` line 197 for implementation.

**Placing Bets:**
The `placeBet()` function allows participants to stake money on a specific outcome. It:
- Validates market is open (not resolved/cancelled)
- Validates caller is not a target participant
- Validates bet amount is multiple of shareSize
- Adds participant if new
- Records stake in `stakes[marketId][user][outcome]`
- Updates `totalStaked[outcome]`

All money is sent directly to the contract and held in escrow.

See `contracts/contracts/Betting.sol` line 302 for implementation.

**Consensus Voting:**
After the deadline, participants call `voteResolve()` to vote on the outcome. The contract immediately checks `_tryConsensusResolve()` which:
- Iterates through all non-target participants
- Returns early if anyone hasn't voted
- Returns early if votes differ
- Auto-resolves market if all voted identically

This atomic check prevents timing exploits.

See `contracts/contracts/Betting.sol` line 400 and line 423 for implementation.

**Withdrawal:**
After resolution, users call `withdraw()` which:
- Validates market is resolved, cancelled, or deadline passed
- Calculates proportional payout
- Sends funds via low-level call
- Prevents re-entry with the `hasWithdrawn` flag

Payout calculation is: `(user_stake_on_winning * total_pool) / total_on_winning_outcome`

See `contracts/contracts/Betting.sol` line 495 for implementation.

### Degen Mode Implementation

**Creating Degen Markets:**
The `createDegenMarket()` function creates RNG-based markets. It:
- Validates degen mode is not STANDARD
- Validates threshold is 0-10000
- Auto-sets outcome count based on mode (2 for RANDOM_RANGE, 3 for CASCADING_ODDS, 4 for VOLATILITY_BOOST)
- Initializes empty RNG fields

See `contracts/contracts/Betting.sol` line 246 for implementation.

**Requesting Entropy:**
The `requestDegenResolution()` function requests random number from Pyth Entropy. It:
- Validates market is degen and past deadline
- Gets fee via `entropy.getFeeV2()`
- Calls `entropy.requestV2{value: fee}()` with proper fee
- Maps sequence number to market ID for callback
- Emits `EntropyRequested` event

The function returns immediately. Pyth provider fulfills the request asynchronously.

See `contracts/contracts/Betting.sol` line 368 for implementation.

**Entropy Callback:**
When Pyth provides the random number, it calls the contract's `entropyCallback()` which:
- Validates caller is entropy contract
- Maps sequence number to market ID
- Validates market state
- Records random hash and provider
- Calls `_resolveDegenMarket()` to process outcome

The contract never reverts in callback - all validation precedes state changes.

See `contracts/contracts/Betting.sol` line 120 for implementation.

**RNG Extraction Logic:**
The `_extractRNGValue()` function processes the random bytes32 into a 0-10000 value based on extraction mode. This is where the different probability distributions emerge.

For RANDOM_RANGE: Simple modulo operation
```solidity
return hashValue % RNG_MAX_THRESHOLD;
```

For CASCADING_ODDS: Three parts weighted 40/35/25
```solidity
uint256 part1 = (hashValue >> 128) % (RNG_MAX_THRESHOLD / 3);
uint256 part2 = (hashValue >> 64) % (RNG_MAX_THRESHOLD / 3);
uint256 part3 = hashValue % (RNG_MAX_THRESHOLD / 3);
return ((part1 * 40) + (part2 * 35) + (part3 * 25)) / 100;
```

For VOLATILITY_BOOST: Base (70%), volatility (20%), time decay (10%)
```solidity
uint256 base = hashValue % RNG_MAX_THRESHOLD;
uint256 volatility = (hashValue >> 64) % 500;
uint256 timeMultiplier = ((block.timestamp % 100) * 100) / 100;
return (base * 70 + volatility * 20 + timeMultiplier * 10) / 100;
```

See `contracts/contracts/Betting.sol` line 572 for full implementation.

**Outcome Computation:**
The `_computeOutcome()` function converts RNG value to outcome index using the threshold:

For RANDOM_RANGE:
```solidity
return rngValue < m.rngThreshold ? 0 : 1;
```

For CASCADING_ODDS: Divides into three ranges
For VOLATILITY_BOOST: Divides into four ranges

See `contracts/contracts/Betting.sol` line 606 for implementation.

**Degen Withdrawal:**
The `withdrawDegen()` function processes degen payouts. It:
- Iterates through all degen bets for the user
- Marks each as claimed
- Calculates proportional payout from winning pool
- Handles timeout refunds
- Sends funds

See `contracts/contracts/Betting.sol` line 676 for implementation.

### Security Features

**Prevention of Reentrancy:**
Uses the checks-effects-interactions pattern. All validations and state changes precede fund transfers.

**Prevention of Frontrunning:**
Deadline-based locking prevents targets from seeing bets and counter-betting. Voting happens after deadline, creating temporal separation.

**Prevention of Early Resolution:**
Markets cannot resolve before deadline. Consensus voting ensures unanimous agreement.

**Prevention of Manipulation:**
Hidden bet amounts, hidden bet directions, and target hiding prevent actors from influencing voting through psychology or collusion.

**Gas Optimization:**
- Uses arrays for participants (iterate-once patterns)
- Uses mappings for stakes (O(1) access)
- Avoids unnecessary loops
- Minimal storage writes

**Event Logging:**
All critical operations emit events for full audit trail. Every market creation, bet, vote, and resolution is logged.

Now you understand how the entire system works!

## Hardhat Development & Testing

The smart contracts use Hardhat for compilation, testing, and deployment.

### Compile Contracts

```bash
cd contracts
pnpm run compile
```

This generates:
- Compiled bytecode in `artifacts/`
- TypeScript interfaces in `artifacts/`
- ABI files for frontend integration

### Run Tests

```bash
pnpm run test
```

Tests cover:
- Market creation with parameter validation
- Bet placement and stake tracking
- Consensus voting resolution
- Degen mode RNG extraction
- Payout calculation
- Edge cases and error conditions

### Deploy to Celo Sepolia

```bash
pnpm run deploy
```

The deploy script (`contracts/scripts/deploy.ts`):
1. Reads ADMIN_MNEMONIC from .env.local
2. Connects to Celo Sepolia RPC
3. Deploys Betting contract
4. Outputs deployed address
5. Saves to config file

### Hardhat Configuration

See `contracts/hardhat.config.ts` for network configuration:

```typescript
module.exports = {
  solidity: "0.8.20",
  networks: {
    "celo-sepolia": {
      url: process.env.CELO_SEPOLIA_RPC_URL,
      accounts: [process.env.ADMIN_MNEMONIC]
    }
  }
};
```

## Next Steps & Roadmap

### Immediate Priorities

**Gas Fee Optimization**
- Implement meta-transaction pattern for free withdrawals
- Use batch operations to reduce per-market gas
- Target: <$0.10 per bet on Celo L2

**Sports Market Automation**
- Integrate ESPN/Sportradar APIs
- Implement auto-resolution for game outcomes
- Real-time score tracking and deadline enforcement

**Push Notifications**
- Alert users when added to markets
- Notify voting windows and deadlines
- Remind when resolution is ready

### Medium-Term Features

**Advanced Market Types**
- Multiple-choice outcomes (more than 4)
- Handicap markets (spread betting)
- Over/under prediction markets
- Ranged outcomes (predict specific values)

**Market Recommendations**
- Track betting history
- Suggest similar markets
- Leaderboards and reputation system
- Social features (followers, trending markets)

**Enhanced Proof Resolution**
- Image-based outcome verification
- Multimodal LLM analysis of proof
- Automated proof scoring
- Appeals process for disputes

**Off-Chain Verifiable Computation**
- Trusted Execution Environment (TEE) integration
- Zero-knowledge proofs for complex logic
- Off-chain storage with merkle tree hashing
- On-chain audit trail for verification

### Long-Term Vision

**Cross-Chain Deployment**
- Deploy to Ethereum mainnet
- Polygon, Optimism, Arbitrum support
- Liquidity pooling across chains
- Cross-chain settlement

**DAO Governance**
- Community-controlled fee structure
- Voting on supported market types
- Decentralized appeals process
- Treasury management for payouts

**Enterprise Features**
- Team bonding event platform
- Corporate group betting
- API for third-party integrations
- White-label deployment

**Institutional Integration**
- Partnership with prediction markets
- Integration with sports betting platforms
- Liquidity provider connections
- Oracle integration for additional data sources

## Contributing

The codebase is organized for easy contribution:

- Smart contract changes: `contracts/contracts/Betting.sol`
- Frontend components: `apps/web/src/components/`
- Market logic: `apps/web/src/lib/market-service.ts`
- Backend routes: `backend/routes/`

All changes should include:
- Tests (for contracts)
- Comments explaining logic
- Updated README if adding features

## Support & Resources

- **Celo Documentation:** https://docs.celo.org/
- **Pyth Entropy:** https://docs.pyth.network/entropy
- **XMTP Documentation:** https://xmtp.org/docs
- **Hardhat:** https://hardhat.org/docs
- **Solidity:** https://docs.soliditylang.org/

## License

This project is open source. See LICENSE file for details.

---
