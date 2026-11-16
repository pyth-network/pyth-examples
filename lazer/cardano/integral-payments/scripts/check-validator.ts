/**
 * scripts/check-validator.ts
 *
 * IntegralPayments — validator UTxO inspector.
 *
 * Queries all UTxOs currently locked at the payment gateway validator address
 * and decodes their inline datums into human-readable payment-request records.
 *
 * Useful for:
 *  - Verifying that lock transactions landed correctly after `deploy.ts`.
 *  - Monitoring open (unsettled) payment requests from the command line.
 *  - Debugging datum encoding issues during development.
 *
 * Usage
 * ─────
 *   npx tsx scripts/check-validator.ts
 *   npx tsx scripts/check-validator.ts --payment-id <hex>   # filter by id
 *   npx tsx scripts/check-validator.ts --raw                # print raw CBOR
 *
 * Environment variables required
 * ───────────────────────────────
 *   BLOCKFROST_API_KEY   Blockfrost project id
 *   TRUSTED_SIGNER_KEY   32-byte hex Ed25519 Pyth signer key
 *   SERVICE_WALLET_SEED  BIP-39 mnemonic (read-only queries — only used to init Lucid)
 *   MERCHANT_WALLET_ADDRESS  Bech32 merchant wallet address
 *   NETWORK              Mainnet | Preprod (default) | Preview
 *   TOLERANCE_BPS        Slippage tolerance (default: 50)
 */

import {
  Data,
  Constr,
  type UTxO,
} from "@lucid-evolution/lucid";
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
  warn,
} from "./utils.js";

// ---------------------------------------------------------------------------
// Datum decoder
// ---------------------------------------------------------------------------

/**
 * Attempt to decode a raw inline datum CBOR string into a structured
 * PaymentDatum record.
 *
 * Field order matches the on-chain Aiken type:
 *   payment_id, merchant_address, invoice_usd_cents,
 *   accepted_feed_id, customer_pkh, created_at
 */
function decodeDatum(raw: string): Record<string, unknown> | null {
  try {
    const decoded = Data.from(raw);
    if (!(decoded instanceof Constr) || decoded.index !== 0n) return null;

    const f = decoded.fields as unknown[];

    // Field 2: merchant_address is a nested Constr for the Address type
    const addrConstr = f[1] as Constr<unknown>;
    const paymentCredConstr = addrConstr?.fields?.[0] as Constr<unknown>;
    const merchantPkh = paymentCredConstr?.fields?.[0] as string ?? "unknown";

    // Field 4: staking_credential (Constr(1,[]) = None, ignored for display)

    const createdAt = Number(f[5] as bigint);
    const ageMinutes = Math.floor((Date.now() / 1000 - createdAt) / 60);

    return {
      paymentId:       f[0] as string,
      merchantPkh:     abbrev(merchantPkh),
      invoiceUsdCents: Number(f[2] as bigint),
      acceptedFeedId:  abbrev(f[3] as string),
      customerPkh:     abbrev(f[4] as string),
      createdAt:       new Date(createdAt * 1000).toISOString(),
      ageMinutes,
    };
  } catch {
    return null;
  }
}

/** Map a known feed id to its human-readable name. */
function feedName(feedId: string): string {
  const names: Record<string, string> = {
    "2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d": "ADA/USD",
    "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43": "BTC/USD",
    "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace": "ETH/USD",
    "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a": "USDC/USD",
  };
  const short = feedId.replace("…", "").slice(0, 64);
  return names[short] ?? `unknown (${feedId})`;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const filterPaymentId = (() => {
    const idx = process.argv.indexOf("--payment-id");
    return idx !== -1 ? process.argv[idx + 1] : null;
  })();
  const showRaw = process.argv.includes("--raw");

  header("IntegralPayments — Validator UTxO Inspector");

  const env = loadEnv();
  field("Network",  env.network);
  field("Blockfrost", env.blockfrostUrl);

  log("Checking Blockfrost connectivity…");
  await checkBlockfrost(env.blockfrostUrl, env.blockfrostApiKey);
  ok("Blockfrost is healthy.");

  log("Reading blueprint and deriving validator address…");
  const blueprint      = readBlueprint();
  const lucid          = await initLucid(env);
  const validator      = applyValidatorParams(blueprint, env.trustedSignerKey, env.toleranceBps);
  const validatorAddr  = lucid.utils.validatorToAddress(validator);
  const scriptHash     = lucid.utils.validatorToScriptHash(validator);

  field("Validator address", validatorAddr);
  field("Script hash",       scriptHash);

  // Fetch all UTxOs
  log(`Querying UTxOs at validator address…`);
  const utxos: UTxO[] = await lucid.utxosAt(validatorAddr);

  if (utxos.length === 0) {
    warn("No UTxOs found at the validator address.");
    warn("Either no payments have been created, or all have been settled.");
    return;
  }

  ok(`Found ${utxos.length} UTxO(s).`);

  // Apply optional filter
  const filtered = filterPaymentId
    ? utxos.filter((u) => {
        const datum = decodeDatum(u.datum ?? "");
        return datum?.paymentId === filterPaymentId;
      })
    : utxos;

  if (filtered.length === 0) {
    warn(`No UTxOs match payment-id: ${filterPaymentId}`);
    return;
  }

  // Print each UTxO
  let index = 0;
  for (const utxo of filtered) {
    index++;
    const utxoRef = `${utxo.txHash}#${utxo.outputIndex}`;
    const lovelace = utxo.assets.lovelace ?? 0n;

    header(`UTxO ${index} / ${filtered.length}`);
    field("UTxO ref",    utxoRef);
    field("ADA locked",  formatAda(lovelace));

    if (!utxo.datum) {
      warn("No inline datum — this UTxO was not created by IntegralPayments.");
      continue;
    }

    if (showRaw) {
      field("Raw datum", utxo.datum);
    }

    const decoded = decodeDatum(utxo.datum);
    if (!decoded) {
      warn("Could not decode datum. Schema mismatch or unexpected constructor.");
      if (!showRaw) field("Raw datum", utxo.datum.slice(0, 80) + "…");
      continue;
    }

    field("Payment ID",       decoded.paymentId as string);
    field("Feed",             feedName(decoded.acceptedFeedId as string));
    field("Invoice (cents)",  `$${((decoded.invoiceUsdCents as number) / 100).toFixed(2)}`);
    field("Merchant PKH",     decoded.merchantPkh as string);
    field("Customer PKH",     decoded.customerPkh as string);
    field("Created at",       decoded.createdAt as string);
    field("Age",              `${decoded.ageMinutes} min`);

    if ((decoded.ageMinutes as number) > 30) {
      warn("This payment request is over 30 minutes old — may be expired.");
    }
  }

  console.log();
  ok("Inspection complete.");
}

main().catch((e) => {
  err(String(e));
  process.exit(1);
});
