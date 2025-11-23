# 0xSlither Smart Contracts

Smart contracts for the 0xSlither game economy on Saga Chainlet using **native SSS token**.

## Contracts

### StakeArena

Main game contract using native SSS for all staking and rewards:

**Features:**
- **Stake-to-Enter**: Players stake SSS to join matches (payable function)
- **Loot-on-Eat**: Winners receive 100% of eaten players' stakes
- **Tap-Out**: Players can voluntarily exit and withdraw their stake
- **Match Finalization**: Server finalizes matches and updates leaderboards
- **On-Chain Leaderboard**: Top 10 players by best score
- **Entropy Commitment**: Placeholder for Pyth Entropy integration

**Why Native Token?**
- ✅ No ERC20 deployment needed
- ✅ No token approval required (faster UX)
- ✅ Single transaction to stake
- ✅ Uses Saga's native SSS directly

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your private key
```

3. Compile contracts:
```bash
pnpm run compile
```

4. Deploy to Saga Chainlet:
```bash
pnpm run deploy
```

## Environment Variables

```env
# Deployer wallet private key (with SSS for gas)
PRIVATE_KEY=0x...

# After deployment, add:
STAKE_ARENA_ADDRESS=0x...
SERVER_ADDRESS=0x...  # For update-server script
```

## Saga Chainlet Details

- **RPC**: https://slither-2763767854157000-1.jsonrpc.sagarpc.io
- **Explorer**: https://slither-2763767854157000-1.sagaexplorer.io
- **Chain ID**: 2763767854157000
- **Native Token**: SSS (1000 total supply)

## Deployment

### Quick Deploy

```bash
# 1. Set your genesis private key
echo "PRIVATE_KEY=0xYOUR_GENESIS_KEY" > .env

# 2. Deploy
pnpm run deploy

# Output will show:
# StakeArena: 0x...
# Save this address!
```

### Post-Deployment Steps

1. **Save the StakeArena address** in your `.env` files
2. **Authorize your server wallet:**
```bash
echo "SERVER_ADDRESS=0xYOUR_SERVER_WALLET" >> .env
pnpm run update-server
```

3. **Distribute SSS to players:**
   - Use MetaMask or a script to send SSS from genesis account
   - Suggested: 50-100 SSS per player for testing

## Scripts

```bash
pnpm run compile         # Compile contracts
pnpm run deploy          # Deploy to Saga
pnpm run update-server   # Update authorized server address
pnpm run balance <addr>  # Check SSS balance of address
pnpm run leaderboard     # View on-chain leaderboard
```

## Contract Functions

### Player Functions
- `enterMatch(bytes32 matchId) payable` - Stake SSS to enter
- `tapOut(bytes32 matchId)` - Exit match and withdraw stake

### Server Functions (requires authorization)
- `reportEat(bytes32 matchId, address eater, address eaten)` - Transfer loot
- `commitEntropy(bytes32 matchId, bytes32 entropyId)` - Commit entropy seed
- `finalizeMatch(bytes32 matchId, address[] players, uint256[] scores, address winner)` - Finalize match

### View Functions
- `getLeaderboard()` - Get top 10 players
- `bestScore(address player)` - Get player's best score
- `getStake(bytes32 matchId, address player)` - Get player's current stake
- `isActive(bytes32 matchId, address player)` - Check if player is active
- `getMatchSummary(bytes32 matchId)` - Get match details

## Events

- `Entered(bytes32 matchId, address player, uint256 amount)`
- `EatLoot(bytes32 matchId, address eater, address eaten, uint256 amount, uint256 timestamp)`
- `TappedOut(bytes32 matchId, address player, uint256 amount)`
- `EntropyCommitted(bytes32 matchId, bytes32 entropyRequestId)`
- `MatchFinalized(bytes32 matchId, address winner, uint256 timestamp)`
- `BestScoreUpdated(address player, uint256 newScore)`

## Token Economics

**Total Supply:** 1000 SSS (fixed, cannot mint more)

## Security

- ✅ ReentrancyGuard on all state-changing functions
- ✅ Access control (onlyOwner, onlyAuthorizedServer)
- ✅ Safe native transfers with `call{value}`
- ✅ Input validation
- ✅ No unchecked math (Solidity 0.8.20)

## Future Extensions

The contract is designed to support:
- NFT cosmetic skins (ERC721)
- Saga Dollar prize pools
- MatchManager lifecycle contract
- Pyth Entropy randomness
- ROFL enclave verification

## Examples

### Deploy and Configure

```bash
# Deploy
pnpm run deploy
# Output: StakeArena: 0xABC123...

# Check balance
pnpm run balance 0x027dc86AEFE8aa96353c2aeE9FF06d3BE4ff40Eb
# Output: Balance: 1000 SSS

# Authorize server
echo "SERVER_ADDRESS=0xDEF456..." >> .env
pnpm run update-server

# View leaderboard
pnpm run leaderboard
```

### Player Flow (via MetaMask)

1. Connect wallet to Saga Chainlet
2. Ensure you have SSS (receive from someone)
3. Call `enterMatch(matchId)` with SSS value
4. Play the game!
5. Either win more SSS or tap out to withdraw

### Server Flow

1. Detect kill in game
2. Call `reportEat(matchId, killerAddress, victimAddress)`
3. Loot automatically transferred on-chain
4. At match end, call `finalizeMatch()`

## Troubleshooting

**"Insufficient balance"**
- Make sure your wallet has SSS
- Get SSS from the genesis account

**"Only authorized server"**
- Run `pnpm run update-server` to authorize your server wallet
- Verify with: Check `authorizedServer` on contract

**"Transfer failed"**
- Ensure contract has enough SSS for withdrawals
- Check transaction on Saga Explorer

## Links

- **Saga Docs**: https://docs.saga.xyz
- **Block Explorer**: https://slither-2763767854157000-1.sagaexplorer.io
- **Project Repo**: (your repo link)

---

**Built for ETHGlobal Buenos Aires 2025** 🇦🇷
