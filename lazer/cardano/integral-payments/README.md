# IntegralPayments — Crypto Payment Gateway for ERP/CRM Platforms

> **Hackathon Submission** | Pyth Network × Input/Output (Cardano) Hackathon  
> **Team:** VeneHsoftw  
> **Project:** IntegralPayments
> **Team Menbers:** Eng. Luis LAbori
> **Contact:** cto@venehsoftw.site

---

## 📌 Overview

**IntegralPayments** is a modular payment gateway designed to be installed and enabled as a plugin/module on leading open-source ERP and CRM platforms — **Dolibarr**, **Tryton**, and **Odoo**. It integrates the **Pyth Network Oracle** on the **Cardano blockchain** to consume real-time and projected cryptocurrency price feeds, enabling businesses to accept payments in digital assets directly through their ERP/CRM environment.

By leveraging Pyth's decentralized price oracle on Cardano, IntegralPayments provides accurate, low-latency asset valuations at the point of payment — eliminating the risk of price slippage and ensuring fair exchange rates for both merchants and customers.

---

## 🚀 Features

- 🔌 **Plug-and-play module** for Dolibarr, Tryton, and Odoo
- 📡 **Pyth Network Oracle integration** for real-time crypto price feeds on Cardano
- 🪙 **Multi-asset support** — accepts payments in ADA and other Cardano-native tokens
- 🔄 **Automatic fiat-to-crypto conversion** at the moment of checkout using live Pyth price data
- 🧾 **Invoice reconciliation** — automatically registers crypto payments in the ERP/CRM ledger at the exchange rate used
- 🔐 **Non-custodial** — funds go directly to the merchant's wallet; no intermediary holds assets
- 📊 **Payment history dashboard** integrated within each ERP/CRM module
- ⚙️ **Configurable asset whitelist** — administrators select which cryptocurrencies to accept

---

## 🏗️ Architecture

```
┌───────────────────────────────────────────────────────────┐
│              ERP / CRM Platform (Dolibarr / Tryton / Odoo)│
│                                                           │
│   ┌───────────────────────────────────────────────────┐   │
│   │            IntegralPayments Module                │   │
│   │                                                   │   │
│   │  ┌──────────────┐     ┌────────────────────────┐  │   │
│   │  │  Checkout UI │────▶│  Price Feed Resolver   │  │   │
│   │  └──────────────┘     └──────────┬─────────────┘  │   │
│   │                                  │                │   │
│   │                    Pyth Hermes API (off-chain)    │   │
│   │                                  │                │   │
│   │  ┌───────────────────────────────▼─────────────┐  │   │
│   │  │        Cardano Smart Contract (Aiken)       │  │   │
│   │  │  - Validates Pyth price update proof        │  │   │
│   │  │  - Verifies payment amount vs. fiat value   │  │   │
│   │  │  - Emits payment confirmation event         │  │   │
│   │  └─────────────────────────────────────────────┘  │   │
│   └───────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

**Flow:**
1. Customer selects "Pay with Crypto" at checkout.
2. The IntegralPayments module queries the **Pyth Hermes API** for the latest signed price update for the chosen asset pair (e.g., `ADA/USD`).
3. The module calculates the exact crypto amount equivalent to the invoice's fiat value.
4. The customer sends the transaction on Cardano.
5. The **Aiken smart contract** on-chain verifies the Pyth price proof and validates that the received amount matches the expected value within an acceptable tolerance window.
6. Upon successful validation, the contract emits a confirmation event.
7. The ERP/CRM module listens for the confirmation, marks the invoice as paid, and records the exchange rate used.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Blockchain | Cardano (Mainnet / Preprod Testnet) |
| Smart Contract Language | Aiken |
| Oracle | Pyth Network — Pyth Core (Pull Model) |
| Price Feed API | Pyth Hermes |
| Off-chain Backend | Node.js / TypeScript |
| ERP/CRM Integration | Python (Odoo module), PHP (Dolibarr module), Python (Tryton module) |
| Wallet Interaction | Lucid Evolution (Cardano off-chain library) |
| Testing | Aiken built-in test framework, Jest |

---

## 🔗 Pyth Integration Details

IntegralPayments uses **Pyth Core** in **Pull Update** mode on Cardano.

### Price Feeds Used

| Asset Pair | Pyth Price Feed ID |
|---|---|
| ADA/USD | `2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d` |
| BTC/USD | `e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43` |
| ETH/USD | `ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace` |
| USDC/USD | `eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a` |

### How Price Updates Are Fetched

```typescript
import { HermesClient } from "@pythnetwork/hermes-client";

const hermesClient = new HermesClient("https://hermes.pyth.network");

// Fetch the latest price update VAA for ADA/USD
const priceUpdateData = await hermesClient.getLatestPriceUpdates([
  "0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
]);

