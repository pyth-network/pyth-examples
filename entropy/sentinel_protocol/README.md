# Token Reputation System with Pyth Entropy & Price Feeds

The [Sentinel Protocol](https://github.com/csking101/Sentinel-Protocol)  is a decentralized reputation protocol that monitors cryptocurrency portfolios, evaluates token credibility using real-time price data from Pyth Network, and enables autonomous portfolio protection through agent-to-agent (A2A) communication. 

We have used Pyth to obtain real-time pricing feed on-chain, as well as entropy that is used to compute the reputation score, using a stochastic model. Please check out our [project](https://github.com/csking101/Sentinel-Protocol) to see how Pyth is integrated with AI.

## 🌟 Overview

This project demonstrates how to build a comprehensive token reputation system that:
- **Fetches real-time price data** from Pyth Network's oracle
- **Calculates reputation scores** based on market stability, fundamental strength, and risk metrics
- **Integrates Pyth Entropy** for verifiable randomness in score computations, to aid in the stochastic computation model
- **Enables autonomous agents** to make portfolio rebalancing decisions
- **Supports multiple blockchain networks** (EVM-compatible chains)

## 🏗️ Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     Agent Orchestrator                        │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │ Price Feed   │   │ News Source  │   │ Reputation   │       │
│  │ Agent        │   │ Agent        │   │ Agent        │       │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘       │
│         │                  │                  │               │
│         └──────────────────┼──────────────────┘               │
│                            │                                  │
│                   ┌────────▼────────┐                         │
│                   │ Decision Agent  │                         │
│                   └────────┬────────┘                         │
│                            │                                  │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Smart Contract │
                    │  (On-Chain)     │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
       ┌──────▼──────┐              ┌───────▼──────┐
       │ Pyth Oracle │              │    Entropy   │
       │ Price Feeds │              │   (Random)   │
       └─────────────┘              └──────────────┘
```

## ✨ Key Features

### 1. **Real-Time Price Integration**
- Fetches live cryptocurrency prices from Pyth Network
- Supports multiple tokens (BTC, ETH, SOL, MATIC, AAVE, DOGE, USDC, etc.)
- Price staleness checks to ensure data freshness
- Confidence intervals for risk assessment

### 2. **Multi-Dimensional Reputation Scoring**
- **Market Stability**: Tracks price volatility and market conditions
- **Fundamental Strength**: Evaluates token fundamentals and adoption
- **Risk Score**: Assesses potential threats and vulnerabilities
- **Overall Reputation**: Composite score for decision-making

### 3. **Entropy-Powered Randomness**
- Uses Pyth Entropy for verifiable random number generation
- Dynamic score adjustments based on entropy and price movements
- Prevents predictable manipulation of reputation scores
- Helps in creating a stochastic reputation model

### 4. **Agent-to-Agent Communication**
- Modular agent architecture for specialized tasks
- Decision agent coordinates multiple information sources
- Authorization agent validates proposed actions
- Autonomous portfolio rebalancing based on market conditions

## 📋 Prerequisites

- Node.js v18+ and npm/yarn
- Solidity ^0.8.20
- An Ethereum wallet with testnet funds
- Basic understanding of smart contracts and oracles

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/pyth-network/pyth-examples.git
cd pyth-examples/token-reputation-system
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment

Create a `.env` file:

```env
# Network Configuration
RPC_URL=https://rpc.ankr.com/eth_sepolia
PRIVATE_KEY=your_private_key_here

# Contract Addresses (Sepolia Testnet)
PYTH_CONTRACT=0xDd24F84d36BF92C65F92307595335bdFab5Bbd21
ENTROPY_CONTRACT=0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c
ENTROPY_PROVIDER=0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344

# Deployed Contract
CONTRACT_ADDRESS=your_deployed_contract_address
ABI_PATH=./artifacts/TokenReputationContract.json
```

### 4. Deploy the Contract

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Or using Remix IDE:
1. Open [Remix](https://remix.ethereum.org)
2. Copy `contracts/TokenReputationContract.sol`
3. Compile with Solidity 0.8.20+
4. Deploy with Pyth and Entropy addresses

### 5. Run Tests

```bash
npm test
```

## 📁 Project Structure

```
token-reputation-system/
├── contracts/
│   └── TokenReputationContract.sol    # Main smart contract
├── scripts/
│   ├── deploy.ts                      # Deployment script
│   └── test.ts                        # Test suite
├── src/
│   └── agents/
│       ├── PriceFeedAgent.ts          # Fetches Pyth prices
│       ├── ReputationAgent.ts         # Reads on-chain reputation
│       ├── NewsSourceAgent.ts         # Analyzes news sentiment
│       ├── DecisionAgent.ts           # Makes rebalancing decisions
│       └── AuthorizationAgent.ts      # Validates actions
├── README.md
├── USAGE.md                           # Detailed usage guide
├── package.json
└── .env.example
```

## 🔧 Usage

### Setting Up Price Feeds

```typescript
import { ethers } from "ethers";

// Connect to contract
const contract = new ethers.Contract(contractAddress, abi, signer);

// Set price feed for a token
await contract.setPriceFeedId(
  "BTC",
  "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
);

// Batch set multiple tokens
await contract.batchSetPriceFeedIds(
  ["ETH", "SOL", "MATIC"],
  [ethFeedId, solFeedId, maticFeedId]
);
```

### Setting Reputation Scores

```typescript
// Set scores for a token
await contract.setScores(
  "BTC",
  85,  // market stability
  90,  // fundamental strength
  30,  // risk
  95   // reputation score
);
```

### Reading Token Data

```typescript
// Get reputation scores
const [market, fundamental, risk, reputation] = 
  await contract.getScores("BTC");

console.log(`BTC Reputation: ${reputation}`);

// Get complete data (scores + price)
const tokenData = await contract.getTokenData("BTC");
console.log(`Price: $${formatPrice(tokenData.price, tokenData.expo)}`);
```

### Updating Prices from Pyth

```typescript
import { PriceServiceConnection } from "@pythnetwork/price-service-client";

const connection = new PriceServiceConnection("https://hermes.pyth.network");

// Get price update data
const priceIds = [BTC_FEED_ID, ETH_FEED_ID];
const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);

// Update on-chain
const updateFee = await contract.pyth.getUpdateFee(priceUpdateData);
await contract.updatePriceFeeds(priceUpdateData, { value: updateFee });
```

### Requesting Entropy

```typescript
// Request random entropy for dynamic score updates
const entropyFee = ethers.parseEther("0.001");
await contract.requestRandomEntropy("BTC", { value: entropyFee });

// Entropy callback automatically updates scores
```

## 🎯 Key Concepts

### Pyth Price Feeds

Pyth uses a pull-based oracle model:
1. Fetch signed price updates off-chain from Hermes API
2. Submit updates on-chain with your transaction
3. Pay a small fee to update the price
4. Read validated price data

**Price Data Structure:**
```typescript
{
  price: int64        // Raw price value
  conf: uint64        // Confidence interval
  expo: int32         // Exponent (price = price × 10^expo)
  publishTime: uint   // Unix timestamp
}
```

**Example:**
```
price: 393238314383
expo: -8
Actual Price = 393238314383 × 10^(-8) = $3,932.38
```

### Reputation Scoring

Scores are calculated based on:
- **Market Stability (0-100)**: Lower volatility = higher score
- **Fundamental Strength (0-100)**: Strong fundamentals = higher score  
- **Risk (0-100)**: Lower risk = better (inverted in reputation calculation)
- **Reputation Score (0-100)**: Composite of all factors

Formula:
```
Reputation = (MarketStability + FundamentalStrength - Risk) / 3
```

### Entropy Integration

Pyth Entropy provides verifiable randomness:
1. Request entropy with `requestRandomEntropy(token)`
2. Entropy callback receives random number
3. Scores are dynamically adjusted using:
   - Random factor from entropy
   - Current price movement
   - Historical patterns

This prevents predictable score manipulation.

## 🔐 Security Considerations

1. **Price Staleness**: Always check `publishTime` - reject stale prices
2. **Confidence Intervals**: High confidence = low `conf` value
3. **Access Control**: Only owner can set scores and price feeds
4. **Entropy Callbacks**: Only Entropy contract can call `_entropyCallback`
5. **Fee Handling**: Always send sufficient value for Pyth/Entropy fees

## 🌐 Supported Networks

### Testnets
- **Ethereum Sepolia**: Pyth `0xDd24F84d36BF92C65F92307595335bdFab5Bbd21`
- **Arbitrum Sepolia**: Pyth `0x4374e5a8b9C22271E9EB878A2AA31DE97DF15DAF`
- **Base Sepolia**: Pyth `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729`

### Mainnets
- **Ethereum**: Pyth `0x4305FB66699C3B2702D4d05CF36551390A4c69C6`
- **Arbitrum**: Pyth `0xff1a0f4744e8582DF1aE09D5611b887B6a12925C`
- **Optimism**: Pyth `0xff1a0f4744e8582DF1aE09D5611b887B6a12925C`

See [Pyth Docs](https://docs.pyth.network/price-feeds/contract-addresses) for complete list.

## 📊 Pyth Price Feed IDs

Common cryptocurrencies:

| Token | Feed ID |
|-------|---------|
| BTC/USD | `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43` |
| ETH/USD | `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace` |
| SOL/USD | `0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d` |
| MATIC/USD | `0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52` |
| AAVE/USD | `0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445` |
| DOGE/USD | `0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c` |
| USDC/USD | `0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a` |

Find more at: [pyth.network/developers/price-feed-ids](https://pyth.network/developers/price-feed-ids)

## 🧪 Testing

Run the complete test suite:

```bash
npm test
```

Test individual components:

```bash
# Test contract deployment
npm run test:deploy

# Test price feeds
npm run test:prices

# Test reputation scoring
npm run test:reputation

# Test entropy integration
npm run test:entropy
```

## 🐛 Troubleshooting

### "Insufficient fee" Error
Increase the value sent with `updatePriceFeeds`:
```typescript
const fee = await pyth.getUpdateFee(priceUpdateData);
await contract.updatePriceFeeds(priceUpdateData, { value: fee * 2n });
```

### "Price feed not set for token"
Ensure you called `setPriceFeedId` before reading prices:
```typescript
await contract.setPriceFeedId("BTC", BTC_FEED_ID);
```

### "Price too stale"
Update prices more frequently or increase staleness threshold.

### BigInt Conversion Issues
```typescript
// Convert BigInt to Number safely
const price = Number(priceData.price) * Math.pow(10, priceData.expo);
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Additional Resources

- [Pyth Network Documentation](https://docs.pyth.network)
- [Pyth Price Feeds Tutorial](https://docs.pyth.network/price-feeds/create-your-first-pyth-app)
- [Pyth Entropy Documentation](https://docs.pyth.network/entropy)
- [Web3.js Documentation](https://web3js.readthedocs.io)
- [Ethers.js Documentation](https://docs.ethers.org)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Pyth Network](https://pyth.network) for oracle infrastructure
- [Hedera](https://hedera.com) for agent-to-agent communication platform
- Community contributors and testers

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/pyth-network/pyth-examples/issues)
- **Discord**: [Pyth Network Discord](https://discord.gg/PythNetwork)
- **Docs**: [Pyth Documentation](https://docs.pyth.network)

---

**Built with ❤️ using Pyth Network**