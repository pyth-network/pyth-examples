# SafeQuote

**Team:** Veltrix  
**Member:** Elio Esis  
**Contact:** eesis.dev@gmail.com

## Overview

SafeQuote is a Cardano preprod web app that lets a seller issue an invoice in USD and settle it in ADA while preserving the USD value with on-chain Pyth validation.

The flow is wallet-only. A browser wallet connects to the app, creates an invoice, and mints an invoice NFT that represents that invoice. Another wallet can pay the invoice by providing the correct PIN and sending enough ADA to satisfy the USD amount according to the current ADA/USD price verified on-chain.

## How the app works

1. A seller connects a CIP-30 browser wallet on Cardano preprod.
2. The seller creates an invoice denominated in USD.
3. The app generates a PIN and stores its hash in the invoice datum.
4. An invoice NFT is minted to represent the invoice.
5. A buyer connects a wallet and opens the invoice.
6. The buyer enters the PIN and attempts to pay in ADA.
7. The transaction uses the SafeQuote Aiken validator to verify:
   - the Pyth update is valid
   - the feed used is ADA/USD
   - the ADA sent is at least the minimum required for the USD amount
   - the PIN matches the stored hash
   - the invoice NFT is transferred to the buyer
   - the ADA settlement goes to the seller
8. If all checks pass, the transaction succeeds on-chain.

## How Pyth is used

SafeQuote uses Pyth as the source of truth for the ADA/USD price.

### Off-chain

The web app calls the Pyth Lazer Cardano flow to fetch the latest ADA/USD update and prepares the binary payload required for transaction building.

- Pyth product: Pyth Lazer / Cardano consumer flow
- Feed used: ADA/USD
- Cardano feed id: `16`
- Preprod policy id: `d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6`

### On-chain

The Aiken validator consumes the Pyth update on-chain and verifies the ADA/USD quote before accepting payment. This ensures the invoice value is enforced in USD while settlement still happens in ADA.

## Stack

- Cardano preprod
- Aiken
- Next.js
- TypeScript
- MeshJS
- Pyth Lazer Cardano integration

## Current status

This project is being built as a hackathon MVP focused on:
- wallet-only authentication
- USD invoices settled in ADA
- invoice NFT representation
- PIN-protected payment flow
- on-chain Pyth verification with Aiken

## Notes

- This project targets Cardano preprod.
- Pyth API keys are kept in private environment variables and are not committed.