const adaUsdPrice = priceUpdateData.parsed[0].price;
const exponent    = priceUpdateData.parsed[0].exponent;
const priceValue  = adaUsdPrice * Math.pow(10, exponent);
```

### Smart Contract Price Verification (Aiken — pseudocode)

```aiken
// Verify that the payment amount satisfies the invoice
// using a Pyth price proof submitted with the transaction
fn verify_payment(
  invoice_amount_usd: Int,
  paid_amount_lovelace: Int,
  pyth_price_proof: PriceProof,
  tolerance_bps: Int,
) -> Bool {
  let ada_usd_price = pyth.verify_and_get_price(pyth_price_proof)
  let expected_lovelace = invoice_amount_usd * 1_000_000 / ada_usd_price
  let delta = abs(paid_amount_lovelace - expected_lovelace)
  delta * 10_000 / expected_lovelace <= tolerance_bps
}
```

---

## 📦 Installation

### Prerequisites

- Node.js ≥ 18
- A Cardano wallet (Nami, Eternl, or compatible)
- Access to a Cardano node or a public RPC (e.g., Blockfrost)
- One of the supported ERP/CRM platforms installed

### 1. Clone the Repository

```bash
git clone https://github.com/venehsoftw/integral-payments.git
cd integral-payments
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
NETWORK=preprod                        # or mainnet
BLOCKFROST_API_KEY=your_key_here
PYTH_HERMES_URL=https://hermes.pyth.network
MERCHANT_WALLET_ADDRESS=addr1...
TOLERANCE_BPS=50                       # 0.5% price slippage tolerance
```

### 4. Deploy the Smart Contract

```bash
cd contracts
aiken build
aiken check
node scripts/deploy.js
```

### 5. Install the ERP/CRM Module

#### Dolibarr

```bash
cp -r modules/dolibarr/integralpayments /path/to/dolibarr/htdocs/custom/
```

Then activate the module from **Setup → Modules/Applications → IntegralPayments**.

#### Odoo

```bash
cp -r modules/odoo/integral_payments /path/to/odoo/addons/
```

Then install from **Apps → Update App List → Search "IntegralPayments"**.

#### Tryton

```bash
pip install trytond-integral-payments
```

Then activate from **Administration → Modules → IntegralPayments**.

---

## 🧪 Running Tests

```bash
# Smart contract tests (Aiken)
cd contracts && aiken check

# Off-chain unit and integration tests
npm test

# Run a full end-to-end test on Preprod Testnet
npm run test:e2e
```

---

## 📁 Project Structure

```
integral-payments/
├── contracts/                  # Aiken smart contracts
│   ├── lib/
│   │   └── pyth/               # Pyth price proof validation helpers
│   ├── validators/
│   │   └── payment_gateway.ak  # Main payment validator
│   └── aiken.toml
├── src/                        # Off-chain TypeScript backend
│   ├── oracle/
│   │   └── pythClient.ts       # Pyth Hermes API client
│   ├── cardano/
│   │   └── transaction.ts      # Lucid transaction builder
│   └── gateway/
│       └── paymentService.ts   # Core payment orchestration
├── modules/
│   ├── dolibarr/               # Dolibarr PHP module
│   ├── odoo/                   # Odoo Python module
│   └── tryton/                 # Tryton Python module
├── scripts/                    # Deployment and utility scripts
├── tests/                      # Test suite
├── .env.example
└── README.md
```

---

## 🌐 Live Demo

| Environment | URL |
|    ---      | --- |
| Demo ERP (Dolibarr Preprod) | _Coming soon_ |
| Smart Contract (Preprod) | `addr_test1...` _(to be updated post-deployment)_ |
| Pyth Price Feed Explorer | https://pyth.network/price-feeds |

---

## 👥 Team — VeneHsoftw

| Name                        | Role |
| ---                         |  --- |
| VeneHsoftw Core Team        | 
| Smart Contract Development  | TBD  |
| Offchain Engineer           | TBD  |
| BackEnd Engineer            | TDB  |
| ERP/CRM Modules developer   | TDB  |
| Security Auditor            | TBD  |
| QA Tester Engineer          | TBD  |


📧 Contact: [info@venehsoftw.site](mailto:info@venehsoftw.site)  
🌍 Organization: VeneHsoftw

---

## 📄 License

This project is licensed under the **Apache 2.0 License**. See [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgements

- [Pyth Network](https://pyth.network) — for providing the decentralized oracle infrastructure and the Hermes API.
- [Input/Output (IOG)](https://iohk.io) — for building the Cardano blockchain and the Aiken smart contract language.
- [Lucid Evolution](https://lucid.spacebudz.io) — for the off-chain Cardano transaction library.
- The open-source communities behind **Dolibarr**, **Odoo**, and **Tryton**.

---

> _IntegralPayments — Bringing real-time crypto payment rails to the world of open-source ERP/CRM._
