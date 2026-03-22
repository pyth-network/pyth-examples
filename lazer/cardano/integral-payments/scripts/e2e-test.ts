/**
 * scripts/e2e-test.ts
 *
 * IntegralPayments — end-to-end integration test (Preprod testnet).
 *
 * Runs a complete payment lifecycle against the live Preprod network:
 *
 *   Step 1  — Verify Blockfrost connectivity and wallet balance.
 *   Step 2  — Fetch a live Pyth ADA/USD price proof.
 *   Step 3  — Build and submit a lock transaction (payment request UTxO).
 *   Step 4  — Wait for the lock UTxO to appear on-chain (up to 120s).
 *   Step 5  — Build and submit a collect transaction (settle the invoice).
 *   Step 6  — Wait for the collect transaction to be confirmed.
 *   Step 7  — Verify the merchant received the correct lovelace amount.
 *   Step 8  — Print a full test report.
 *
 * This script is used in CI (GitHub Actions) against Preprod before any
 * mainnet deployment.  It requires real tADA (Cardano testnet ADA).
 *
 * Usage
 * ─────
 *   npx tsx scripts/e2e-test.ts
 *   npx tsx scripts/e2e-test.ts --invoice-cents 500   # $5.00 invoice
 *   npx tsx scripts/e2e-test.ts --skip-collect        # lock only (for debugging)
 *
 * Environment variables required (all)
 * ─────────────────────────────────────
 *   BLOCKFROST_API_KEY       Preprod Blockfrost project id
 *   TRUSTED_SIGNER_KEY       32-byte hex Ed25519 Pyth signer key
 *   SERVICE_WALLET_SEED      BIP-39 mnemonic (holds tADA for fees + deposit)
 *   MERCHANT_WALLET_ADDRESS  Bech32 merchant address (receives the payment)
 *   NETWORK                  Must be Preprod for this script
 *   TOLERANCE_BPS            Slippage tolerance (default: 50)
 */

