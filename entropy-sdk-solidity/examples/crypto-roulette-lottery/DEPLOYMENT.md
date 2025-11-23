# 🚀 Deployment Guide

Complete guide for deploying Crypto Roulette & Daily Lottery contracts.

---

## Prerequisites

### Required Tools

1. **Foundry** - Ethereum development toolkit
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Git** - Version control
   ```bash
   git --version
   ```

3. **Node.js** (optional, for frontend)
   ```bash
   node --version  # Should be >= v20.18.3
   ```

### Required Accounts

1. **Deployer Wallet** with testnet ETH
2. **RPC URL** for target network
3. **Etherscan API Key** (for verification)

---

## Network Configuration

### Optimism Sepolia (Current Deployment)

| Parameter | Value |
|-----------|-------|
| **Chain ID** | 11155420 |
| **RPC URL** | https://sepolia.optimism.io |
| **Explorer** | https://sepolia-optimism.etherscan.io |
| **Pyth Entropy** | `0x4821932D0CDd71225A6d914706A621e0389D7061` |
| **Currency** | ETH |

### Get Testnet ETH

1. Visit [Optimism Sepolia Faucet](https://www.optimism.io/faucet)
2. Enter your deployer address
3. Request test ETH

---

## Step-by-Step Deployment

### 1. Set Up Project

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/pyth-examples.git
cd pyth-examples/entropy-sdk-solidity/examples/crypto-roulette-lottery

# Install dependencies (if using Foundry project)
forge install
```

### 2. Configure Environment

Create a `.env` file:

```bash
# Network Configuration
RPC_URL=https://sepolia.optimism.io
CHAIN_ID=11155420

# Etherscan (for verification)
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Deployment Parameters
ENTROPY_ADDRESS=0x4821932D0CDd71225A6d914706A621e0389D7061
TICKET_PRICE=1000000000000000  # 0.001 ETH in wei
```

### 3. Set Up Deployer Account

**Option A: Using Foundry Keystore (Recommended)**

```bash
# Create encrypted keystore
cast wallet import deployer --interactive

# You'll be prompted for:
# 1. Your private key
# 2. A password to encrypt it

# Your keystore is now saved securely
```

**Option B: Using Private Key (Less Secure)**

```bash
# Add to .env file
PRIVATE_KEY=your_private_key_here
```

### 4. Verify Pyth Entropy Address

Confirm Pyth Entropy is deployed on your target network:

```bash
# Check if contract exists
cast code 0x4821932D0CDd71225A6d914706A621e0389D7061 \
  --rpc-url https://sepolia.optimism.io

# Should return bytecode if deployed
```

**Pyth Entropy Addresses by Network:**

| Network | Address |
|---------|---------|
| Optimism Sepolia | `0x4821932D0CDd71225A6d914706A621e0389D7061` |
| Optimism Mainnet | `0x4374e5a8b9C22271E9EB878A2AA31DE97DF15DAF` |
| Ethereum Sepolia | `0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c` |

For other networks, check [Pyth Documentation](https://docs.pyth.network/entropy/contract-addresses).

### 5. Deploy Contracts

**Using the Deployment Script:**

```bash
# Deploy to Optimism Sepolia
forge script script/DeployCryptoRoulette.s.sol \
  --rpc-url $RPC_URL \
  --account deployer \
  --broadcast \
  --verify

# You'll be prompted for your keystore password
```

**Manual Deployment (Alternative):**

```bash
# 1. Deploy DailyLottery
forge create contracts/DailyLottery.sol:DailyLottery \
  --rpc-url $RPC_URL \
  --account deployer \
  --constructor-args $ENTROPY_ADDRESS 0x0000000000000000000000000000000000000000

# Note the deployed address: LOTTERY_ADDRESS

# 2. Deploy CryptoRoulette
forge create contracts/CryptoRoulette.sol:CryptoRoulette \
  --rpc-url $RPC_URL \
  --account deployer \
  --constructor-args $ENTROPY_ADDRESS $LOTTERY_ADDRESS $TICKET_PRICE

# Note the deployed address: ROULETTE_ADDRESS

# 3. Link contracts
cast send $LOTTERY_ADDRESS \
  "setRouletteContract(address)" $ROULETTE_ADDRESS \
  --rpc-url $RPC_URL \
  --account deployer
```

### 6. Verify Contracts on Etherscan

**CryptoRoulette:**

```bash
forge verify-contract $ROULETTE_ADDRESS \
  contracts/CryptoRoulette.sol:CryptoRoulette \
  --chain optimism-sepolia \
  --constructor-args $(cast abi-encode "constructor(address,address,uint256)" \
    $ENTROPY_ADDRESS \
    $LOTTERY_ADDRESS \
    $TICKET_PRICE) \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

**DailyLottery:**

```bash
forge verify-contract $LOTTERY_ADDRESS \
  contracts/DailyLottery.sol:DailyLottery \
  --chain optimism-sepolia \
  --constructor-args $(cast abi-encode "constructor(address,address)" \
    $ENTROPY_ADDRESS \
    $ROULETTE_ADDRESS) \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

---

## Post-Deployment Verification

### 1. Check Contract State

```bash
# Get current day
cast call $ROULETTE_ADDRESS "getCurrentDay()(uint256)" \
  --rpc-url $RPC_URL

# Get ticket price
cast call $ROULETTE_ADDRESS "ticketPrice()(uint256)" \
  --rpc-url $RPC_URL

# Get total spin cost (entropy fee + ticket)
cast call $ROULETTE_ADDRESS "getTotalSpinCost()(uint256)" \
  --rpc-url $RPC_URL

# Get lottery contract address
cast call $ROULETTE_ADDRESS "lotteryContract()(address)" \
  --rpc-url $RPC_URL

# Get roulette contract address in lottery
cast call $LOTTERY_ADDRESS "rouletteContract()(address)" \
  --rpc-url $RPC_URL
```

### 2. Verify Pyth Entropy Fee

```bash
# Get current Pyth Entropy fee
cast call $ENTROPY_ADDRESS "getFeeV2()(uint128)" \
  --rpc-url $RPC_URL

# Should return fee in wei (typically ~0.0001 ETH = 100000000000000)
```

### 3. Test Functionality

**Test a Roulette Spin:**

```bash
# Get total cost
TOTAL_COST=$(cast call $ROULETTE_ADDRESS "getTotalSpinCost()(uint256)" --rpc-url $RPC_URL)

# Spin roulette (guess = 0 for BTC)
cast send $ROULETTE_ADDRESS \
  "spinRoulette(uint8)" 0 \
  --value $TOTAL_COST \
  --rpc-url $RPC_URL \
  --account deployer

# Wait ~10-30 seconds for Pyth callback
# Check events on Etherscan to see result
```

---

## Deployment Costs

Approximate gas costs on Optimism Sepolia:

| Action | Gas Used | Cost (at 0.001 Gwei) |
|--------|----------|----------------------|
| Deploy DailyLottery | ~2,500,000 | ~$0.005 |
| Deploy CryptoRoulette | ~3,000,000 | ~$0.006 |
| setRouletteContract | ~50,000 | ~$0.0001 |
| **Total Deployment** | **~5,550,000** | **~$0.011** |

Plus:
- Verification: Free
- Test spin: ~150,000 gas + Entropy fee

---

## Configuration Options

### Adjust Ticket Price

To change the ticket price after deployment:

**Note:** Ticket price is immutable. To change it, you must redeploy.

When redeploying, modify `DeployCryptoRoulette.s.sol`:

```solidity
uint256 ticketPrice = 0.002 ether; // Change this value
```

### Change Network

To deploy on a different network:

1. **Update Entropy Address** in deployment script
2. **Update RPC URL** in environment
3. **Get testnet/mainnet currency**
4. **Update verification chain**

Example for Ethereum Sepolia:

```bash
# .env
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ENTROPY_ADDRESS=0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c

# Deployment
forge script script/DeployCryptoRoulette.s.sol \
  --rpc-url $RPC_URL \
  --account deployer \
  --broadcast

# Verification
forge verify-contract $ADDRESS \
  contracts/CryptoRoulette.sol:CryptoRoulette \
  --chain sepolia \
  --constructor-args $ARGS
```

---

## Troubleshooting

### Issue: "Insufficient funds for gas"

**Solution:** Ensure deployer account has enough ETH for gas + deployment

```bash
# Check balance
cast balance $YOUR_ADDRESS --rpc-url $RPC_URL

# Get ETH from faucet if needed
```

### Issue: "Invalid entropy address"

**Solution:** Verify Pyth Entropy is deployed on your network

```bash
# Check if contract exists
cast code $ENTROPY_ADDRESS --rpc-url $RPC_URL

# If returns 0x, Pyth Entropy is not deployed on this network
```

### Issue: "Verification failed"

**Solution:** Ensure constructor args match exactly

```bash
# Get constructor args from deployment logs
# Encode them properly with cast abi-encode

cast abi-encode "constructor(address,address,uint256)" \
  0x4821... \
  0x5149... \
  1000000000000000
```

### Issue: "Pyth callback not arriving"

**Possible causes:**
1. Pyth providers not active on testnet
2. Insufficient entropy fee sent
3. Network congestion

**Solution:**
```bash
# Check if entropy fee was sent correctly
# View transaction on explorer
# Wait up to 60 seconds for callback

# If still failing, check Pyth status:
# https://status.pyth.network
```

---

## Production Deployment Checklist

Before deploying to mainnet:

- [ ] **Audit contracts** (get professional audit)
- [ ] **Test extensively** on testnet
- [ ] **Verify Pyth Entropy** address for mainnet
- [ ] **Set appropriate** ticket price
- [ ] **Fund deployer** account with sufficient ETH
- [ ] **Backup private key** securely
- [ ] **Prepare emergency** procedures
- [ ] **Set up monitoring** for events
- [ ] **Document contract** addresses
- [ ] **Verify contracts** on Etherscan
- [ ] **Test with small** amounts first

---

## Deployed Contracts (Optimism Sepolia)

Current production deployment:

- **CryptoRoulette**: [`0x19aab2239911164c9051ccaed184102a10d7121f`](https://sepolia-optimism.etherscan.io/address/0x19aab2239911164c9051ccaed184102a10d7121f)
- **DailyLottery**: [`0x5149cc9f6c3a4b60cfa84125161e96b0cf677eb4`](https://sepolia-optimism.etherscan.io/address/0x5149cc9f6c3a4b60cfa84125161e96b0cf677eb4)
- **Pyth Entropy**: [`0x4821932D0CDd71225A6d914706A621e0389D7061`](https://sepolia-optimism.etherscan.io/address/0x4821932D0CDd71225A6d914706A621e0389D7061)

Deployed: November 23, 2024  
Block: 36038675  
Ticket Price: 0.001 ETH

---

## Support

For deployment issues:

- **Pyth Entropy Docs**: https://docs.pyth.network/entropy
- **Foundry Book**: https://book.getfoundry.sh
- **Optimism Docs**: https://docs.optimism.io

---

## License

MIT License - See main README for details

