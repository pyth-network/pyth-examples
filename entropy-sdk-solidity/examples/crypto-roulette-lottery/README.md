# 🎰 Crypto Roulette & Daily Lottery

> **Pyth Entropy Pool Prize Submission - ETH Global Buenos Aires 2024**

**Verifiable On-Chain Randomness Powered by Pyth Entropy V2**

![Solidity](https://img.shields.io/badge/Solidity-0.8.13-363636?style=flat&logo=solidity)
![Optimism Sepolia](https://img.shields.io/badge/Network-Optimism%20Sepolia-red?style=flat)
![Foundry](https://img.shields.io/badge/Built%20with-Foundry-orange?style=flat)

---

## 🎯 Pyth Entropy Pool Prize Submission

**Project:** Crypto Roulette & Daily Lottery  
**Network:** Optimism Sepolia (Chain ID: 11155420)  
**Status:** ✅ Deployed, Verified, and Fully Functional

**Deployed Contracts:**
- **CryptoRoulette**: [`0x19aab2239911164c9051ccaed184102a10d7121f`](https://sepolia-optimism.etherscan.io/address/0x19aab2239911164c9051ccaed184102a10d7121f)
- **DailyLottery**: [`0x5149cc9f6c3a4b60cfa84125161e96b0cf677eb4`](https://sepolia-optimism.etherscan.io/address/0x5149cc9f6c3a4b60cfa84125161e96b0cf677eb4)
- **Pyth Entropy**: [`0x4821932D0CDd71225A6d914706A621e0389D7061`](https://sepolia-optimism.etherscan.io/address/0x4821932D0CDd71225A6d914706A621e0389D7061)

**Innovation Highlight:** This project demonstrates the versatility of Pyth Entropy V2 by implementing **TWO distinct randomness consumption patterns** in a single interconnected gaming ecosystem: high-frequency roulette spins and periodic lottery draws.

---

## 📖 Project Overview

**Crypto Roulette & Daily Lottery** is an innovative decentralized gaming platform that combines two games powered entirely by Pyth Entropy V2 for verifiable on-chain randomness.

### The Games

1. **🎲 Crypto Roulette**: Players guess which cryptocurrency (BTC, ETH, SOL, AVAX, or DOGE) will be randomly selected
   - 20% win probability (1 in 5 chance)
   - Winners automatically qualify for the daily lottery
   - All ticket prices fund the daily lottery pool

2. **🎁 Daily Lottery**: Exclusive lottery where only roulette winners can participate
   - Winner-takes-all daily prize pool
   - Random winner selected from whitelist of roulette winners
   - Owner-triggered draws at end of each day

### Why This Is Innovative

Unlike traditional single-game implementations, this project creates an **interconnected gaming economy**:
- Two different smart contracts sharing randomness infrastructure
- Two distinct use cases for Pyth Entropy (continuous + periodic)
- Sustainable game loop: losers fund the pool, winners compete for prizes
- Real-world gaming mechanics powered by verifiable randomness

---

## 🔮 Pyth Entropy V2 Integration

### Why Pyth Entropy?

We chose Pyth Entropy V2 for its:
- **Verifiable Randomness**: Cryptographically secure and unpredictable
- **On-Chain Native**: Numbers generated and verified entirely on-chain
- **Permissionless**: Anyone can request random numbers
- **Low Latency**: Fast callback mechanism (~5-30 seconds)
- **Battle-Tested**: Audited and used by major DeFi protocols

### Implementation Pattern: Two-Step Randomness

Both contracts follow Pyth's secure two-step pattern:

#### Pattern Flow:
```
1. Request Phase: Contract calls entropy.requestV2() → Emits event
2. Callback Phase: Pyth calls entropyCallback() with verified random number
```

This prevents:
- ❌ Front-running attacks
- ❌ Result manipulation
- ❌ Transaction reversion exploits
- ❌ Block hash prediction

---

## 💡 Innovation: Dual Randomness Patterns

### Pattern 1: High-Frequency Randomness (CryptoRoulette)

**Use Case:** Instant gameplay with continuous player interactions

**Implementation:**

```solidity
// Player initiates spin
function spinRoulette(Asset _guess) external payable {
    uint128 entropyFee = entropy.getFeeV2();
    require(msg.value >= entropyFee + ticketPrice, "Insufficient payment");
    
    // Request random number from Pyth Entropy
    uint64 sequenceNumber = entropy.requestV2{ value: entropyFee }();
    
    // Store spin request
    spins[sequenceNumber] = SpinRequest({
        player: msg.sender,
        guessedAsset: _guess,
        day: currentDay,
        fulfilled: false,
        resultAsset: Asset.BTC,
        won: false
    });
    
    emit SpinRequested(msg.sender, sequenceNumber, _guess, currentDay);
}

// Pyth Entropy calls back with random result
function entropyCallback(
    uint64 sequenceNumber,
    address,
    bytes32 randomNumber
) internal override {
    SpinRequest storage spin = spins[sequenceNumber];
    require(!spin.fulfilled, "Already fulfilled");
    
    // Use random number to determine outcome (0-4 for 5 assets)
    uint256 randomIndex = uint256(randomNumber) % 5;
    Asset resultAsset = Asset(randomIndex);
    
    bool won = (resultAsset == spin.guessedAsset);
    
    spin.resultAsset = resultAsset;
    spin.won = won;
    spin.fulfilled = true;
    
    // Winner joins lottery whitelist
    if (won) {
        lotteryContract.addToWhitelist(spin.player, spin.day);
    }
    
    // Ticket price always goes to lottery pool
    lotteryContract.addToPool{ value: ticketPrice }(spin.day);
    
    emit SpinCompleted(sequenceNumber, spin.player, resultAsset, won);
}
```

**Key Features:**
- Continuous, player-initiated randomness
- Each spin is independent
- Real-time gameplay experience
- Demonstrates Pyth Entropy for gaming

---

### Pattern 2: Periodic Randomness (DailyLottery)

**Use Case:** Scheduled, high-stakes winner selection

**Implementation:**

```solidity
// Owner triggers daily draw
function startDailyDraw(uint256 day) external payable onlyOwner {
    require(!dayCompleted[day], "Day already completed");
    require(dailyWhitelist[day].length > 0, "Whitelist empty");
    require(dailyPool[day] > 0, "Pool empty");
    
    // Request random number for winner selection
    uint128 entropyFee = entropy.getFeeV2();
    require(msg.value >= entropyFee, "Insufficient entropy fee");
    
    uint64 sequenceNumber = entropy.requestV2{ value: entropyFee }();
    
    draws[sequenceNumber] = DrawRequest({
        day: day,
        fulfilled: false,
        winner: address(0),
        prize: dailyPool[day]
    });
    
    emit DrawRequested(
        day,
        sequenceNumber,
        dailyWhitelist[day].length,
        dailyPool[day]
    );
}

// Pyth Entropy calls back to select winner
function entropyCallback(
    uint64 sequenceNumber,
    address,
    bytes32 randomNumber
) internal override {
    DrawRequest storage draw = draws[sequenceNumber];
    require(!draw.fulfilled, "Already fulfilled");
    
    address[] storage whitelist = dailyWhitelist[draw.day];
    
    // Use random number to pick winner from whitelist
    uint256 winnerIndex = uint256(randomNumber) % whitelist.length;
    address winner = whitelist[winnerIndex];
    
    // Transfer prize to winner
    (bool success, ) = winner.call{ value: draw.prize }("");
    require(success, "Transfer failed");
    
    draw.winner = winner;
    draw.fulfilled = true;
    dayCompleted[draw.day] = true;
    
    emit WinnerSelected(draw.day, winner, draw.prize);
}
```

**Key Features:**
- Periodic, admin-triggered randomness
- High-stakes winner selection
- Fair distribution from whitelist
- Demonstrates Pyth Entropy for lotteries

---

## 🏗️ Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         PLAYER                               │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   1. PLAY ROULETTE                           │
│  • Select crypto asset (BTC/ETH/SOL/AVAX/DOGE)              │
│  • Pay: Entropy Fee + Ticket Price                         │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              CRYPTOROULETTE CONTRACT                         │
│  • Calls: entropy.requestV2()                               │
│  • Stores: SpinRequest with player guess                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   PYTH ENTROPY V2                            │
│  • Generates secure random number                           │
│  • Calls back: entropyCallback()                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│         2. ROULETTE RESULT DETERMINED                        │
│  • Random % 5 = Winning asset                               │
│  • If WIN: Add to lottery whitelist                         │
│  • Always: Add ticket to lottery pool                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  DAILYLOTTERY CONTRACT                       │
│  • Accumulates prize pool from tickets                      │
│  • Maintains whitelist of roulette winners                  │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│            3. DAILY DRAW (Owner Triggered)                   │
│  • Owner calls: startDailyDraw()                            │
│  • Calls: entropy.requestV2()                               │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   PYTH ENTROPY V2                            │
│  • Generates secure random number                           │
│  • Calls back: entropyCallback()                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              4. LOTTERY WINNER SELECTED                      │
│  • Random % whitelist.length = Winner index                 │
│  • Transfer entire pool to winner                           │
│  • Mark day as completed                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📜 Smart Contracts

### CryptoRoulette.sol

**Purpose:** Manages roulette game with 5 crypto assets

**Key Functions:**
- `spinRoulette(Asset _guess)`: Player initiates spin
- `entropyCallback()`: Receives random result from Pyth
- `getEntropyFee()`: Returns current Pyth fee
- `getTotalSpinCost()`: Returns total cost (entropy + ticket)

**Events:**
- `SpinRequested(address player, uint64 sequenceNumber, Asset guess, uint256 day)`
- `SpinCompleted(uint64 sequenceNumber, address player, Asset result, bool won)`

### DailyLottery.sol

**Purpose:** Manages daily lottery with whitelist-based entry

**Key Functions:**
- `addToWhitelist(address player, uint256 day)`: Adds roulette winner (roulette-only)
- `addToPool(uint256 day)`: Adds funds to prize pool (roulette-only)
- `startDailyDraw(uint256 day)`: Initiates random winner selection (owner-only)
- `entropyCallback()`: Receives random result and selects winner
- `emergencyWithdraw(uint256 day)`: Emergency fund recovery (owner-only)

**Events:**
- `PlayerWhitelisted(address player, uint256 day)`
- `PoolIncreased(uint256 day, uint256 amount, uint256 newTotal)`
- `DrawRequested(uint256 day, uint64 sequenceNumber, uint256 whitelistSize, uint256 poolAmount)`
- `WinnerSelected(uint256 day, address winner, uint256 prize)`

### IDailyLottery.sol

**Purpose:** Interface for cross-contract communication

---

## 🚀 Deployment

### Prerequisites

- Foundry installed
- Optimism Sepolia ETH for deployment
- Keystore account configured

### Deploy Script

The `DeployCryptoRoulette.s.sol` script deploys both contracts and links them:

```solidity
function run() external ScaffoldEthDeployerRunner {
    // Pyth Entropy on Optimism Sepolia
    address entropyAddress = 0x4821932D0CDd71225A6d914706A621e0389D7061;
    uint256 ticketPrice = 0.001 ether;

    // Deploy DailyLottery
    DailyLottery lottery = new DailyLottery(entropyAddress, address(0));
    
    // Deploy CryptoRoulette
    CryptoRoulette roulette = new CryptoRoulette(
        entropyAddress,
        address(lottery),
        ticketPrice
    );
    
    // Link contracts
    lottery.setRouletteContract(address(roulette));
}
```

### Deployment Commands

```bash
# Deploy to Optimism Sepolia
forge script script/DeployCryptoRoulette.s.sol \
  --rpc-url https://sepolia.optimism.io \
  --account deployer \
  --broadcast \
  --verify

# Verify contracts
forge verify-contract <CONTRACT_ADDRESS> \
  src/CryptoRoulette.sol:CryptoRoulette \
  --chain optimism-sepolia \
  --constructor-args $(cast abi-encode "constructor(address,address,uint256)" \
    0x4821932D0CDd71225A6d914706A621e0389D7061 \
    <LOTTERY_ADDRESS> \
    1000000000000000)
```

---

## 🛠️ Tech Stack

- **Solidity**: v0.8.13
- **Pyth Entropy SDK**: V2
- **Foundry**: Development & deployment framework
- **Scaffold-ETH 2**: Full-stack dApp framework
- **Next.js**: React framework for frontend
- **RainbowKit**: Wallet connection
- **Wagmi**: Ethereum React hooks
- **Optimism Sepolia**: L2 testnet deployment

---

## ✨ Key Features

### 🎯 Provably Fair Randomness
Every outcome is determined by Pyth Entropy's verifiable random numbers. No one can predict or manipulate results.

### 🔗 Interconnected Game Economy
Roulette and lottery work together: ticket prices fund the pool, only winners can win the lottery.

### 🔍 Transparent On-Chain Results
All spins, results, and lottery draws are recorded with events. Anyone can verify fairness.

### 💰 Winner-Takes-All Mechanism
Entire daily pool goes to one lucky winner, creating exciting high-stakes gameplay.

### 🛡️ Security First
- Owner-controlled lottery draws
- Emergency withdrawal functions
- Reentrancy protection
- Day completion tracking

---

## 🎮 How It Works

### For Players

1. **Connect wallet** to the dApp
2. **Play roulette**: Choose an asset and spin
3. **Wait for result**: Pyth Entropy determines outcome (~5-30 seconds)
4. **If you win**: Automatically added to today's lottery
5. **Daily draw**: Owner triggers at end of day
6. **Winner selected**: Pyth Entropy randomly picks one winner
7. **Prize transferred**: Winner receives entire pool automatically

### For Operators

1. **Monitor daily pool**: Check accumulated prizes
2. **Trigger draw**: Call `startDailyDraw(day)` at end of day
3. **Pay entropy fee**: Include Pyth's fee with transaction
4. **Winner selected**: Pyth Entropy handles selection
5. **Funds distributed**: Winner receives prize automatically

---

## 📊 Innovation Highlights

### 🌟 Dual Randomness Patterns

Most examples show **one** use case for Pyth Entropy. We demonstrate **two distinct patterns**:
1. High-frequency, player-initiated (roulette)
2. Periodic, admin-triggered (lottery)

This showcases Pyth Entropy's versatility across different gaming mechanics.

### 🎰 Interconnected Economy

Unlike standalone games, we've created a **sustainable gaming ecosystem**:
- Roulette losers contribute to lottery pool
- Only skilled/lucky players compete for big prizes
- Creates sustained engagement and excitement

### 🏆 Production-Ready

This isn't just a proof-of-concept:
- ✅ Deployed and verified on Optimism Sepolia
- ✅ Full frontend with Scaffold-ETH 2
- ✅ Comprehensive event logging
- ✅ Emergency functions for edge cases
- ✅ Real-world game mechanics

---

## 🔒 Security Considerations

### Randomness Security
- Pyth Entropy V2 provides cryptographically secure randomness
- Two-step pattern prevents manipulation
- Results cannot be predicted before commitment

### Access Control
- Owner-only: `startDailyDraw`, `emergencyWithdraw`, `setRouletteContract`
- Contract-only: `addToWhitelist`, `addToPool` (only roulette can call)
- No user funds controllable by owner

### State Management
- Day completion tracking prevents double draws
- Sequence number mapping prevents replay attacks
- Fulfilled flags prevent double processing

### Emergency Functions
- `emergencyWithdraw`: Allows recovery of unclaimed prizes
- Only callable for completed days
- Prevents permanent fund locking

---

## 📁 Repository Structure

```
crypto-roulette-lottery/
├── README.md (this file)
├── DEPLOYMENT.md (deployment guide)
├── contracts/
│   ├── CryptoRoulette.sol (roulette game contract)
│   ├── DailyLottery.sol (lottery contract)
│   └── interfaces/
│       └── IDailyLottery.sol (interface)
└── script/
    └── DeployCryptoRoulette.s.sol (deployment script)
```

---

## 🔗 Links

### Deployed Contracts
- [CryptoRoulette on Etherscan](https://sepolia-optimism.etherscan.io/address/0x19aab2239911164c9051ccaed184102a10d7121f)
- [DailyLottery on Etherscan](https://sepolia-optimism.etherscan.io/address/0x5149cc9f6c3a4b60cfa84125161e96b0cf677eb4)

### Documentation
- [Pyth Entropy Documentation](https://docs.pyth.network/entropy)
- [Scaffold-ETH 2 Docs](https://docs.scaffoldeth.io)
- [Foundry Book](https://book.getfoundry.sh)

### Project Links
- **Full Repository**: [Add your repo URL]
- **Live Demo**: [Add your demo URL]
- **Video Demo**: [Add if available]

---

## 🏆 Built For

**ETH Global Buenos Aires Hackathon 2024**
- Track: DeFi / Gaming
- Prize: Pyth Entropy Pool Prize ($5,000)

This project qualifies for the Pyth Entropy Pool Prize by:
- ✅ Using Pyth Entropy to generate random numbers on-chain
- ✅ Consuming random numbers in smart contracts
- ✅ Demonstrating innovative use of Pyth Entropy V2
- ✅ Production-ready deployment on Optimism Sepolia
- ✅ Comprehensive documentation and code

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **Pyth Network** for providing industry-leading on-chain randomness
- **ETH Global** for hosting an incredible hackathon
- **Optimism** for providing a fast, low-cost L2 environment
- **Scaffold-ETH 2** team for the amazing dApp framework

---

<div align="center">

**⚡ Powered by Pyth Entropy V2 | Built with ❤️ for ETH Global Buenos Aires ⚡**

</div>