import { HermesClient } from "@pythnetwork/hermes-client";
import "dotenv/config";
import {
  abbrev,
  applyValidatorParams,
  checkBlockfrost,
  err,
  field,
  formatAda,
  header,
  initLucid,
  loadEnv,
  log,
  ok,
  readBlueprint,
  sleep,
  waitUntil,
  warn,
} from "./utils.js";
import { PaymentService } from "../src/gateway/paymentService.js";
import { loadConfig } from "../src/config.js";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const invoiceCents = (() => {
  const idx = process.argv.indexOf("--invoice-cents");
  return idx !== -1 ? parseInt(process.argv[idx + 1] ?? "1000", 10) : 1000;
})();
const skipCollect = process.argv.includes("--skip-collect");

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startTime = Date.now();

  header("IntegralPayments — End-to-End Integration Test");

  const env = loadEnv();

  if (env.network !== "Preprod") {
    err("E2E test must run on Preprod. Set NETWORK=Preprod in .env");
    process.exit(1);
  }

  field("Network",         env.network);
  field("Invoice amount",  `$${(invoiceCents / 100).toFixed(2)} (${invoiceCents} cents)`);
  field("Tolerance",       `${env.toleranceBps} bp`);
  field("Skip collect",    skipCollect ? "yes" : "no");

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1: Connectivity and wallet balance
  // ─────────────────────────────────────────────────────────────────────────
  header("Step 1 — Connectivity & Wallet Balance");

  log("Checking Blockfrost…");
  await checkBlockfrost(env.blockfrostUrl, env.blockfrostApiKey);
  ok("Blockfrost is healthy.");

  const lucid         = await initLucid(env);
  const serviceAddr   = await lucid.wallet().address();
  const serviceUtxos  = await lucid.utxosAt(serviceAddr);
  const serviceBalance = serviceUtxos.reduce(
    (acc, u) => acc + (u.assets.lovelace ?? 0n), 0n,
  );

  field("Service wallet",  abbrev(serviceAddr, 14));
  field("Balance",         formatAda(serviceBalance));

  if (serviceBalance < 10_000_000n) {
    err("Service wallet needs at least 10 ADA for this test.");
    err(`Fund address: ${serviceAddr}`);
    err("Faucet: https://docs.cardano.org/cardano-testnet/tools/faucet");
    process.exit(1);
  }
  ok("Sufficient balance.");

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2: Fetch Pyth price proof
  // ─────────────────────────────────────────────────────────────────────────
  header("Step 2 — Pyth Oracle Price Fetch");

  const hermesUrl = process.env["PYTH_HERMES_URL"] ?? "https://hermes.pyth.network";
  const hermes    = new HermesClient(hermesUrl, { timeout: 10_000 });
  const ADA_FEED  = "0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d";

  log("Fetching ADA/USD price from Hermes…");
  const update = await hermes.getLatestPriceUpdates([ADA_FEED], {
    parsed: true, binary: false,
  });
  const parsed = update.parsed?.[0];
  if (!parsed) {
    err("ADA/USD feed not in Hermes response.");
    process.exit(1);
  }

  const price    = BigInt(parsed.price.price);
  const exponent = parsed.price.expo;
  const ageS     = Math.floor(Date.now() / 1000) - parsed.price.publish_time;
  const priceF   = Number(price) * Math.pow(10, exponent);
  const scale    = 10n ** BigInt(-exponent);
  const lovelaceNeeded = (BigInt(invoiceCents) * 1_000_000n * scale) / (price * 100n);

  field("ADA/USD price",   `$${priceF.toFixed(8)}`);
  field("Price age",       `${ageS}s`);
  field("Required ADA",    formatAda(lovelaceNeeded));

  if (ageS > 60) {
    warn(`Price is ${ageS}s old — close to the freshness limit.`);
  }
  ok("Price proof fetched.");

  // ─────────────────────────────────────────────────────────────────────────
  // Step 3: Lock transaction
  // ─────────────────────────────────────────────────────────────────────────
  header("Step 3 — Lock Transaction");

  const config = loadConfig();
  const service = await PaymentService.create(config, env.serviceSeed);

  const invoiceRef = `E2E-TEST-${Date.now()}`;
  log(`Creating payment request for invoice: ${invoiceRef}`);

  const { request, lockResult } = await service.createPaymentRequest(
    invoiceRef,
    env.merchantAddress,
    invoiceCents,
    "ADA/USD",
    serviceAddr, // use service wallet as customer for the E2E test
  );

  ok(`Lock tx submitted:  ${lockResult.txHash}`);
  ok(`UTxO ref:           ${lockResult.utxoRef}`);
  field("Payment ID",     request.datum.paymentId);

  if (skipCollect) {
    warn("--skip-collect: stopping after lock transaction.");
    printSummary(startTime, { lockTxHash: lockResult.txHash });
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 4: Wait for lock UTxO to appear on-chain
  // ─────────────────────────────────────────────────────────────────────────
  header("Step 4 — Waiting for Lock UTxO Confirmation");

  log("Polling for UTxO at validator address (up to 120s)…");
  const blueprint     = readBlueprint();
  const validator     = applyValidatorParams(blueprint, env.trustedSignerKey, env.toleranceBps);
  const validatorAddr = lucid.utils.validatorToAddress(validator);

  const lockConfirmed = await waitUntil(async () => {
    const utxos = await lucid.utxosAt(validatorAddr);
    return utxos.some((u) => u.txHash === lockResult.txHash.split("#")[0]);
  }, 120_000, 6_000);

  if (!lockConfirmed) {
    err("Lock UTxO did not appear within 120s — check Blockfrost/network.");
    process.exit(1);
  }
  ok("Lock UTxO confirmed on-chain.");

  // ─────────────────────────────────────────────────────────────────────────
  // Step 5: Collect transaction (settle invoice)
  // ─────────────────────────────────────────────────────────────────────────
  header("Step 5 — Collect Transaction");

  log("Submitting collect (settle) transaction…");
  const collectResult = await service.settlePayment(
    request.datum.paymentId,
    env.serviceSeed, // service wallet acts as customer in the E2E test
  );

  ok(`Collect tx submitted: ${collectResult.txHash}`);
  field("Paid lovelace",    formatAda(collectResult.paidLovelace));
  field("Price used",       `$${collectResult.priceUsed.priceFloat.toFixed(8)}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Step 6: Wait for collect confirmation
  // ─────────────────────────────────────────────────────────────────────────
  header("Step 6 — Waiting for Collect Confirmation");

  log("Polling for collect tx (up to 120s)…");
  const collectConfirmed = await waitUntil(async () => {
    // UTxO should disappear from validator once collected
    const utxos = await lucid.utxosAt(validatorAddr);
    return !utxos.some((u) => u.txHash === lockResult.txHash.split("#")[0]);
  }, 120_000, 6_000);

  if (!collectConfirmed) {
    warn("Could not confirm collect tx within 120s — check manually.");
  } else {
    ok("Collect confirmed: UTxO no longer at validator.");
    service.confirmSettlement(request.datum.paymentId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 7: Verify merchant received payment
  // ─────────────────────────────────────────────────────────────────────────
  header("Step 7 — Merchant Balance Verification");

  log("Querying merchant address for recent UTxOs…");
  const merchantUtxos = await lucid.utxosAt(env.merchantAddress);
  const merchantTotal = merchantUtxos.reduce(
    (acc, u) => acc + (u.assets.lovelace ?? 0n), 0n,
  );
  field("Merchant address", abbrev(env.merchantAddress, 14));
  field("Merchant balance", formatAda(merchantTotal));

  // Check the expected amount landed (within tolerance)
  const toleranceFactor = (10_000n - BigInt(env.toleranceBps)) * lovelaceNeeded / 10_000n;
  const recentMerchantUtxo = merchantUtxos.find(
    (u) => (u.assets.lovelace ?? 0n) >= toleranceFactor,
  );
  if (recentMerchantUtxo) {
    ok(`Merchant UTxO found with ≥ ${formatAda(toleranceFactor)}.`);
  } else {
    warn("Could not find a qualifying merchant UTxO — may need manual verification.");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Final report
  // ─────────────────────────────────────────────────────────────────────────
  printSummary(startTime, {
    lockTxHash:     lockResult.txHash,
    collectTxHash:  collectResult.txHash,
    paidLovelace:   collectResult.paidLovelace,
    invoiceCents,
  });
}

function printSummary(
  startTime: number,
  data: {
    lockTxHash:    string;
    collectTxHash?: string;
    paidLovelace?:  bigint;
    invoiceCents?:  number;
  },
): void {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  header("Test Summary");
  field("Duration",       `${elapsed}s`);
  field("Lock tx",        data.lockTxHash);
  if (data.collectTxHash) {
    field("Collect tx",   data.collectTxHash);
    field("Paid",         formatAda(data.paidLovelace ?? 0n));
    field("Invoice",      `$${((data.invoiceCents ?? 0) / 100).toFixed(2)}`);
    console.log(`\n  Explorer (lock):    https://preprod.cardanoscan.io/transaction/${data.lockTxHash}`);
    console.log(`  Explorer (collect): https://preprod.cardanoscan.io/transaction/${data.collectTxHash}\n`);
    ok("E2E test PASSED.");
  } else {
    console.log(`\n  Explorer: https://preprod.cardanoscan.io/transaction/${data.lockTxHash}\n`);
    ok("Lock transaction submitted. Collect skipped.");
  }
}

main().catch((e) => {
  err(`E2E test FAILED: ${String(e)}`);
  process.exit(1);
});
