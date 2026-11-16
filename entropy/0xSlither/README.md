# 🎮 0xSlither

A real-time multiplayer snake game with a complete on-chain economy powered by blockchain technology.

**Built for ETHGlobal Buenos Aires 2025** 🇦🇷

[![Play Now](https://img.shields.io/badge/🎮_Play_Now-0xslither.vercel.app-success?style=for-the-badge)](https://0xslither.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**🔴 LIVE NOW**: [https://0xslither.vercel.app](https://0xslither.vercel.app)

---

## 🌟 What is 0xSlither?

0xSlither is a multiplayer snake game where players stake tokens to enter matches and winners collect the stakes of players they eliminate. Every match uses cryptographically verifiable randomness for fair spawn positions and pellet placement. All game results, stakes, and leaderboards are stored permanently on-chain.

**🚀 Fully Deployed & Production Ready**
- **Frontend**: Hosted on Vercel
- **Game Server**: Hosted on Fluence CPU (decentralized compute)
- **Smart Contracts**: Deployed on Saga Chainlet & Base Sepolia

### 🎯 Core Features

#### Gameplay
- **Real-time Multiplayer**: Authoritative 20 TPS server with WebSocket communication
- **Ultra-Smooth Movement**: 60 FPS rendering with advanced interpolation
- **Dynamic Growth System**: Eat pellets to grow (growth proportional to pellet size)
- **Precise Collision Detection**: Snake-to-snake collisions and pellet consumption
- **Responsive Camera**: Smooth camera following with easing

#### Blockchain Economy
- **Stake-to-Enter**: Players stake SSS tokens to join matches
- **Winner Takes All**: Collect 100% of eliminated players' stakes
- **Tap-Out Anytime**: Exit safely and withdraw your current stake
- **On-Chain Leaderboard**: Top players tracked permanently on [Saga Explorer](https://slither-2763767854157000-1.sagaexplorer.io/txs)
- **Match Finalization**: Results and best scores stored on-chain
- **Auto Network Config**: MetaMask automatically configured (no manual setup!)

#### Fair Randomness (Pyth Entropy)
- **Cryptographically Secure RNG**: Powered by [Pyth Entropy on Base Sepolia](https://sepolia.basescan.org/address/0x662371163C3797b66ab80dCB592761718537F492)
- **Cross-Chain Architecture**: Bridges randomness between Base Sepolia (entropy) and Saga (game)
- **Deterministic Gameplay**: Single on-chain seed generates all match-critical random values
- **Provable Fairness**: Spawn positions, colors, and pellet layouts derived from verifiable entropy
- **Reproducible Matches**: Same seed + player roster = identical match conditions
- **On-Chain Verification**: Match seed hash committed to blockchain for auditability

---

## 🚀 Quick Start

### 🎮 Play Online Now

**Visit [0xslither.vercel.app](https://0xslither.vercel.app)** and start playing immediately!

1. Open [https://0xslither.vercel.app](https://0xslither.vercel.app)
2. Connect your MetaMask wallet (optional)
3. Enter your name
4. Stake SSS tokens or play for free
5. Start eating and growing!

> **Server**: Running on Fluence CPU (decentralized compute platform)  
> **Frontend**: Hosted on Vercel  
> **Blockchain**: Saga Chainlet + Base Sepolia

### 🔧 Run Locally (For Development)

Want to modify the code or run your own instance?

```bash
# Install dependencies
pnpm install

# Start server and client
pnpm run dev
```

Open http://localhost:3000 to play your local version.

---

## 📋 Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** package manager ([Install](https://pnpm.io/installation))
- **MetaMask** browser extension (for blockchain features)
- **Test tokens** (SSS for Saga, ETH for Base Sepolia - see [Getting Test Tokens](#getting-test-tokens))

---

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/0xSlither.git
cd 0xSlither
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs dependencies for all workspaces (server, client, shared, contracts).

### 3. Start the Game

```bash
pnpm run dev
```

This starts:
- Game server on **port 8080** (WebSocket)
- Web client on **port 3000** (HTTP)

### 4. Play!

Open http://localhost:3000 in your browser.

---

## 🎮 How to Play

**Live Game**: [0xslither.vercel.app](https://0xslither.vercel.app)

1. **Connect Wallet** (optional - only for staking features)
2. **Enter Your Name**
3. **Stake SSS Tokens** or click "Play" to play for free
4. **Move Mouse** to control your snake's direction
5. **Eat Pellets** to grow bigger
6. **Avoid Other Snakes** - hitting their body kills you!
7. **Eliminate Others** to collect their stakes
8. **Tap Out** anytime to safely exit and withdraw

---

## 🌐 Production Deployment

0xSlither is fully deployed and running in production:

| Component | Platform | URL/Details |
|-----------|----------|-------------|
| **Frontend** | Vercel | [0xslither.vercel.app](https://0xslither.vercel.app) |
| **Game Server** | Fluence CPU | Decentralized compute platform |
| **Smart Contracts** | Saga Chainlet | [View on Explorer](https://slither-2763767854157000-1.sagaexplorer.io/txs) |
| **Randomness Oracle** | Base Sepolia | [View Contract](https://sepolia.basescan.org/address/0x662371163C3797b66ab80dCB592761718537F492) |

### Why Fluence CPU?

Fluence CPU provides decentralized compute infrastructure, ensuring:
- ✅ No single point of failure
- ✅ Censorship resistance
- ✅ Transparent execution
- ✅ Perfect fit for Web3 gaming

---

## ⛓️ Blockchain Architecture

### Multi-Chain Setup

0xSlither uses a dual-chain architecture:

1. **Saga Chainlet** (Primary Game Chain)
   - Dedicated EVM L1 with recycled gas fees
   - Hosts the main game contract (`StakeArena`)
   - Handles staking, leaderboards, and match results
   - Uses native SSS tokens

2. **Base Sepolia** (Randomness Chain)
   - L2 testnet hosting Pyth Entropy oracle
   - Provides cryptographically secure randomness
   - Server bridges entropy from Base to Saga

### Getting Test Tokens

#### Saga Chainlet SSS Tokens
1. Add Saga Chainlet to MetaMask (automatic via the game UI)
2. Get SSS tokens from the [Saga Faucet](https://faucet.saga.xyz/) or ask in Discord

#### Base Sepolia ETH
1. Add Base Sepolia to MetaMask
2. Get testnet ETH from [Base Sepolia Faucet](https://www.basescan.org/faucet) or [Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia)

### Contract Deployment

#### 1. Deploy to Saga Chainlet

```bash
cd contracts

# Create .env file
cat > .env << EOF
SAGA_CHAINLET_RPC_URL=https://slither-2763767854157000-1.jsonrpc.sagarpc.io
DEPLOYER_PRIVATE_KEY=your_private_key_here
EOF

# Deploy StakeArena contract
pnpm run deploy:saga
```

Copy the deployed `StakeArena` address.

#### 2. Deploy to Base Sepolia (For Entropy)

```bash
# Add Base Sepolia config to .env
cat >> .env << EOF
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_PRIVATE_KEY=your_private_key_here
EOF

# Deploy EntropyOracle contract
pnpm run deploy:entropy
```

Copy the deployed `EntropyOracle` address.

### Server Configuration

Create `server/.env`:

```bash
cd ../server
cat > .env << EOF
# Required
SERVER_PRIVATE_KEY=0x...                    # Server wallet private key
STAKE_ARENA_ADDRESS=0x...                   # StakeArena contract (Saga)

# Optional (for Pyth Entropy)
ENTROPY_ORACLE_ADDRESS=0x...                # EntropyOracle contract (Base Sepolia)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
SAGA_CHAINLET_RPC_URL=https://slither-2763767854157000-1.jsonrpc.sagarpc.io

# Optional (for match finalization)
ENABLE_BLOCKCHAIN=true
EOF
```

### Client Configuration

Create `client/.env`:

```bash
cd ../client
cat > .env << EOF
VITE_BLOCKCHAIN_ENABLED=true
VITE_STAKE_ARENA_ADDRESS=0x...              # StakeArena contract address
VITE_SAGA_CHAINLET_RPC_URL=https://slither-2763767854157000-1.jsonrpc.sagarpc.io
VITE_SAGA_CHAIN_ID=2763767854157000
EOF
```

### Authorize the Server

The server needs permission to finalize matches:

```bash
cd contracts
pnpm run update:server
```

Enter your StakeArena address and server wallet address when prompted.

### Start With Blockchain

```bash
cd ..
pnpm run dev
```

Now when you play:
- Connect your MetaMask wallet
- Stake SSS tokens to enter matches
- Earn stakes from eliminated players
- View your rank on the on-chain leaderboard

---

## 🎲 How Pyth Entropy Works

### Cross-Chain Fair Randomness

```
┌──────────────────────────────────────────────────┐
│  1. Server requests entropy from Base Sepolia    │
└────────────────┬─────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
    │  2. Pyth Oracle reveals    │
    │     random seed            │
    │     (10-30 sec delay)      │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
    │  3. Server reads seed from │
    │     EntropyOracle (Base)   │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
    │  4. Server commits hash to │
    │     StakeArena (Saga)      │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
    │  5. Generate using RNG:    │
    │     • Spawn positions      │
    │     • Snake colors         │
    │     • Pellet layout        │
    │     • Map type             │
        └────────────────────────────┘
```

### What Gets Randomized

1. **Player Spawns**: Derived from `keccak256(seed, "spawn", playerAddress, retryCount)`
2. **Snake Colors**: Derived from `keccak256(seed, "color", playerAddress)`
3. **Pellet Field**: All 500 pellets from `keccak256(seed, "pellets")`
4. **Map Layout**: Pattern type from `keccak256(seed, "map")`

### Verification

- **Seed Hash**: `StakeArena.entropySeedByMatch[matchId]` on Saga
- **Request ID**: `EntropyOracle.entropyRequestIdByMatch[matchId]` on Base Sepolia
- **Fair Match Badge**: ✓ Shown in-game with match ID and entropy details

---

## 📁 Project Structure

```
0xSlither/
├── client/                 # Frontend (Vite + TypeScript)
│   └── src/
│       ├── main.ts         # Entry point
│       ├── Game.ts         # Game state management
│       ├── Renderer.ts     # Canvas rendering (60 FPS)
│       ├── Camera.ts       # Smooth camera system
│       ├── InputHandler.ts # Mouse controls
│       ├── WalletService.ts# Web3 wallet integration
│       └── UI.ts           # UI components
│
├── server/                 # Backend (Node.js + TypeScript)
│   └── src/
│       ├── index.ts        # WebSocket server
│       ├── GameServer.ts   # Main game loop (20 TPS)
│       ├── Snake.ts        # Snake entity
│       ├── Pellet.ts       # Pellet management
│       ├── CollisionDetection.ts # Physics
│       ├── BlockchainService.ts  # Saga Web3
│       ├── EntropyBridgeService.ts # Pyth cross-chain
│       ├── DeterministicRNG.ts   # Seeded RNG
│       └── Leaderboard.ts  # Rankings
│
├── contracts/              # Smart contracts (Solidity)
│   ├── contracts/
│   │   ├── StakeArena.sol      # Main game (Saga)
│   │   ├── EntropyOracle.sol   # Pyth oracle (Base)
│   │   └── GameToken.sol       # ERC20 token
│   └── scripts/
│       ├── deployStakeArena.ts # Deploy to Saga
│       ├── deployEntropyOracle.ts # Deploy to Base
│       ├── updateServer.ts     # Authorize server
│       └── getLeaderboard.ts   # Query rankings
│
└── shared/                 # Shared TypeScript types
    ├── constants.ts        # Game configuration
    ├── types.ts            # Entity definitions
    └── protocol.ts         # Network messages
```

---

## 🔧 Development

### Run Separately

```bash
# Terminal 1 - Server
pnpm run server

# Terminal 2 - Client
pnpm run client
```

### Build for Production

```bash
# Build server
cd server && pnpm run build
pnpm start

# Build client
cd client && pnpm run build
pnpm run preview
```

### Test Multiplayer

Open multiple browser tabs to [0xslither.vercel.app](https://0xslither.vercel.app) - each tab is a separate player!

For local testing, use http://localhost:3000 instead.

### Configuration

Edit `shared/constants.ts`:

```typescript
export const WORLD_WIDTH = 5000;          // Game world width
export const WORLD_HEIGHT = 5000;         // Game world height
export const TICK_RATE = 20;              // Server updates/sec
export const SNAKE_BASE_SPEED = 100;      // Snake speed
export const PELLET_COUNT = 500;          // Number of pellets
export const LEADERBOARD_SIZE = 5;        // Top players shown
```

### Change Server Port

```bash
PORT=9000 pnpm run server
```

---

## 🛠️ Tech Stack

### Frontend
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Vercel** - Production hosting
- **Canvas 2D** - High-performance rendering
- **ethers.js v6** - Blockchain interactions

### Backend
- **Node.js** - Server runtime
- **Fluence CPU** - Decentralized compute hosting
- **ws** - WebSocket library
- **ethers.js v6** - Blockchain interactions

### Blockchain
- **Saga Chainlet** - EVM L1 for game economy
- **Base Sepolia** - L2 testnet for Pyth Entropy
- **Solidity 0.8.20** - Smart contracts
- **Hardhat** - Development framework
- **OpenZeppelin** - Secure contract libraries
- **Pyth Entropy** - Verifiable randomness

---

## 🎯 Roadmap

### ✅ Completed
- [x] Real-time multiplayer gameplay
- [x] On-chain staking economy
- [x] Pyth Entropy integration
- [x] Cross-chain architecture
- [x] Deterministic match replay
- [x] Leaderboard system
- [x] Smooth camera and interpolation
- [x] **Production deployment on Vercel**
- [x] **Decentralized server on Fluence CPU**

### 🚧 Future Enhancements
- [ ] Mobile touch controls
- [ ] Audio and sound effects
- [ ] Multiple game rooms
- [ ] Power-ups
- [ ] Snake skins/NFT customization
- [ ] Tournament mode with brackets
- [ ] Achievement system

---

## 🐛 Troubleshooting

### Connection Issues
- ✅ Ensure server is running on port 8080
- ✅ Check browser console (F12) for WebSocket errors
- ✅ Verify firewall isn't blocking connections
- ✅ Try `ws://localhost:8080` instead of `wss://`

### Blockchain Issues
- ✅ Ensure MetaMask is installed and unlocked
- ✅ Verify you're on Saga Chainlet network
- ✅ Check you have enough SSS tokens
- ✅ Look for transaction errors in MetaMask
- ✅ View contract on [Saga Explorer](https://slither-2763767854157000-1.sagaexplorer.io/)

### Performance Issues
- ✅ Reduce `PELLET_COUNT` in `shared/constants.ts`
- ✅ Close other browser tabs
- ✅ Check CPU usage (should be <50%)
- ✅ Try a different browser (Chrome recommended)

### Game Not Starting
1. Check that both servers are running
2. Verify `pnpm install` completed successfully
3. Clear browser cache and reload
4. Check for errors in terminal and browser console

---

## 📚 Documentation

- **Project Overview**: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
- **Smart Contracts**: See `contracts/README.md`
- **Network Protocol**: See "Network Protocol" section below

---

## 📡 Network Protocol

### Client → Server

```typescript
{ type: 'JOIN', name: string, address?: string, stakeAmount?: string }
{ type: 'INPUT', angle: number }
{ type: 'PING', timestamp: number }
{ type: 'TAPOUT' }
```

### Server → Client

```typescript
{ type: 'STATE', snakes: Snake[], pellets: Pellet[], leaderboard: Player[] }
{ type: 'DEAD', score: number, rank: number }
{ type: 'PONG', timestamp: number }
```

---

## 🎮 Game Mechanics

- **Movement**: Snake moves forward continuously, mouse controls rotation
- **Growth**: Pellets add 2-4 segments based on size
- **Death**: Hitting another snake's body eliminates you
- **Stakes**: Winner collects all stakes from eliminated players
- **Respawn**: Click "Play Again" to rejoin with new stake
- **Score**: Based on total snake length
- **Leaderboard**: Top 5 players by score

---

## 📊 Performance

- **Server**: 20 TPS (authoritative game loop)
- **Client**: 60 FPS rendering with interpolation
- **Players**: Supports 10-20+ concurrent players
- **Latency**: <50ms typical (local), <200ms acceptable
- **World**: 5000×5000 units with 500 pellets

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **ETHGlobal** - For the hackathon opportunity
- **Saga** - For the dedicated chainlet infrastructure
- **Fluence** - For decentralized compute hosting
- **Pyth Network** - For Entropy randomness oracle
- **Vercel** - For frontend hosting
- **OpenZeppelin** - For secure contract libraries
- **Slither.io** - Original game inspiration

---

## 📞 Support & Links

- **🎮 Play Game**: [0xslither.vercel.app](https://0xslither.vercel.app)
- **Issues**: [GitHub Issues](https://github.com/yourusername/0xSlither/issues)
- **Saga Explorer**: [View Transactions](https://slither-2763767854157000-1.sagaexplorer.io/txs)
- **Base Sepolia Explorer**: [View Entropy Contract](https://sepolia.basescan.org/address/0x662371163C3797b66ab80dCB592761718537F492)

---

<div align="center">

**Built with ❤️ using TypeScript, Fluence CPU, and Blockchain**

**Deployed on Vercel | Server on Fluence CPU | Contracts on Saga & Base**

**[🎮 Play Now](https://0xslither.vercel.app)** | **[Report Bug](https://github.com/yourusername/0xSlither/issues)** | **[Request Feature](https://github.com/yourusername/0xSlither/issues)**

</div>
