# Iron Piggy · Iron Pig

**Iron Pig** is a savings vault on **Cardano**: you deposit **ADA** and allowed stablecoins; the contract only releases funds when the **USD value** of what's locked — based on the ADA price provided by **Pyth** and the stablecoins rules — **reaches the goal** you set when creating the vault. Nobody can change that rule afterwards; only you can withdraw once it is met.

![Iron Pig — PythFlow pitch (still from video)](public/iron-pig-pitch-poster.jpg)

**PythFlow pitch:** [Watch on YouTube](https://www.youtube.com/watch?v=j5q2i8WTVcg) · [local copy (MP4)](public/IronPig%20by%20PythFlow%20PUBLI-PITCH%20v1.mp4)

**PythFlow litepaper (English, PDF):** [`PythFLOW_Litepaper_EN.pdf`](public/PythFLOW_Litepaper_EN.pdf)

This repository is the **first example** of Pyth oracle usage in the demo ecosystem: contract in **Aiken**, ready for **preprod**, with tests covering deposit, failed withdrawal, and successful withdrawal.

---

## Pyth Integration

In **Iron Piggy**, **Pyth Network** is the oracle layer for real-time market data.

Flow nodes can:

- **Read** price feeds from Pyth
- **Define** conditions based on that data
- **Incorporate** oracle logic into the contract behavior

**Typical flow:**

1. Start from a blank canvas
2. Add and configure nodes manually or with the help of the AI agent
3. Use nodes that integrate Pyth data where needed
4. **Generate** smart contract logic from the node graph
5. **Submit** the transaction to deploy the contract

_Iron Pig fits in steps 4–5: the rule "total value ≥ USD goal" is exactly the kind of condition that Pyth allows to materialize on-chain in a verifiable way._

---

## Tech Stack

| Layer            | Role                                                           |
| ---------------- | -------------------------------------------------------------- |
| **Pyth Network** | Market prices (e.g. ADA/USD) that feed the unlock logic        |
| **Aiken**        | Iron Pig contract, on-chain tests and blueprint for deployment |
| **MeshJS**       | Transaction building and signing on the client (UI / web flow) |
| **AI Agent**     | Node orchestration and flow design assistance in PythFlow      |

---

## Development (minimum)

You need [Aiken](https://aiken-lang.org) **v1.1.21+** (see `aiken.toml`).

```bash
aiken fmt --check && aiken check -D && aiken build
```

- Contract and tests: `validators/iron_pig.ak` · shared logic: `lib/iron_pig_logic.ak`
- **Scripts** (`scripts/`) and example **environment variables** (`env.preprod.example`) target **preprod** (`TESTNET_MAGIC=1`).
- The contract assumes an **oracle datum** in demo format aligned with Pyth; once the official payload exists on preprod, the datum shape and reading will be swapped — the core idea (Pyth policy + feed + price) remains.

Apache-2.0 (see `aiken.toml`).

---

## Team

- Lisandro Faure
- Santiago Amaya
- Luciano Bianco
- Facundo Couto
- Juan Garcia Carballo
