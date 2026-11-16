# PRD — Factura Ya: Sell Your Invoices, Get Paid Today

> Loops PRD: 1

---

## Context

SMEs in Argentina wait an average of 60-90 days to collect on invoices issued to large clients. Traditional factoring (banks, specialized firms) charges rates of 3-5% per month and takes days to approve. Meanwhile, the global tokenized RWA (Real World Assets) market grew from $5.5B to $24B+ in one year (2025), but existing solutions (Centrifuge, Goldfinch) target institutional players and don't serve Latin American SMEs.

## Problem

Latin American SMEs have capital trapped in accounts receivable. They cannot access fast liquidity without paying abusive rates or waiting for slow bank approvals. At the same time, investors seek yield on real assets but lack access to this market without costly intermediaries.

## Objectives

1. Build an on-chain marketplace on Cardano where SMEs tokenize outstanding invoices and sell them at a discount to investors.
2. Use Pyth as an exchange rate oracle for real-time ARS ↔ USDC conversion.
3. Deliver a functional MVP for the Pythathon hackathon (demo with full tokenization, purchase, and settlement flow).

## Functional Requirements

- **FR-01**: An SME can register an outstanding invoice specifying: amount, currency, due date, debtor, and debtor contact information (email or phone).
- **FR-01.1**: Upon tokenization, the system records the assignment of collection rights on-chain: the new beneficiary is the NFT holder. The seller (SME) is responsible for notifying the debtor that the collection right has been assigned, using the contact information provided in FR-01.
- **FR-02**: The system tokenizes the invoice as an NFT or native token on Cardano, representing the collection right.
- **FR-02.1**: Upon tokenization, the SME deposits collateral (e.g., 10-20% of the invoice value) that is locked in the smart contract as a good-faith guarantee. If payment is not credited to the buyer by the due date, the collateral is released in favor of the investor.
- **FR-03**: The tokenized invoice is listed on an on-chain marketplace with its discount and due date visible.
- **FR-04**: An investor can purchase the tokenized invoice by paying with ADA or stablecoins (USDC/DJED) at the discounted price.
- **FR-05**: At the time of purchase, the SME receives the funds immediately in their wallet.
- **FR-06**: The smart contract consumes Pyth's ARS/USD price feed to convert invoice values in pesos to their stablecoin equivalent.
- **FR-07**: At invoice maturity, a settlement mechanism exists where the investor receives the full amount (simulated in the MVP).
- **FR-07.1**: If at maturity the investor confirms collection, the SME's collateral is unlocked and returned. If the investor reports non-payment, the collateral is transferred to the investor as partial compensation.
- **FR-08**: The web interface displays the list of available invoices with: original amount, discount, implied yield, due date, and current exchange rate (via Pyth).
- **FR-09**: The displayed exchange rate updates in real time using Pyth's feed.

## Non-Functional Requirements

- **NFR-01**: Smart contracts written in Aiken (Cardano's native language).
- **NFR-02**: Pyth's price feed is consumed on-chain for invoice valuation.
- **NFR-03**: The demo must show the complete flow (issuance → purchase → settlement) in under 3 minutes.
- **NFR-04**: The web interface must be simple and functional (hackathon — no polished design required).
- **NFR-05**: Source code is delivered as a PR to the `pyth-examples` repo in the `/lazer/cardano` directory with the `cardano` tag.
- **NFR-06**: The README must explain what the project is and how Pyth is used.
- **NFR-07**: Transaction indexing using Oura (TxPipe) for the marketplace.

## Acceptance Criteria

- **AC-01**: An SME can register an invoice (with debtor contact information) and the system tokenizes it as an asset on Cardano, locking the SME's collateral.
- **AC-02**: The tokenized invoice appears on the marketplace with price, discount, and due date.
- **AC-03**: The invoice price in stablecoins is calculated using Pyth's ARS/USD feed on-chain.
- **AC-04**: An investor can purchase a tokenized invoice and the SME receives funds instantly.
- **AC-05**: The demo shows the end-to-end flow: invoice issuance (with collateral) → tokenization → investor purchase → settlement (with collateral return).
- **AC-06**: The exchange rate in the interface updates in real time via Pyth.
- **AC-07**: The PR to `pyth-examples` contains the complete source with a descriptive README.

## Out of Scope

- Real invoice verification (validation with AFIP, ARCA, or tax agencies). In the MVP, invoices are registered manually.
- SME reputation or credit scoring system.
- Automated debtor contact verification (in the MVP, it is registered manually without validation).
- **Payment oracle + dispute resolution (second iteration):** in a future version, an external oracle or validator would confirm that the debtor's payment was made, removing the dependency on manual investor confirmation. In case of dispute, resolution would be handled through an on-chain or delegated arbitration mechanism. Out of scope for the MVP.
- Formal arbitration in case of debtor non-payment.
- Secondary market for tokenized invoices (resale between investors).
- Integration with accounting systems or ERPs.
- Regulatory compliance (KYC/AML) — out of scope for hackathon.
- Multi-country support (Argentina only for the MVP).

## Dependencies

- **Pyth Network**: ARS/USD price feed available on Cardano (verify availability on testnet/devnet).
- **Cardano testnet**: Deployment environment for the MVP.
- **Aiken**: Compiler and toolchain for Cardano smart contracts.
- **TxPipe / Oura**: On-chain transaction indexing to power the marketplace.
- **Demeter.run**: Cardano node infrastructure.
- **Cardano wallet**: Testnet-compatible for the demo (e.g., Nami, Eternl).
