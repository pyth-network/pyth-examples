# Shark Battles - Prediction Battle Platform

This example demonstrates how to build a decentralized prediction battle platform using Pyth Network price feeds and Pyth Entropy for verifiable randomness. The application gamifies cryptocurrency price predictions where users compete to predict price movements and win ETH rewards through a dual reward system combining skill and luck.

## What This Example Does

Shark Battles is a prediction battle platform where users compete to predict cryptocurrency price movements within specific time periods. The platform features two distinct reward mechanisms that create engaging gameplay for both skilled traders and casual participants:

- **Top Price Change Reward (0.01 ETH)**: Awarded to the prediction with the highest price increase during the battle period
- **Random Reward (0.005 ETH)**: Randomly distributed to any participant using Pyth Entropy's verifiable randomness

Users can predict on multiple cryptocurrencies, with battles running for predetermined time periods. The platform integrates with **Pyth Network** for real-time price feeds and **Pyth Entropy** for provably fair random reward distribution, ensuring transparency and fairness in all battles.

### Key Components

**Smart Contracts**:

- **Battlefield.sol**: Main contract implementing the prediction battle mechanics with Pyth integrations. It manages battle creation, prediction submission, battle processing, and reward distribution using both price oracles and entropy callbacks.

**Battle Processing Scripts**:

- **process-started-battle.ts**: Automated script for processing battle start phases with real-time price data
- **process-ended-battle.ts**: Script for calculating price changes, awarding top performers, and requesting randomness
- **create-predictionts.ts**: Utility script for creating test predictions

### How the Pyth Integration Works

1. **Battle Creation**: Battles are created with specific price feed IDs, duration, and reward pools.

2. **Prediction Submission**: Users submit predictions by selecting a cryptocurrency and battle timeframe, with their FID (Farcaster ID) for social integration.

3. **Battle Start Processing**: When battles begin, the contract records initial prices from Pyth oracles using real-time price feed data.

4. **Battle End Processing**: The contract calculates price changes for all predictions, automatically awards the top performer, and requests randomness from Pyth Entropy for random reward selection.

5. **Random Reward Distribution**: Entropy delivers verifiable randomness via callback to fairly select a random participant for the luck-based reward.

6. **Social Integration**: Designed for Farcaster integration with FID-based user identification, making it perfect for social platform mini-apps.

This dual-oracle approach ensures both accurate price data and fair randomness, creating a transparent and engaging prediction game.

## Project Structure

```
entropy/sharkbattles/
├── contracts/
│   └── Battlefield.sol      # Main prediction battle contract
├── ignition/
│   └── modules/            # Deployment configuration
├── scripts/
│   ├── create-predictionts.ts       # Create test predictions
│   ├── process-started-battle.ts    # Process battle start
│   ├── process-ended-battle.ts      # Process battle end
│   └── data/               # Battle data and configurations
├── test/
│   └── Battlefield.ts      # Contract tests
├── artifacts/              # Compiled contract artifacts
├── package.json
└── hardhat.config.ts
```

## Prerequisites

Before running this example, ensure you have:

- **Node.js** (v18 or later)
- **npm** package manager
- A Web3 wallet with funds on Base Sepolia testnet
- Access to Pyth Network price feeds and Entropy service
- Farcaster account for social integration (optional)

## Running the Example

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

Set up your environment variables for network access:

```bash
npx hardhat keystore set BASE_SEPOLIA_RPC_URL
```

### Step 3: Deploy the Smart Contracts

Deploy the Battlefield contract to Base Sepolia testnet:

```bash
npx hardhat ignition deploy ignition/modules/Battlefield.ts --network baseSepolia
```

After deployment, note the deployed contract address for use in battle processing scripts.

### Step 4: Run Tests

Test the contract functionality:

```bash
npx hardhat test
```

For Node.js specific tests:

```bash
npx hardhat test nodejs
```

### Step 5: Process Battles

Use the provided scripts to manage battle lifecycle:

**Create test predictions:**

```bash
npx hardhat run scripts/create-predictionts.ts --network baseSepolia
```

**Process battle start:**

```bash
npx hardhat run scripts/process-started-battle.ts --network baseSepolia
```

**Process battle end:**

