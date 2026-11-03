# DexHunter Live Adapter

This iteration adds a live execution path for Cardano hot-bucket swaps using DexHunter's official build/sign flow.

## Scope

Implemented:
- `POST /swap/estimate`
- `POST /swap/build`
- `POST /swap/sign`
- injected hot-wallet signer / submitter interface
- fee breakdown calculation for auditability
- keeper integration path for live execution after `PolicyVault` authorization

Not implemented yet:
- a concrete Cardano wallet/provider SDK integration
- on-chain Aiken enforcement of the hot-bucket rule
- fallback execution through `Minswap`

## Architecture

1. `PolicyVaultSimulator` authorizes execution based on oracle-aware risk policy.
2. `DexHunterLiveAdapter` converts the `ExecutionIntent` into DexHunter payloads.
3. A hot-wallet abstraction signs and submits the CBOR transaction.
4. The keeper records the resulting execution and fee breakdown in the audit log.

## Why this shape

DexHunter's documented transaction flow is `build -> sign -> witness -> submit`. The adapter follows that exact pattern while keeping the wallet dependency injected so we can later plug in a real Cardano signer without rewriting the business logic.

## Required runtime inputs

- `DEXHUNTER_PARTNER_ID`
- `CARDANO_EXECUTION_HOT_WALLET_ADDRESS`
- a concrete implementation of the hot-wallet signer/submission interface

## Per-call inputs

- `assetTokenIds` for the non-ADA assets being traded
- `nowUs`, which must fall inside the authorized intent validity window

## Sources

- DexHunter API overview: [official docs](https://dexhunter.gitbook.io/dexhunter-partners/api-reference/api)
- DexHunter swap flow: [official docs](https://dexhunter.gitbook.io/dexhunter-partners/trading/swap)
