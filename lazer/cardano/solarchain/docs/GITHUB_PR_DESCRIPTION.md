# Pull request description — SolarChain (copy into GitHub)

**Subject**

```
feat: implementation of SolarChain — verifiable solar settlement on Cardano
```

**Description**

This Pull Request introduces **SolarChain**, a traceability and settlement layer for **verifiable solar benefit** on Cardano, powered by **Pyth Network**. The MVP focuses on site-level energy evidence, **sKWh** (integer settlement units), and programmatic settlement previews—not a public trading product, carbon market, or green bond narrative.

**Team**

Ever Allende, Brian Castagno, Esteban Rosman

---

**Key technical implementations**

- **On-chain validation (Aiken):** Escrow and settlement validators that encode bilateral-style rules and verified oracle consumption patterns aligned with the SolarChain domain packages.
- **Pyth Lazer integration:** Client adapter using the Pyth stack to bring high-frequency, verifiable reference data into the off-chain orchestration path.
- **Off-chain API (`solarchain-api`):** Batch quote, settlement preparation, snapshot ingest, and evidence export; pluggable persistence (in-memory or PostgreSQL).
- **Dashboard (`solarchain-web`):** Next.js UI for energy evidence, climate/economic references, settlement preview, persisted snapshots, and evidence export.
- **Cardano core:** Lucid-based, deterministic transaction building aligned with the eUTXO model (Node.js 20 toolchain).

**Security and reliability**

- **Anti-staleness:** Price/oracle freshness constraints enforced in the settlement path (aligned with domain validation).
- **Confidence and policy hygiene:** Validation paths that reject weak or untrusted oracle payloads where configured (mirror the rigor of the Tokenized Commodities stack).
- **Operational clarity:** Health and site endpoints for integrators; schema and repository boundaries to reduce accidental state misuse.

**Positioning**

SolarChain is presented as **infrastructure for verifiable solar benefit and settlement** tied to site rules (e.g. `EXPORTED_ENERGY_ONLY`), avoiding trading, tokenomics, or public-offering framing.

**How to test**

1. Open `lazer/cardano/solarchain/`.
2. `cp .env.example .env` (if needed).
3. `npm install`
4. `npm run test` — domain and package tests (e.g. quote / validation logic).
5. `npm run typecheck`
6. `npm run dev:api` and `npm run dev:web` — exercise dashboard, batch quote, ingest, and evidence flows against your configured network.
