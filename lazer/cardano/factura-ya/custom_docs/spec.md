# Technical Specification — Factura Ya

> Loops Spec: 0

---

## Technical Summary

Factura Ya is an on-chain invoice factoring marketplace on Cardano. SMEs tokenize outstanding invoices as NFTs, deposit collateral as a good-faith guarantee, and sell the collection rights to investors at a discount. Pyth's ARS/USD price feed provides real-time currency conversion. Settlement is handled via on-chain confirmation with collateral release/forfeit logic.

The system consists of four Aiken validators (Pyth oracle consumer, invoice minting policy, escrow/collateral, marketplace), off-chain transaction builders in TypeScript, an Oura indexer for marketplace state, and a lightweight web frontend.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend (React)                      │
│  - Register invoice     - Browse marketplace              │
│  - Buy invoice          - Confirm settlement / report     │
└──────────────┬────────────────────────┬──────────────────┘
               │ cardano-serialization  │ lucid / mesh
               │          lib           │
┌──────────────▼────────────────────────▼──────────────────┐
│               Off-chain Tx Builders (TypeScript)          │
│  - buildMintInvoiceTx    - buildPurchaseTx               │
│  - buildSettleTx         - buildClaimCollateralTx        │
└──────────┬──────────┬──────────────┬─────────────────────┘
           │          │              │
┌──────────▼───┐ ┌────▼──────────┐ ┌▼─────────────────────┐
│ Invoice Mint │ │  Escrow       │ │  Marketplace          │
│ Policy       │ │  Validator    │ │  Validator            │
│ (Aiken)      │ │  (Aiken)      │ │  (Aiken)             │
│ - Mint NFT   │ │  - Lock       │ │  - List               │
│ - Burn NFT   │ │    collateral │ │  - Purchase            │
│              │ │  - Release    │ │  - Delist              │
│              │ │  - Forfeit    │ │                        │
└──────────────┘ └───────┬───────┘ └────────────┬──────────┘
                         │                      │
                    ┌────▼──────────────────────▼───┐
                    │        Pyth Oracle             │
                    │        (ARS/USD feed)           │
                    └────────────────────────────────┘

