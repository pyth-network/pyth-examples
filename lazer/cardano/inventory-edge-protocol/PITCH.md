# Inventory-Edge Protocol — RealFi MVP (Hackathon)

## The missing primitive on Cardano

Institutional **RealFi** needs a standard pattern to (1) represent an inventory or RWA position on-chain, (2) attach **real-time valuation**, and (3) enforce **risk rules** (loan health, insurance strikes) in the same transaction graph as the asset. Cardano’s eUTxO model is excellent for auditable state transitions, but teams still lack a **small, composable vault** that is explicitly designed around **oracle-verified** prices and **Lazer-style** asset metadata—not just a generic “lock tokens” script.

**Inventory-Edge** is that primitive: a single spending validator (`vault`) that:

- Locks a **shadow RWA NFT** (demo mint via Lucid; metadata carries Pyth Lazer feed hints).
- Tracks **synthetic debt** and a **collateral quantity** (off-chain scaling documented next to the datum).
- Supports **Adjust** (owner), **ApplyHedge** (parametric insurance strike / payout fields), **Close** (debt-free unwind), **Liquidate** (Pyth pull model + underwater check), and **ClaimInsurance** (Pyth pull model + strike breach).

Judges can read `onchain/validators/vault.ak` in one sitting: it is intentionally smaller than a production protocol, but it is **not** a toy—it calls `pyth.get_updates` exactly like the audited Pyth Lazer Cardano integration.

## High-frequency risk with Pyth Lazer

We use **Pyth Lazer** off-chain to fetch **Solana-binary** price updates (the format shared with Cardano), then attach a **reference input** to the on-chain **Pyth state** and perform a **zero-lovelace withdrawal** against Pyth’s script so the **payload is verified on-chain** before our vault logic runs.

That is the same pull-model pattern proven in the reference `lazer-rwa` project: the oracle is not “trusted JSON in metadata”; it is **cryptographically checked** in the transaction.

For **liquidation**, we compare integer-rounded collateral value against **110% of debt** using on-chain integer arithmetic (`price * qty * 100 < debt * 110` in the MVP). For **insurance**, `ClaimInsurance` requires the owner’s signature and checks `spot < strike` using the same verified feed.

## Synergy with Lazer-RWA

**Lazer-RWA** (reference: `pyth-examples/lazer/cardano/lazer-rwa`) shows how to align **off-chain streaming**, **datum design**, and **Pyth state resolution** on **PreProd**. We treat that repo as the **design north star**, not a dependency to fork blindly:

- **On-chain**: same `pyth-network/pyth-lazer-cardano` dependency and PreProd **policy id** as the reference integration.
- **Off-chain**: we keep **Lucid** for the **asset demo** (CIP-25 metadata + native mint) where the UX wins, and **Evolution SDK** for **Pyth-withdraw + Plutus v3 spends**, because Lucid 0.10 does not expose Plutus v3 attach paths—an honest trade-off documented here rather than hidden in the code.

The three **shadow** assets (gold / WTI / BTC) map to **Pyth Lazer feed ids** in `lib/feeds.ts` (XAU is aligned with the reference; BTC/WTI are **placeholders** until you confirm ids from the Lazer symbols API—this keeps the demo honest).

## Limitations (MVP scope)

- **Composition**: `Liquidate` and `ClaimInsurance` are implemented as **single transactions** that combine Pyth verification with vault redemption in the Evolution builder. If your cluster parameters or coin-selection edge cases differ, fall back to the two-step flow described in the original sprint plan (verify Pyth on-chain, then spend vault) and keep iterating.
- **Insurance payout**: the on-chain check authorizes the transition when `price < strike`; **exact payout wiring** to outputs is left as a product layer (the datum already stores `payout_lovelace` for demos and future tightening).
- **Lucid vs Evolution**: Lucid is **deprecated** on npm; we still use it for **Preprod Blockfrost mints** because it is the fastest way to get CIP-25 NFTs for judges. Production should migrate mints to Evolution or another maintained stack.

## How to demo (operators)

**Judges:** the scoring surface is the **Aiken vault + blueprint** — see the “For judges” section in [`README.md`](./README.md). The steps below are for live PreProd demos only.

1. `npm run build:onchain`
2. Set `BLOCKFROST_PROJECT_ID` (or `MAESTRO_API_KEY`), `CARDANO_MNEMONIC`, and `ACCESS_TOKEN` in `.env` (see `.env.example`). Skipping Blockfrost/Maestro usually breaks Evolution’s chain simulation (Koios-only is brittle).
3. `npm run mock-assets` → copy `SHADOW_POLICY_ID` / `SHADOW_NAME_HEX` for one NFT.
4. `npm run tx:open-vault` → locks NFT + vault datum at the script.
5. Optional: `npm run tx:hedge` → sets insurance fields.
6. `npm run tx:liquidate` → Pyth payload + `Liquidate` when the vault is underwater.

**Beyond the CLI:** `package.json` does not ship scripts for **Close**, **Adjust**, **ClaimInsurance**, or **pool** actions — those are available from the **judge API + Vite UI** via `npm run demo` (same `.env`), which calls into `lib/transactions.ts` / `lib/pool_onchain.ts`.

This is **PreProd-only** MVP code: do not reuse keys or mnemonics from demos on mainnet.
