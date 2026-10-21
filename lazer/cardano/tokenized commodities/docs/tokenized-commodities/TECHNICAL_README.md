# Tokenized Commodities — Technical README

## Product thesis
This product is a private bilateral agreement infrastructure for commodity-linked contracts on Cardano PreProd.
It is intentionally not an exchange, marketplace, public investment venue, custody stack, or physical delivery system.

## MVP flow
1. Create agreement.
2. Validate and normalize parameters.
3. Resolve oracle evidence.
4. Compute bounded settlement with cap/floor.
5. Check collateral sufficiency.
6. Build settlement tx draft or dispute draft.
7. Return audit trail for demo and review.

## Local run
```bash
cp .env.example .env
npm install
npm run dev:commodities:api
npm run dev:commodities:web
```