┌───────────────────────────────────┐
│  Oura Indexer (TxPipe)            │
│  - Watches marketplace UTxOs      │
│  - Feeds API / frontend state     │
└───────────────────────────────────┘
```

### Data Model

**Invoice NFT Metadata (CIP-25/CIP-68):**
```
{
  invoice_id: ByteArray,        -- unique identifier
  seller: PubKeyHash,           -- SME wallet
  amount_ars: Int,              -- invoice amount in ARS (scaled)
  currency: ByteArray,          -- "ARS"
  due_date_slot: Int,           -- invoice maturity as slot number
  debtor_name: ByteArray,       -- debtor identifier
  debtor_contact: ByteArray,    -- email or phone (hashed for privacy)
  created_at_slot: Int
}
```

**Escrow Datum (collateral UTxO):**
```
{
  invoice_id: ByteArray,
  seller: PubKeyHash,
  collateral_amount: Int,       -- lovelace or stablecoin locked
  buyer: Option<PubKeyHash>,    -- set after purchase
  due_date_slot: Int,
  status: Locked | Released | Forfeited
}
```

**Marketplace Listing Datum:**
```
{
  invoice_id: ByteArray,
  seller: PubKeyHash,
  asking_price_usd: Int,        -- discounted price in USD-equivalent (scaled)
  original_amount_ars: Int,
  pyth_price_at_listing: Int,   -- ARS/USD rate when listed (reference)
  due_date_slot: Int,
  status: Listed | Sold | Delisted
}
```

### Threat Model

See `docs/threat.md` (to be created separately).

---

## Block 1: Pyth Oracle Integration

**Objective:** Read and validate ARS/USD price from Pyth on-chain in Aiken.

**Files to create/modify:**
- `contracts/lib/pyth_oracle.ak` — Helper functions to parse and validate Pyth price attestation data from a reference input UTxO.
- `contracts/lib/types.ak` — Shared type definitions (PriceData, InvoiceDatum, EscrowDatum, ListingDatum).
- `offchain/src/pyth.ts` — TypeScript helper to fetch the Pyth price update and attach it as a reference input to transactions.

**Logic:**
- Parse Pyth price attestation from the reference input datum.
- Validate attestation freshness (price must not be older than N slots).
- Extract ARS/USD price as a scaled integer.
- Expose `get_price(reference_input) -> Result<PriceData, Error>` for use in other validators.

**Tests:**
- [ ] Unit test: parse valid Pyth attestation and extract correct price.
- [ ] Unit test: reject stale attestation (older than threshold).
- [ ] Unit test: reject malformed attestation data.
- [ ] Integration test: build a transaction with Pyth reference input on preview testnet.

**Completion criteria:** `get_price` returns a validated ARS/USD price from a Pyth reference input, with all tests passing.

---

## Block 2: Invoice NFT Minting

**Objective:** Allow SMEs to tokenize invoices as NFTs on Cardano with on-chain metadata.

**Files to create/modify:**
- `contracts/validators/invoice_mint.ak` — Minting policy for invoice NFTs. Handles Mint and Burn redeemers.
- `contracts/lib/types.ak` — Add InvoiceMetadata type.
- `offchain/src/mint.ts` — Transaction builder for minting and burning invoice NFTs.

**Logic:**
- **Mint:**
  - SME submits invoice data (amount, currency, due date, debtor, debtor contact).
  - Minting policy validates: seller signature present, amount > 0, due date in the future, debtor contact non-empty.
  - Mints a unique NFT (policy ID + invoice_id as asset name).
  - Invoice metadata stored in datum (CIP-68 pattern) or reference UTxO.
  - Debtor contact is hashed before storing on-chain (privacy).

- **Burn:**
  - Only after settlement is complete (status Released or Forfeited).
  - Requires NFT holder signature.

**Tests:**
- [ ] Unit test: mint succeeds with valid invoice data and seller signature.
- [ ] Unit test: mint fails if due date is in the past.
- [ ] Unit test: mint fails if debtor contact is empty.
- [ ] Unit test: burn succeeds after settlement.
- [ ] Unit test: burn fails if settlement is not complete.

**Completion criteria:** SME can mint an invoice NFT with correct metadata. Burn is gated by settlement status. All tests passing.

---

## Block 3: Escrow / Collateral Validator

**Objective:** Lock SME collateral at tokenization and release/forfeit at settlement.

**Files to create/modify:**
- `contracts/validators/escrow.ak` — Escrow validator with Lock, Release, and Forfeit redeemers.
- `contracts/lib/types.ak` — Add EscrowDatum, EscrowRedeemer types.
- `offchain/src/escrow.ts` — Transaction builders for lock, release, and forfeit operations.

**Logic:**
- **Lock (at mint time, same tx as Block 2):**
  - SME deposits collateral (10-20% of invoice value converted to ADA/stablecoins using Pyth price from Block 1).
  - Creates escrow UTxO with status `Locked`, linked to `invoice_id`.
  - Validates collateral amount ≥ minimum percentage of invoice value.

- **Release (happy path — debtor paid):**
  - Can only execute after `due_date_slot`.
  - Requires buyer (NFT holder) signature to confirm payment received.
  - Collateral returned to seller.
  - Escrow status → `Released`.

- **Forfeit (unhappy path — debtor did not pay):**
  - Can only execute after `due_date_slot` + grace period.
  - Requires buyer (NFT holder) signature reporting non-payment.
  - Collateral transferred to buyer as partial compensation.
  - Escrow status → `Forfeited`.

**Tests:**
- [ ] Unit test: lock creates escrow with correct collateral amount and status.
- [ ] Unit test: lock fails if collateral is below minimum percentage.
- [ ] Unit test: release succeeds with buyer signature after due date, returns collateral to seller.
- [ ] Unit test: release fails before due date.
- [ ] Unit test: forfeit succeeds with buyer signature after due date + grace period.
- [ ] Unit test: forfeit fails without buyer signature.
- [ ] Unit test: forfeit transfers collateral to buyer.

**Completion criteria:** Collateral lifecycle (lock → release/forfeit) works correctly with proper access control. All tests passing.

---

## Block 4: Marketplace Validator

**Objective:** List tokenized invoices for sale and handle purchases.

**Files to create/modify:**
- `contracts/validators/marketplace.ak` — Marketplace validator with List, Purchase, and Delist redeemers.
- `contracts/lib/types.ak` — Add ListingDatum, MarketplaceRedeemer types.
- `offchain/src/marketplace.ts` — Transaction builders for list, purchase, and delist.

**Logic:**
- **List:**
  - SME sends invoice NFT to marketplace script address.
  - Creates listing UTxO with datum: invoice details, asking price (ARS amount converted to USD via Pyth), discount percentage, due date.
  - The Pyth price at listing time is recorded as reference.
  - Status → `Listed`.

- **Purchase:**
  - Investor pays the asking price in ADA/stablecoins.
  - Payment goes directly to the seller's address (FR-05: immediate payment).
  - Invoice NFT transferred to buyer.
  - Escrow datum updated: `buyer = investor_pkh`.
  - Listing status → `Sold`.
  - Validates payment amount ≥ asking price (re-checked against current Pyth price if needed).

- **Delist:**
  - Only seller can delist (requires seller signature).
  - Returns NFT to seller.
  - Unlocks collateral from escrow.
  - Listing status → `Delisted`.

**Tests:**
- [ ] Unit test: list creates listing with correct datum and holds NFT.
- [ ] Unit test: purchase transfers NFT to buyer and payment to seller.
- [ ] Unit test: purchase fails if payment is below asking price.
- [ ] Unit test: purchase updates escrow with buyer identity.
- [ ] Unit test: delist returns NFT and unlocks collateral, requires seller signature.
- [ ] Unit test: delist fails without seller signature.

**Completion criteria:** Full marketplace flow (list → purchase or delist) works with correct fund routing and escrow linkage. All tests passing.

---

## Block 5: Oura Indexer

**Objective:** Index on-chain marketplace state for the frontend using TxPipe's Oura.

**Files to create/modify:**
- `indexer/oura.toml` — Oura pipeline configuration (source: Cardano node, filters: marketplace script address, sink: PostgreSQL or JSON file).
- `indexer/src/api.ts` — Simple REST API to serve indexed marketplace data.
- `indexer/schema.sql` — Database schema for indexed listings (if using PostgreSQL).

**Logic:**
- Oura watches the marketplace validator script address for UTxO changes.
- On new listing: parse datum, store invoice details + status in DB/file.
- On purchase: update listing status to `Sold`, record buyer.
- On delist: update listing status to `Delisted`.
- REST API exposes:
  - `GET /invoices` — all active listings with current Pyth price for display.
  - `GET /invoices/:id` — single invoice detail.

**Tests:**
- [ ] Oura pipeline starts and connects to Cardano node.
- [ ] New listing is indexed within N seconds.
- [ ] Purchase event updates listing status correctly.
- [ ] API returns correct data for active listings.

**Completion criteria:** Marketplace state is indexed off-chain and available via API. Frontend can query listings without scanning UTxOs directly.

---

## Block 6: Web Frontend

**Objective:** Simple UI for SMEs and investors.

**Files to create/modify:**
- `frontend/` — React app (Vite or Next.js).
- `frontend/src/components/RegisterInvoice.tsx` — Invoice registration form.
- `frontend/src/components/Marketplace.tsx` — Browse available invoices.
- `frontend/src/components/InvoiceDetail.tsx` — Single invoice view with purchase action.
- `frontend/src/components/MyInvoices.tsx` — SME's listed invoices and settlement status.
- `frontend/src/components/MyPurchases.tsx` — Investor's purchased invoices and settlement actions.
- `frontend/src/components/PriceDisplay.tsx` — Live ARS/USD rate from Pyth.
- `frontend/src/lib/wallet.ts` — Wallet connection (Nami, Eternl via CIP-30).
- `frontend/src/lib/transactions.ts` — Wraps offchain tx builders.
- `frontend/src/lib/api.ts` — Client for the Oura indexer API.

**Logic:**
- **Register invoice (SME):**
  - Connect wallet. Fill form: amount (ARS), due date, debtor name, debtor contact.
  - System calculates: collateral required (using Pyth ARS/USD), suggested discount, asking price in USD.
  - SME confirms → mints NFT + locks collateral + lists on marketplace (single UX flow, may be 1-2 txs).

- **Marketplace (investor):**
  - Browse active listings from indexer API.
  - Each card shows: original amount (ARS), price (USD), discount %, implied yield, due date, current ARS/USD rate.
  - Exchange rate updates in real time (FR-09).
  - Click to view detail → purchase button.

- **Settlement (post-maturity):**
  - Investor sees "Confirm payment received" or "Report non-payment" buttons after due date.
  - SME sees collateral status (locked / returned / forfeited).

**Tests:**
- [ ] Register invoice form submits valid data and triggers mint + list.
- [ ] Marketplace displays listings from indexer API.
- [ ] Exchange rate updates in real time.
- [ ] Purchase flow works end-to-end on testnet.
- [ ] Settlement confirmation releases collateral.

**Completion criteria:** SME can register and list an invoice, investor can browse and purchase, settlement actions work. All via web UI on testnet.

---

## Block 7: Demo & Submission

**Objective:** Prepare the hackathon demo and submission PR.

**Files to create/modify:**
- `offchain/src/simulate.ts` — Script to simulate the full lifecycle with test wallets.
- `README.md` — Project description, team, Pyth usage, setup instructions.
- `demo/` — Demo script or recording.

**Logic:**
- **Demo script:**
  1. SME registers an invoice: 100,000 ARS, due in 90 days, debtor "ACME Corp".
  2. System shows: collateral required (15,000 ARS equivalent), asking price ($950 USD at current rate).
  3. SME confirms → NFT minted, collateral locked, listed on marketplace.
  4. Investor browses marketplace, sees invoice with 5% discount and implied yield.
  5. Investor purchases for $950 USD → SME receives funds instantly.
  6. Time skip (simulated): due date reached.
  7. Investor confirms payment received → collateral returned to SME.
  8. Total flow under 3 minutes.

- **README:** Project name, team members, contact info, what it does, how Pyth is used (ARS/USD conversion for invoice valuation and marketplace pricing), setup and run instructions.

**Tests:**
- [ ] Simulation script runs end-to-end without errors.
- [ ] README contains all required submission fields.
- [ ] PR structure matches `/lazer/cardano` directory requirement.

**Completion criteria:** Demo can be executed live in under 3 minutes showing the full flow. README and PR structure meet hackathon submission requirements.

---

## Block Dependencies

```
Block 1 (Pyth Oracle) ──► Block 2 (Invoice Mint)
                      └──► Block 3 (Escrow)
                      └──► Block 4 (Marketplace)
