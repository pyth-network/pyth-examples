# Chaos LP — Uniswap v4 with Pyth Price Feeds + Entropy (EthGlobal Buenos Aires)

This directory is a self-contained example for the Pyth hackathon, showing how
to combine **Pyth Price Feeds (pull oracle)** and **Pyth Entropy** to build a
MEV-resistant Uniswap v4 LP strategy (“Chaos LP”).

This is the same project as `chaos-lp` in [reymom/chaos-lp-ethglobal-ba](https://github.com/reymom/chaos-lp-ethglobal-ba), adapted to live
inside `pyth-examples/entropy/chaos-lp-uniswap-v4`.

This repository contains a complete demonstration of how to combine **Pyth Price Feeds (pull oracle)** and **Pyth Entropy** to build a **MEV-resistant Uniswap v4 Liquidity Provider** (“Chaos LP”).  
The goal is to show how oracle-driven price updates + on-chain randomness produce **unpredictable LP bands**, reducing MEV extraction opportunities.

This README is designed for the **Pyth Bounty Submission**, including the **Price Feeds Track**, **Entropy Track**, and **Most Innovative Integration** categories.

# 🎯 Summary

Chaos LP introduces **randomized liquidity ranges** in a Uniswap v4 pool.  
The hook:

- Pulls price data from **Pyth Hermes**
- Uses **updatePriceFeeds()** on-chain
- Consumes the fresh price feed
- Requests random numbers from **Pyth Entropy**
- Randomizes the LP tick bands
- Adds liquidity via the Uniswap v4 PoolManager

On top of that:

- A TypeScript chaos client (scripts/requestChaos.ts) triggers the full flow live on Base Sepolia, via `npm run request:chaos:base`.
- A companion Rust tool (`mev-sim`) performs Monte Carlo simulations of MEV behavior and shows that Chaos LP dramatically reduces MEV profitability.

# 🏗 Architecture Overview

### Components

| Component                        | Description                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| **ChaosHook.sol**                | Uniswap v4 hook that pulls Pyth price feeds + Pyth Entropy randomness                            |
| **ChaosPoolManagerDeployer.sol** | Deploys PoolManager + tokens + ChaosHook + initializes pool                                      |
| **Hermes client (ts)**           | `requestChaos.ts` fetches Hermes bytes and calls `requestChaosWithPyth` on Base Sepolia on-chain |
| **mev-sim (Rust)**               | Monte Carlo MEV simulation comparing Normal LP vs Chaos LP                                       |
| **Deploy scripts**               | Foundry scripts to deploy to Base Sepolia (incl. `DeployChaosBaseSepolia.s.sol`)                 |

# 🔌 Pyth Price Feed Integration (Pull Oracle)

Chaos LP **fully implements the pull oracle pattern** required for the bounty.

### ✔ 1. Fetch price data from Hermes

The system includes a simple Rust Hermes client (`requestChaos.rs` planned version + CLI snippet) that:

```bash
curl "https://hermes.pyth.network/v2/updates/price/latest?ids[]=$ETH_USD_FEED_ID"   | jq -r '.binary.data[]' > update.bin
```

This produces `bytes[]` blobs that the hook accepts.

We also provide a Rust example (shortened):

```rust
let updates = hermes_client.fetch_latest_price_updates(feed_id)?;
chaos_hook.requestChaosWithPyth(pool_key, updates, MAX_AGE).send().await?;
```

### ✔ 2. Push update on-chain via `updatePriceFeeds`

In `ChaosHook`:

```solidity
uint256 pythFee = pyth.getUpdateFee(updateData);
pyth.updatePriceFeeds{value: pythFee}(updateData);
```

Fully compliant with Pyth’s EVM Pull method.

### ✔ 3. Consume the fresh price feed

```solidity
PythStructs.Price memory price = pyth.getPriceNoOlderThan(feedId, maxAge);
int64 expo = price.expo;
int64 priceInt = price.price;
```

This is used to compute the latest tick for Uniswap v4.

### ✔ 4. Price pusher script

For the full demo, we use a dedicated script:

```bash
npm run request:chaos:base
```

which runs:

```
"scripts": {
  "request:chaos:base": "NETWORK=base-sepolia ts-node scripts/requestChaos.ts"
}
```

This script:

- Fetches Hermes updates
- Calculates pythFee on-chain
- Calls requestChaosWithPyth with the correct PoolKey + bytes[] updates
- Triggers both Pyth Price Feeds + Entropy in one transaction

This completes **all required steps** to qualify for the **Pyth Price Feed Pull Track**.

## 🔮 Pyth Entropy Integration

ChaosHook implements the **IEntropyConsumer** pattern:

```solidity
function getEntropy() external view returns (address) {
    return address(entropy);
}
```

Randomness is requested inside `requestChaosWithPyth`:

```solidity
uint128 entropyFee = entropy.getFeeV2();
uint64 seq = entropy.requestV2{value: entropyFee}();
pendingRequests[seq] = key;
```

Entropy callback:

```solidity
function entropyCallback(
    uint64 sequenceNumber,
    address /*provider*/,
    bytes32 randomNumber
) internal override {
    PoolKey memory key = pendingRequests[sequenceNumber];
    // ...
    int24 centerTick = _getLatestTick();

    int256 baseOffset = _mapRandomNumber(randomNumber, MIN_OFFSET, MAX_OFFSET);
    if ((uint256(randomNumber) & 1) == 0) {
        baseOffset = -baseOffset;
    }

    int24 rawLower = centerTick - int24(baseOffset);
    int24 rawUpper = centerTick + int24(baseOffset);

    int24 tickLower = _snapAndClamp(rawLower, tickSpacing);
    int24 tickUpper = _snapAndClamp(rawUpper, tickSpacing);

    poolManager.modifyLiquidity(
        key,
        ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: LIQUIDITY_DELTA,
            salt: bytes32(0)
        }),
        ""
    );

    emit ChaosPositionPlanned(
        sequenceNumber,
        poolId,
        centerTick,
        tickLower,
        tickUpper,
        randomNumber
    );
}
```

The entire liquidity band generation depends on on-chain randomness:

- Each Chaos request maps an Entropy random number to a tick offset
- Bands are centred around the current Pyth tick, but randomized in width and direction

This fulfils the requirements for the **Pyth Entropy track**.

## 🦄 Uniswap v4 Integration

ChaosHook is a minimal but full-featured v4 hook:

- Implements `beforeAddLiquidity` permissions (no-op so normal LP adds still work)
- Computes oracle tick via Pyth
- Uses Entropy randomness to randomize tick offsets
- Calls `poolManager.modifyLiquidity` to add liquidity

A Uniswap v4 system is deployed using:

- `PoolManager.sol`
- `TestToken.sol`
- `ChaosPoolManagerDeployer.sol` (local deployer for tests / prototyping)
- `script/DeployChaosBaseSepolia.s.sol` (production-style deploy on Base Sepolia)

The included deployment scripts set this up automatically.

## 🧪 Local Anvil Fork + MEV Simulation

For the MEV simulations we run Chaos LP against a **local Anvil fork of Base** plus local mocks (MockPyth + MockEntropy). This lets us iterate quickly without touching the real testnet.

### 1. Start Anvil forked from Base

```bash
export BASE_RPC="https://base-mainnet.g.alchemy.com/v2/<YOUR_KEY>"

anvil \
  --fork-url $BASE_RPC \
  --fork-block-number 20000000 \
  --chain-id 8453
```

Keep this Anvil instance running in its own terminal.

### 2. Deploy the local Chaos system (PoolManager + tokens + mocks)

From another terminal, deploy the full local stack to the fork:

```bash
export DEPLOYER_PK=0x...  # anvil-funded key (same one Anvil prints on startup)

forge script script/DeployChaosSystem.s.sol:DeployChaosSystem \
  --rpc-url http://127.0.0.1:8545 \
  --private-key $DEPLOYER_PK \
  --broadcast \
  -vv
```

This script:

- Deploys PoolManager
- Deploys two TestToken ERC-20s
- Deploys MockPyth + MockEntropy
- Deploys ChaosHook wired to the mocks
- Initializes a v4 pool and writes addresses to deployments/local.json

## 📊 MEV Simulation (Rust)

The `mev-sim/` folder contains a **complete Monte Carlo MEV simulator**.

### What it does:

- Pulls live oracle ticks from on-chain ChaosHook (Base Sepolia)
- Generates thousands of Chaos LP bands (randomized)
- Compares:
  - Attacker overlap probability
  - Expected attacker payoff (relative units)
  - Success rate of profitable strategies

### Key Results (10k simulations)

```
┌───────────────────────┬──────────────┬──────────────┬──────────────┐
│ Metric                │ Normal LP    │ Chaos LP     │ Change       │
├───────────────────────┼──────────────┼──────────────┼──────────────┤
│ Avg MEV payoff        │     1.0000x  │     0.0376x  │     -96.2%   │
│ Max MEV payoff        │     1.0000x  │     1.0000x  │              │
│ MEV success rate      │     100.0%   │       7.5%   │     -92.5%   │
│ Predictability        │       High   │     Chaotic  │              │
└───────────────────────┴──────────────┴──────────────┴──────────────┘
```

Chaos LP massively reduces MEV success probability and expected payoff.

### Visual Summary Dashboard

The simulator produces `chaos_mev_dashboard.png`, showing:

- Expected attacker payoff comparison
- Attacker success rate comparison

Both clearly illustrate Chaos LP’s MEV resistance.

## 🚀 Deployment Guide (Base Sepolia)

We include a full deployment script:

```
script/DeployChaosBaseSepolia.s.sol
```

- Deploys:
  - `PoolManager`
  - Two `TestTokens`
  - `ChaosHookDeployer`
  - `ChaosHook`
- Initializes a Uniswap v4 pool with:
  - `fee = 3000`
  - `tickSpacing = 10`
  - `hooks = ChaosHook`
- Wires in real Pyth endpoints on Base Sepolia:
  - `PYTH_ADDRESS`
  - `ENTROPY_ADDRESS`
  - `ETH_USD_FEED_ID`
- Writes `deployments/base-sepolia.json` with all deployed addresses

Base Sepolia Pyth endpoints used:

| Component         | Address            |
| ----------------- | ------------------ |
| Pyth Price Oracle | `$PYTH_ADDRESS`    |
| Pyth Entropy      | `$ENTROPY_ADDRESS` |
| ETH/USD Feed ID   | `$ETH_USD_FEED_ID` |

### Environment:

```bash
export BASE_SEPOLIA_RPC_URL="https://base-sepolia.g.alchemy.com/v2/<your_key>"
export PRIVATE_KEY=0x<private_key>
export PYTH_ADDRESS=0xA2aa501b19aff244D90cc15a4Cf739D2725B5729
export ENTROPY_ADDRESS=0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c
export ETH_USD_FEED_ID=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
export BASESCAN_API_KEY=<basescan_api_key>
```

### Deploy + verify

```bash
forge script script/DeployChaosBaseSepolia.s.sol:DeployChaosBaseSepolia \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --chain-id 84532 \
  --broadcast \
  --verify \
  -vv
```

This:

- Deploys the full Chaos system
- Verifies all contracts on Base Sepolia (Basescan)
- Writes `deployments/base-sepolia.json` used by the client script

## Deployments

The contracts are deployed to base sepolia:

| Network      | Chain ID | PoolManager                                  | ChaosHook                                    | Token0                                       | Token1                                       | Pyth                                         | Entropy                                      |
| ------------ | -------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Base Sepolia | 84532    | `0xB693223F321760fD4FE00DDF8D4168f95A11035D` | `0xD4ED3f079E04f681F8c3C16D4589c4eF82AFC800` | `0xE47bC56b07f1E3D4faB5f16bD3Be53A8B6470d2E` | `0x51Ea2928c87328D6Df0e4569DcC60b78EcEc725f` | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` | `0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c` |

# 🧪 Chaos LP In Action (End-to-End Flow)

1. Fetch latest price update from Hermes
2. Run `requestChaosWithPyth`
3. Hook updates price feed on-chain
4. Hook requests entropy
5. Entropy callback fires
6. Latest price → latest tick → band randomized → liquidity added
7. MEV simulator confirms highly randomized bands

## Run Chaos on Base Sepolia

```bash
npm run request:chaos:base
```

Typical output:

```bash
🚀 Using network: base-sepolia
📁 Deployment file: deployments/base-sepolia.json
💰 Pyth fee: 10
🎲 Entropy fee: 26745271200001
📦 totalFee: 26745271200011
📨 Chaos tx: 0x56a2993a4909d36c957e18874c90b3e82cf2dd8ff433b2aefa26648d56c322c1
Chaos LP request mined
✅ Chaos LP request mined on Base Sepolia!
```

This one command is the live demo of:

- Pyth Hermes → on-chain price update
- Pyth Entropy → on-chain randomness
- Uniswap v4 hook → randomized liquidity band placement

# 🏁 Final Notes

This project:

- Uses **Pyth Price Feeds (Pull method)**
- Uses **Pyth Entropy**
- Demonstrates **on-chain randomness applied to Uniswap v4**
- Executes a **quantitative MEV study**
- Deploys to a real testnet (**Base Sepolia**)