```bash
npx hardhat run scripts/process-ended-battle.ts --network baseSepolia
```

## Key Contract Functions

### Battlefield Contract

- **`createBattle(bytes32 priceFeedId, uint256 duration, uint256 topReward, uint256 randomReward)`**: Creates a new prediction battle
- **`submitPrediction(uint256 battleId, uint256 fid)`**: Submits a prediction for a specific battle
- **`processBattleStart(uint256 battleId)`**: Records initial prices when battle begins
- **`processBattleEnd(uint256 battleId)`**: Calculates results and distributes rewards
- **`getBattleInfo(uint256 battleId)`**: Returns battle details and current state

### Events

- **`BattleCreated`**: Emitted when a new battle is created
- **`PredictionSubmitted`**: Emitted when a user submits a prediction
- **`BattleStarted`**: Emitted when battle start processing completes
- **`BattleEnded`**: Emitted when battle end processing and rewards are distributed

## Development Commands

### Project Management

```bash
# Clean the project
npx hardhat clean

# Install dependencies
npm install
```

### Testing and Deployment

```bash
# Run tests
npx hardhat test

# Deploy to Base Sepolia
npx hardhat ignition deploy ignition/modules/Battlefield.ts --network baseSepolia

# Verify contract
npx hardhat verify [CONTRACT_ADDRESS] --network baseSepolia
```

### Keystore Management

```bash
# List all keys in keystore
npx hardhat keystore list

# Set RPC URL
npx hardhat keystore set BASE_SEPOLIA_RPC_URL
```

## Development Notes

### Technology Stack

**Smart Contracts**:

- Solidity ^0.8.24
- Hardhat for development and deployment
- Pyth Network SDK for price feeds
- Pyth Entropy SDK for randomness
- OpenZeppelin contracts for security

**Infrastructure**:

- Base Sepolia testnet for fast, low-cost transactions
- Pyth Network oracles for real-time price data
- Pyth Entropy for verifiable randomness
- Farcaster integration for social features

### Battle Mechanics

The platform implements a sophisticated battle system:

1. **Battle Creation**: Battles are created with specific parameters including price feed, duration, and reward amounts
2. **Prediction Phase**: Users submit predictions during the active battle period
3. **Settlement Phase**: Battles are processed using real-time price data to determine winners
4. **Reward Distribution**: Dual reward system ensures both skill-based and luck-based incentives

### Gas Optimization

The contract is optimized for L2 deployment with:

- Efficient data structures for battle and prediction storage
- Batch processing capabilities for multiple predictions
- Minimal state changes to reduce transaction costs

### Testing Locally

To test contracts without deploying:

```bash
npx hardhat test
```

For development with a local blockchain:

1. Start local Hardhat node: `npx hardhat node`
2. Deploy contracts locally: `npx hardhat ignition deploy ignition/modules/Battlefield.ts --network localhost`
3. Run battle processing scripts against local deployment

Note that testing with actual Pyth feeds and Entropy requires deploying to a supported testnet where these services are available.

## Supported Networks

This example is configured for **Base Sepolia** testnet, but can be adapted for any EVM network that supports Pyth Network price feeds and Entropy. You'll need to:

1. Find the Pyth contract addresses for your target network
2. Update deployment configuration with correct addresses
3. Configure the network in `hardhat.config.ts`
4. Update scripts with appropriate network settings

For available networks and addresses, see:

- **Pyth Price Feeds**: https://docs.pyth.network/price-feeds/contract-addresses
- **Pyth Entropy**: https://docs.pyth.network/entropy

## Social Integration

Shark Battles is designed for integration with social platforms, particularly Farcaster:

- **FID Integration**: Users are identified by their Farcaster ID (FID)
- **Mini-App Ready**: Optimized for social platform mini-app deployment
- **Social Sharing**: Battle results and predictions can be shared on social platforms

## Additional Resources

- **Pyth Network Documentation**: https://docs.pyth.network
- **Pyth Price Feeds**: https://docs.pyth.network/price-feeds
- **Pyth Entropy Documentation**: https://docs.pyth.network/entropy
- **Base Network**: https://base.org
- **Farcaster Protocol**: https://farcaster.xyz