Block 2 ──► Block 3 (mint + lock in same tx)
Block 2 ──► Block 4 (NFT listed after mint)
Block 3 ──► Block 4 (escrow linked to listing)
Block 4 ──► Block 5 (Oura indexes marketplace)
Block 5 ──► Block 6 (Frontend reads from indexer)
Block 3 ──► Block 6 (settlement UI)
Block 4 ──► Block 6
Block 6 ──► Block 7 (Demo)
```

**Execution order:** Block 1 → Blocks 2 & 3 (parallel) → Block 4 → Block 5 → Block 6 → Block 7

## Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Pyth ARS/USD feed not available on Cardano testnet | Blocker — no oracle data | Verify feed availability early. Fallback: use a different currency pair for demo and document ARS/USD as the production target. |
| Aiken + Pyth integration is undocumented | High — unknown integration pattern | Research Pyth's Cardano integration docs. Check `pyth-examples` repo for existing Cardano samples. |
| Multi-validator transaction complexity | High — mint + escrow + list in one tx may exceed limits | Design as 2-step: (1) mint + lock collateral, (2) list on marketplace. Keep datums minimal. |
| Oura setup complexity | Medium — infrastructure dependency | Start with a simple file-based sink (JSON) instead of PostgreSQL. Upgrade to DB if time allows. Fallback: direct UTxO scanning from frontend. |
| Debtor contact privacy | Medium — PII on-chain | Hash debtor contact before storing on-chain. Raw contact shared off-chain between seller and buyer only. |
| Cardano transaction size limits | Medium — NFT metadata + escrow + listing in same tx | Use CIP-68 reference UTxO pattern to keep metadata off the token UTxO. Split into multiple transactions if needed. |
| Testnet instability / Demeter.run downtime | Medium — blocks demo | Have a local devnet setup as backup (e.g., Yaci DevKit). |

## Security Notes

- **Oracle manipulation:** Pyth attestation freshness must be validated on-chain. Listing price snapshots the rate but purchase re-validates against current price.
- **Collateral theft:** Only the buyer (NFT holder) can trigger release or forfeit, and only after the due date. Seller cannot reclaim collateral while a buyer exists.
- **Invoice duplication:** The minting policy must ensure uniqueness per invoice_id. Use a one-shot pattern or include a UTxO reference in the asset name to guarantee uniqueness.
- **Front-running purchases:** Cardano's UTxO model prevents double-spending the listing UTxO, so two buyers cannot purchase the same invoice.
- **PII exposure:** Debtor contact is hashed on-chain (SHA-256). The raw contact is shared off-chain via the frontend only to the buyer after purchase. Consider encrypting with the buyer's public key.
- **Settlement griefing:** An investor could refuse to confirm payment to steal collateral. The grace period mitigates this — if no action is taken after due date + grace, consider a default resolution (e.g., collateral returned to seller). This is documented as a second-iteration improvement (payment oracle).
