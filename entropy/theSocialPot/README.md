# The Social Pot 🍀

> **WIN. GIVE. GROW.**

A revolutionary blockchain lottery that combines winning, earning, and social impact. Buy tickets, win daily drawings, receive guaranteed monthly payments for 10 years, and help finance social projects addressing global crises.

## 🌟 Overview

**The Social Pot** is a decentralized lottery built on Base blockchain that offers:

- **Daily Drawings**: New winner selected every day at midnight UTC using provably fair randomness from Pyth Entropy
- **10-Year Monthly Payouts**: Winners receive guaranteed monthly payments for 120 months through Aave lending protocol
- **Social Impact**: Interest generated from funds (~$7M annually) finances projects addressing:
  - 🏥 **Health Crisis**: Medical facilities, healthcare access, emergency response
  - 🏠 **Housing Crisis**: Affordable housing, shelter programs, housing assistance
  - 🍽️ **Food Crisis**: Food banks, nutrition programs, sustainable agriculture

## 🎯 Key Features

### For Players
- **Low Entry Cost**: Just 1 USDC per ticket
- **Daily Chances**: New drawing every day at midnight UTC
- **Referral Rewards**: Earn 30% commission on tickets sold through your referral link
- **Transparent & Fair**: Powered by Pyth Entropy for verifiable randomness
- **Long-Term Income**: Monthly payments for 10 years (120 months)

### For Winners
- **Instant First Payment**: Receive 1/120th of jackpot immediately
- **Monthly Payouts**: Receive your payment each month for the next 119 months
- **Growing Returns**: Funds deposited on Aave generate interest, increasing your total payout
- **Social Impact**: Your winnings help fund critical social projects

## 🏗️ Architecture

### Smart Contracts

```
MegaYieldLottery.sol
├── Manages daily lottery drawings
├── Integrates with Pyth Entropy for randomness
├── Handles ticket purchases and jackpot distribution
└── Coordinates with MegaYieldVesting for payouts

MegaYieldVesting.sol
├── Manages 10-year monthly vesting schedule
├── Integrates with Aave for lending
└── Handles monthly payment claims

PythIntegration.sol
└── Wrapper for Pyth Entropy V2 API

AaveIntegration.sol
└── Wrapper for Aave V3 lending protocol
```

### Technology Stack

**Backend:**
- Solidity ^0.8.24
- Foundry (testing & deployment)
- Hardhat (development)
- OpenZeppelin Contracts
- Pyth Entropy SDK
- Aave V3 Core

**Frontend:**
- Next.js 16
- React 19
- TypeScript
- Wagmi v3 (Web3 integration)
- Viem (Ethereum utilities)
- Tailwind CSS
- Radix UI

**Blockchain:**
- Base Sepolia (testnet)
- Base Mainnet (production)
- Pyth Entropy smart contracts

## 📋 Prerequisites

- Node.js 18+ and npm
- Foundry (for contract testing)
- A Web3 wallet (MetaMask recommended)
- USDC tokens on Base Sepolia/Base

## 🚀 Getting Started

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Compile contracts
forge build
# or
npm run compile

# Run tests
forge test
# or
npm test
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## 📁 Project Structure

```
megaYield/
├── backend/
│   ├── contracts/          # Smart contracts
│   │   ├── MegaYieldLottery.sol
│   │   ├── MegaYieldVesting.sol
│   │   ├── PythIntegration.sol
│   │   └── AaveIntegration.sol
│   ├── test/              # Test files
│   │   ├── MegaYieldLottery.test.ts
│   │   ├── PythReal.t.sol
│   │   └── PythVerification.t.sol
│   ├── script/            # Deployment scripts
│   │   └── DeployLottery.s.sol
│   └── config/            # Configuration
│       └── addresses.ts
│
└── frontend/
    ├── src/
    │   ├── app/           # Next.js pages
    │   ├── components/    # React components
    │   ├── hooks/         # Custom hooks
    │   ├── lib/           # Utilities
    │   └── config/       # Frontend config
    └── public/            # Static assets
```

## 🎮 How It Works

### 1. Buy Tickets
- Purchase tickets for 1 USDC each
- Use a referral code to support friends (they get 30% commission)
- 70% goes to jackpot, 30% to referrals

### 2. Daily Drawing
- Every day at midnight UTC, a winner is selected
- Uses Pyth Entropy for provably fair randomness
- Winner receives first payment immediately (1/120th of jackpot)

### 3. Monthly Payouts
- Remaining funds deposited on Aave lending protocol
- Winner can claim monthly payment for 119 months
- Interest generated increases total payout over time

### 4. Social Impact
- Interest from Aave deposits (~$7M annually) funds social projects
- Projects address health, housing, and food crises
- 100% of interest goes to verified social initiatives

## 🔐 Security

- **Provably Fair**: Pyth Entropy provides verifiable randomness
- **Audited Libraries**: Uses OpenZeppelin's battle-tested contracts
- **Reentrancy Protection**: ReentrancyGuard on critical functions
- **Ownable**: Owner-only functions for administrative tasks
- **SafeERC20**: Safe token transfers using OpenZeppelin's SafeERC20

## 🧪 Testing

### Foundry Tests

```bash
# Run all tests
forge test

# Run specific test
forge test --match-test testPythRealRandomNumber

# Run with fork (requires RPC URL)
forge test --fork-url https://sepolia.base.org
```

### Hardhat Tests

```bash
npm test
```

## 📦 Deployment

### Deploy to Base Sepolia

```bash
cd backend

# Using Foundry
forge script script/DeployLottery.s.sol:DeployLotteryScript \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Using Hardhat
npm run deploy:testnet
```

### Deploy to Base Mainnet

```bash
npm run deploy:mainnet
```

## 🌐 Contract Addresses

### Base Sepolia (Testnet)

- **Lottery**: `0x28645Ac9f3FF24f1623CbD65A6D7d9122d6b9a07`
- **Vesting**: `0x7314251E4CEb115fbA106f84BB5B7Ef8a6ABae3E`
- **Pyth Integration**: `0x0f3AcD9aF35f1970A8ceef26dF5484E7C2245840`
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Pyth Entropy**: `0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c`

## 📊 Economic Model

### Revenue Distribution
- **70%** → Jackpot (winner's payout)
- **30%** → Referral rewards (if referrer provided)

### Payout Structure
- **First Payment**: Immediate (1/120th of jackpot)
- **Monthly Payments**: 119 payments over 10 years
- **Interest**: Generated from Aave deposits increases total payout

### Social Impact Funding
- **Source**: Interest from Aave deposits
- **Amount**: ~$7M annually (with 1M USDC daily deposits at 4% APY)
- **Allocation**: 100% to social projects

## 🔗 Integrations

### Pyth Entropy
- **Purpose**: Provably fair random number generation
- **Version**: V2 API
- **Fee**: Dynamic (currently ~0.000022 ETH on Base Sepolia)
- **Pattern**: Callback-based for asynchronous randomness

### Aave V3
- **Purpose**: Lending protocol for generating interest
- **Token**: USDC
- **Benefit**: Winners earn interest on top of monthly payments

### Base Blockchain
- **Network**: Base Sepolia (testnet) / Base Mainnet
- **Benefits**: Low fees, fast transactions, Ethereum compatibility

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License

## 🙏 Acknowledgments

- **Pyth Network** for provably fair randomness
- **Aave** for lending infrastructure
- **Base** for blockchain infrastructure
- **OpenZeppelin** for secure contract libraries

## 📞 Support

For questions or support, please open an issue on GitHub.

---

**The Social Pot** - Where winning meets giving. 🍀

WIN. GIVE. GROW.

