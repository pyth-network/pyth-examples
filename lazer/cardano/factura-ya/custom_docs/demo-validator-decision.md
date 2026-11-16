# Demo Validator Decision

> Date: 2026-03-22

## Decision

The on-chain demo uses a simplified minting policy (`invoice_mint_demo.ak`) instead of the full validator (`invoice_mint.ak`).

## Context

The full `invoice_mint.ak` validator performs 6 checks on mint:
1. Exactly 1 token minted under the policy
2. Output contains an `InvoiceDatum` with matching `invoice_id`
3. Seller signature present
4. `amount_usd > 0`
5. `due_date_posix_ms` in the future
6. `debtor_contact_hash` non-empty

For burn, it additionally checks escrow state (Released/Forfeited).

## Problem

The datum serialization from the off-chain TypeScript code (MeshJS) does not match the exact CBOR format that the Aiken validator expects when deserializing with `expect datum: InvoiceDatum = raw`. Specifically:

- MeshJS's `txOutInlineDatumValue()` does not support Plutus Data Constr objects — only primitives and CBOR hex strings
- Manual CBOR construction (`d8799f...ff`) produces valid CBOR but the Plutus VM's `unConstrData` fails to parse it as the expected Aiken type
- The mismatch is in how Aiken serializes/deserializes named-field constructors vs how we manually encode them

This is a **serialization interop issue** between the TypeScript off-chain tooling and the Aiken on-chain validator, not a logic error.

## What We Tried

1. **MeshJS `mConStr0([...fields...])`** → `txOutInlineDatumValue()` throws "Cannot convert undefined to a BigInt"
2. **MeshJS with `'Mesh'` type hint** → same BigInt error
3. **MeshJS with `'JSON'` type hint** → "Malformed Plutus data json"
4. **Manual CBOR hex via `cborConstr0()`** → builds successfully but the Plutus VM rejects the deserialization at runtime
5. **Removing the evaluator** → tx builds but node rejects on submission (script evaluation fails)

## Solution

`invoice_mint_demo.ak` validates only:
- Exactly 1 token minted/burned
- At least one signer present

This allows the NFT to be minted on-chain, demonstrating the full CIP-30 wallet flow (connect → build tx → sign → assemble → submit → confirm).

The full validator with all 6 checks remains in `invoice_mint.ak` with 32 passing Aiken tests.

## Path to Production

1. **Use Lucid Evolution's `Data.to()` with Aiken blueprint schema** — generates correctly serialized Plutus Data from TypeScript types. Blocked by Lucid's ESM/WASM incompatibility with Vite (see `transactions.ts` for details).
2. **Use MeshJS's `MeshTxBuilder` with blueprint codegen** — MeshJS v2 has experimental blueprint integration that auto-generates typed datum constructors.
3. **Use `aiken blueprint apply` + `cardano-cli`** — construct the datum in Aiken's test framework, serialize to CBOR, and use that exact encoding.

All three approaches produce the correct serialization. The limitation is tooling interop in the hackathon timeframe, not a fundamental issue.
