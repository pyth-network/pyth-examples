/**
 * scripts/deploy.ts
 *
 * IntegralPayments — validator deployment script.
 *
 * What this script does
 * ─────────────────────
 * 1. Reads the compiled blueprint from contracts/plutus.json.
 * 2. Applies the two runtime parameters (trustedSignerKey, toleranceBps)
 *    to produce the final parameterised CBOR.
 * 3. Derives the validator script address for the selected network.
 * 4. Optionally publishes the script as a reference UTxO (saves ~1 ADA per
 *    collect transaction by allowing reference-script spending).
 * 5. Writes the parameterised CBOR and derived address to:
 *      - .env.deployed    (for the gateway service)
 *      - deployment.json  (for auditors and the PR README)
 *
 * Prerequisites
 * ─────────────
 *   cd contracts && aiken build      # produces contracts/plutus.json
 *   cp .env.example .env             # fill in required variables
 *
 * Usage
 * ─────
 *   npx tsx scripts/deploy.ts [--publish-reference-script]
 *
 * Environment variables required
 * ───────────────────────────────
 *   BLOCKFROST_API_KEY       Blockfrost project id
 *   TRUSTED_SIGNER_KEY       32-byte hex Ed25519 Pyth signer key
 *   SERVICE_WALLET_SEED      BIP-39 mnemonic of the service wallet
 *   MERCHANT_WALLET_ADDRESS  Bech32 merchant wallet address
 *   NETWORK                  Mainnet | Preprod (default) | Preview
 *   TOLERANCE_BPS            Slippage tolerance (default: 50)
 */

