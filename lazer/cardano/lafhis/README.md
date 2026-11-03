# 🏇 CoinStable — Traders Duel 

> **Buenos Aires Pythathon 2026** · Hackathon Submission · March 21–22, 2026

A **trustless, on-chain PvP trading duel** built on Cardano and powered by real-time Pyth oracle prices. Two players pick different crypto assets, stake ADA, and watch 60 seconds of live price action decide the winner — **completely verified on-chain**. No house. No trust. Just math.

---

## 🎯 The Game

Two players. Two assets. One winner.

**CoinStable** is a real-time duel where each player bets on a different crypto asset (ADA/USD, BTC/USD, ETH/USD, BNB/USD). After a countdown, whoever's asset appreciated the most in **percentage terms** wins the entire pot.

```
🟣 Player A bets 25 ADA on ADA/USD
🔵 Player B bets 25 ADA on BTC/USD

⏱  60 seconds of live price action...

ADA/USD:  +1.2%  🏆
BTC/USD:  +0.3%

Player A wins 50 ADA!
```

If the difference between both percentage changes is **under 0.0001%**, it's a **draw** — both players get their ADA back.

---

## 🗺️ Table of Contents

- [How It Works](#%EF%B8%8F-how-it-works)
- [Why It's Trustless](#-why-its-trustless)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [Project Structure](#-project-structure)
- [Smart Contracts](#-smart-contracts)
- [Frontend](#%EF%B8%8F-frontend)
- [Getting Started](#-getting-started)
- [Design Decisions](#-design-decisions)
- [Team](#-team)

---

## ⚙️ How It Works

### Step by Step

```
① Player A creates a duel
   ├── Picks an asset (e.g. ADA/USD)
   ├── Sets a bet amount (10, 25, or 50 ADA)
   └── Deposits into the on-chain contract → gets a shareable link 🔗

② Player B joins via the link
   ├── Picks a different asset (e.g. BTC/USD)
   └── Deposits matching ADA into the same contract

③ The race begins 🏁
   ├── Backend records start prices from Pyth at join time
   ├── Live "race" visualization shows real-time % change for each asset
   └── Countdown timer ticks away...

④ Resolution (fully on-chain) ✅
   ├── Backend fetches final Pyth prices after the deadline
   ├── On-chain validator calculates % change for both assets
   ├── Winner receives the full pot directly to their wallet
   └── Authenticity NFT is burned to close the duel
```

### Duel Lifecycle (State Machine)

```
  [Waiting] ──(Player B joins)──► [Active] ──(deadline passed)──► [Finished]
      │                                                                 │
      └──────────────────(Cancel)───────────────────────────────► [Refunded]
```

Each state transition is a real Cardano transaction — enforced by the on-chain validator.

---

## 🔒 Why It's Trustless

This is **not** a "trust the backend" game. The outcome is cryptographically determined on-chain.

- 📡 **Pyth Lazer** delivers signed price updates directly embedded in the transaction
- 🧮 The **Aiken validator** reads those prices and runs the winner calculation on-chain
- 🚫 The **backend cannot lie** — it can only submit transactions the validator approves
- 🎟️ **NFT-gated duels** prevent spam and ensure each contract is authentic

### Winner Calculation (on-chain logic)

```
change_a = (end_price_a - start_price_a) × 1_000_000 / start_price_a
change_b = (end_price_b - start_price_b) × 1_000_000 / start_price_b

if |change_a - change_b| < 1         →  🤝 Draw   (both refunded)
else if change_a > change_b         →  🏆 Player A wins the full pot
else                                →  🏆 Player B wins the full pot
```

The **0.0001% draw threshold** prevents dust-level differences from picking a winner when the race is essentially tied.

### Horseshoe Tokens

Every duel winner receives 1 **Horseshoe** — a fungible Cardano token minted atomically in the same transaction that settles the duel. Because minting is gated by the `winner_token` Aiken validator (which requires the backend to co-sign), Horseshoes can only exist as proof of a real on-chain win. They accumulate in your wallet across duels and will form the basis of the leaderboard in a future version of CoinStable.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| 📜 Smart Contracts | [Aiken](https://aiken-lang.org) (Plutus v3) | On-chain duel logic |
| ⛓️ Blockchain | Cardano Testnet (Preprod/Preview) | Settlement layer |
| 🔮 Oracle | [Pyth Network — Lazer](https://pyth.network) | Verified price feeds |
| 👛 Wallet | [MeshJS](https://meshjs.dev) (CIP-30) | Wallet integration |
| 🔍 Chain Indexer | [Blockfrost](https://blockfrost.io) | UTxO queries |
| 🖥️ Frontend | Next.js 16, React 18, TypeScript | UI & game interface |
| 🎨 Styling | Tailwind CSS | Design system |
| 📈 Live Prices | Pyth Hermes Client (WebSocket) | Real-time price ticks |

### 🔮 Why Pyth?

Pyth Lazer delivers **sub-second price updates** with **on-chain cryptographic verification**. Instead of trusting the backend to report prices, the transaction itself carries signed Pyth price data — and the validator verifies it using the **zero-withdrawal pattern**:

- Price data is verified **inside the transaction**, not by the backend
- No one can submit a fake price — Pyth's signature ensures authenticity
- The outcome is **fully auditable** by anyone on-chain

---

## 📂 Project Structure

```
lafhis/
│
├── 📜 pyth-coin-stable-validators/     Smart contracts (Aiken)
│   ├── validators/
│   │   ├── nft.ak                      NFT minting policy
│   │   └── validators.ak               Main duel validator
│   ├── plutus.json                     Compiled Plutus scripts
│   └── aiken.toml                      Aiken project config
│
├── 🖥️  pyth-coin-stable-front/          Frontend (Next.js)
│   └── src/
│       ├── pages/
│       │   ├── index.tsx               Landing page + demo
│       │   ├── create-game.tsx         Create a duel
│       │   ├── join-game.tsx           Join a duel (Player B)
│       │   └── game/[id].tsx           Live duel view
│       ├── components/
│       │   ├── DuelPreview.tsx         🏇 Live race visualization
│       │   └── PriceTicker.tsx         Real-time price feed
│       ├── context/
│       │   └── WalletContext.tsx       CIP-30 wallet state
│       ├── server/
│       │   └── gameStore.ts            In-memory session store
│       └── types/
│           └── game.ts                 TypeScript definitions
│
├── 📄 duelo_de_traders_resumen.md      Full design document (ES)
├── 📄 duelo_de_traders_interfaces.md   API/interface specs (ES)
└── 📄 wallet_integration.md            MeshJS wallet docs
```

---

## 📜 Smart Contracts

Three validators compiled to **Plutus v3** with Aiken.

### 🎟️ NFT Policy (`nft.ak`)

Controls minting and burning of **authenticity NFTs** — one per duel. Each NFT's asset name is the `duel_id`, derived deterministically as `SHA256(tx_hash || output_index)` of the creating UTxO. This makes every duel uniquely addressable on-chain.

- **Mint:** Only the backend can authorize; must consume the UTxO used to derive the ID
- **Burn:** Called automatically on Resolve and Cancel to close the duel cleanly

### ⚖️ Bet Validator (`validators.ak`)

Enforces the duel lifecycle. Parameterized at deploy time by:
- `backend_pkh` — only this key can resolve duels
- `nft_policy_id` — links to the NFT policy above
- `pyth_id` — Pyth Lazer script policy ID on the target network

**What's stored in the contract UTxO (Datum):**

```
DuelDatum {
  duel_id              : ByteArray            — unique duel identifier
  player_a             : Player {
                           pkh,               — payment key hash
                           feed_id,           — Pyth feed (e.g. 16 = ADA/USD)
                           start_price        — recorded at duel start
                         }
  player_b             : Option<Player>       — None until joined
  bet_amount_lovelace  : Int                  — each player's stake
  status               : Waiting | Active | Finished
  deadline             : Option<Int>          — POSIX ms timestamp
}
```

**Redeemers (actions):**

| Action | Who | When | What Happens |
|--------|-----|------|-------------|
| `Join` | Player B + Backend | Status = Waiting | Reads Pyth start prices, activates duel |
| `Resolve` | Backend | Status = Active, after deadline | Calculates winner on-chain, pays out pot |
| `Cancel` | Player A or Backend | Status = Waiting | Refunds Player A, burns NFT |

### 🧲 Winner Token Policy (`winner_token.ak`)

Mints and burns **Horseshoe** tokens — the fungible reward given to every duel winner. Parameterized at deploy time by:
- `backend_pkh` — only the backend can authorize minting, ensuring tokens are only issued as part of a real `Resolve` transaction

**Token:**
- **Name:** `horseshoe` (UTF-8, fixed for all duels)
- **Fungible:** yes — winners accumulate Horseshoes across duels; their balance is the leaderboard

**Redeemers (actions):**

| Action | Who | What Happens |
|--------|-----|-------------|
| `MintVictory` | Backend | Mints exactly 1 Horseshoe to the winner, atomically in the same TX as `Resolve` |
| `BurnVictory` | Token holder | Burns any number of Horseshoes — no backend needed, owner controls their tokens |

Because minting is atomic with resolution, a Horseshoe can only ever exist as cryptographic proof of a real on-chain win.

---

## 🖥️ Frontend

### Pages

| Route | Description |
|-------|-------------|
| `/` | 🏠 Landing page with animated demo race + live price ticker |
| `/create-game` | 🆕 Connect wallet, pick asset + bet amount + duration |
| `/join-game?gameId=...` | 🤝 Player B view — pick a different asset and join |
| `/game/[id]` | 🏁 Live duel lobby — race visualization, countdown, status |

### Key Components

**🏇 `DuelPreview`** — The heart of the UI. Two lanes with real-time % change bars, a countdown timer, and "Leading" / "Winner" badges. Fetches live prices from Pyth Hermes via WebSocket. Also runs in demo mode on the landing page.

**👛 `WalletContext`** — Connects to any CIP-30 compatible wallet (Nami, Eternl, Lace, Flint...). Exposes address, balance, and network ID to the whole app via React Context.

**🚪 `RequireWallet`** — Gate component — shows a wallet connect prompt if no wallet is connected, preventing you from accidentally creating a duel without funds.

### REST API Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/games` | Create a new game session |
| `GET` | `/api/games/:id` | Fetch current game state |
| `POST` | `/api/games/:id/join` | Player B joins an existing game |
| `GET` | `/api/onchain/deposit-a-config` | Returns `blockfrostId`, `backendPkh`, `pythPolicyId`, compiled validators |
| `POST` | `/api/onchain/deposit-a-submit` | Backend co-signs + submits Player A's partial transaction |
| `POST` | `/api/onchain/deposit-b-submit` | Backend co-signs + submits Player B's partial transaction |
| `POST` | `/api/onchain/pyth-lazer-prices` | Fetches a signed Pyth Lazer update (server-side, needs `PYTH_TOKEN`) |
| `POST` | `/api/onchain/resolve` | Resolves a finished duel: fetches final prices, determines winner, submits resolve TX |

### ⚠️ Known Limitation: Player B Join Transaction

Everything in the project works end-to-end **except one step**: the browser transaction for Player B joining a duel (`depositB`) is not completing successfully on-chain. Player A creating a game works, the smart contracts are deployed and validated, the UI is fully functional, and the race visualization runs live on the game lobby screen — including a demo preview while waiting for the opponent.

The issue is a subtle Cardano-specific quirk: the Pyth Lazer signed price update is a large binary payload that must be included in the transaction as a Plutus withdrawal redeemer, and Cardano enforces a strict 64-byte CBOR chunking rule that MeshJS's browser serializer and Blockfrost's submission endpoint handle differently. We spent significant time tracking this down during the hackathon but could not close it within the time window.

**The complete transaction-building logic exists and is correct** — you can see the full flow working in the standalone Node.js scripts:

| File | Description |
|------|-------------|
| `pyth-coin-stable-front/src/depositA.mjs` | Player A creates a duel — mints authenticity NFT, locks ADA at script |
| `pyth-coin-stable-front/src/depositB.mjs` | Player B joins — fetches Pyth Lazer prices, verifies on-chain via zero-withdrawal, transitions datum to Active |
| `pyth-coin-stable-front/src/resolve.mjs` | Backend resolves — fetches final prices, determines winner, burns NFT, pays out pot + mints horseshoe token |

These scripts use the exact same MeshJS transaction builder, Pyth Lazer SDK, and Aiken validators as the frontend, and can be run directly with `node` against Cardano preprod. They prove that the architecture, the smart contracts, and the Pyth integration are all sound.

In the meantime, the game lobby already shows a **live race preview** — with real-time price bars, a countdown, and asset performance — so you can experience the full look and feel of a duel even before Player B has joined.

### 🧪 Reviewer Demo — Step by Step

Follow these steps to experience the project end-to-end:

**Prerequisites**
- A Chromium-based browser (Chrome, Brave, Arc)
- [Eternl](https://eternl.io) or [Nami](https://namiwallet.io) wallet extension installed and set to **Preprod** testnet
- Some test ADA in your preprod wallet (get it free at [docs.cardano.org/cardano-testnets/tools/faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/))
- The app running locally (see **Getting Started** below) or deployed

**Step 1 — Open the app and connect your wallet**
1. Go to the home page. You'll see the landing page with a live animated demo race showing two assets competing in real time using live Pyth prices.
2. Click **Connect Wallet** in the top right and approve the connection in your wallet extension.

**Step 2 — Create a game**
1. Click **Create Game** in the navigation.
2. Choose your asset (e.g. `ADA/USD`), set a bet amount (minimum 2 ADA recommended for testnet), and pick a duel duration.
3. Click **Create Game**. Your wallet will prompt you to sign a transaction — this is the `depositA` transaction that mints an authenticity NFT and locks your bet on-chain.
4. Approve the transaction. Once submitted, you'll be redirected to the **Game Lobby**.

**Step 3 — See the live race preview**
1. On the Game Lobby page you'll immediately see the race visualization running — two asset price bars moving in real time, powered by Pyth Hermes prices.
2. A message reads *"Waiting for opponent to join before the race starts…"* — this is the demo state. The race preview is fully functional even without Player 2.
3. You can copy your **Game ID** or **Invite Link** from this screen to share with a second player.

**Step 4 — What happens when Player 2 joins** *(architecture demo)*
> The browser-side join transaction is the part that isn't fully wired up due to the CBOR serialization issue described above. To see the full flow including Player B joining and the resolve step, run the Node.js scripts directly:

```bash
cd pyth-coin-stable-front/src

# Make sure your .env has BLOCKFROST_ID, PYTH_TOKEN, BACKEND_PKH, MNEMONIC, PYTH_POLICY_ID
node depositA.mjs   # Creates the duel on-chain
node depositB.mjs   # Player B joins, Pyth prices verified on-chain
node resolve.mjs    # Resolves the duel, winner gets the pot + horseshoe token
```

Each script prints the transaction hash and a Cardano explorer link so you can follow every step on-chain.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Cardano testnet wallet (Nami, Eternl, or similar) with test ADA
- Blockfrost API key ([free tier](https://blockfrost.io) works)
- Pyth Lazer access token

### Run the Frontend

```bash
cd pyth-coin-stable-front
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the live demo with real Pyth prices!

### Build the Smart Contracts

```bash
cd pyth-coin-stable-validators
aiken build
```

Compiled output goes to `plutus.json`. Apply parameters using MeshJS or cardano-cli before deployment.

### Environment Variables

Create a `.env.local` in `pyth-coin-stable-front/`:

```env
PYTH_TOKEN=<your pyth lazer token>
BLOCKFROST_ID=<your blockfrost project id>
BACKEND_PKH=<backend wallet payment key hash>
MNEMONIC=<backend wallet mnemonic — testnet only!>
```

### Run the End-to-End Test Flow

```bash
cd pyth-coin-stable-front
node src/testFlow.mjs
```

This simulates the full lifecycle on Cardano preprod: **Deposit A → Deposit B → Resolve**, with real Pyth prices and real on-chain transactions.

---

## 🧠 Design Decisions

**Why a 0.0001% draw threshold?**
Crypto prices are volatile, but tiny differences at the millisecond level are noise. A 0.0001% minimum gap ensures the winner meaningfully outperformed — not won by rounding error.

**Why in-memory session store?**
For the hackathon, this keeps the backend dependency-free and fast to demo. In production, this would be replaced with a persistent DB or a fully on-chain state derivation from UTxO history.

**Why MeshJS?**
MeshJS is the most ergonomic Cardano transaction builder for JavaScript. It handles CBOR serialization, multi-sig, and wallet integration in a way that pairs naturally with Next.js.

**Why Aiken?**
Aiken is purpose-built for Cardano. It compiles directly to Plutus v3, has excellent tooling, and is significantly more readable than raw Plutus Haskell — great for a 24-hour hackathon.

**Why Pyth Lazer specifically?**
Lazer provides the zero-withdrawal pattern: prices are verified **inside the transaction itself**, making the outcome fully trustless and auditable without any off-chain oracle trust assumptions.

---

## 👥 Team

**LAFHIS** — We are students from LaFHIS lab at UBA. Built at Buenos Aires Pythathon, March 22, 2026.

- **Felicitas Garcia** — felicitasgarcia01@gmail.com
- **Ian Grinspan** — iangrinspan7@gmail.com
- **Matias Waisman** — matiasewaisman@gmail.com

Built with ❤️, Cardano, Pyth Lazer, Aiken, MeshJS, and a lot of ☕.

---

## 🔭 Future Work

Ideas for what comes next:

- **📉 Short positions** — Let players bet on an asset going *down*, not just up. The validator would need to distinguish long vs. short positions per player.
- **🏆 Leaderboard** — Winners receive Horseshoe tokens on-chain. A leaderboard could rank players by Horseshoe balance, making every duel meaningful beyond the pot.
- **🐴 Horse Sprite Marketplace** — A marketplace where players spend Horseshoes to purchase NFT horse sprites. Each sprite is a unique Cardano NFT that customizes your horse in the race UI — turning Horseshoes into a real in-game economy.
- **🪙 More assets** — Expand beyond ADA/BTC/ETH/BNB to any feed available on Pyth (SOL, MATIC, AVAX, forex, commodities...).
- **⏱️ Configurable duel duration** — Let the duel creator choose how long the race lasts (30s, 5min, 1h). The deadline is already a parameter in the datum.
- **⚔️ Battle Royale** — More than two players in a single duel. The validator would need to generalize from two players to N, with a winner-takes-all or tiered payout.

---

> ⚠️ *This project was built in ~24 hours as a hackathon proof-of-concept. Smart contracts are unaudited — do not use on mainnet with real funds.*
