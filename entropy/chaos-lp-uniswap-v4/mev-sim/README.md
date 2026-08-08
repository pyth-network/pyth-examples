# 📘 Chaos LP MEV Simulator (Rust)

This folder contains a Rust program that benchmarks **MEV resistance** of the _Chaos LP_ pricing mechanism against a traditional **Normal LP** (Uniswap-v4-style static liquidity band).

The simulator fetches the **live oracle tick** from anvil-deployed `ChaosHook` smart contract, generates random "chaotic" LP bands, and runs a **Monte-Carlo attack model** to measure how much useful information an MEV attacker can extract.

The result:  
👉 **Chaos LP reduces expected MEV payoff by ~96% and collapses MEV success rate from 100% → ~7.5%.**

## 🚀 Features

### ✓ On-chain Integration

- Reads from your deployed **ChaosHook** contract:
  - `getLatestTick()`
  - `pyth()` oracle address
  - `entropy()` randomness source

### ✓ Deterministic vs Chaotic Band Modeling

- **Normal LP**: deterministic band centered on oracle tick
- **Chaos LP**: random offset + same width, clamped + snapped to tick spacing

### ✓ Attack Overlap Simulation

For each Chaos LP sample:

- compute attacker edge (distance from oracle)
- compute band overlap with Normal LP (profitability window)
- store results to CSV
- accumulate statistics

### ✓ Monte Carlo MEV Model (10,000 runs)

Outputs:

- expected attacker payoff (relative)
- attacker success rate (any profitable overlap)
- min/max/avg chaos band edges
- max achievable overlap (worst-case)

### ✓ Judge-Friendly PNG Visualizations

Two final plots:

1. **expected_mev_bar.png** — simple 2-bar payoff comparison
2. **chaos_mev_dashboard.png** — combined payoff + success-rate dashboard

These are included in the hackathon submission.

## 📂 Project Structure

```text
rust/
├── src/
│   ├── main.rs              # Orchestration only
│   ├── chaos.rs             # ABI + tick/band math
│   ├── plotting.rs          # Plotting utilities
│
├── chaos_vs_normal.csv      # Generated CSV (10k chaos samples)
├── expected_mev_bar.png     # Simple 2-bar visual
├── chaos_mev_dashboard.png  # Full judge-ready dashboard
└── README.md                # (this file)
```

### Module responsibilities

**src/chaos.rs**

- `ChaosHook` ABI (alloy `sol!`)
- band construction
- tick snapping/clamping
- intersection logic
- attacker edge computation

**src/plotting.rs**

- 2-panel dashboard PNG
- simple bar chart PNG

**src/main.rs**

- environment loading
- RPC connection
- Monte-Carlo event loop
- printing results in table format
- generating plots

## 🛠️ Requirements

Install system dependencies:

```bash
sudo apt install pkg-config libfreetype6-dev libfontconfig1-dev
```

Install Rust toolchain:

```bash
rustup install stable
rustup default stable
```

## ⚙️ Environment Variables

Create a `.env` file in this folder:

```bash
RPC_URL=https://base-sepolia.infura.io/v3/<your-key>
PRIVATE_KEY=0x...
CHAOS_HOOK_ADDRESS=0x...
CURRENCY0_ADDRESS=0x...
CURRENCY1_ADDRESS=0x...
```

You only need the hook address; currency addresses are logged but not used in simulation.

## ▶️ Running the Simulator

```bash
cd rust
cargo run --release
```

Output includes:

- printed summary table
- full CSV dataset
- PNG graphs

Example (from a real run):

```text
Avg MEV payoff        |     1.0000x |     0.0376x |     -96.2%
MEV success rate      |    100.0%   |      7.5%   |     -92.5%
Predictability        | High        | Chaotic
```

---

## 📊 Simulation Summary (10,000 samples)

| Metric           | Normal LP | Chaos LP | Change |
| ---------------- | --------- | -------- | ------ |
| Avg MEV payoff   | 1.0000x   | 0.0376x  | −96.2% |
| MEV success rate | 100.0%    | 7.5%     | −92.5% |
| Predictability   | High      | Chaotic  | —      |

### TL;DR

**Chaos LP destroys MEV predictability.**  
Attackers only succeed ~7% of the time and earn ~25× less.

## 📥 Output Artifacts

After running `cargo run --release` you get:

- `chaos_vs_normal.csv` — full simulation dataset
- `expected_mev_bar.png` — simple bar chart
- `chaos_mev_dashboard.png` — judge-ready dashboard

---

## 🧠 Why it Works

Chaos LP injects **randomized offsets** around the oracle price.  
So even if the attacker knows:

- the oracle price,
- the fee,
- the pool,
- the liquidity width,

they cannot predict the _actual_ liquidity center.

This completely breaks time-sensitive sandwich and arbitrage strategies.

## 📄 License

MIT — feel free to use this for your research, thesis, or hackathon entries.