import fs   from "node:fs";
import path from "node:path";
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
  ROOT_DIR,
  sleep,
  warn,
} from "./utils.js";

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const publishRefScript = process.argv.includes("--publish-reference-script");

  header("IntegralPayments — Validator Deployment");

  // 1. Load environment
  const env = loadEnv();
  field("Network",        env.network);
  field("Blockfrost URL", env.blockfrostUrl);
  field("Tolerance",      `${env.toleranceBps} bp (${env.toleranceBps / 100} %)`);
  field("Trusted signer", abbrev(env.trustedSignerKey));
  field("Merchant addr",  abbrev(env.merchantAddress, 12));

  // 2. Verify Blockfrost connectivity
  log("Checking Blockfrost connectivity…");
  await checkBlockfrost(env.blockfrostUrl, env.blockfrostApiKey);
  ok("Blockfrost is healthy.");

  // 3. Read blueprint
  log("Reading contracts/plutus.json…");
  const blueprint = readBlueprint();
  ok(`Blueprint loaded. Plutus version: ${blueprint.preamble.plutusVersion}`);
  log(`Found validators: ${blueprint.validators.map((v) => v.title).join(", ")}`);

  // 4. Apply parameters to produce final CBOR
  log("Applying parameters to validator…");
  const validator    = applyValidatorParams(blueprint, env.trustedSignerKey, env.toleranceBps);
  const validatorCbor = validator.script;
  ok(`Parameterised CBOR length: ${validatorCbor.length / 2} bytes`);

  // 5. Derive validator address
  log("Initialising Lucid and deriving validator address…");
  const lucid            = await initLucid(env);
  const validatorAddress = lucid.utils.validatorToAddress(validator);
  const scriptHash       = lucid.utils.validatorToScriptHash(validator);
  ok(`Validator address: ${validatorAddress}`);
  ok(`Script hash:       ${scriptHash}`);

  // 6. Check service wallet balance
  const serviceAddress = await lucid.wallet().address();
  const utxos          = await lucid.utxosAt(serviceAddress);
  const totalLovelace  = utxos.reduce((acc, u) => acc + (u.assets.lovelace ?? 0n), 0n);
  field("Service wallet",  serviceAddress);
  field("Balance",         formatAda(totalLovelace));

  if (totalLovelace < 5_000_000n) {
    warn("Service wallet has less than 5 ADA. Transactions may fail.");
    warn(`Fund the address:  ${serviceAddress}`);
    if (env.network !== "Mainnet") {
      warn("Get Preprod tADA:  https://docs.cardano.org/cardano-testnet/tools/faucet");
    }
  }

  // 7. (Optional) Publish reference script UTxO
  let refScriptTxHash: string | null = null;
  if (publishRefScript) {
    if (totalLovelace < 20_000_000n) {
      warn("Insufficient funds to publish reference script (need ≥ 20 ADA). Skipping.");
    } else {
      header("Publishing Reference Script UTxO");
      log("Building reference-script publish transaction…");
      log("(Reference scripts eliminate the need to attach the full script in every collect tx)");

      // Sending the script to its own address as a reference script reduces
      // collect-transaction size by ~4–8 KB, saving ~1–2 ADA per settlement.
      const tx = await lucid
        .newTx()
        .pay.ToAddressWithData(
          validatorAddress,
          { inline: "d87980" }, // Constr(0,[]) — empty inline datum (required)
          { lovelace: 15_000_000n }, // 15 ADA minimum for reference scripts
          validator, // attach script as reference
        )
        .complete();

      const signed = await tx.sign.withWallet().complete();
      refScriptTxHash = await signed.submit();
      ok(`Reference script UTxO published: ${refScriptTxHash}#0`);
      log("Waiting for confirmation (30s)…");
      await sleep(30_000);
    }
  }

  // 8. Write deployment artefacts
  header("Writing Deployment Artefacts");

  const deployment = {
    timestamp:       new Date().toISOString(),
    network:         env.network,
    validatorTitle:  "payment_gateway.spend",
    scriptHash,
    validatorAddress,
    validatorCbor,
    parameters: {
      trustedSignerKey: env.trustedSignerKey,
      toleranceBps:     env.toleranceBps,
    },
    referenceScriptUtxo: refScriptTxHash ? `${refScriptTxHash}#0` : null,
    plutusVersion: blueprint.preamble.plutusVersion,
  };

  // deployment.json — for auditors and PR documentation
  const deploymentPath = path.join(ROOT_DIR, "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  ok(`deployment.json written → ${deploymentPath}`);

  // .env.deployed — can be sourced by the gateway service
  const envDeployedPath = path.join(ROOT_DIR, ".env.deployed");
  const envLines = [
    `# Generated by scripts/deploy.ts on ${new Date().toISOString()}`,
    `NETWORK=${env.network}`,
    `VALIDATOR_CBOR=${validatorCbor}`,
    `VALIDATOR_ADDRESS=${validatorAddress}`,
    `SCRIPT_HASH=${scriptHash}`,
    `TRUSTED_SIGNER_KEY=${env.trustedSignerKey}`,
    `TOLERANCE_BPS=${env.toleranceBps}`,
    refScriptTxHash ? `REFERENCE_SCRIPT_UTXO=${refScriptTxHash}#0` : "",
  ].filter(Boolean).join("\n");
  fs.writeFileSync(envDeployedPath, envLines + "\n");
  ok(`.env.deployed written   → ${envDeployedPath}`);

  // 9. Final summary
  header("Deployment Complete");
  field("Script hash",      scriptHash);
  field("Validator address", validatorAddress);
  field("Deployment JSON",  deploymentPath);
  field("Env file",         envDeployedPath);
  if (refScriptTxHash) {
    field("Ref script UTxO", `${refScriptTxHash}#0`);
  }

  console.log("\nNext steps:");
  console.log("  1. Copy .env.deployed values into your .env file");
  console.log("  2. Fund the validator address with test ADA (Preprod)");
  console.log(`  3. Verify on explorer: https://preprod.cardanoscan.io/address/${validatorAddress}`);
  console.log("  4. Run:  npm run dev  to start the gateway service\n");
}

main().catch((e) => {
  err(String(e));
  process.exit(1);
});
