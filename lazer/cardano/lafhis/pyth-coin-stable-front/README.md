# pyth-coin-stable-front

Next.js frontend for creating and joining Cardano duels and for driving the on-chain deposit flow backed by Pyth price data.

## What is included

- Landing page and duel UI
- Create game / join game flow
- Next.js API routes for temporary game state
- Client and server transaction helpers for `depositA` and `depositB`
- Standalone Node scripts for end-to-end on-chain testing

## Important assumptions

- The app is currently wired for **Cardano preprod**.
- Local game state is stored in memory in [`src/server/gameStore.ts`](/home/mati/Facu/pyth-examples/lazer/cardano/lafhis/pyth-coin-stable-front/src/server/gameStore.ts), so restarting the Next server clears all lobbies.
- The backend reads `../pyth-coin-stable-validators/plutus.json`. If that file is missing, the on-chain routes will fail.

Expected folder layout:

```text
parent/
├── pyth-coin-stable-front/
└── pyth-coin-stable-validators/
    └── plutus.json
```

## Requirements

- Node.js 20+ recommended
- npm
- A CIP-30 Cardano wallet extension in the browser
- A funded preprod wallet if you want to test real transactions
- A Blockfrost project ID for Cardano preprod
- The backend wallet mnemonic and its payment key hash (`BACKEND_PKH`)

## Installation

```bash
npm install
```

## Environment variables

Use the example file as a starting point:

```bash
cp .env.example .env.local
```

If you want to run the standalone scripts in `src/*.mjs`, also copy the same values to `.env` because those scripts load environment variables with `dotenv`:

```bash
cp .env.example .env
```

### Required for the web app on-chain flow

These variables are needed to create and join games from the UI:

```env
BLOCKFROST_ID=...
PYTH_POLICY_ID=...
BACKEND_PKH=...
MNEMONIC="word1 word2 word3 ..."
```

Notes:

- `MNEMONIC` is required by the Next.js API routes that co-sign and submit transactions.
- `BACKEND_PKH` must be the payment key hash of the backend wallet used to sign those transactions.
- `../pyth-coin-stable-validators/plutus.json` must exist and contain the compiled validators used by the API routes.

### Required only for standalone scripts

These scripts also need a Pyth token, they are examples of transactions that work using our validator:

- [`src/testFlow.mjs`](/home/mati/Facu/pyth-examples/lazer/cardano/lafhis/pyth-coin-stable-front/src/testFlow.mjs)
- [`src/depositA.mjs`](/home/mati/Facu/pyth-examples/lazer/cardano/lafhis/pyth-coin-stable-front/src/depositA.mjs)
- [`src/depositB.mjs`](/home/mati/Facu/pyth-examples/lazer/cardano/lafhis/pyth-coin-stable-front/src/depositB.mjs)
- [`src/resolve.mjs`](/home/mati/Facu/pyth-examples/lazer/cardano/lafhis/pyth-coin-stable-front/src/resolve.mjs)

```env
PYTH_TOKEN=...
```

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

Useful routes:

- `/`
- `/create-game`
- `/join-game`

## Production build

```bash
npm run build
npm run start
```

## Standalone scripts

The repository also includes direct Node scripts for manual testing:

```bash
node src/testFlow.mjs
node src/depositA.mjs
node src/depositB.mjs
node src/resolve.mjs
```

Those scripts assume:

- `.env` exists
- `PYTH_TOKEN` is set
- `../pyth-coin-stable-validators/plutus.json` exists
- the backend wallet has funds on preprod
