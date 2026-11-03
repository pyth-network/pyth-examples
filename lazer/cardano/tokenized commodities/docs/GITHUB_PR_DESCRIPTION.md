# Pull request description — Tokenized Commodities (copy into GitHub)

**Subject**

```
feat: implementation of Tokenized Commodities — bilateral settlement infrastructure
```

**Description**

This Pull Request introduces **Tokenized Commodities**, a private and bilateral settlement infrastructure built on **Cardano** and powered by **Pyth Network**. The solution addresses financial friction in long-term commodity-linked agreements by providing a **programmatic execution layer** that mitigates market volatility.

**Team**

Ever Allende, Franca Zerilli, Ricardo Satavicius

---

**Key technical implementations**

- **On-chain validation (Aiken):** Robust escrow validator enforcing bilateral agreement terms, cap/floor protection, and verified oracle data consumption.
- **Pyth Lazer integration:** `@pythnetwork/pyth-lazer-cardano-js` (and related adapters) to fetch and verify high-frequency commodity feeds (e.g. soybeans, corn, wheat).
- **Off-chain orchestration:** Built with **Lucid** and **Node.js 20**, with deterministic transaction building aligned with the eUTXO model.

**Security and reliability**

- **Anti-staleness:** Enforced price freshness window **under 120 seconds**.
- **Confidence filtering:** Transactions valid only if Pyth’s confidence interval is below **1%**.
- **Policy verification:** Strict check against Pyth’s official **PreProd** policy ID (`d799d2…a21e6` — use the full ID from your deployment config in production docs).

**Regulatory alignment**

Following the **Pitch & Risk** narrative, the project is positioned as **private infrastructure for bilateral agreements**, avoiding public-offering language and focusing on **programmatic settlement** for existing legal contracts.

**How to test**

1. Navigate to `lazer/cardano/tokenized commodities/` (folder name includes a space).
2. `npm install`
3. `npm test` — run the **25+** unit tests covering settlement logic and oracle validation.
4. Use the provided `demo_script.sh` (if present in that tree) to simulate a full settlement flow on **PreProd**.
