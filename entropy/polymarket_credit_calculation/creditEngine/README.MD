# Credit Score Engine with Pyth Entropy

This module calculates credit scores (0-999) for traders based on their Polymarket trading data, using Pyth Entropy for randomized variance to ensure fairness.

## 📍 Deployed Contract

**Base Sepolia:** `0x2e951d54caD20ff3CeA95bFc79CF11FfC62E0134`

## 🚀 Quick Start

### Calculate Credit Score from JSON

```bash
# Using excellent trader sample data
JSON_FILE=scripts/creditEngine/sampleData/excellentTrader.json npx hardhat run scripts/creditEngine/runCreditScore.ts --network baseSepolia

# Using poor trader sample data
JSON_FILE=scripts/creditEngine/sampleData/poorTrader.json npx hardhat run scripts/creditEngine/runCreditScore.ts --network baseSepolia

# Using average trader sample data
JSON_FILE=scripts/creditEngine/sampleData/averageTrader.json npx hardhat run scripts/creditEngine/runCreditScore.ts --network baseSepolia
```

### Check Existing Score

```bash
# Check the current user's score
npx hardhat run scripts/creditEngine/checkScoreSimple.ts --network baseSepolia
```

## 📊 How Credit Scores are Calculated

The credit score is calculated using multiple factors:

1. **Closed Positions Performance (40% weight)**
   - Win rate
   - Profit/loss ratio
   - Historical trading success

2. **Current Positions Health (30% weight)**
   - Current P&L
   - Position management
   - Risk exposure

3. **Portfolio Value (20% weight)**
   - Total value under management
   - Logarithmic scale for fairness

4. **Trading Activity (10% weight)**
   - Number of trades
   - Market participation

5. **Entropy Variance (±50 points)**
   - Random adjustment using Pyth Entropy
   - Prevents gaming the system
   - Ensures fairness

## 🏆 Score Ratings

| Score Range | Rating | Description |
|-------------|--------|-------------|
| 850-999 | 🌟 EXCEPTIONAL | Top tier trader with excellent track record |
| 750-849 | ✨ EXCELLENT | Very strong trading performance |
| 650-749 | 👍 GOOD | Solid trader with positive results |
| 550-649 | 📊 FAIR | Average trading performance |
| 450-549 | ⚠️ BELOW AVERAGE | Needs improvement |
| 300-449 | ⚡ POOR | Significant losses or low activity |
| 0-299 | 🔴 VERY POOR | High risk profile |

## 📁 JSON Data Format

Create a JSON file with the following structure:

```json
{
  "user": {
    "name": "TraderName",
    "value": "100000"  // Portfolio value in USD
  },
  "closedPositions": [
    {
      "realizedPnl": "50000",  // Profit/loss from closed position
      "totalBought": "100000"  // Amount invested
    }
  ],
  "currentPositions": [
    {
      "size": "50000",
      "avgPrice": "1",
      "initialValue": "50000",
      "currentValue": "55000",
      "cashPnl": "5000",
      "percentPnl": "10",
      "totalBought": "50000",
      "realizedPnl": "0",
      "percentRealizedPnl": "0",
      "curPrice": "1100000"
    }
  ]
}
```

## ⏱️ Performance Metrics

Typical execution times:
- **Data Preparation:** ~0.5-1s
- **Transaction Submission:** ~2-3s
- **Entropy Callback:** ~0.2-4s (varies)
- **Total Time:** ~3-8s

## 🔧 Technical Details

### Smart Contract Features
- Uses Pyth Entropy for verifiable randomness
- Stores scores on-chain with timestamps
- Calculates base score deterministically
- Adds ±50 points variance via entropy
- Supports re-calculation with new data

### Scripts Available

1. **`deployCreditScore.ts`** - Deploy the contract
2. **`runCreditScore.ts`** - Calculate score from JSON data
3. **`checkScoreSimple.ts`** - Check existing scores
4. **`submitPolymarketData.ts`** - Submit hardcoded example data

### Sample Data Files

- **`excellentTrader.json`** - High performing trader (score ~750-850)
- **`averageTrader.json`** - Moderate performance (score ~500-650)
- **`poorTrader.json`** - Poor performance (score ~200-400)

## 🔑 Configuration

The scripts use a hardcoded private key for testing:
```
0x0ab2a1d8d5a410c75b6365c1b544117a960aa4cc3459cf2adfea8cd6fc9e14ce
```

**⚠️ WARNING:** This is for testing only. Never use this key for production or with real funds.

## 📈 Example Output

```
════════════════════════════════════════════════════════════
  ✅ CREDIT SCORE CALCULATION COMPLETE!
════════════════════════════════════════════════════════════

┌──────────────────────────────────────┐
│  📊 FINAL CREDIT SCORE: 791  / 999  │
└──────────────────────────────────────┘

📋 Score Breakdown:
   Base Score (Performance): 763
   Entropy Variance: +28
   ─────────────────────────
   Final Score: 791

✨ Credit Rating: EXCELLENT
   Very strong trading performance

📈 Trading Performance:
   Win Rate: 100.0%
   Total P&L: $770,000
   ROI: 81.5%
```

## 🌐 View on Explorer

View the deployed contract on BaseScan:
https://sepolia.basescan.org/address/0x2e951d54caD20ff3CeA95bFc79CF11FfC62E0134

## 🔮 Pyth Entropy Integration

The contract uses Pyth Entropy for randomness:
- **Entropy Contract:** `0x41c9e39574f40ad34c79f1c99b66a45efb830d4c`
- **Default Provider:** `0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344`
- **Gas Limit:** 500,000
- **Fee:** ~0.000015 ETH per calculation

## 💡 Use Cases

1. **DeFi Lending** - Assess trader creditworthiness
2. **Copy Trading** - Identify successful traders to follow
3. **Risk Assessment** - Evaluate portfolio risk profiles
4. **Gamification** - Create trader leaderboards
5. **Reputation Systems** - Build on-chain reputation